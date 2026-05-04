import "server-only";
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { consorcios, expenditures, users } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/session";
import {
  EXPENDITURE_CATEGORIES,
  type ExpenditureCategory,
} from "@/lib/format";

export function getViewableConsorcioIds(
  user: CurrentUser,
): "all" | string[] {
  if (user.isSuperAdmin) return "all";
  return Array.from(
    new Set(
      user.memberships
        .filter((m) => m.consorcioId !== null)
        .map((m) => m.consorcioId as string),
    ),
  );
}

export function isValidCategory(value: string): value is ExpenditureCategory {
  return (EXPENDITURE_CATEGORIES as string[]).includes(value);
}

export function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function monthBounds(month: string): { start: Date; end: Date } {
  const [year, m] = month.split("-").map(Number);
  const start = new Date(year, m - 1, 1);
  const end = new Date(year, m, 1);
  return { start, end };
}

export type ExpenditureRow = {
  id: string;
  consorcioId: string;
  consorcioName: string;
  date: Date;
  description: string;
  amountCents: number;
  category: ExpenditureCategory;
  vendor: string | null;
  receiptUrl: string | null;
  notes: string | null;
  createdByName: string | null;
};

export type ExpendituresFilters = {
  category?: ExpenditureCategory;
  month?: string;
};

export type PaginatedExpenditures = {
  items: ExpenditureRow[];
  total: number;
  totalCents: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export async function getExpendituresForUser(
  user: CurrentUser,
  options: { page: number; perPage: number; filters?: ExpendituresFilters },
): Promise<PaginatedExpenditures> {
  const ids = getViewableConsorcioIds(user);
  const { page, perPage, filters = {} } = options;

  if (ids !== "all" && ids.length === 0) {
    return {
      items: [],
      total: 0,
      totalCents: 0,
      page,
      perPage,
      totalPages: 0,
    };
  }

  const conditions = [];
  if (ids !== "all") {
    conditions.push(inArray(expenditures.consorcioId, ids));
  }
  if (filters.category) {
    conditions.push(eq(expenditures.category, filters.category));
  }
  if (filters.month) {
    const { start, end } = monthBounds(filters.month);
    conditions.push(gte(expenditures.date, start), lt(expenditures.date, end));
  }

  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * perPage;

  const [items, totalsRow] = await Promise.all([
    db
      .select({
        id: expenditures.id,
        consorcioId: consorcios.id,
        consorcioName: consorcios.name,
        date: expenditures.date,
        description: expenditures.description,
        amountCents: expenditures.amountCents,
        category: expenditures.category,
        vendor: expenditures.vendor,
        receiptUrl: expenditures.receiptUrl,
        notes: expenditures.notes,
        createdByName: users.name,
      })
      .from(expenditures)
      .innerJoin(consorcios, eq(consorcios.id, expenditures.consorcioId))
      .leftJoin(users, eq(users.id, expenditures.createdByUserId))
      .where(whereClause)
      .orderBy(desc(expenditures.date), desc(expenditures.createdAt))
      .limit(perPage)
      .offset(offset),
    db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${expenditures.amountCents}), 0)::bigint`,
      })
      .from(expenditures)
      .where(whereClause),
  ]);

  const total = Number(totalsRow[0]?.count ?? 0);
  const totalCents = Number(totalsRow[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return { items, total, totalCents, page, perPage, totalPages };
}

export async function getExpenditureById(
  user: CurrentUser,
  id: string,
): Promise<ExpenditureRow | null> {
  const ids = getViewableConsorcioIds(user);
  if (ids !== "all" && ids.length === 0) return null;

  const conditions = [eq(expenditures.id, id)];
  if (ids !== "all") {
    conditions.push(inArray(expenditures.consorcioId, ids));
  }

  const [row] = await db
    .select({
      id: expenditures.id,
      consorcioId: consorcios.id,
      consorcioName: consorcios.name,
      date: expenditures.date,
      description: expenditures.description,
      amountCents: expenditures.amountCents,
      category: expenditures.category,
      vendor: expenditures.vendor,
      receiptUrl: expenditures.receiptUrl,
      notes: expenditures.notes,
      createdByName: users.name,
    })
    .from(expenditures)
    .innerJoin(consorcios, eq(consorcios.id, expenditures.consorcioId))
    .leftJoin(users, eq(users.id, expenditures.createdByUserId))
    .where(and(...conditions))
    .limit(1);

  return row ?? null;
}
