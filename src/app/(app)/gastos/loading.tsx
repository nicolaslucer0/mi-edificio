import {
  SkeletonExpenditureCard,
  SkeletonLine,
  SkeletonList,
  SkeletonPageHeader,
} from "@/components/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GastosLoading() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <SkeletonPageHeader />
        <SkeletonLine box="h-5" bar="h-3" width="w-full max-w-sm" />
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            {/* Botón "Filtrar" (h-11) y, si hay filtros puestos, sus chips. */}
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-11 w-28 rounded-lg" />
            </div>
            <div className="flex flex-col items-center border-t pt-4">
              <SkeletonLine box="h-4" bar="h-3" width="w-32" />
              <SkeletonLine box="h-9" bar="h-7" width="w-40" />
              <SkeletonLine box="h-4" bar="h-3" width="w-16" />
            </div>
          </CardContent>
        </Card>
        <SkeletonList count={4} Item={SkeletonExpenditureCard} />
      </div>
    </main>
  );
}
