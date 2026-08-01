import { Users } from "lucide-react";
import { formatCurrencyCents } from "@/lib/format";
import { getDebtBoard } from "@/lib/queries/debt-board";
import { WidgetCard } from "./widget-card";
import type { WidgetProps } from "./types";

/**
 * El agregado del consorcio, cuando la administración lo activó y eligió que
 * además aparezca en el home. El listado por unidad nunca sale acá: para eso
 * hay que entrar a /balance (ver docs/estado-de-pagos.md).
 */
export async function EstadoDePagosWidget({
  user,
  consorcioId,
}: Readonly<WidgetProps>) {
  const board = await getDebtBoard(user, consorcioId);
  if (!board || !board.onHome || board.totalUnits === 0) return null;

  const allUpToDate = board.upToDateUnits === board.totalUnits;

  return (
    <WidgetCard
      title="Estado de pagos"
      icon={Users}
      tone="teal"
      action={{
        href: "/balance",
        label: "Ver detalle",
        ariaLabel: "Ver el estado de pagos del consorcio",
      }}
      contentClassName="flex flex-col gap-1 py-1"
    >
      <p className="text-base font-semibold tracking-tight text-balance">
        {allUpToDate
          ? "Todas las unidades están al día 🎉"
          : `${board.upToDateUnits} de ${board.totalUnits} unidades al día`}
      </p>
      {!allUpToDate && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Faltan cobrar {formatCurrencyCents(board.overdueTotalCents)} en el
          consorcio.
        </p>
      )}
    </WidgetCard>
  );
}
