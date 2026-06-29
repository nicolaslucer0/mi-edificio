import Link from "next/link";
import { ArrowRight, CalendarClock, Check, Clock } from "lucide-react";
import { requireUser, roleLabel } from "@/lib/session";
import { getCurrentConsorcioId } from "@/lib/consorcio-context";
import {
  getDebtForUser,
  getRecentExpensesForUser,
  type DebtSummary,
  type ExpenseRow,
} from "@/lib/queries/expenses";
import {
  formatCurrencyCents,
  formatDate,
  formatDueUrgency,
  formatPeriod,
  isFuturePeriod,
} from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InstallPrompt } from "@/components/install-prompt";
import { CelebrateScene } from "@/components/illustrations";
import { cn } from "@/lib/utils";

function getGreeting(): string {
  const hour = Number.parseInt(
    new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      hour12: false,
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date()),
    10,
  );
  if (hour < 12) return "Buen día";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getFirstName(name: string | null, email: string): string {
  if (name) return name.split(/\s+/)[0];
  return email.split("@")[0];
}

function buildStatusSummary(debt: DebtSummary): string | null {
  if (!debt.hasUnit) return null;
  if (debt.amountCents === 0) return "Estás al día con las expensas.";
  const plural =
    debt.count === 1 ? "expensa pendiente" : "expensas pendientes";
  let summary = `Debés ${formatCurrencyCents(debt.amountCents)} en ${debt.count} ${plural}.`;
  if (debt.nextDueDate) {
    const urgency = formatDueUrgency(debt.nextDueDate);
    summary += urgency
      ? ` La próxima ${urgency.label.toLowerCase()}.`
      : ` La próxima vence el ${formatDate(debt.nextDueDate)}.`;
  }
  return summary;
}

export default async function Home() {
  const user = await requireUser();
  const consorcioId = await getCurrentConsorcioId(user);
  const [debt, recent] = await Promise.all([
    getDebtForUser(user, consorcioId),
    getRecentExpensesForUser(user, 3, consorcioId),
  ]);

  const firstName = getFirstName(user.name, user.email);
  const summary = buildStatusSummary(debt);

  return (
    <main className="flex flex-1 flex-col gap-7 px-4 pt-6 pb-10 sm:px-6">
      <section className="mx-auto w-full max-w-2xl">
        <p className="text-sm text-muted-foreground">{getGreeting()},</p>
        <h1 className="text-3xl font-bold tracking-tight text-balance">
          {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {roleLabel(user.primaryRole)}
        </p>
        {summary && (
          <p className="mt-3 text-base leading-relaxed text-foreground/90 text-balance">
            {summary}
          </p>
        )}
      </section>

      {debt.hasUnit && (
        <section className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          {debt.amountCents === 0 ? <UpToDateCard /> : <DebtCard debt={debt} />}
          <Link
            href="/cuenta"
            className="text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground touch-manipulation"
          >
            Ver estado de cuenta
          </Link>
        </section>
      )}

      <section className="mx-auto w-full max-w-2xl">
        <InstallPrompt />
      </section>

      {recent.length > 0 && (
        <section className="mx-auto w-full max-w-2xl">
          <header className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold tracking-tight">
              Últimos movimientos
            </h2>
            <Link
              href="/expensas"
              className="text-sm font-medium text-muted-foreground hover:text-foreground touch-manipulation"
            >
              Ver todo
            </Link>
          </header>
          <Card>
            <CardContent className="px-5 py-1">
              <ul>
                {recent.map((expense, idx) => (
                  <RecentRow
                    key={expense.id}
                    expense={expense}
                    isLast={idx === recent.length - 1}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}

function DebtCard({
  debt,
}: Readonly<{
  debt: { amountCents: number; count: number };
}>) {
  return (
    <Card
      role="region"
      aria-labelledby="debt-label"
      aria-live="polite"
      className="border-destructive/15 bg-card shadow-sm"
    >
      <CardContent className="flex flex-col items-center gap-3 p-7 text-center sm:p-8">
        <p
          id="debt-label"
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Tu deuda
        </p>
        <p className="text-5xl font-bold tracking-tight tabular-nums text-destructive sm:text-6xl">
          {formatCurrencyCents(debt.amountCents)}
        </p>
        <p className="text-sm text-muted-foreground">
          {debt.count === 1
            ? "1 expensa pendiente"
            : `${debt.count} expensas pendientes`}
        </p>
        <Link
          href="/expensas"
          className={cn(
            buttonVariants(),
            "mt-3 h-12 w-full max-w-xs gap-2 text-base touch-manipulation",
          )}
        >
          Ver detalle
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

function UpToDateCard() {
  return (
    <Card
      role="region"
      aria-live="polite"
      className="border-success/25 bg-success/5 shadow-sm dark:bg-success/10"
    >
      <CardContent className="flex flex-col items-center gap-3 p-7 text-center sm:p-8">
        <CelebrateScene className="h-auto w-36" />
        <p className="text-3xl font-bold tracking-tight text-success text-balance sm:text-4xl">
          Estás al día 🎉
        </p>
        <p className="text-sm leading-relaxed text-success/80 dark:text-success-foreground/70">
          No tenés expensas pendientes.
        </p>
      </CardContent>
    </Card>
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
        <p className="text-xs text-muted-foreground mt-0.5">{display.label}</p>
      </div>
      <p className="text-sm font-bold tabular-nums">
        {formatCurrencyCents(expense.amountCents)}
      </p>
    </li>
  );
}
