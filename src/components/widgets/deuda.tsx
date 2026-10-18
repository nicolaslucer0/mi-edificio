import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { getDebtForUser } from "@/lib/queries/expenses";
import { formatCurrencyCents, formatDueUrgency } from "@/lib/format";
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
      {debt.amountCents === 0 ? (
        <UpToDateCard pendingCents={debt.pendingCents} />
      ) : (
        <DebtCard debt={debt} />
      )}
    </WidgetCard>
  );
}

/**
 * Compacta y con el tono de alerta puesto en el color y el ícono, no en el
 * tamaño ni en el movimiento: una tarjeta enorme y parpadeando en rojo es
 * hostil, sobre todo para un vecino grande. Ocupa poco y se entiende rápido.
 */
function DebtCard({
  debt,
}: Readonly<{
  debt: {
    amountCents: number;
    count: number;
    nextDueDate: Date | null;
    pendingCents: number;
  };
}>) {
  const urgency = debt.nextDueDate ? formatDueUrgency(debt.nextDueDate) : null;

  return (
    <Card
      role="region"
      aria-label="Tu deuda"
      aria-live="polite"
      className="border-l-4 border-l-destructive bg-destructive/5 shadow-sm"
    >
      <CardContent className="flex items-center gap-3 p-4">
        <span
          aria-hidden="true"
          className="alert-badge flex size-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"
        >
          <AlertCircle className="size-5" />
        </span>

        <div className="alert-amount flex min-w-0 flex-1 flex-col">
          <p className="text-2xl font-bold leading-tight tracking-tight tabular-nums text-destructive">
            {formatCurrencyCents(debt.amountCents)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {debt.count === 1
              ? "1 expensa pendiente"
              : `${debt.count} expensas pendientes`}
            {urgency && (
              <>
                {" · "}
                <span
                  className={cn(
                    "font-semibold",
                    urgency.tone === "danger"
                      ? "text-destructive"
                      : "text-foreground",
                  )}
                >
                  {urgency.label}
                </span>
              </>
            )}
          </p>
          {debt.pendingCents > 0 && (
            <p className="text-sm text-muted-foreground">
              Y avisaste {formatCurrencyCents(debt.pendingCents)} que está en
              revisión
            </p>
          )}
        </div>

        <Link
          href="/expensas"
          aria-label="Ver el detalle de tus expensas"
          className={cn(
            buttonVariants(),
            "h-11 shrink-0 gap-1.5 px-4 text-sm touch-manipulation",
          )}
        >
          Ver
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * La contracara: acá el espacio es el mensaje. Aire, una ilustración grande
 * que respira despacio y una línea que dice que no hace falta estar
 * revisando — que es lo que de verdad baja la ansiedad.
 *
 * Si está al día porque avisó un pago que todavía no se validó, se dice: es
 * la misma cuenta que el estado de cuenta, y así los dos números coinciden.
 */
function UpToDateCard({ pendingCents }: Readonly<{ pendingCents: number }>) {
  return (
    <Card
      role="region"
      aria-live="polite"
      className="border-success/25 bg-success/5 shadow-sm dark:bg-success/10"
    >
      <CardContent className="flex items-center gap-4 p-5 sm:gap-5 sm:p-6">
        <CelebrateScene className="h-auto w-20 shrink-0 sm:w-24" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-2xl font-bold tracking-tight text-success text-balance">
            Estás al día 🎉
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground text-balance">
            {pendingCents > 0
              ? `Avisaste ${formatCurrencyCents(pendingCents)} que el administrador está revisando. Te avisamos cuando lo confirme.`
              : "Te avisamos cuando llegue la próxima. No hace falta que entres a chequear."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
