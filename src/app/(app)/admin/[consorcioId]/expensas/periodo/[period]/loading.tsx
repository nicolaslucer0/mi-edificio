import { SkeletonPageTitle } from "@/components/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function UnitGroupSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PeriodDetailLoading() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <SkeletonPageTitle />
          <Skeleton className="h-11 w-24" />
        </div>
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <UnitGroupSkeleton />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
