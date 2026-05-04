import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { consorcios, memberships, units, users } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";
import { getAccessibleConsorcioIds } from "./admin";

export type UnitVecino = {
  membershipId: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  role: "owner" | "tenant";
};

export type AdminUnitRow = {
  id: string;
  label: string;
  floor: string | null;
  vecinos: UnitVecino[];
};

export type AdminConsorcioWithUnits = {
  id: string;
  name: string;
  type: "edificio" | "ph" | "barrio_cerrado";
  address: string | null;
  units: AdminUnitRow[];
};

export async function getConsorciosWithUnitsForAdmin(
  user: CurrentUser,
): Promise<AdminConsorcioWithUnits[]> {
  const ids = getAccessibleConsorcioIds(user);
  if (ids !== "all" && ids.length === 0) return [];

  const consorcioRows =
    ids === "all"
      ? await db
          .select({
            id: consorcios.id,
            name: consorcios.name,
            type: consorcios.type,
            address: consorcios.address,
          })
          .from(consorcios)
          .orderBy(asc(consorcios.name))
      : await db
          .select({
            id: consorcios.id,
            name: consorcios.name,
            type: consorcios.type,
            address: consorcios.address,
          })
          .from(consorcios)
          .where(inArray(consorcios.id, ids))
          .orderBy(asc(consorcios.name));

  if (consorcioRows.length === 0) return [];

  const consorcioIds = consorcioRows.map((c) => c.id);

  const [unitRows, vecinoRows] = await Promise.all([
    db
      .select({
        id: units.id,
        consorcioId: units.consorcioId,
        label: units.label,
        floor: units.floor,
      })
      .from(units)
      .where(inArray(units.consorcioId, consorcioIds))
      .orderBy(asc(units.floor), asc(units.label)),
    db
      .select({
        membershipId: memberships.id,
        unitId: memberships.unitId,
        userId: memberships.userId,
        userName: users.name,
        userEmail: users.email,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(inArray(memberships.consorcioId, consorcioIds)),
  ]);

  const vecinosByUnit = new Map<string, UnitVecino[]>();
  for (const v of vecinoRows) {
    if (!v.unitId) continue;
    if (v.role !== "owner" && v.role !== "tenant") continue;
    const arr = vecinosByUnit.get(v.unitId) ?? [];
    arr.push({
      membershipId: v.membershipId,
      userId: v.userId,
      userName: v.userName,
      userEmail: v.userEmail ?? "",
      role: v.role,
    });
    vecinosByUnit.set(v.unitId, arr);
  }

  const unitsByConsorcio = new Map<string, AdminUnitRow[]>();
  for (const u of unitRows) {
    const list = unitsByConsorcio.get(u.consorcioId) ?? [];
    list.push({
      id: u.id,
      label: u.label,
      floor: u.floor,
      vecinos: vecinosByUnit.get(u.id) ?? [],
    });
    unitsByConsorcio.set(u.consorcioId, list);
  }

  return consorcioRows.map((c) => ({
    ...c,
    units: unitsByConsorcio.get(c.id) ?? [],
  }));
}

