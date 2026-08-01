import Link from "next/link";
import { ArrowRight, CalendarClock, Check, Clock, PieChart } from "lucide-react";
import {
  getRecentExpensesForUser,
  type ExpenseRow,
} from "@/lib/queries/expenses";
import {
  formatCurrencyCents,
  formatPeriod,
  isFuturePeriod,
} from "@/lib/format";
import { WidgetCard } from "./widget-card";
import type { WidgetProps } from "./types";
import { cn } from "@/lib/utils";

export async function UltimosMovimientosWidget({
  user,
  consorcioId,
}: Readonly<WidgetProps>) {
  const recent = await getRecentExpensesForUser(user, 3, consorcioId);
  if (recent.length === 0) return null;

  return (
    <WidgetCard
      span="full"
      title="Últimos movimientos"
      action={{
        href: "/expensas",
        label: "Ver todo",
        ariaLabel: "Ver todas las expensas",
      }}
      contentClassName="px-5 py-1"
    >
      <ul>
        {recent.map((expense, idx) => (
          <RecentRow
            key={expense.id}
            expense={expense}
            isLast={idx === recent.length - 1}
          />
        ))}
      </ul>
    </WidgetCard>
  );
}

const STATUS_DISPLAY = {
  pagado: {
    label: "Pagada",
    classes: "bg-success/15 text-success",
    icon: Check,
  },
  pendiente: {
    label: "Pendiente",
    classes: "bg-destructive/10 text-destructive",
    icon: Clock,
  },
  en_validacion: {
    label: "En validación",
    classes:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    icon: Clock,
  },
  parcial: {
    label: "Pago parcial",
    classes:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    icon: PieChart,
  },
  rechazado: {
    label: "Rechazada",
    classes: "bg-destructive/10 text-destructive",
    icon: Clock,
  },
} as const;

// Expensa de un mes que todavía no llegó: neutro, no rojo.
const FUTURE_DISPLAY = {
  label: "Próxima · podés adelantarla",
  classes: "bg-spot-blue-soft text-spot-blue",
  icon: CalendarClock,
} as const;

function RecentRow({
  expense,
  isLast,
}: Readonly<{ expense: ExpenseRow; isLast: boolean }>) {
  const isFuture =
    expense.status === "pendiente" && isFuturePeriod(expense.period);
  const display = isFuture ? FUTURE_DISPLAY : STATUS_DISPLAY[expense.status];
  const Icon = display.icon;
  return (
    <li
      className={cn(
        "flex items-center gap-3 py-3.5",
        !isLast && "border-b border-border/50",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          display.classes,
        )}
      >
        <Icon aria-hidden="true" className="size-4" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight truncate">
          {formatPeriod(expense.period)}
          {expense.type === "extraordinaria" && (
            <span className="ml-1.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              · Extra
            </span>
          )}
        </p>
        {isFuture ? (
          <Link
            href="/expensas"
            className="mt-0.5 inline-flex items-center gap-0.5 text-xs font-semibold text-primary transition-colors hover:underline touch-manipulation"
          >
            Adelantar expensa
            <ArrowRight aria-hidden="true" className="size-3" />
          </Link>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5">
            {display.label}
          </p>
        )}
      </div>
      <p className="text-sm font-bold tabular-nums">
        {formatCurrencyCents(expense.amountCents)}
      </p>
    </li>
  );
}
