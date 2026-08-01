import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDebtForUser } from "@/lib/queries/expenses";
import { formatCurrencyCents } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CelebrateScene } from "@/components/illustrations";
import { WidgetCard } from "./widget-card";
import type { WidgetProps } from "./types";
import { cn } from "@/lib/utils";

/**
 * La pieza principal del home: cuánto debe el vecino, o la felicitación si
 * está al día. Va sin header y con card propia, por eso `bare`.
 */
export async function DeudaWidget({ user, consorcioId }: Readonly<WidgetProps>) {
  const debt = await getDebtForUser(user, consorcioId);
  if (!debt.hasUnit) return null;

  return (
    <WidgetCard
      span="full"
      bare
      footer={
        <Link
          href="/cuenta"
          className="text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground touch-manipulation"
        >
          Ver estado de cuenta
        </Link>
      }
    >
      {debt.amountCents === 0 ? <UpToDateCard /> : <DebtCard debt={debt} />}
    </WidgetCard>
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
