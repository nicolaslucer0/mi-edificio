import "server-only";
import { cache } from "react";
import {
  and,
  desc,
  eq,
  gte,
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
import { claimInformedCents, remainingCents } from "@/lib/payments";

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

/**
 * Qué expensas ve el usuario: todas las de las unidades de las que es
 * propietario, y solo las ordinarias de las que es inquilino (las
 * extraordinarias las paga el propietario).
 */
export function buildExpenseAccessCondition(
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
      /** Lo que avisó que pagó y el admin todavía no validó. */
      pendingCents: number;
    };

/**
 * Lo que el vecino avisó que pagó y el admin todavía no validó, por expensa.
 * Es la misma cuenta en todas las pantallas que dicen cuánto se debe: se
 * descuenta de la deuda (optimista) y, si el admin lo rechaza, vuelve.
 */
export async function getPendingClaimCents(
  rows: { id: string; amountCents: number }[],
): Promise<Map<string, number>> {
  const byExpense = new Map<string, number>();
  if (rows.length === 0) return byExpense;

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
  for (const p of pending) {
    const informed = claimInformedCents(p, amountById.get(p.expenseId) ?? 0);
    byExpense.set(p.expenseId, (byExpense.get(p.expenseId) ?? 0) + informed);
  }
  return byExpense;
}

/**
 * Cacheada por request: el home la consulta desde el saludo y desde el widget
 * de deuda, y así va una sola vez a la base.
 */
export const getDebtForUser = cache(async function getDebtForUser(
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
    return {
      hasUnit: true,
      amountCents: 0,
      count: 0,
      nextDueDate: null,
      pendingCents: 0,
    };
  }

  const pendingByExpense = await getPendingClaimCents(rows);

  let amountCents = 0;
  let count = 0;
  let nextDueDate: Date | null = null;
  let pendingCents = 0;
  for (const r of rows) {
    const remaining = remainingCents(r.amountCents, r.paidCents);
    const pending = Math.min(pendingByExpense.get(r.id) ?? 0, remaining);
    pendingCents += pending;
    const owed = remaining - pending;
    if (owed <= 0) continue;
    amountCents += owed;
    count += 1;
    if (!nextDueDate || r.dueDate < nextDueDate) nextDueDate = r.dueDate;
  }
  return { hasUnit: true, amountCents, count, nextDueDate, pendingCents };
});

/**
 * Cómo le fue al vecino en un mes:
 * - `pagado`: cubrió todo lo emitido.
 * - `avisado`: avisó que pagó lo que faltaba y el admin todavía no lo validó.
 * - `parcial`: pagó una parte.
 * - `debe`: venció y no pagó nada.
 * - `pendiente`: emitida pero todavía no vencida.
 * - `sin`: no se le emitió nada ese mes.
 */
export type MonthPaymentState =
  | "pagado"
  | "avisado"
  | "parcial"
  | "debe"
  | "pendiente"
  | "sin";

export type YearMonthSummary = {
  period: string;
  state: MonthPaymentState;
  billedCents: number;
  paidCents: number;
};

/**
 * Los últimos 12 meses del vecino, del más viejo al más nuevo. Un mes cuenta
 * como pagado cuando cubrió todo lo que se le emitió, sumando ordinarias y
 * extraordinarias.
 */
export async function getYearOverviewForUser(
  user: CurrentUser,
  consorcioId?: string | null,
): Promise<YearMonthSummary[]> {
  const access = buildExpenseAccessCondition(user, consorcioId);
  if (!access) return [];

  const now = new Date();
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const cutoff = `${firstMonth.getFullYear()}-${String(firstMonth.getMonth() + 1).padStart(2, "0")}`;

  const rows = await db
    .select({
      id: expenses.id,
      period: expenses.period,
      amountCents: expenses.amountCents,
      paidCents: expenses.paidCents,
      dueDate: expenses.dueDate,
    })
    .from(expenses)
    .where(and(access, gte(expenses.period, cutoff)));
  const pendingByExpense = await getPendingClaimCents(rows);

  type Bucket = {
    billed: number;
    paid: number;
    pending: number;
    allFuture: boolean;
  };
  const months = new Map<string, Bucket>();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.set(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      { billed: 0, paid: 0, pending: 0, allFuture: true },
    );
  }

  for (const row of rows) {
    const month = months.get(row.period);
    if (!month) continue;
    month.billed += row.amountCents;
    month.paid += Math.min(row.paidCents, row.amountCents);
    month.pending += Math.min(
      pendingByExpense.get(row.id) ?? 0,
      remainingCents(row.amountCents, row.paidCents),
    );
    if (row.dueDate.getTime() <= now.getTime()) month.allFuture = false;
  }

  return Array.from(months.entries()).map(([period, m]) => {
    const state = ((): MonthPaymentState => {
      if (m.billed === 0) return "sin";
      if (m.paid >= m.billed) return "pagado";
      // Lo que falta ya lo avisó: igual que el inicio, no se pinta de rojo.
      if (m.paid + m.pending >= m.billed) return "avisado";
      // Nada vencido todavía: no es deuda, está por vencer.
      if (m.allFuture) return "pendiente";
      return m.paid + m.pending > 0 ? "parcial" : "debe";
    })();
    return { period, state, billedCents: m.billed, paidCents: m.paid };
  });
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
