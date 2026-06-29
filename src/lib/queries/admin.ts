import "server-only";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  consorcios,
  expenditures,
  expenses,
  memberships,
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

export async function getPendingClaimsForAdmin(
  user: CurrentUser,
  options: { consorcioId?: string } = {},
) {
  const ids = getAccessibleConsorcioIds(user);
  if (ids !== "all" && ids.length === 0) return [];
  const { consorcioId } = options;
  if (consorcioId && ids !== "all" && !ids.includes(consorcioId)) return [];

  const conditions = [eq(paymentClaims.resolution, "pending")];
  if (consorcioId) {
    conditions.push(eq(units.consorcioId, consorcioId));
  } else if (ids !== "all") {
    conditions.push(inArray(units.consorcioId, ids));
  }

  return db
    .select({
      claimId: paymentClaims.id,
      claimedAt: paymentClaims.claimedAt,
      note: paymentClaims.note,
      receiptUrl: paymentClaims.receiptUrl,
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
  openingBalanceCents: number;
  openingBalanceDate: Date | null;
};

export async function getConsorcioForAdmin(
  user: CurrentUser,
  consorcioId: string,
): Promise<AdminConsorcio | null> {
  const ids = getAccessibleConsorcioIds(user);
  if (ids !== "all" && !ids.includes(consorcioId)) return null;

  const [row] = await db
    .select({
      id: consorcios.id,
      name: consorcios.name,
      type: consorcios.type,
      address: consorcios.address,
      paymentAlias: consorcios.paymentAlias,
      paymentCbu: consorcios.paymentCbu,
      paymentHolderName: consorcios.paymentHolderName,
      openingBalanceCents: consorcios.openingBalanceCents,
      openingBalanceDate: consorcios.openingBalanceDate,
    })
    .from(consorcios)
    .where(eq(consorcios.id, consorcioId))
    .limit(1);

  return row ?? null;
}

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
    openingBalanceCents: consorcios.openingBalanceCents,
    openingBalanceDate: consorcios.openingBalanceDate,
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

export type ConsorcioDashboardStats = {
  totalBalanceCents: number;
  openingBalanceCents: number;
  openingBalanceDate: Date | null;
  pendingThisMonthCents: number;
  pendingThisMonthCount: number;
  claimsPendingCount: number;
  unitCount: number;
  vecinoCount: number;
};

function currentMonthRange(): { start: Date; end: Date; period: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return { start, end, period };
}

export async function getConsorcioDashboardStats(
  user: CurrentUser,
  consorcioId: string,
): Promise<ConsorcioDashboardStats | null> {
  const consorcio = await getConsorcioForAdmin(user, consorcioId);
  if (!consorcio) return null;

  const { period } = currentMonthRange();

  const [
    paidSum,
    spentSum,
    pendingMonth,
    claimsCount,
    unitCount,
    vecinoCount,
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int`,
      })
      .from(expenses)
      .innerJoin(units, eq(units.id, expenses.unitId))
      .where(
        and(
          eq(units.consorcioId, consorcioId),
          eq(expenses.status, "pagado"),
        ),
      ),
    db
      .select({
        total: sql<number>`coalesce(sum(${expenditures.amountCents}), 0)::int`,
      })
      .from(expenditures)
      .where(eq(expenditures.consorcioId, consorcioId)),
    db
      .select({
        total: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(expenses)
      .innerJoin(units, eq(units.id, expenses.unitId))
      .where(
        and(
          eq(units.consorcioId, consorcioId),
          eq(expenses.period, period),
          notInArray(expenses.status, ["pagado"]),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(paymentClaims)
      .innerJoin(expenses, eq(expenses.id, paymentClaims.expenseId))
      .innerJoin(units, eq(units.id, expenses.unitId))
      .where(
        and(
          eq(units.consorcioId, consorcioId),
          eq(paymentClaims.resolution, "pending"),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(units)
      .where(eq(units.consorcioId, consorcioId)),
    db
      .select({
        count: sql<number>`count(distinct ${memberships.userId})::int`,
      })
      .from(memberships)
      .where(eq(memberships.consorcioId, consorcioId)),
  ]);

  const totalBalance =
    consorcio.openingBalanceCents +
    Number(paidSum[0]?.total ?? 0) -
    Number(spentSum[0]?.total ?? 0);

  return {
    totalBalanceCents: totalBalance,
    openingBalanceCents: consorcio.openingBalanceCents,
    openingBalanceDate: consorcio.openingBalanceDate,
    pendingThisMonthCents: Number(pendingMonth[0]?.total ?? 0),
    pendingThisMonthCount: Number(pendingMonth[0]?.count ?? 0),
    claimsPendingCount: Number(claimsCount[0]?.count ?? 0),
    unitCount: Number(unitCount[0]?.count ?? 0),
    vecinoCount: Number(vecinoCount[0]?.count ?? 0),
  };
}

export type AdminUnit = {
  id: string;
  label: string;
  floor: string | null;
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
      floor: units.floor,
      consorcioId: consorcios.id,
      consorcioName: consorcios.name,
    })
    .from(units)
    .innerJoin(consorcios, eq(consorcios.id, units.consorcioId))
    .orderBy(consorcios.name, units.floor, units.label);

  if (ids === "all") return baseQuery;
  return baseQuery.where(inArray(units.consorcioId, ids));
}
