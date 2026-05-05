import {
  SkeletonExpenseCard,
  SkeletonList,
  SkeletonPageTitle,
} from "@/components/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpensasLoading() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <SkeletonPageTitle />
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-2/3" />
          </CardContent>
        </Card>
        <SkeletonList count={4} Item={SkeletonExpenseCard} />
      </div>
    </main>
  );
}
