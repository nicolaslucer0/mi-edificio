import { Users } from "lucide-react";
import { formatCurrencyCents, formatPeriod } from "@/lib/format";
import { getMonthlyFinancials } from "@/lib/queries/balance";
import { getDebtBoard } from "@/lib/queries/debt-board";
import { WidgetCard } from "./widget-card";
import type { WidgetProps } from "./types";

/**
 * Cómo viene la cobranza **del mes en curso**, cuando la administración activó
 * el estado de pagos y eligió que además aparezca en el inicio.
 *
 * Siempre acotado al mes y con el mes en el título: la deuda acumulada y el
 * listado por unidad viven en /balance, donde el encuadre temporal está claro
 * (ver docs/estado-de-pagos.md).
 */
export async function EstadoDePagosWidget({
  user,
  consorcioId,
}: Readonly<WidgetProps>) {
  const board = await getDebtBoard(user, consorcioId);
  if (!board?.onHome) return null;

  const [month] = await getMonthlyFinancials(user, 1, consorcioId);
  if (!month || month.unitsTotal === 0) return null;

  const allPaid = month.unitsPaid === month.unitsTotal;

  return (
    <WidgetCard
      title={`Cobranza de ${formatPeriod(month.period)}`}
      icon={Users}
      tone="teal"
      action={{
        href: "/balance",
        label: "Ver balance",
        ariaLabel: "Ver el balance del consorcio",
      }}
      contentClassName="flex flex-col gap-1 py-1"
    >
      <p className="text-base font-semibold tracking-tight text-balance">
        {allPaid
          ? "Pagaron todas las unidades 🎉"
          : `Pagaron ${month.unitsPaid} de ${month.unitsTotal} unidades`}
      </p>
      {!allPaid && month.pendingCents > 0 && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Falta cobrar {formatCurrencyCents(month.pendingCents)} de este mes.
        </p>
      )}
    </WidgetCard>
  );
}
