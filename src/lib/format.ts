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
