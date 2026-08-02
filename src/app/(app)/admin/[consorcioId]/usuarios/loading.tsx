import { SkeletonLine, SkeletonPageHeader } from "@/components/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Una unidad con sus vecinos, dentro de la tarjeta del piso. */
function UnitSkeleton({ people }: { people: number }) {
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <SkeletonLine box="h-5" bar="h-3.5" width="w-24" />
      <ul className="flex flex-col gap-2">
        {Array.from({ length: people }).map((_, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <SkeletonLine box="h-5" bar="h-3.5" width="w-32" />
              <SkeletonLine box="h-4" bar="h-3" width="w-44" />
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Skeleton className="size-7 rounded-lg" />
              <Skeleton className="size-7 rounded-lg" />
            </div>
          </li>
        ))}
      </ul>
    </li>
  );
}

export default function UsuariosLoading() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <SkeletonPageHeader subtitle />

        <div className="flex flex-col gap-6">
          {/* Buscador + botón de alta */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <SkeletonLine box="h-6" bar="h-4" width="w-20" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <Skeleton className="h-12 w-full rounded-lg sm:w-40" />
          </div>

          {/* Vecinos, unidades ocupadas, sin nadie */}
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col rounded-lg bg-muted/50 px-3 py-2"
              >
                <SkeletonLine box="h-4" bar="h-3" width="w-16" />
                <SkeletonLine box="h-7" bar="h-5" width="w-8" />
              </div>
            ))}
          </div>

          {/* Dos pisos con sus unidades */}
          <div className="flex flex-col gap-4">
            {[0, 1].map((floor) => (
              <Card key={floor}>
                <CardContent className="flex flex-col gap-3 p-5">
                  <SkeletonLine box="h-5" bar="h-3.5" width="w-20" />
                  <ul className="flex flex-col divide-y divide-border/60">
                    {[0, 1].map((unit) => (
                      <UnitSkeleton key={unit} people={unit === 0 ? 2 : 1} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
