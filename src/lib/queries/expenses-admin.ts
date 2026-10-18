import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  consorcios,
  expenses,
  memberships,
  paymentClaims,
  units,
  users,
  type expenseStatusEnum,
  type expenseTypeEnum,
} from "@/lib/db/schema";
import { claimValidatedCents } from "@/lib/payments";
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
  paidCents: number;
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
        paidCents: expenses.paidCents,
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
      paidCents: expenses.paidCents,
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

export type AdminPaymentRow = {
  id: string;
  expenseId: string;
  amountCents: number;
  resolvedAt: Date | null;
  registeredByAdmin: boolean;
  paidByName: string | null;
};

/**
 * Pagos confirmados de esas expensas, para poder anular uno. Los ids vienen de
 * una query ya scopeada a los consorcios del admin.
 */
export async function getApprovedPaymentsForExpenses(
  expenseIds: string[],
): Promise<AdminPaymentRow[]> {
  if (expenseIds.length === 0) return [];

  const rows = await db
    .select({
      id: paymentClaims.id,
      expenseId: paymentClaims.expenseId,
      amountCents: paymentClaims.amountCents,
      confirmedAmountCents: paymentClaims.confirmedAmountCents,
      expenseAmountCents: expenses.amountCents,
      resolvedAt: paymentClaims.resolvedAt,
      claimedByUserId: paymentClaims.claimedByUserId,
      resolvedByUserId: paymentClaims.resolvedByUserId,
      name: users.name,
      email: users.email,
    })
    .from(paymentClaims)
    .innerJoin(expenses, eq(expenses.id, paymentClaims.expenseId))
    .innerJoin(users, eq(users.id, paymentClaims.claimedByUserId))
    .where(
      and(
        inArray(paymentClaims.expenseId, expenseIds),
        eq(paymentClaims.resolution, "approved"),
      ),
    )
    .orderBy(paymentClaims.resolvedAt);

  return rows
    .map((r) => ({
      id: r.id,
      expenseId: r.expenseId,
      amountCents: claimValidatedCents(r, r.expenseAmountCents),
      resolvedAt: r.resolvedAt,
      // Lo pidió y lo aprobó la misma persona: lo registró el admin.
      registeredByAdmin: r.claimedByUserId === r.resolvedByUserId,
      paidByName: r.name ?? r.email,
    }))
    .filter((p) => p.amountCents > 0);
}

/**
 * Quién vive en cada unidad ("Silvia, Paula Ponce (inquilino)"). Con dos
 * edificios numerados igual, el nombre es lo que evita registrar o anular un
 * pago en la unidad equivocada.
 */
export async function getUnitPeople(
  unitIds: string[],
): Promise<Map<string, string>> {
  const byUnit = new Map<string, string>();
  if (unitIds.length === 0) return byUnit;

  const rows = await db
    .select({
      unitId: memberships.unitId,
      role: memberships.role,
      name: users.name,
      email: users.email,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        inArray(memberships.unitId, unitIds),
        inArray(memberships.role, ["owner", "tenant"]),
      ),
    )
    .orderBy(memberships.role, users.name);

  const people = new Map<string, { owners: string[]; tenants: string[] }>();
  for (const r of rows) {
    const person = r.name ?? r.email;
    if (!r.unitId || !person) continue;
    const entry = people.get(r.unitId) ?? { owners: [], tenants: [] };
    const list = r.role === "tenant" ? entry.tenants : entry.owners;
    // Una persona puede tener más de una membresía sobre la misma unidad.
    if (!list.includes(person)) list.push(person);
    people.set(r.unitId, entry);
  }
  for (const [unitId, { owners, tenants }] of people) {
    byUnit.set(
      unitId,
      [...owners, ...tenants.map((t) => `${t} (inquilino)`)].join(", "),
    );
  }
  return byUnit;
}
