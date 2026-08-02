import { Users } from "lucide-react";
import { currentPeriod, isValidPeriodString, shiftPeriod } from "@/lib/format";
import { getMonthFinancials } from "@/lib/queries/balance";
import { getDebtBoard } from "@/lib/queries/debt-board";
import { CollectionMeter } from "@/components/collection-meter";
import { MonthNav } from "@/components/month-nav";
import { WidgetCard } from "./widget-card";
import type { WidgetProps } from "./types";

/** Hasta cuánto se puede retroceder con las flechas. */
const MONTHS_BACK = 11;

/**
 * Cómo viene la cobranza del mes, cuando la administración activó el estado de
 * pagos y eligió que además aparezca en el inicio.
 *
 * Siempre acotado a un mes y con el mes a la vista: la deuda acumulada y el
 * listado por unidad viven en /balance (ver docs/estado-de-pagos.md).
 */
export async function EstadoDePagosWidget({
  user,
  consorcioId,
  searchParams,
}: Readonly<WidgetProps>) {
  const board = await getDebtBoard(user, consorcioId);
  if (!board?.onHome) return null;

  const period = resolvePeriod(searchParams.mes);
  const month = await getMonthFinancials(user, period, consorcioId);

  const allPaid =
    month !== null &&
    month.unitsTotal > 0 &&
    month.unitsPaid === month.unitsTotal;

  return (
    <WidgetCard
      title="Cobranza"
      icon={Users}
      tone="teal"
      action={{
        href: "/balance",
        label: "Ver balance",
        ariaLabel: "Ver el balance del consorcio",
      }}
      contentClassName="flex flex-col gap-2 py-1"
    >
      <MonthNav
        period={period}
        hrefFor={(p) => `/?mes=${p}`}
        minPeriod={shiftPeriod(currentPeriod(), -MONTHS_BACK)}
        maxPeriod={currentPeriod()}
        className="-mt-1"
      />

      {!month || month.unitsTotal === 0 ? (
        <p className="pb-1 text-sm leading-relaxed text-muted-foreground">
          No hay expensas emitidas en este mes.
        </p>
      ) : (
        <>
          <p className="text-base font-semibold tracking-tight text-balance">
            {allPaid
              ? "Pagaron todas las unidades 🎉"
              : `Pagaron ${month.unitsPaid} de ${month.unitsTotal} unidades`}
          </p>
          <CollectionMeter
            collectedCents={month.collectedCents}
            pendingCents={month.pendingCents}
            collectedPct={month.collectedPct}
          />
        </>
      )}
    </WidgetCard>
  );
}

/** El mes de la URL, si es uno válido y está dentro de la ventana navegable. */
export function resolvePeriod(value: string | undefined): string {
  const current = currentPeriod();
  if (!value || !isValidPeriodString(value)) return current;
  if (value > current) return current;
  if (value < shiftPeriod(current, -MONTHS_BACK)) return current;
  return value;
}
