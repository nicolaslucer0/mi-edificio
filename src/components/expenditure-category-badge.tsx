import { cn } from "@/lib/utils";
import {
  formatExpenditureCategory,
  type ExpenditureCategory,
} from "@/lib/format";
import { CATEGORY_ICON, CATEGORY_TONE } from "@/lib/expenditure-categories";
import { TILE_TONES } from "@/lib/tones";

export function ExpenditureCategoryBadge({
  category,
}: Readonly<{ category: ExpenditureCategory }>) {
  const Icon = CATEGORY_ICON[category];
  const tone = CATEGORY_TONE[category];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground/80 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full",
          tone ? TILE_TONES[tone] : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-2.5" />
      </span>
      {formatExpenditureCategory(category)}
    </span>
  );
}
