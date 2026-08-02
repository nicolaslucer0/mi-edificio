import { Receipt } from "lucide-react";
import {
  formatCurrencyCents,
  formatExpenditureCategory,
  formatPeriod,
} from "@/lib/format";
import { getMonthExpenditureBreakdown } from "@/lib/queries/balance";
import { WidgetCard } from "./widget-card";
import { resolvePeriod } from "./estado-de-pagos";
import type { WidgetProps } from "./types";

/** Cuántas categorías se listan antes de agrupar el resto. */
const TOP_CATEGORIES = 3;

/**
 * La contracara del widget de cobranza: qué salió en el mes y en qué se fue.
 * Sigue el mismo mes que la cobranza (el parámetro `mes` de la URL), así las
 * dos tarjetas hablan siempre del mismo período.
 */
export async function GastosDelMesWidget({
  user,
  consorcioId,
  searchParams,
}: Readonly<WidgetProps>) {
  const period = resolvePeriod(searchParams.mes);
  const breakdown = await getMonthExpenditureBreakdown(
    user,
    period,
    consorcioId,
  );

  const top = breakdown.byCategory.slice(0, TOP_CATEGORIES);
  const restCents = breakdown.byCategory
    .slice(TOP_CATEGORIES)
    .reduce((sum, c) => sum + c.amountCents, 0);

  return (
    <WidgetCard
      title={`Gastos de ${formatPeriod(period)}`}
      icon={Receipt}
      tone="amber"
      action={{
        href: "/gastos",
        label: "Ver detalle",
        ariaLabel: "Ver el detalle de los gastos del consorcio",
      }}
      contentClassName="flex flex-col gap-2"
    >
      <p className="text-2xl font-bold tracking-tight">
        {formatCurrencyCents(breakdown.totalCents)}
      </p>
      {/* Un mes sin gastos se muestra igual, en cero: esconder la tarjeta haría
          parecer que el dato no existe, cuando la respuesta es "no se gastó". */}
      {breakdown.totalCents === 0 && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          No se cargaron gastos en este mes.
        </p>
      )}
      <dl className="flex flex-col gap-1 text-sm">
        {top.map((item) => (
          <div key={item.category} className="flex justify-between gap-3">
            <dt className="truncate text-muted-foreground">
              {formatExpenditureCategory(item.category)}
            </dt>
            <dd className="shrink-0 font-medium tabular-nums">
              {formatCurrencyCents(item.amountCents)}
            </dd>
          </div>
        ))}
        {restCents > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="truncate text-muted-foreground">Otros</dt>
            <dd className="shrink-0 font-medium tabular-nums">
              {formatCurrencyCents(restCents)}
            </dd>
          </div>
        )}
      </dl>
    </WidgetCard>
  );
}
