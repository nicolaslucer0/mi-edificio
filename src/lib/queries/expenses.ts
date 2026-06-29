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
import {
  consorcios,
  expenses,
  paymentClaims,
  units,
  type expenseStatusEnum,
  type expenseTypeEnum,
} from "@/lib/db/schema";
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
  | {
      hasUnit: true;
      amountCents: number;
      count: number;
      nextDueDate: Date | null;
    };

export async function getDebtForUser(
  user: CurrentUser,
  consorcioId?: string | null,
): Promise<DebtSummary> {
  const access = buildExpenseAccessCondition(user, consorcioId);
  if (!access) return { hasUnit: false };

  const rows = await db
    .select({ amountCents: expenses.amountCents, dueDate: expenses.dueDate })
    .from(expenses)
    .where(
      and(access, notInArray(expenses.status, ["pagado", "en_validacion"])),
    );

  const amountCents = rows.reduce((sum, r) => sum + r.amountCents, 0);
  const nextDueDate = rows.reduce<Date | null>(
    (min, r) => (!min || r.dueDate < min ? r.dueDate : min),
    null,
  );
  return { hasUnit: true, amountCents, count: rows.length, nextDueDate };
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

export type ReceiptData = {
  expenseId: string;
  consorcioName: string;
  holderName: string | null;
  unitLabel: string;
  period: string;
  amountCents: number;
  type: (typeof expenseTypeEnum.enumValues)[number];
  description: string | null;
  paidAt: Date | null;
  receiptUrl: string | null;
};

/**
 * Data for a payment receipt: only for a `pagado` expense that belongs to a
 * unit the current user is assigned to. Returns null otherwise.
 */
export async function getReceiptData(
  user: CurrentUser,
  expenseId: string,
): Promise<ReceiptData | null> {
  const unitIds = Array.from(
    new Set(
      user.memberships
        .filter((m) => m.unitId !== null)
        .map((m) => m.unitId as string),
    ),
  );
  if (unitIds.length === 0) return null;

  const [row] = await db
    .select({
      expenseId: expenses.id,
      consorcioName: consorcios.name,
      holderName: consorcios.paymentHolderName,
      unitLabel: units.label,
      period: expenses.period,
      amountCents: expenses.amountCents,
      type: expenses.type,
      description: expenses.description,
    })
    .from(expenses)
    .innerJoin(units, eq(units.id, expenses.unitId))
    .innerJoin(consorcios, eq(consorcios.id, units.consorcioId))
    .where(
      and(
        eq(expenses.id, expenseId),
        inArray(expenses.unitId, unitIds),
        eq(expenses.status, "pagado"),
      ),
    )
    .limit(1);
  if (!row) return null;

  const [claim] = await db
    .select({
      resolvedAt: paymentClaims.resolvedAt,
      receiptUrl: paymentClaims.receiptUrl,
    })
    .from(paymentClaims)
    .where(
      and(
        eq(paymentClaims.expenseId, expenseId),
        eq(paymentClaims.resolution, "approved"),
      ),
    )
    .orderBy(desc(paymentClaims.resolvedAt))
    .limit(1);

  return {
    ...row,
    paidAt: claim?.resolvedAt ?? null,
    receiptUrl: claim?.receiptUrl ?? null,
  };
}
