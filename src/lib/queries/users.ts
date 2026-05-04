import "server-only";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { consorcios, memberships, units, users } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";
import { getAccessibleConsorcioIds } from "./admin";

type Role = "super_admin" | "admin" | "owner" | "tenant";

export type UserMembershipRow = {
  membershipId: string;
  role: Role;
  consorcioId: string | null;
  consorcioName: string | null;
  unitId: string | null;
  unitLabel: string | null;
};

export type UserWithMemberships = {
  id: string;
  email: string;
  name: string | null;
  memberships: UserMembershipRow[];
};

export async function getUsersForAdmin(
  user: CurrentUser,
): Promise<UserWithMemberships[]> {
  const ids = getAccessibleConsorcioIds(user);
  if (ids !== "all" && ids.length === 0) return [];

  const scopedUserIdsRows =
    ids === "all"
      ? await db
          .select({ id: users.id })
          .from(users)
          .where(isNotNull(users.email))
      : await db
          .selectDistinct({ id: memberships.userId })
          .from(memberships)
          .where(inArray(memberships.consorcioId, ids));

  const scopedUserIds = scopedUserIdsRows.map((r) => r.id);
  if (scopedUserIds.length === 0) return [];

  const userRows = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(inArray(users.id, scopedUserIds))
    .orderBy(asc(users.email));

  const membershipWhere =
    ids === "all"
      ? inArray(memberships.userId, scopedUserIds)
      : and(
          inArray(memberships.userId, scopedUserIds),
          inArray(memberships.consorcioId, ids),
        );

  const membershipRows = await db
    .select({
      membershipId: memberships.id,
      userId: memberships.userId,
      role: memberships.role,
      consorcioId: memberships.consorcioId,
      consorcioName: consorcios.name,
      unitId: memberships.unitId,
      unitLabel: units.label,
    })
    .from(memberships)
    .leftJoin(consorcios, eq(consorcios.id, memberships.consorcioId))
    .leftJoin(units, eq(units.id, memberships.unitId))
    .where(membershipWhere);

  const byUser = new Map<string, UserMembershipRow[]>();
  for (const row of membershipRows) {
    const list = byUser.get(row.userId) ?? [];
    list.push({
      membershipId: row.membershipId,
      role: row.role,
      consorcioId: row.consorcioId,
      consorcioName: row.consorcioName,
      unitId: row.unitId,
      unitLabel: row.unitLabel,
    });
    byUser.set(row.userId, list);
  }

  return userRows
    .filter((u) => u.email)
    .map((u) => ({
      id: u.id,
      email: u.email as string,
      name: u.name,
      memberships: byUser.get(u.id) ?? [],
    }));
}
