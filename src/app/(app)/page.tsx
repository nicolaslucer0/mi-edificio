import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  Receipt,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { requireUser, roleLabel } from "@/lib/session";
import {
  getDebtForUser,
  getRecentExpensesForUser,
  type ExpenseRow,
} from "@/lib/queries/expenses";
import { formatCurrencyCents, formatPeriod } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export default async function Home() {
  const user = await requireUser();
  const isAdmin = user.isSuperAdmin || user.isAdmin;
  const [debt, recent] = await Promise.all([
    getDebtForUser(user),
    getRecentExpensesForUser(user, 3),
  ]);

  const firstName = getFirstName(user.name, user.email);

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
      </section>

      {debt.hasUnit && (
        <section className="mx-auto w-full max-w-2xl">
          {debt.amountCents === 0 ? <UpToDateCard /> : <DebtCard debt={debt} />}
        </section>
      )}

      <section className="mx-auto w-full max-w-2xl">
        <QuickActions isAdmin={isAdmin} />
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
    <Card className="border-destructive/15 bg-card shadow-sm">
      <CardContent className="flex flex-col items-center gap-3 p-7 text-center sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
    <Card className="border-success/25 bg-success/5 shadow-sm dark:bg-success/10">
      <CardContent className="flex flex-col items-center gap-3 p-7 text-center sm:p-8">
        <div
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-2xl bg-success/15 text-success"
        >
          <Check className="size-7" strokeWidth={2.5} />
        </div>
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

function QuickActions({ isAdmin }: Readonly<{ isAdmin: boolean }>) {
  const actions = [
    { href: "/expensas", label: "Expensas", icon: Wallet },
    { href: "/gastos", label: "Gastos", icon: Receipt },
    { href: "/balance", label: "Balance", icon: BarChart3 },
  ];
  if (isAdmin) {
    actions.push({ href: "/admin", label: "Admin", icon: ShieldCheck });
  }

  return (
    <Card>
      <CardContent
        className={cn(
          "grid gap-1 px-2 py-4 sm:px-3",
          actions.length === 4 ? "grid-cols-4" : "grid-cols-3",
        )}
      >
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="group/qa flex flex-col items-center gap-2 rounded-xl px-2 py-2 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground transition-all duration-200 group-hover/qa:bg-foreground group-hover/qa:text-background group-active/qa:scale-95">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="text-xs font-medium">{a.label}</span>
            </Link>
          );
        })}
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

function RecentRow({
  expense,
  isLast,
}: Readonly<{ expense: ExpenseRow; isLast: boolean }>) {
  const display = STATUS_DISPLAY[expense.status];
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
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{display.label}</p>
      </div>
      <p className="text-sm font-bold tabular-nums">
        {formatCurrencyCents(expense.amountCents)}
      </p>
    </li>
  );
}
