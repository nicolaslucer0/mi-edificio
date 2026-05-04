import {
  Briefcase,
  Hammer,
  Shield,
  Sparkles,
  Tag,
  Trees,
  Wrench,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatExpenditureCategory,
  type ExpenditureCategory,
} from "@/lib/format";

const ICON_BY_CATEGORY: Record<ExpenditureCategory, typeof Hammer> = {
  limpieza: Sparkles,
  mantenimiento: Wrench,
  jardineria: Trees,
  seguridad: Shield,
  servicios: Zap,
  obras: Hammer,
  administracion: Briefcase,
  otros: Tag,
};

export function ExpenditureCategoryBadge({
  category,
}: Readonly<{ category: ExpenditureCategory }>) {
  const Icon = ICON_BY_CATEGORY[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground/80 whitespace-nowrap",
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />
      {formatExpenditureCategory(category)}
    </span>
  );
}
