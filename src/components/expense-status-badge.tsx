import { AlertCircle, CalendarClock, Check, Clock, PieChart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isFuturePeriod } from "@/lib/format";
import type { expenseStatusEnum } from "@/lib/db/schema";

type Status = (typeof expenseStatusEnum.enumValues)[number];

type BadgeConfig = { label: string; icon: typeof Check; classes: string };

// Expensa de un mes que todavía no llegó: no es deuda, se puede adelantar.
const FUTURE_CONFIG: BadgeConfig = {
  label: "Próxima",
  icon: CalendarClock,
  classes:
    "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800/60",
};

const STATUS_CONFIG: Record<Status, BadgeConfig> = {
  pagado: {
    label: "Pagada",
    icon: Check,
    classes:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800/60",
  },
  pendiente: {
    label: "Pendiente",
    icon: AlertCircle,
    classes:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800/60",
  },
  en_validacion: {
    label: "En validación",
    icon: Clock,
    classes:
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800/60",
  },
  parcial: {
    label: "Parcial",
    icon: PieChart,
    classes:
      "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800/60",
  },
  rechazado: {
    label: "Rechazada",
    icon: X,
    classes:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800/60",
  },
};

export function ExpenseStatusBadge({
  status,
  period,
}: Readonly<{ status: Status; period?: string }>) {
  const config =
    status === "pendiente" && period && isFuturePeriod(period)
      ? FUTURE_CONFIG
      : STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        config.classes,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {config.label}
    </span>
  );
}
