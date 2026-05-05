import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SkeletonHeader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Skeleton className="size-9 shrink-0 rounded-lg" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5 p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

export function SkeletonActionCard() {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Skeleton className="size-10 shrink-0 rounded-2xl" />
        <div className="flex flex-1 flex-col gap-1">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonPeriodCard() {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-40" />
          <div className="mt-1 flex gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="size-5 shrink-0 rounded-md" />
      </CardContent>
    </Card>
  );
}

export function SkeletonExpenseCard() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex items-baseline gap-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-11 w-full rounded-md sm:w-32" />
      </CardContent>
    </Card>
  );
}

export function SkeletonListRow() {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <Skeleton className="h-5 w-16" />
      </CardContent>
    </Card>
  );
}

export function SkeletonExpenditureCard() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex justify-between gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-7 w-32" />
      </CardContent>
    </Card>
  );
}

export function SkeletonPageTitle() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="size-9 shrink-0 rounded-lg" />
      <Skeleton className="h-7 w-48" />
    </div>
  );
}

export function SkeletonList({
  count,
  Item,
}: {
  count: number;
  Item: () => React.JSX.Element;
}) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Cargando">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <Item />
        </li>
      ))}
    </ul>
  );
}
