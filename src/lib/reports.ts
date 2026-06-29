import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  consorcios,
  expenses,
  memberships,
  paymentClaims,
  units,
  users,
  type expenseStatusEnum,
} from "@/lib/db/schema";
import { formatCurrencyCents, formatDate, formatPeriod } from "@/lib/format";

type ExpenseStatus = (typeof expenseStatusEnum.enumValues)[number];

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  pendiente: "Pendiente",
  en_validacion: "En validación",
  pagado: "Pagada",
  rechazado: "Rechazada",
};

export type ReportRow = {
  consorcioName: string;
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

export type ReportSummary = {
  total: number;
  paidCount: number;
  paidCents: number;
  pendingCount: number;
  pendingCents: number;
  collectedPct: number;
};

/** "YYYY-MM" for the calendar month before `now`. */
export function previousPeriod(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function isValidPeriod(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
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
      consorcioName: consorcios.name,
      period: expenses.period,
      type: expenses.type,
      amountCents: expenses.amountCents,
      status: expenses.status,
      dueDate: expenses.dueDate,
    })
    .from(expenses)
    .innerJoin(units, eq(units.id, expenses.unitId))
    .innerJoin(consorcios, eq(consorcios.id, units.consorcioId))
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
  const ownersByUnit = new Map<string, { name: string | null; email: string | null }[]>();
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
      consorcioName: r.consorcioName,
      floor: r.floor,
      unitLabel: r.unitLabel,
      period: r.period,
      type: r.type,
      amountCents: r.amountCents,
      status: r.status,
      dueDate: r.dueDate,
      paidAt: r.status === "pagado" ? claim?.resolvedAt ?? null : null,
      paidBy:
        r.status === "pagado"
          ? claim?.name ?? claim?.email ?? null
          : null,
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

export function summarizeReport(rows: ReportRow[]): ReportSummary {
  let paidCount = 0;
  let paidCents = 0;
  let pendingCount = 0;
  let pendingCents = 0;
  for (const r of rows) {
    if (r.status === "pagado") {
      paidCount += 1;
      paidCents += r.amountCents;
    } else {
      pendingCount += 1;
      pendingCents += r.amountCents;
    }
  }
  const totalCents = paidCents + pendingCents;
  const collectedPct =
    totalCents > 0 ? Math.round((paidCents / totalCents) * 100) : 0;
  return {
    total: rows.length,
    paidCount,
    paidCents,
    pendingCount,
    pendingCents,
    collectedPct,
  };
}

const HEADERS = [
  "Consorcio",
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

function csvField(value: string | number | null): string {
  const s = value === null ? "" : String(value);
  if (/[";\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

/** CSV with UTF-8 BOM and ";" delimiter so Excel (es-AR) opens it cleanly. */
export function buildExpenseReportCsv(rows: ReportRow[]): string {
  const lines = [HEADERS.join(";")];
  for (const r of rows) {
    lines.push(
      [
        r.consorcioName,
        r.floor ?? "",
        r.unitLabel,
        formatPeriod(r.period),
        r.type === "extraordinaria" ? "Extraordinaria" : "Ordinaria",
        Math.round(r.amountCents / 100),
        STATUS_LABEL[r.status],
        r.status === "pagado" ? "Sí" : "No",
        formatDate(r.dueDate),
        r.paidAt ? formatDate(r.paidAt) : "",
        r.paidBy ?? "",
        r.owners,
        r.ownerEmails,
      ]
        .map(csvField)
        .join(";"),
    );
  }
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
  rows: ReportRow[];
  summary: ReportSummary;
};

export async function buildMonthlyReport(
  consorcioId: string,
  period: string,
  consorcioName: string,
): Promise<MonthlyReport> {
  const rows = await getMonthlyExpenseReportRows(consorcioId, period);
  return {
    filename: `reporte-${slugify(consorcioName)}-${period}.csv`,
    csv: buildExpenseReportCsv(rows),
    rows,
    summary: summarizeReport(rows),
  };
}

export function reportSummaryText(
  summary: ReportSummary,
  period: string,
): string {
  return [
    `Período: ${formatPeriod(period)}`,
    `Expensas: ${summary.total}`,
    `Cobradas: ${summary.paidCount} (${formatCurrencyCents(summary.paidCents)})`,
    `Pendientes: ${summary.pendingCount} (${formatCurrencyCents(summary.pendingCents)})`,
    `Cobranza: ${summary.collectedPct}%`,
  ].join("\n");
}
