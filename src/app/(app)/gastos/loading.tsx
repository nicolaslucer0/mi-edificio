import {
  SkeletonExpenditureCard,
  SkeletonList,
  SkeletonPageTitle,
} from "@/components/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GastosLoading() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <SkeletonPageTitle />
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
            <div className="flex flex-col items-center gap-1.5 border-t pt-4">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-3 w-16" />
            </div>
          </CardContent>
        </Card>
        <SkeletonList count={4} Item={SkeletonExpenditureCard} />
      </div>
    </main>
  );
}
