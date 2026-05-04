import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  consorcios,
  expenses,
  units,
  type expenseStatusEnum,
  type expenseTypeEnum,
} from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";
import { getAccessibleConsorcioIds } from "./admin";

export type AdminExpenseRow = {
  id: string;
  unitId: string;
  unitLabel: string;
  unitFloor: string | null;
  consorcioId: string;
  consorcioName: string;
  period: string;
  dueDate: Date;
  amountCents: number;
  type: (typeof expenseTypeEnum.enumValues)[number];
  status: (typeof expenseStatusEnum.enumValues)[number];
  description: string | null;
};

export type PaginatedAdminExpenses = {
  items: AdminExpenseRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export async function getExpensesForAdmin(
  user: CurrentUser,
  options: {
    page: number;
    perPage: number;
    consorcioId?: string;
    period?: string;
  },
): Promise<PaginatedAdminExpenses> {
  const ids = getAccessibleConsorcioIds(user);
  const { page, perPage, consorcioId, period } = options;
  if (ids !== "all" && ids.length === 0) {
    return { items: [], total: 0, page, perPage, totalPages: 0 };
  }

  const conditions = [];
  if (ids !== "all") conditions.push(inArray(units.consorcioId, ids));
  if (consorcioId) conditions.push(eq(units.consorcioId, consorcioId));
  if (period) conditions.push(eq(expenses.period, period));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * perPage;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: expenses.id,
        unitId: expenses.unitId,
        unitLabel: units.label,
        unitFloor: units.floor,
        consorcioId: consorcios.id,
        consorcioName: consorcios.name,
        period: expenses.period,
        dueDate: expenses.dueDate,
        amountCents: expenses.amountCents,
        type: expenses.type,
        status: expenses.status,
        description: expenses.description,
      })
      .from(expenses)
      .innerJoin(units, eq(units.id, expenses.unitId))
      .innerJoin(consorcios, eq(consorcios.id, units.consorcioId))
      .where(where)
      .orderBy(desc(expenses.period), consorcios.name, units.label)
      .limit(perPage)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .innerJoin(units, eq(units.id, expenses.unitId))
      .where(where),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return { items, total, page, perPage, totalPages };
}

export type ExpensePeriodSummary = {
  period: string;
  total: number;
  totalAmountCents: number;
  paidCount: number;
  inValidationCount: number;
  pendingCount: number;
};

export type PaginatedExpensePeriods = {
  items: ExpensePeriodSummary[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export async function getExpensePeriodsForAdmin(
  user: CurrentUser,
  options: { page: number; perPage: number; consorcioId?: string },
): Promise<PaginatedExpensePeriods> {
  const ids = getAccessibleConsorcioIds(user);
  const { page, perPage, consorcioId } = options;
  if (ids !== "all" && ids.length === 0) {
    return { items: [], total: 0, page, perPage, totalPages: 0 };
  }

  const conditions = [];
  if (ids !== "all") conditions.push(inArray(units.consorcioId, ids));
  if (consorcioId) conditions.push(eq(units.consorcioId, consorcioId));
  const where = conditions.length === 0 ? undefined : and(...conditions);
  const offset = (page - 1) * perPage;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        period: expenses.period,
        total: sql<number>`count(*)::int`,
        totalAmountCents: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int`,
        paidCount: sql<number>`count(*) filter (where ${expenses.status} = 'pagado')::int`,
        inValidationCount: sql<number>`count(*) filter (where ${expenses.status} = 'en_validacion')::int`,
        pendingCount: sql<number>`count(*) filter (where ${expenses.status} in ('pendiente', 'rechazado'))::int`,
      })
      .from(expenses)
      .innerJoin(units, eq(units.id, expenses.unitId))
      .where(where)
      .groupBy(expenses.period)
      .orderBy(desc(expenses.period))
      .limit(perPage)
      .offset(offset),
    db
      .select({
        count: sql<number>`count(distinct ${expenses.period})::int`,
      })
      .from(expenses)
      .innerJoin(units, eq(units.id, expenses.unitId))
      .where(where),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return {
    items: items.map((i) => ({
      period: i.period,
      total: Number(i.total),
      totalAmountCents: Number(i.totalAmountCents),
      paidCount: Number(i.paidCount),
      inValidationCount: Number(i.inValidationCount),
      pendingCount: Number(i.pendingCount),
    })),
    total,
    page,
    perPage,
    totalPages,
  };
}

export async function getExpenseForAdmin(
  user: CurrentUser,
  id: string,
): Promise<AdminExpenseRow | null> {
  const ids = getAccessibleConsorcioIds(user);
  if (ids !== "all" && ids.length === 0) return null;

  const conditions = [eq(expenses.id, id)];
  if (ids !== "all") conditions.push(inArray(units.consorcioId, ids));

  const [row] = await db
    .select({
      id: expenses.id,
      unitId: expenses.unitId,
      unitLabel: units.label,
      unitFloor: units.floor,
      consorcioId: consorcios.id,
      consorcioName: consorcios.name,
      period: expenses.period,
      dueDate: expenses.dueDate,
      amountCents: expenses.amountCents,
      type: expenses.type,
      status: expenses.status,
      description: expenses.description,
    })
    .from(expenses)
    .innerJoin(units, eq(units.id, expenses.unitId))
    .innerJoin(consorcios, eq(consorcios.id, units.consorcioId))
    .where(and(...conditions))
    .limit(1);

  return row ?? null;
}
