import { SkeletonLine } from "@/components/skeletons";
import { WidgetCardSkeleton } from "@/components/widgets/widget-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Espejo del home: el saludo y la grilla de widgets, con las mismas medidas
 * (mismo `main`, mismo `gap-7`, mismas alturas de línea). Si cambia el orden o
 * el alto de un widget, esto hay que tocarlo — la estructura de cada tarjeta,
 * en cambio, sale de `WidgetCardSkeleton`, que vive al lado de la real.
 */
export default function HomeLoading() {
  return (
    <main className="flex flex-1 flex-col gap-7 px-4 pt-6 pb-10 sm:px-6">
      {/* Saludo: "Buenas tardes," (text-sm) + nombre (text-3xl) + rol (text-sm)
          + resumen (text-base con mt-3). */}
      <section className="mx-auto w-full max-w-2xl">
        <SkeletonLine box="h-5" bar="h-3" width="w-28" />
        <SkeletonLine box="h-9" bar="h-7" width="w-48" />
        <SkeletonLine box="h-5" bar="h-3" width="w-36" className="mt-1" />
        <SkeletonLine box="h-6" bar="h-4" width="w-64" className="mt-3" />
      </section>

      <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-7 sm:grid-cols-2">
        {/* Deuda: card propia, centrada, sin header, con el link debajo. */}
        <section className="flex flex-col gap-3 sm:col-span-2">
          <Card className="border-destructive/15 shadow-sm">
            <CardContent className="flex flex-col items-center gap-3 p-7 text-center sm:p-8">
              <SkeletonLine box="h-4" bar="h-3" width="w-20" />
              <SkeletonLine box="h-12 sm:h-15" bar="h-10" width="w-56" />
              <SkeletonLine box="h-5" bar="h-3" width="w-32" />
              <Skeleton className="mt-3 h-12 w-full max-w-xs rounded-lg" />
            </CardContent>
          </Card>
          <SkeletonLine
            box="h-5"
            bar="h-3"
            width="w-40"
            className="justify-center"
          />
        </section>

        {/* Tu año: síntesis + doce celdas + referencias. */}
        <WidgetCardSkeleton span="full" contentClassName="flex flex-col gap-3">
          <SkeletonLine box="h-5" bar="h-4" width="w-52" />
          <div className="grid grid-cols-12 gap-0.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Skeleton className="aspect-square w-full rounded-sm" />
                <SkeletonLine box="h-3.5" bar="h-2" width="w-5" />
              </div>
            ))}
          </div>
          <SkeletonLine box="h-4" bar="h-3" width="w-44" />
        </WidgetCardSkeleton>

        {/* Cobranza del mes: flechas + titular + barra + referencias. */}
        <WidgetCardSkeleton contentClassName="flex flex-col gap-2">
          <div className="-mt-1 flex items-center justify-between gap-2">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <SkeletonLine box="h-5" bar="h-4" width="w-24" />
            <Skeleton className="size-11 shrink-0 rounded-full" />
          </div>
          <SkeletonLine box="h-6" bar="h-4" width="w-44" />
          <Skeleton className="h-3 w-full rounded-full" />
          <SkeletonLine box="h-4" bar="h-3" width="w-40" />
        </WidgetCardSkeleton>

        {/* Gastos del mes: total grande + tres categorías. */}
        <WidgetCardSkeleton contentClassName="flex flex-col gap-2">
          <SkeletonLine box="h-8" bar="h-6" width="w-36" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex h-5 items-center justify-between gap-3">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </WidgetCardSkeleton>

        {/* Últimos movimientos: tres filas de py-3.5 con separador. */}
        <WidgetCardSkeleton span="full" contentClassName="px-5 py-1">
          <ul>
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className={`flex items-center gap-3 py-3.5 ${
                  i < 2 ? "border-b border-border/50" : ""
                }`}
              >
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col">
                  <SkeletonLine box="h-5" bar="h-3.5" width="w-28" />
                  <SkeletonLine box="h-4" bar="h-3" width="w-20" />
                </div>
                <SkeletonLine box="h-5" bar="h-3.5" width="w-20" />
              </li>
            ))}
          </ul>
        </WidgetCardSkeleton>
      </div>
    </main>
  );
}
