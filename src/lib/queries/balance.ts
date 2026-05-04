import "server-only";
import { and, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { consorcios, expenditures, expenses, units } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";
import { getViewableConsorcioIds } from "./expenditures";

export type MonthlyBalance = {
  period: string;
  collectedCents: number;
  spentCents: number;
  balanceCents: number;
};

export type OpeningBalanceSummary = {
  totalCents: number;
  earliestDate: Date | null;
};

export async function getOpeningBalanceForUser(
  user: CurrentUser,
): Promise<OpeningBalanceSummary> {
  const ids = getViewableConsorcioIds(user);
  if (ids !== "all" && ids.length === 0) {
    return { totalCents: 0, earliestDate: null };
  }

  const where = ids === "all" ? undefined : inArray(consorcios.id, ids);

  const [row] = await db
    .select({
      totalCents: sql<number>`coalesce(sum(${consorcios.openingBalanceCents}), 0)::int`,
      earliestDate: sql<Date | null>`min(${consorcios.openingBalanceDate})`,
    })
    .from(consorcios)
    .where(
      where
        ? and(where, isNotNull(consorcios.openingBalanceDate))
        : isNotNull(consorcios.openingBalanceDate),
    );

  return {
    totalCents: Number(row?.totalCents ?? 0),
    earliestDate: row?.earliestDate ?? null,
  };
}

export async function getMonthlyBalance(
  user: CurrentUser,
  monthsBack = 12,
): Promise<MonthlyBalance[]> {
  const ids = getViewableConsorcioIds(user);
  if (ids !== "all" && ids.length === 0) return [];

  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);

  const expenseConditions = [
    eq(expenses.status, "pagado" as const),
    gte(expenses.dueDate, cutoff),
  ];
  if (ids !== "all") {
    expenseConditions.push(inArray(units.consorcioId, ids));
  }

  const expenditureConditions = [gte(expenditures.date, cutoff)];
  if (ids !== "all") {
    expenditureConditions.push(inArray(expenditures.consorcioId, ids));
  }

  const [paidExpenses, spentRows] = await Promise.all([
    db
      .select({
        period: expenses.period,
        amountCents: expenses.amountCents,
      })
      .from(expenses)
      .innerJoin(units, eq(units.id, expenses.unitId))
      .where(and(...expenseConditions)),
    db
      .select({
        date: expenditures.date,
        amountCents: expenditures.amountCents,
      })
      .from(expenditures)
      .where(and(...expenditureConditions)),
  ]);

  const map = new Map<string, MonthlyBalance>();

  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(period, {
      period,
      collectedCents: 0,
      spentCents: 0,
      balanceCents: 0,
    });
  }

  for (const row of paidExpenses) {
    const entry = map.get(row.period);
    if (entry) entry.collectedCents += row.amountCents;
  }

  for (const row of spentRows) {
    const period = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, "0")}`;
    const entry = map.get(period);
    if (entry) entry.spentCents += row.amountCents;
  }

  for (const entry of map.values()) {
    entry.balanceCents = entry.collectedCents - entry.spentCents;
  }

  return Array.from(map.values()).sort((a, b) => b.period.localeCompare(a.period));
}
