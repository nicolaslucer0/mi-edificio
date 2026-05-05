import {
  SkeletonExpenseCard,
  SkeletonList,
  SkeletonPageTitle,
} from "@/components/skeletons";

export default function AprobarPagosLoading() {
  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <SkeletonPageTitle />
        <SkeletonList count={3} Item={SkeletonExpenseCard} />
      </div>
    </main>
  );
}
