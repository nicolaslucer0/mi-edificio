import {
  SkeletonList,
  SkeletonPageTitle,
  SkeletonPeriodCard,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminExpensasLoading() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <SkeletonPageTitle />
          <Skeleton className="h-11 w-24" />
        </div>
        <SkeletonList count={5} Item={SkeletonPeriodCard} />
      </div>
    </main>
  );
}
