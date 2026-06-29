import "server-only";
import {
  and,
  desc,
  eq,
  inArray,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { expenses, units, type expenseStatusEnum, type expenseTypeEnum } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";

type UnitAccess = {
  ownerUnits: string[];
  tenantOnlyUnits: string[];
};

function getUnitAccess(
  user: CurrentUser,
  consorcioId?: string | null,
): UnitAccess {
  const owner = new Set<string>();
  const tenant = new Set<string>();
  for (const m of user.memberships) {
    if (!m.unitId) continue;
    if (consorcioId && m.consorcioId !== consorcioId) continue;
    if (m.role === "owner") owner.add(m.unitId);
    else if (m.role === "tenant") tenant.add(m.unitId);
  }
  for (const u of owner) tenant.delete(u);
  return {
    ownerUnits: Array.from(owner),
    tenantOnlyUnits: Array.from(tenant),
  };
}

function buildExpenseAccessCondition(
  user: CurrentUser,
  consorcioId?: string | null,
): SQL | null {
  const { ownerUnits, tenantOnlyUnits } = getUnitAccess(user, consorcioId);
  const parts: SQL[] = [];
  if (ownerUnits.length > 0) {
    parts.push(inArray(expenses.unitId, ownerUnits));
  }
  if (tenantOnlyUnits.length > 0) {
    parts.push(
      and(
        inArray(expenses.unitId, tenantOnlyUnits),
        eq(expenses.type, "ordinaria"),
      )!,
    );
  }
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  return or(...parts) as SQL;
}

export type DebtSummary =
  | { hasUnit: false }
  | { hasUnit: true; amountCents: number; count: number };

export async function getDebtForUser(
  user: CurrentUser,
  consorcioId?: string | null,
): Promise<DebtSummary> {
  const access = buildExpenseAccessCondition(user, consorcioId);
  if (!access) return { hasUnit: false };

  const rows = await db
    .select({ amountCents: expenses.amountCents })
    .from(expenses)
    .where(
      and(access, notInArray(expenses.status, ["pagado", "en_validacion"])),
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
  consorcioId?: string | null,
): Promise<ExpenseRow[]> {
  const access = buildExpenseAccessCondition(user, consorcioId);
  if (!access) return [];

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
    .where(access)
    .orderBy(desc(expenses.period))
    .limit(limit);
}

export async function getExpensesForUser(
  user: CurrentUser,
  options: { page: number; perPage: number; consorcioId?: string | null },
): Promise<PaginatedExpenses> {
  const { page, perPage, consorcioId } = options;
  const access = buildExpenseAccessCondition(user, consorcioId);

  if (!access) {
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
      .where(access)
      .orderBy(desc(expenses.period))
      .limit(perPage)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .innerJoin(units, eq(units.id, expenses.unitId))
      .where(access),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return { items, total, page, perPage, totalPages };
}
