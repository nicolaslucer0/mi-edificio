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
