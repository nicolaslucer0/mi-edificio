import {
  AlertCircle,
  CalendarCheck,
  Check,
  Clock,
  Hourglass,
  PieChart,
  type LucideIcon,
} from "lucide-react";
import {
  getYearOverviewForUser,
  type MonthPaymentState,
  type YearMonthSummary,
} from "@/lib/queries/expenses";
import { formatPeriod } from "@/lib/format";
import { WidgetCard } from "./widget-card";
import type { WidgetProps } from "./types";
import { cn } from "@/lib/utils";

const MONTH_ABBR = new Intl.DateTimeFormat("es-AR", { month: "short" });

function monthAbbr(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return MONTH_ABBR.format(new Date(year, month - 1, 1)).replace(".", "");
}

/**
 * Estado de cada mes. El color nunca va solo: cada celda lleva su ícono, el mes
 * debajo y una etiqueta para el lector de pantalla, más la referencia al pie.
 */
const STATE_DISPLAY: Record<
  MonthPaymentState,
  { label: string; classes: string; icon: LucideIcon | null }
> = {
  pagado: {
    label: "Pagada",
    classes: "bg-success/15 text-success",
    icon: Check,
  },
  avisado: {
    // El mismo amarillo que "En validación" en la lista de expensas.
    label: "Avisaste el pago",
    classes:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    icon: Hourglass,
  },
  parcial: {
    label: "Pago parcial",
    classes:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    icon: PieChart,
  },
  debe: {
    // Rojo pleno, no lavado: es el único estado que tiene que saltar a la vista.
    label: "Sin pagar",
    classes: "bg-destructive text-background",
    icon: AlertCircle,
  },
  pendiente: {
    label: "Todavía no vence",
    classes: "bg-spot-blue-soft text-spot-blue",
    icon: Clock,
  },
  sin: {
    label: "Sin expensa",
    classes: "bg-muted text-muted-foreground inset-shadow-2xs",
    icon: null,
  },
};

/** Orden de la referencia: los estados que importan primero. */
const LEGEND_ORDER: MonthPaymentState[] = [
  "pagado",
  "avisado",
  "parcial",
  "debe",
  "pendiente",
  "sin",
];

export async function TuAnioWidget({
  user,
  consorcioId,
}: Readonly<WidgetProps>) {
  const months = await getYearOverviewForUser(user, consorcioId);
  const billedMonths = months.filter((m) => m.state !== "sin");
  if (billedMonths.length === 0) return null;

  const paidCount = billedMonths.filter((m) => m.state === "pagado").length;
  const presentStates = LEGEND_ORDER.filter((state) =>
    months.some((m) => m.state === state),
  );

  return (
    <WidgetCard
      span="full"
      title="Tu año"
      icon={CalendarCheck}
      tone="violet"
      action={{
        href: "/expensas",
        label: "Ver expensas",
        ariaLabel: "Ver todas tus expensas",
      }}
      contentClassName="flex flex-col gap-3"
    >
      <p className="text-sm leading-relaxed">
        Pagaste{" "}
        <span className="font-semibold">
          {paidCount} de {billedMonths.length}
        </span>{" "}
        {billedMonths.length === 1 ? "mes" : "meses"} de los últimos doce.
      </p>

      <ol
        className="grid grid-cols-12 gap-0.5"
        aria-label="Tus últimos doce meses"
      >
        {months.map((month) => (
          <MonthCell key={month.period} month={month} />
        ))}
      </ol>

      <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Referencias">
        {presentStates.map((state) => (
          <li
            key={state}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-sm",
                STATE_DISPLAY[state].classes,
              )}
            >
              {STATE_DISPLAY[state].icon && (
                <LegendIcon state={state} />
              )}
            </span>
            {STATE_DISPLAY[state].label}
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

function LegendIcon({ state }: Readonly<{ state: MonthPaymentState }>) {
  const Icon = STATE_DISPLAY[state].icon;
  if (!Icon) return null;
  return <Icon className="size-2.5" strokeWidth={3} />;
}

function MonthCell({ month }: Readonly<{ month: YearMonthSummary }>) {
  const display = STATE_DISPLAY[month.state];
  const Icon = display.icon;
  return (
    <li className="flex flex-col items-center gap-1">
      <span
        aria-hidden="true"
        className={cn(
          "flex aspect-square w-full items-center justify-center rounded-sm",
          display.classes,
        )}
      >
        {Icon && <Icon className="size-3" strokeWidth={2.5} />}
      </span>
      <span aria-hidden="true" className="text-[10px] text-muted-foreground">
        {monthAbbr(month.period)}
      </span>
      <span className="sr-only">
        {formatPeriod(month.period)}: {display.label}
      </span>
    </li>
  );
}
