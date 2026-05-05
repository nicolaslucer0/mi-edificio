import {
  SkeletonActionCard,
  SkeletonStatCard,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConsorcioDashboardLoading() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-3 w-2/3" />
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>

        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-24" />
          <div className="grid gap-3 sm:grid-cols-2">
            <SkeletonActionCard />
            <SkeletonActionCard />
            <SkeletonActionCard />
            <SkeletonActionCard />
            <SkeletonActionCard />
          </div>
        </div>
      </div>
    </main>
  );
}
