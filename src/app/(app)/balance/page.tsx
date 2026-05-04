import Link from "next/link";
import { ChevronLeft, TrendingDown, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getMonthlyBalance, type MonthlyBalance } from "@/lib/queries/balance";
import { formatCurrencyCents, formatPeriod } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Balance del consorcio — Mi edificio",
};

export default async function BalancePage() {
  const user = await requireUser();
  const months = await getMonthlyBalance(user, 12);

  const totals = months.reduce(
    (acc, m) => ({
      collected: acc.collected + m.collectedCents,
      spent: acc.spent + m.spentCents,
    }),
    { collected: 0, spent: 0 },
  );
  const totalBalance = totals.collected - totals.spent;

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Volver al inicio"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon-lg" }),
              "touch-manipulation",
            )}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Balance del consorcio
          </h1>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Comparativa entre lo que se cobró en expensas y lo que se gastó, mes
          por mes.
        </p>

        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
            <Stat
              label="Cobrado (12m)"
              value={formatCurrencyCents(totals.collected)}
              icon={<TrendingUp aria-hidden="true" className="size-4" />}
              tone="positive"
            />
            <Stat
              label="Gastado (12m)"
              value={formatCurrencyCents(totals.spent)}
              icon={<TrendingDown aria-hidden="true" className="size-4" />}
              tone="negative"
            />
            <Stat
              label="Saldo (12m)"
              value={formatCurrencyCents(totalBalance)}
              tone={totalBalance >= 0 ? "positive" : "negative"}
              emphasis
            />
          </CardContent>
        </Card>

        <ul
          className="flex flex-col gap-3"
          aria-label="Balance mensual"
        >
          {months.map((m) => (
            <li key={m.period}>
              <MonthRow balance={m} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
  emphasis,
}: Readonly<{
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone: "positive" | "negative";
  emphasis?: boolean;
}>) {
  const toneClass =
    tone === "positive"
      ? "text-green-700 dark:text-green-300"
      : "text-destructive";
  return (
    <div className="flex flex-col gap-1 text-center">
      <p className="inline-flex items-center justify-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p
        className={cn(
          "tabular-nums",
          emphasis ? "text-2xl font-bold" : "text-lg font-semibold",
          toneClass,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MonthRow({ balance }: Readonly<{ balance: MonthlyBalance }>) {
  const positive = balance.balanceCents >= 0;
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <p className="text-base font-semibold tracking-tight">
          {formatPeriod(balance.period)}
        </p>
        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Cobrado</dt>
            <dd className="font-medium text-green-700 dark:text-green-300 tabular-nums">
              {formatCurrencyCents(balance.collectedCents)}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Gastado</dt>
            <dd className="font-medium text-destructive tabular-nums">
              {formatCurrencyCents(balance.spentCents)}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Saldo</dt>
            <dd
              className={cn(
                "font-semibold tabular-nums",
                positive
                  ? "text-green-700 dark:text-green-300"
                  : "text-destructive",
              )}
            >
              {formatCurrencyCents(balance.balanceCents)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
