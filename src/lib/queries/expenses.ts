import "server-only";
import {
  and,
  desc,
  eq,
  inArray,
  lte,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { currentPeriod } from "@/lib/format";
import {
  consorcios,
  creditDeposits,
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
    .select({
      id: expenses.id,
      amountCents: expenses.amountCents,
      paidCents: expenses.paidCents,
      dueDate: expenses.dueDate,
    })
    .from(expenses)
    .where(
      and(
        access,
        notInArray(expenses.status, ["pagado"]),
        // Las expensas de meses futuros todavía no son deuda.
        lte(expenses.period, currentPeriod()),
      ),
    );

  if (rows.length === 0) {
    return { hasUnit: true, amountCents: 0, count: 0, nextDueDate: null };
  }

  // Pagos pendientes de validación: se descuentan de la deuda mostrada
  // (comportamiento optimista). Si el admin los rechaza, la deuda reaparece.
  const pending = await db
    .select({
      expenseId: paymentClaims.expenseId,
      amountCents: paymentClaims.amountCents,
    })
    .from(paymentClaims)
    .where(
      and(
        inArray(
          paymentClaims.expenseId,
          rows.map((r) => r.id),
        ),
        eq(paymentClaims.resolution, "pending"),
      ),
    );
  const amountById = new Map(rows.map((r) => [r.id, r.amountCents]));
  const pendingByExpense = new Map<string, number>();
  for (const p of pending) {
    const informed = p.amountCents ?? amountById.get(p.expenseId) ?? 0;
    pendingByExpense.set(
      p.expenseId,
      (pendingByExpense.get(p.expenseId) ?? 0) + informed,
    );
  }

  let amountCents = 0;
  let count = 0;
  let nextDueDate: Date | null = null;
  for (const r of rows) {
    const owed = Math.max(
      0,
      r.amountCents - r.paidCents - (pendingByExpense.get(r.id) ?? 0),
    );
    if (owed <= 0) continue;
    amountCents += owed;
    count += 1;
    if (!nextDueDate || r.dueDate < nextDueDate) nextDueDate = r.dueDate;
  }
  return { hasUnit: true, amountCents, count, nextDueDate };
}

export type ExpenseRow = {
  id: string;
  unitId: string;
  unitLabel: string;
  period: string;
  dueDate: Date;
  amountCents: number;
  paidCents: number;
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
      paidCents: expenses.paidCents,
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
        paidCents: expenses.paidCents,
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
  claimId: string | null;
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
      id: paymentClaims.id,
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
    claimId: claim?.id ?? null,
    receiptUrl: claim?.receiptUrl ?? null,
  };
}

/**
 * Returns the receipt URL of a payment claim only if the current user is
 * authorized to view it: the claimant, a member (owner/tenant) of the
 * expense's unit, or an admin of the unit's consorcio. Returns null otherwise
 * (or if the claim has no receipt). Used by the authenticated receipt route.
 */
export async function getClaimReceiptUrl(
  user: CurrentUser,
  claimId: string,
): Promise<string | null> {
  const [row] = await db
    .select({
      receiptUrl: paymentClaims.receiptUrl,
      claimedByUserId: paymentClaims.claimedByUserId,
      unitId: expenses.unitId,
      consorcioId: units.consorcioId,
    })
    .from(paymentClaims)
    .innerJoin(expenses, eq(expenses.id, paymentClaims.expenseId))
    .innerJoin(units, eq(units.id, expenses.unitId))
    .where(eq(paymentClaims.id, claimId))
    .limit(1);

  if (!row?.receiptUrl) return null;

  if (user.isSuperAdmin || row.claimedByUserId === user.id) {
    return row.receiptUrl;
  }

  const memberUnitIds = new Set(
    user.memberships.filter((m) => m.unitId).map((m) => m.unitId),
  );
  const adminConsorcioIds = new Set(
    user.memberships
      .filter((m) => m.role === "admin" && m.consorcioId)
      .map((m) => m.consorcioId),
  );

  const canView =
    memberUnitIds.has(row.unitId) || adminConsorcioIds.has(row.consorcioId);
  return canView ? row.receiptUrl : null;
}

export type UnitCredit = {
  unitId: string;
  unitLabel: string;
  creditCents: number;
};

/** Saldo a favor de las unidades del usuario (en el consorcio si se pasa). */
export async function getCreditForUser(
  user: CurrentUser,
  consorcioId?: string | null,
): Promise<UnitCredit[]> {
  const { ownerUnits, tenantOnlyUnits } = getUnitAccess(user, consorcioId);
  const unitIds = Array.from(new Set([...ownerUnits, ...tenantOnlyUnits]));
  if (unitIds.length === 0) return [];
  return db
    .select({
      unitId: units.id,
      unitLabel: units.label,
      creditCents: units.creditCents,
    })
    .from(units)
    .where(inArray(units.id, unitIds));
}

/**
 * Receipt URL de un adelanto de saldo, solo si el usuario puede verlo: quien lo
 * pidió, un miembro de la unidad, o un admin del consorcio. Igual que
 * getClaimReceiptUrl, para la ruta autenticada de comprobantes.
 */
export async function getDepositReceiptUrl(
  user: CurrentUser,
  depositId: string,
): Promise<string | null> {
  const [row] = await db
    .select({
      receiptUrl: creditDeposits.receiptUrl,
      requestedByUserId: creditDeposits.requestedByUserId,
      unitId: creditDeposits.unitId,
      consorcioId: units.consorcioId,
    })
    .from(creditDeposits)
    .innerJoin(units, eq(units.id, creditDeposits.unitId))
    .where(eq(creditDeposits.id, depositId))
    .limit(1);

  if (!row?.receiptUrl) return null;

  if (user.isSuperAdmin || row.requestedByUserId === user.id) {
    return row.receiptUrl;
  }

  const memberUnitIds = new Set(
    user.memberships.filter((m) => m.unitId).map((m) => m.unitId),
  );
  const adminConsorcioIds = new Set(
    user.memberships
      .filter((m) => m.role === "admin" && m.consorcioId)
      .map((m) => m.consorcioId),
  );
  const canView =
    memberUnitIds.has(row.unitId) || adminConsorcioIds.has(row.consorcioId);
  return canView ? row.receiptUrl : null;
}
