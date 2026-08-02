import { formatCurrencyCents } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  collectedCents: number;
  pendingCents: number;
  collectedPct: number;
  className?: string;
};

/**
 * Cuánto se cobró de un mes y cuánto falta: verde lo cobrado, rojo lo que no.
 *
 * Lo que falta va en rojo pleno, no en gris: es lo que tiene que saltar a la
 * vista. Los dos tramos van siempre con su referencia y su monto en texto —
 * verde y rojo es justo el par que no distingue quien tiene daltonismo, así que
 * el color nunca puede ser lo único que diferencie.
 */
export function CollectionMeter({
  collectedCents,
  pendingCents,
  collectedPct,
  className,
}: Readonly<Props>) {
  const pct = Math.max(0, Math.min(100, collectedPct));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        aria-hidden="true"
        className="flex h-3 w-full gap-0.5 rounded-full bg-muted inset-shadow-2xs"
      >
        {pct > 0 && (
          <div
            className="h-full shrink-0 rounded-full bg-success"
            style={{ width: `${pct}%` }}
          />
        )}
        {pct < 100 && <div className="h-full flex-1 rounded-full bg-destructive" />}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <MeterKey
          toneClass="bg-success"
          label="Cobrado"
          value={formatCurrencyCents(collectedCents)}
        />
        {pendingCents > 0 && (
          <MeterKey
            toneClass="bg-destructive"
            label="Falta cobrar"
            value={formatCurrencyCents(pendingCents)}
          />
        )}
      </ul>
    </div>
  );
}

function MeterKey({
  toneClass,
  label,
  value,
}: Readonly<{ toneClass: string; label: string; value: string }>) {
  return (
    <li className="flex items-center gap-1.5 text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", toneClass)}
      />
      {label}:{" "}
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </li>
  );
}
