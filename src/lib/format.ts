const ARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrencyCents(cents: number): string {
  return ARS.format(cents / 100);
}

const PERIOD_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
});

export function formatPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  const date = new Date(year, month - 1, 1);
  const formatted = PERIOD_FORMATTER.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Mes en curso como "YYYY-MM" en horario de Argentina. */
export function currentPeriod(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

/**
 * Una expensa es "a futuro" cuando su período (YYYY-MM) es posterior al mes
 * en curso: todavía no es deuda, pero se puede adelantar el pago.
 */
export function isFuturePeriod(period: string): boolean {
  return period > currentPeriod();
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return DATE_FORMATTER.format(d);
}

const MS_PER_DAY = 86_400_000;

function toUtcDay(d: Date): number {
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / MS_PER_DAY,
  );
}

export type DueUrgency = {
  label: string;
  tone: "neutral" | "warning" | "danger";
};

/**
 * Relative due-date label for an unpaid expense ("Vence en 3 días", "Venció
 * hace 2 días"). Returns null when the due date is far off (>7 days), so the
 * plain date is enough.
 */
export function formatDueUrgency(date: Date | string): DueUrgency | null {
  const due = typeof date === "string" ? new Date(date) : date;
  const diff = toUtcDay(due) - toUtcDay(new Date());

  if (diff < 0) {
    const n = -diff;
    return {
      label: n === 1 ? "Venció ayer" : `Venció hace ${n} días`,
      tone: "danger",
    };
  }
  if (diff === 0) return { label: "Vence hoy", tone: "danger" };
  if (diff === 1) return { label: "Vence mañana", tone: "warning" };
  if (diff <= 7) return { label: `Vence en ${diff} días`, tone: "warning" };
  return null;
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "recién";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  return formatDate(d);
}

const EXPENDITURE_CATEGORY_LABELS = {
  limpieza: "Limpieza",
  mantenimiento: "Mantenimiento",
  jardineria: "Jardinería",
  seguridad: "Seguridad",
  servicios: "Servicios",
  obras: "Obras",
  administracion: "Administración",
  otros: "Otros",
} as const;

export type ExpenditureCategory = keyof typeof EXPENDITURE_CATEGORY_LABELS;

export function formatExpenditureCategory(category: ExpenditureCategory): string {
  return EXPENDITURE_CATEGORY_LABELS[category];
}

export const EXPENDITURE_CATEGORIES = Object.keys(
  EXPENDITURE_CATEGORY_LABELS,
) as ExpenditureCategory[];

export function formatUnitWithFloor(unit: {
  label: string;
  floor: string | null;
}): string {
  if (!unit.floor) return `Unidad ${unit.label}`;
  return `Piso ${unit.floor} — Unidad ${unit.label}`;
}
