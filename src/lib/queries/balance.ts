import "server-only";
import { and, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { consorcios, expenditures, expenses, units } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";
import type { ExpenditureCategory } from "@/lib/format";
import { getViewableConsorcioIds } from "./expenditures";

/**
 * Narrow the viewable consorcios down to a single one when the user has it in
 * scope. Never widens access: if `consorcioId` is not viewable, the original
 * guard is kept.
 */
function narrowToConsorcio(
  ids: "all" | string[],
  consorcioId?: string | null,
): "all" | string[] {
  if (!consorcioId) return ids;
  if (ids === "all" || ids.includes(consorcioId)) return [consorcioId];
  return ids;
}

function periodOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Lo cobrado de una expensa nunca supera lo facturado: el excedente de un
 * sobrepago va al saldo a favor de la unidad, no a la cobranza del período.
 */
const COLLECTED_SQL = sql<number>`coalesce(sum(least(${expenses.paidCents}, ${expenses.amountCents})), 0)::int`;

export type ConsorcioCash = {
  openingCents: number;
  openingDate: Date | null;
  /** Todo lo cobrado de expensas, desde siempre. */
  collectedCents: number;
  spentCents: number;
  /** Saldo inicial + cobrado − gastado. */
  balanceCents: number;
};

export async function getConsorcioCash(
  user: CurrentUser,
  consorcioId?: string | null,
): Promise<ConsorcioCash> {
  const ids = narrowToConsorcio(getViewableConsorcioIds(user), consorcioId);
  if (ids !== "all" && ids.length === 0) {
    return {
      openingCents: 0,
      openingDate: null,
      collectedCents: 0,
      spentCents: 0,
      balanceCents: 0,
    };
  }

  const hasOpeningDate = isNotNull(consorcios.openingBalanceDate);
  const [openingRows, collectedRows, spentRows] = await Promise.all([
    db
      .select({
        totalCents: sql<number>`coalesce(sum(${consorcios.openingBalanceCents}), 0)::int`,
        earliestDate: sql<Date | null>`min(${consorcios.openingBalanceDate})`,
      })
      .from(consorcios)
      .where(
        ids === "all"
          ? hasOpeningDate
          : and(inArray(consorcios.id, ids), hasOpeningDate),
      ),
    db
      .select({ total: COLLECTED_SQL })
      .from(expenses)
      .innerJoin(units, eq(units.id, expenses.unitId))
      .where(ids === "all" ? undefined : inArray(units.consorcioId, ids)),
    db
      .select({
        total: sql<number>`coalesce(sum(${expenditures.amountCents}), 0)::int`,
      })
      .from(expenditures)
      .where(
        ids === "all" ? undefined : inArray(expenditures.consorcioId, ids),
      ),
  ]);

  const openingCents = Number(openingRows[0]?.totalCents ?? 0);
  const collectedCents = Number(collectedRows[0]?.total ?? 0);
  const spentCents = Number(spentRows[0]?.total ?? 0);

  return {
    openingCents,
    openingDate: openingRows[0]?.earliestDate ?? null,
    collectedCents,
    spentCents,
    balanceCents: openingCents + collectedCents - spentCents,
  };
}

export type MonthlyFinancials = {
  period: string;
  /** Lo que se emitió en expensas para ese período. */
  billedCents: number;
  /** De eso, lo cobrado y validado. */
  collectedCents: number;
  pendingCents: number;
  collectedPct: number;
  /** Unidades con expensa emitida en el período. */
  unitsTotal: number;
  /** Las que la cubrieron entera. */
  unitsPaid: number;
  spentCents: number;
  /** Cobrado − gastado. */
  netCents: number;
};

/**
 * El mes a mes del consorcio, del más reciente al más viejo.
 *
 * Las expensas se cuentan por **período** (la cobranza de agosto es lo cobrado
 * de las expensas de agosto, se haya pagado cuando se haya pagado) y los gastos
 * por **fecha**. Es la lectura que espera un vecino: "de las expensas de agosto
 * se cobró el 80%".
 */
export async function getMonthlyFinancials(
  user: CurrentUser,
  monthsBack = 12,
  consorcioId?: string | null,
): Promise<MonthlyFinancials[]> {
  const ids = narrowToConsorcio(getViewableConsorcioIds(user), consorcioId);
  if (ids !== "all" && ids.length === 0) return [];

  const now = new Date();
  const firstMonth = new Date(
    now.getFullYear(),
    now.getMonth() - monthsBack + 1,
    1,
  );

  const expenseConditions = [gte(expenses.period, periodOf(firstMonth))];
  if (ids !== "all") {
    expenseConditions.push(inArray(units.consorcioId, ids));
  }
  const expenditureConditions = [gte(expenditures.date, firstMonth)];
  if (ids !== "all") {
    expenditureConditions.push(inArray(expenditures.consorcioId, ids));
  }

  const [expenseRows, spentRows] = await Promise.all([
    db
      .select({
        period: expenses.period,
        unitId: expenses.unitId,
        amountCents: expenses.amountCents,
        paidCents: expenses.paidCents,
      })
      .from(expenses)
      .innerJoin(units, eq(units.id, expenses.unitId))
      .where(and(...expenseConditions)),
    db
      .select({ date: expenditures.date, amountCents: expenditures.amountCents })
      .from(expenditures)
      .where(and(...expenditureConditions)),
  ]);

  const periods: string[] = [];
  for (let i = 0; i < monthsBack; i += 1) {
    periods.push(periodOf(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }

  return aggregateMonths(periods, expenseRows, spentRows).sort((a, b) =>
    b.period.localeCompare(a.period),
  );
}

/** Un mes puntual, para las pantallas que navegan mes a mes. */
export async function getMonthFinancials(
  user: CurrentUser,
  period: string,
  consorcioId?: string | null,
): Promise<MonthlyFinancials | null> {
  const ids = narrowToConsorcio(getViewableConsorcioIds(user), consorcioId);
  if (ids !== "all" && ids.length === 0) return null;

  const { start, end } = monthBounds(period);

  const expenseConditions = [eq(expenses.period, period)];
  if (ids !== "all") {
    expenseConditions.push(inArray(units.consorcioId, ids));
  }
  const expenditureConditions = [
    gte(expenditures.date, start),
    lt(expenditures.date, end),
  ];
  if (ids !== "all") {
    expenditureConditions.push(inArray(expenditures.consorcioId, ids));
  }

  const [expenseRows, spentRows] = await Promise.all([
    db
      .select({
        period: expenses.period,
        unitId: expenses.unitId,
        amountCents: expenses.amountCents,
        paidCents: expenses.paidCents,
      })
      .from(expenses)
      .innerJoin(units, eq(units.id, expenses.unitId))
      .where(and(...expenseConditions)),
    db
      .select({ date: expenditures.date, amountCents: expenditures.amountCents })
      .from(expenditures)
      .where(and(...expenditureConditions)),
  ]);

  return aggregateMonths([period], expenseRows, spentRows)[0] ?? null;
}

function monthBounds(period: string): { start: Date; end: Date } {
  const [year, month] = period.split("-").map(Number);
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

type ExpenseInput = {
  period: string;
  unitId: string;
  amountCents: number;
  paidCents: number;
};

function aggregateMonths(
  periods: string[],
  expenseRows: ExpenseInput[],
  spentRows: Array<{ date: Date; amountCents: number }>,
): MonthlyFinancials[] {
  type Bucket = MonthlyFinancials & {
    /** Facturado y cobrado por unidad, para saber cuántas cubrieron el mes. */
    byUnit: Map<string, { billed: number; collected: number }>;
  };
  const months = new Map<string, Bucket>();
  for (const period of periods) {
    months.set(period, {
      period,
      billedCents: 0,
      collectedCents: 0,
      pendingCents: 0,
      collectedPct: 0,
      unitsTotal: 0,
      unitsPaid: 0,
      spentCents: 0,
      netCents: 0,
      byUnit: new Map(),
    });
  }

  for (const row of expenseRows) {
    const month = months.get(row.period);
    if (!month) continue;
    const collected = Math.min(row.paidCents, row.amountCents);
    month.billedCents += row.amountCents;
    month.collectedCents += collected;

    const unit = month.byUnit.get(row.unitId) ?? { billed: 0, collected: 0 };
    unit.billed += row.amountCents;
    unit.collected += collected;
    month.byUnit.set(row.unitId, unit);
  }

  for (const row of spentRows) {
    const month = months.get(periodOf(row.date));
    if (month) month.spentCents += row.amountCents;
  }

  return Array.from(months.values()).map((month) => {
    const { byUnit, ...rest } = month;
    let unitsPaid = 0;
    for (const unit of byUnit.values()) {
      if (unit.collected >= unit.billed) unitsPaid += 1;
    }
    return {
      ...rest,
      pendingCents: Math.max(0, month.billedCents - month.collectedCents),
      collectedPct:
        month.billedCents > 0
          ? Math.round((month.collectedCents / month.billedCents) * 100)
          : 0,
      unitsTotal: byUnit.size,
      unitsPaid,
      netCents: month.collectedCents - month.spentCents,
    };
  });
}

export type MonthExpenditureBreakdown = {
  totalCents: number;
  /** Categorías del mes, de mayor a menor. */
  byCategory: Array<{ category: ExpenditureCategory; amountCents: number }>;
};

/** En qué se fue la plata del mes, por categoría. */
export async function getMonthExpenditureBreakdown(
  user: CurrentUser,
  period: string,
  consorcioId?: string | null,
): Promise<MonthExpenditureBreakdown> {
  const ids = narrowToConsorcio(getViewableConsorcioIds(user), consorcioId);
  if (ids !== "all" && ids.length === 0) {
    return { totalCents: 0, byCategory: [] };
  }

  const { start, end } = monthBounds(period);
  const conditions = [
    gte(expenditures.date, start),
    lt(expenditures.date, end),
  ];
  if (ids !== "all") {
    conditions.push(inArray(expenditures.consorcioId, ids));
  }

  const rows = await db
    .select({
      category: expenditures.category,
      total: sql<number>`coalesce(sum(${expenditures.amountCents}), 0)::int`,
    })
    .from(expenditures)
    .where(and(...conditions))
    .groupBy(expenditures.category);

  const byCategory = rows
    .map((r) => ({ category: r.category, amountCents: Number(r.total) }))
    .sort((a, b) => b.amountCents - a.amountCents);

  return {
    totalCents: byCategory.reduce((sum, c) => sum + c.amountCents, 0),
    byCategory,
  };
}
