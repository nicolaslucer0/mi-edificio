import Link from "next/link";
import { Coins, Receipt } from "lucide-react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getCurrentConsorcioId } from "@/lib/consorcio-context";
import {
  getConsorcioCash,
  getMonthlyFinancials,
  type MonthlyFinancials,
} from "@/lib/queries/balance";
import { getDebtBoard } from "@/lib/queries/debt-board";
import { formatCurrencyCents, formatPeriod } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DebtBoardSummary, DebtBoardUnits } from "@/components/debt-board";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Balance del consorcio — Mi edificio",
};

export default async function BalancePage() {
  const user = await requireUser();
  const consorcioId = await getCurrentConsorcioId(user);
  const [cash, months, debtBoard] = await Promise.all([
    getConsorcioCash(user, consorcioId),
    getMonthlyFinancials(user, 12, consorcioId),
    getDebtBoard(user, consorcioId),
  ]);

  const [currentMonth, ...olderMonths] = months;
  // Meses sin expensas ni gastos no aportan nada: no se listan.
  const previousMonths = olderMonths.filter(
    (m) => m.billedCents > 0 || m.spentCents > 0,
  );

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          backHref="/"
          backLabel="Volver al inicio"
          icon={Coins}
          tone="green"
          title="Balance del consorcio"
        />

        <p className="text-sm text-muted-foreground leading-relaxed">
          Cuánta plata tiene el consorcio, cuánto se cobró de las expensas de
          cada mes y en qué se fue.
        </p>

        <CashCard cash={cash} />

        {currentMonth && (
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">
              Este mes · {formatPeriod(currentMonth.period)}
            </h2>
            <CurrentMonthCard month={currentMonth} />
          </section>
        )}

        {previousMonths.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-semibold">Meses anteriores</h2>
            <ul className="flex flex-col gap-3" aria-label="Balance mensual">
              {previousMonths.map((m) => (
                <li key={m.period}>
                  <MonthRow month={m} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Deuda arrastrada de meses anteriores. Va aparte del bloque mensual a
            propósito: no es "cómo venimos este mes". Solo si la administración
            activó el estado de pagos (ver docs/estado-de-pagos.md). */}
        {debtBoard && debtBoard.totalUnits > 0 && (
          <section className="flex flex-col gap-3 border-t border-border/60 pt-6">
            <h2 className="text-base font-semibold">Deuda acumulada</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Expensas vencidas sin pagar, de este mes y de los anteriores.
            </p>
            <DebtBoardSummary board={debtBoard} />
            <DebtBoardUnits units={debtBoard.units} />
          </section>
        )}

        <Link
          href="/gastos"
          className="inline-flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground touch-manipulation"
        >
          <Receipt aria-hidden="true" className="size-4" />
          Ver el detalle de los gastos
        </Link>
      </div>
    </main>
  );
}

/**
 * Solo el número. El saldo inicial entra en la cuenta pero no se muestra: es un
 * dato de cuando arrancó la app, no información del consorcio. Y con el desglose
 * a la vista la resta no cerraría (ver docs/balance.md).
 */
function CashCard({
  cash,
}: Readonly<{ cash: Awaited<ReturnType<typeof getConsorcioCash>> }>) {
  const positive = cash.balanceCents >= 0;
  return (
    <Card className={cn("border-l-4", positive ? "border-l-success" : "border-l-destructive")}>
      <CardContent className="flex flex-col gap-1 p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Plata del consorcio
        </p>
        <p
          className={cn(
            "text-4xl font-bold tracking-tight tabular-nums",
            positive ? "text-success" : "text-destructive",
          )}
        >
          {formatCurrencyCents(cash.balanceCents)}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Es lo que hay hoy en la cuenta del consorcio.
        </p>
      </CardContent>
    </Card>
  );
}

function CurrentMonthCard({ month }: Readonly<{ month: MonthlyFinancials }>) {
  if (month.billedCents === 0 && month.spentCents === 0) {
    return (
      <Card>
        <CardContent className="px-6 py-8 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Todavía no hay expensas ni gastos cargados en este mes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const positive = month.netCents >= 0;
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        {month.billedCents > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Se cobró{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatCurrencyCents(month.collectedCents)}
                </span>{" "}
                de {formatCurrencyCents(month.billedCents)}
              </p>
              <p className="text-sm font-semibold tabular-nums">
                {month.collectedPct}%
              </p>
            </div>
            <div
              aria-hidden="true"
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${Math.min(100, month.collectedPct)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Pagaron{" "}
              <span className="font-semibold text-foreground">
                {month.unitsPaid} de {month.unitsTotal}
              </span>{" "}
              {month.unitsTotal === 1 ? "unidad" : "unidades"}
              {month.pendingCents > 0 && (
                <>
                  {" "}
                  · falta cobrar{" "}
                  <span className="font-semibold tabular-nums text-destructive">
                    {formatCurrencyCents(month.pendingCents)}
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        <dl className="grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-sm">
          <Figure
            label="Cobrado"
            value={formatCurrencyCents(month.collectedCents)}
            tone="positive"
          />
          <Figure
            label="Gastado"
            value={formatCurrencyCents(month.spentCents)}
            tone="negative"
          />
          <Figure
            label="Resultado"
            value={formatCurrencyCents(month.netCents)}
            tone={positive ? "positive" : "negative"}
            emphasis
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function MonthRow({ month }: Readonly<{ month: MonthlyFinancials }>) {
  const positive = month.netCents >= 0;
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-base font-semibold tracking-tight">
            {formatPeriod(month.period)}
          </p>
          {month.billedCents > 0 && (
            <p className="text-xs text-muted-foreground">
              {month.collectedPct}% cobrado · pagaron {month.unitsPaid} de{" "}
              {month.unitsTotal}
            </p>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Figure
            label="Expensas"
            value={formatCurrencyCents(month.billedCents)}
          />
          <Figure
            label="Cobrado"
            value={formatCurrencyCents(month.collectedCents)}
            tone="positive"
          />
          <Figure
            label="Gastado"
            value={formatCurrencyCents(month.spentCents)}
            tone="negative"
          />
          <Figure
            label="Resultado"
            value={formatCurrencyCents(month.netCents)}
            tone={positive ? "positive" : "negative"}
            emphasis
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function Figure({
  label,
  value,
  tone,
  emphasis,
}: Readonly<{
  label: string;
  value: string;
  tone?: "positive" | "negative";
  emphasis?: boolean;
}>) {
  const toneClass = (() => {
    if (tone === "positive") return "text-green-700 dark:text-green-300";
    if (tone === "negative") return "text-destructive";
    return "text-foreground";
  })();
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          emphasis ? "font-bold" : "font-medium",
          toneClass,
        )}
      >
        {value}
      </dd>
    </div>
  );
}
