import { formatCurrencyCents } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import type { DebtBoard, DebtBoardUnit } from "@/lib/queries/debt-board";
import { cn } from "@/lib/utils";

/**
 * El agregado del consorcio: cuántas unidades están al día y cuánto falta
 * cobrar. Es lo único que se muestra en el nivel `resumen`.
 */
export function DebtBoardSummary({
  board,
  className,
}: Readonly<{ board: DebtBoard; className?: string }>) {
  const allUpToDate = board.upToDateUnits === board.totalUnits;

  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-1 p-5">
        <p className="text-lg font-bold tracking-tight text-balance">
          {allUpToDate
            ? "Todas las unidades están al día 🎉"
            : `${board.upToDateUnits} de ${board.totalUnits} unidades al día`}
        </p>
        {!allUpToDate && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Faltan cobrar{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatCurrencyCents(board.overdueTotalCents)}
            </span>{" "}
            de expensas vencidas.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * El listado del nivel `por_unidad`: unidad y monto adeudado, sin nombres y sin
 * ranking — el orden es por piso y unidad, como en el resto de la app.
 */
export function DebtBoardUnits({
  units,
}: Readonly<{ units: readonly DebtBoardUnit[] }>) {
  if (units.length === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-col divide-y divide-border/60 p-0">
        {units.map((unit) => (
          <div
            key={unit.unitId}
            className={cn(
              "flex items-center justify-between gap-3 px-5 py-3",
              unit.isMine && "bg-muted/40",
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {unit.label}
                {unit.isMine && (
                  <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Tu unidad
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {unit.overdueCount === 1
                  ? "1 expensa vencida"
                  : `${unit.overdueCount} expensas vencidas`}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-destructive">
              {formatCurrencyCents(unit.amountCents)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
