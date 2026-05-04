import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  consorcios,
  expenses,
  paymentClaims,
  units,
  users,
} from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";

export type AccessibleConsorcios = "all" | string[];

export function getAccessibleConsorcioIds(
  user: CurrentUser,
): AccessibleConsorcios {
  if (user.isSuperAdmin) return "all";
  return user.memberships
    .filter((m) => m.role === "admin" && m.consorcioId)
    .map((m) => m.consorcioId as string);
}

export async function getPendingClaimsForAdmin(user: CurrentUser) {
  const ids = getAccessibleConsorcioIds(user);
  if (ids !== "all" && ids.length === 0) return [];

  const conditions = [eq(paymentClaims.resolution, "pending")];
  if (ids !== "all") {
    conditions.push(inArray(units.consorcioId, ids));
  }

  return db
    .select({
      claimId: paymentClaims.id,
      claimedAt: paymentClaims.claimedAt,
      note: paymentClaims.note,
      expenseId: expenses.id,
      period: expenses.period,
      amountCents: expenses.amountCents,
      unitLabel: units.label,
      consorcioId: consorcios.id,
      consorcioName: consorcios.name,
      claimedByName: users.name,
      claimedByEmail: users.email,
    })
    .from(paymentClaims)
    .innerJoin(expenses, eq(expenses.id, paymentClaims.expenseId))
    .innerJoin(units, eq(units.id, expenses.unitId))
    .innerJoin(consorcios, eq(consorcios.id, units.consorcioId))
    .innerJoin(users, eq(users.id, paymentClaims.claimedByUserId))
    .where(and(...conditions))
    .orderBy(desc(paymentClaims.claimedAt));
}

export type AdminConsorcio = {
  id: string;
  name: string;
  type: "edificio" | "ph" | "barrio_cerrado";
  address: string | null;
  paymentAlias: string | null;
  paymentCbu: string | null;
  paymentHolderName: string | null;
};

export async function getConsorciosForAdmin(
  user: CurrentUser,
): Promise<AdminConsorcio[]> {
  const ids = getAccessibleConsorcioIds(user);
  if (ids !== "all" && ids.length === 0) return [];

  const baseSelect = {
    id: consorcios.id,
    name: consorcios.name,
    type: consorcios.type,
    address: consorcios.address,
    paymentAlias: consorcios.paymentAlias,
    paymentCbu: consorcios.paymentCbu,
    paymentHolderName: consorcios.paymentHolderName,
  };

  if (ids === "all") {
    return db.select(baseSelect).from(consorcios).orderBy(consorcios.name);
  }
  return db
    .select(baseSelect)
    .from(consorcios)
    .where(inArray(consorcios.id, ids))
    .orderBy(consorcios.name);
}

export type AdminUnit = {
  id: string;
  label: string;
  consorcioId: string;
  consorcioName: string;
};

export async function getUnitsForAdmin(
  user: CurrentUser,
): Promise<AdminUnit[]> {
  const ids = getAccessibleConsorcioIds(user);
  if (ids !== "all" && ids.length === 0) return [];

  const baseQuery = db
    .select({
      id: units.id,
      label: units.label,
      consorcioId: consorcios.id,
      consorcioName: consorcios.name,
    })
    .from(units)
    .innerJoin(consorcios, eq(consorcios.id, units.consorcioId))
    .orderBy(consorcios.name, units.label);

  if (ids === "all") return baseQuery;
  return baseQuery.where(inArray(units.consorcioId, ids));
}
