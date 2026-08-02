import { SkeletonLine, SkeletonPageHeader } from "@/components/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Las cifras al pie de una tarjeta: dt (text-xs) + dd (text-sm). */
function FiguresSkeleton({ count }: { count: 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid gap-2 border-t border-border/60 pt-3",
        count === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4",
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col">
          <SkeletonLine box="h-4" bar="h-3" width="w-16" />
          <SkeletonLine box="h-5" bar="h-3.5" width="w-20" />
        </div>
      ))}
    </div>
  );
}

function MonthRowSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SkeletonLine box="h-6" bar="h-4" width="w-28" />
          <SkeletonLine box="h-4" bar="h-3" width="w-44" />
        </div>
        <FiguresSkeleton count={4} />
      </CardContent>
    </Card>
  );
}

export default function BalanceLoading() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <SkeletonPageHeader />
        <SkeletonLine box="h-5" bar="h-3" width="w-full max-w-md" />

        {/* Plata del consorcio */}
        <Card className="border-l-4 border-l-muted">
          <CardContent className="flex flex-col gap-1 p-5">
            <SkeletonLine box="h-4" bar="h-3" width="w-32" />
            <SkeletonLine box="h-10" bar="h-8" width="w-52" />
            <SkeletonLine box="h-5" bar="h-3" width="w-56" />
          </CardContent>
        </Card>

        {/* El mes elegido: título, flechas y detalle */}
        <section className="flex flex-col gap-3">
          <SkeletonLine box="h-6" bar="h-4" width="w-24" />
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="size-11 shrink-0 rounded-full" />
            <SkeletonLine box="h-5" bar="h-4" width="w-28" />
            <Skeleton className="size-11 shrink-0 rounded-full" />
          </div>
          <Card>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <SkeletonLine box="h-5" bar="h-3.5" width="w-52" />
                  <SkeletonLine box="h-5" bar="h-3.5" width="w-10" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
                <SkeletonLine box="h-4" bar="h-3" width="w-64" />
                <SkeletonLine box="h-5" bar="h-3.5" width="w-48" />
              </div>
              <FiguresSkeleton count={3} />
            </CardContent>
          </Card>
        </section>

        {/* Los otros meses */}
        <section className="flex flex-col gap-3">
          <SkeletonLine box="h-6" bar="h-4" width="w-36" />
          <ul className="flex flex-col gap-3" aria-label="Cargando">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i}>
                <MonthRowSkeleton />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
