import "server-only";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  expenditures,
  expenses,
  memberships,
  paymentClaims,
  units,
  users,
  type expenseStatusEnum,
} from "@/lib/db/schema";
import {
  formatCurrencyCents,
  formatDate,
  formatExpenditureCategory,
  formatPeriod,
  type ExpenditureCategory,
} from "@/lib/format";

type ExpenseStatus = (typeof expenseStatusEnum.enumValues)[number];

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  pendiente: "Pendiente",
  en_validacion: "En validación",
  pagado: "Pagada",
  rechazado: "Rechazada",
};

export type ReportRow = {
  floor: string | null;
  unitLabel: string;
  period: string;
  type: "ordinaria" | "extraordinaria";
  amountCents: number;
  status: ExpenseStatus;
  dueDate: Date;
  paidAt: Date | null;
  paidBy: string | null;
  owners: string;
  ownerEmails: string;
};

export type ExpenditureReportRow = {
  date: Date;
  description: string;
  category: ExpenditureCategory;
  amountCents: number;
  vendor: string | null;
  hasReceipt: boolean;
  createdByName: string | null;
};

export type ReportSummary = {
  total: number;
  paidCount: number;
  paidCents: number;
  pendingCount: number;
  pendingCents: number;
  collectedPct: number;
  spentCents: number;
  netCents: number;
};

/** "YYYY-MM" for the calendar month before `now`. */
export function previousPeriod(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isValidPeriod(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function monthBounds(period: string): { start: Date; end: Date } {
  const [year, month] = period.split("-").map(Number);
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
}

export async function getMonthlyExpenseReportRows(
  consorcioId: string,
  period: string,
): Promise<ReportRow[]> {
  const rows = await db
    .select({
      expenseId: expenses.id,
      unitId: expenses.unitId,
      unitLabel: units.label,
      floor: units.floor,
      period: expenses.period,
      type: expenses.type,
      amountCents: expenses.amountCents,
      status: expenses.status,
      dueDate: expenses.dueDate,
    })
    .from(expenses)
    .innerJoin(units, eq(units.id, expenses.unitId))
    .where(and(eq(units.consorcioId, consorcioId), eq(expenses.period, period)))
    .orderBy(units.floor, units.label, expenses.type);

  if (rows.length === 0) return [];

  const expenseIds = rows.map((r) => r.expenseId);
  const unitIds = Array.from(new Set(rows.map((r) => r.unitId)));

  const [claims, owners] = await Promise.all([
    db
      .select({
        expenseId: paymentClaims.expenseId,
        resolvedAt: paymentClaims.resolvedAt,
        name: users.name,
        email: users.email,
      })
      .from(paymentClaims)
      .innerJoin(users, eq(users.id, paymentClaims.claimedByUserId))
      .where(
        and(
          inArray(paymentClaims.expenseId, expenseIds),
          eq(paymentClaims.resolution, "approved"),
        ),
      ),
    db
      .select({
        unitId: memberships.unitId,
        name: users.name,
        email: users.email,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(
        and(inArray(memberships.unitId, unitIds), eq(memberships.role, "owner")),
      ),
  ]);

  const claimByExpense = new Map(claims.map((c) => [c.expenseId, c]));
  const ownersByUnit = new Map<
    string,
    { name: string | null; email: string | null }[]
  >();
  for (const o of owners) {
    if (!o.unitId) continue;
    const list = ownersByUnit.get(o.unitId) ?? [];
    list.push({ name: o.name, email: o.email });
    ownersByUnit.set(o.unitId, list);
  }

  return rows.map((r) => {
    const claim = claimByExpense.get(r.expenseId);
    const unitOwners = ownersByUnit.get(r.unitId) ?? [];
    return {
      floor: r.floor,
      unitLabel: r.unitLabel,
      period: r.period,
      type: r.type,
      amountCents: r.amountCents,
      status: r.status,
      dueDate: r.dueDate,
      paidAt: r.status === "pagado" ? claim?.resolvedAt ?? null : null,
      paidBy:
        r.status === "pagado" ? claim?.name ?? claim?.email ?? null : null,
      owners: unitOwners
        .map((o) => o.name ?? o.email ?? "")
        .filter(Boolean)
        .join(", "),
      ownerEmails: unitOwners
        .map((o) => o.email ?? "")
        .filter(Boolean)
        .join(", "),
    };
  });
}

export async function getMonthlyExpenditureReportRows(
  consorcioId: string,
  period: string,
): Promise<ExpenditureReportRow[]> {
  const { start, end } = monthBounds(period);
  const rows = await db
    .select({
      date: expenditures.date,
      description: expenditures.description,
      category: expenditures.category,
      amountCents: expenditures.amountCents,
      vendor: expenditures.vendor,
      receiptUrl: expenditures.receiptUrl,
      createdByName: users.name,
    })
    .from(expenditures)
    .leftJoin(users, eq(users.id, expenditures.createdByUserId))
    .where(
      and(
        eq(expenditures.consorcioId, consorcioId),
        gte(expenditures.date, start),
        lt(expenditures.date, end),
      ),
    )
    .orderBy(expenditures.date);

  return rows.map((r) => ({
    date: r.date,
    description: r.description,
    category: r.category,
    amountCents: r.amountCents,
    vendor: r.vendor,
    hasReceipt: Boolean(r.receiptUrl),
    createdByName: r.createdByName,
  }));
}

export function summarizeReport(
  expenseRows: ReportRow[],
  expenditureRows: ExpenditureReportRow[],
): ReportSummary {
  let paidCount = 0;
  let paidCents = 0;
  let pendingCount = 0;
  let pendingCents = 0;
  for (const r of expenseRows) {
    if (r.status === "pagado") {
      paidCount += 1;
      paidCents += r.amountCents;
    } else {
      pendingCount += 1;
      pendingCents += r.amountCents;
    }
  }
  const spentCents = expenditureRows.reduce((s, g) => s + g.amountCents, 0);
  const billedCents = paidCents + pendingCents;
  const collectedPct =
    billedCents > 0 ? Math.round((paidCents / billedCents) * 100) : 0;
  return {
    total: expenseRows.length,
    paidCount,
    paidCents,
    pendingCount,
    pendingCents,
    collectedPct,
    spentCents,
    netCents: paidCents - spentCents,
  };
}

const EXPENSE_HEADERS = [
  "Piso",
  "Unidad",
  "Período",
  "Tipo",
  "Monto (pesos)",
  "Estado",
  "¿Pagada?",
  "Vencimiento",
  "Fecha de pago",
  "Pagada por",
  "Propietario(s)",
  "Email(s)",
];

const EXPENDITURE_HEADERS = [
  "Fecha",
  "Descripción",
  "Categoría",
  "Monto (pesos)",
  "Proveedor",
  "¿Comprobante?",
  "Cargado por",
];

function csvField(value: string | number | null): string {
  const s = value === null ? "" : String(value);
  if (/[";\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function csvRow(cells: (string | number | null)[]): string {
  return cells.map(csvField).join(";");
}

function pesos(cents: number): number {
  return Math.round(cents / 100);
}

function expenseSection(rows: ReportRow[]): string[] {
  if (rows.length === 0) {
    return [csvRow(["EXPENSAS (COBRANZAS)"]), csvRow(["Sin expensas en el período."])];
  }
  return [
    csvRow(["EXPENSAS (COBRANZAS)"]),
    EXPENSE_HEADERS.join(";"),
    ...rows.map((r) =>
      csvRow([
        r.floor ?? "",
        r.unitLabel,
        formatPeriod(r.period),
        r.type === "extraordinaria" ? "Extraordinaria" : "Ordinaria",
        pesos(r.amountCents),
        STATUS_LABEL[r.status],
        r.status === "pagado" ? "Sí" : "No",
        formatDate(r.dueDate),
        r.paidAt ? formatDate(r.paidAt) : "",
        r.paidBy ?? "",
        r.owners,
        r.ownerEmails,
      ]),
    ),
  ];
}

function expenditureSection(rows: ExpenditureReportRow[]): string[] {
  if (rows.length === 0) {
    return [csvRow(["GASTOS (EGRESOS)"]), csvRow(["Sin gastos en el período."])];
  }
  return [
    csvRow(["GASTOS (EGRESOS)"]),
    EXPENDITURE_HEADERS.join(";"),
    ...rows.map((g) =>
      csvRow([
        formatDate(g.date),
        g.description,
        formatExpenditureCategory(g.category),
        pesos(g.amountCents),
        g.vendor ?? "",
        g.hasReceipt ? "Sí" : "No",
        g.createdByName ?? "",
      ]),
    ),
  ];
}

function summarySection(summary: ReportSummary): string[] {
  return [
    csvRow(["RESUMEN"]),
    csvRow(["Cobrado", pesos(summary.paidCents)]),
    csvRow(["Pendiente de cobro", pesos(summary.pendingCents)]),
    csvRow(["Gastado", pesos(summary.spentCents)]),
    csvRow(["Resultado del mes (cobrado - gastado)", pesos(summary.netCents)]),
    csvRow(["Cobranza", `${summary.collectedPct}%`]),
  ];
}

/**
 * One CSV with three sections (expensas, gastos, resumen). UTF-8 BOM + ";"
 * delimiter so Excel (es-AR) opens it with columns and accents intact.
 */
export function buildMonthlyReportCsv(params: {
  consorcioName: string;
  period: string;
  expenseRows: ReportRow[];
  expenditureRows: ExpenditureReportRow[];
  summary: ReportSummary;
}): string {
  const lines = [
    csvRow(["Reporte de cobranzas y gastos"]),
    csvRow([params.consorcioName, formatPeriod(params.period)]),
    "",
    ...expenseSection(params.expenseRows),
    "",
    ...expenditureSection(params.expenditureRows),
    "",
    ...summarySection(params.summary),
  ];
  return `﻿${lines.join("\r\n")}`;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/g, "")
    .replaceAll(/[^a-zA-Z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .toLowerCase();
}

export type MonthlyReport = {
  filename: string;
  csv: string;
  hasData: boolean;
  summary: ReportSummary;
};

export async function buildMonthlyReport(
  consorcioId: string,
  period: string,
  consorcioName: string,
): Promise<MonthlyReport> {
  const [expenseRows, expenditureRows] = await Promise.all([
    getMonthlyExpenseReportRows(consorcioId, period),
    getMonthlyExpenditureReportRows(consorcioId, period),
  ]);
  const summary = summarizeReport(expenseRows, expenditureRows);
  return {
    filename: `reporte-${slugify(consorcioName)}-${period}.csv`,
    csv: buildMonthlyReportCsv({
      consorcioName,
      period,
      expenseRows,
      expenditureRows,
      summary,
    }),
    hasData: expenseRows.length > 0 || expenditureRows.length > 0,
    summary,
  };
}

export function reportSummaryText(
  summary: ReportSummary,
  period: string,
): string {
  return [
    `Período: ${formatPeriod(period)}`,
    `Expensas: ${summary.total}`,
    `Cobrado: ${summary.paidCount} (${formatCurrencyCents(summary.paidCents)})`,
    `Pendiente: ${summary.pendingCount} (${formatCurrencyCents(summary.pendingCents)})`,
    `Gastado: ${formatCurrencyCents(summary.spentCents)}`,
    `Resultado del mes: ${formatCurrencyCents(summary.netCents)}`,
    `Cobranza: ${summary.collectedPct}%`,
  ].join("\n");
}
