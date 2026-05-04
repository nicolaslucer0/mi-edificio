import "server-only";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, units, type expenseStatusEnum, type expenseTypeEnum } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";

function getResidentUnitIds(user: CurrentUser): string[] {
  return user.memberships
    .filter(
      (m) =>
        (m.role === "owner" || m.role === "tenant") && m.unitId !== null,
    )
    .map((m) => m.unitId as string);
}

export type DebtSummary =
  | { hasUnit: false }
  | { hasUnit: true; amountCents: number; count: number };

export async function getDebtForUser(user: CurrentUser): Promise<DebtSummary> {
  const unitIds = getResidentUnitIds(user);
  if (unitIds.length === 0) {
    return { hasUnit: false };
  }

  const rows = await db
    .select({ amountCents: expenses.amountCents })
    .from(expenses)
    .where(
      and(
        inArray(expenses.unitId, unitIds),
        notInArray(expenses.status, ["pagado", "en_validacion"]),
      ),
    );

  const amountCents = rows.reduce((sum, r) => sum + r.amountCents, 0);
  return { hasUnit: true, amountCents, count: rows.length };
}

export type ExpenseRow = {
  id: string;
  unitId: string;
  unitLabel: string;
  period: string;
  dueDate: Date;
  amountCents: number;
  type: (typeof expenseTypeEnum.enumValues)[number];
  status: (typeof expenseStatusEnum.enumValues)[number];
  description: string | null;
};

export type PaginatedExpenses = {
  items: ExpenseRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export async function getRecentExpensesForUser(
  user: CurrentUser,
  limit: number,
): Promise<ExpenseRow[]> {
  const unitIds = user.memberships
    .filter(
      (m) => (m.role === "owner" || m.role === "tenant") && m.unitId !== null,
    )
    .map((m) => m.unitId as string);
  if (unitIds.length === 0) return [];

  return db
    .select({
      id: expenses.id,
      unitId: expenses.unitId,
      unitLabel: units.label,
      period: expenses.period,
      dueDate: expenses.dueDate,
      amountCents: expenses.amountCents,
      type: expenses.type,
      status: expenses.status,
      description: expenses.description,
    })
    .from(expenses)
    .innerJoin(units, eq(units.id, expenses.unitId))
    .where(inArray(expenses.unitId, unitIds))
    .orderBy(desc(expenses.period))
    .limit(limit);
}

export async function getExpensesForUser(
  user: CurrentUser,
  options: { page: number; perPage: number },
): Promise<PaginatedExpenses> {
  const unitIds = getResidentUnitIds(user);
  const { page, perPage } = options;

  if (unitIds.length === 0) {
    return { items: [], total: 0, page, perPage, totalPages: 0 };
  }

  const offset = (page - 1) * perPage;

  const [items, totalResult] = await Promise.all([
    db
      .select({
        id: expenses.id,
        unitId: expenses.unitId,
        unitLabel: units.label,
        period: expenses.period,
        dueDate: expenses.dueDate,
        amountCents: expenses.amountCents,
        type: expenses.type,
        status: expenses.status,
        description: expenses.description,
      })
      .from(expenses)
      .innerJoin(units, eq(units.id, expenses.unitId))
      .where(inArray(expenses.unitId, unitIds))
      .orderBy(desc(expenses.period))
      .limit(perPage)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(inArray(expenses.unitId, unitIds)),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return { items, total, page, perPage, totalPages };
}
