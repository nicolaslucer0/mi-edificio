import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatPeriod, shiftPeriod } from "@/lib/format";
import { MonthNavArrowIcon } from "@/components/month-nav-arrow";
import { cn } from "@/lib/utils";

type Props = {
  period: string;
  /** A dónde apunta cada flecha. */
  hrefFor: (period: string) => string;
  /** Mes más viejo y más nuevo que se pueden elegir, inclusive. */
  minPeriod: string;
  maxPeriod: string;
  className?: string;
};

/**
 * Flechas para moverse mes a mes. Son links, así que andan sin JavaScript y el
 * mes queda en la URL: se puede compartir o volver con el botón de atrás.
 */
export function MonthNav({
  period,
  hrefFor,
  minPeriod,
  maxPeriod,
  className,
}: Readonly<Props>) {
  const previous = shiftPeriod(period, -1);
  const next = shiftPeriod(period, 1);

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <Arrow
        href={previous >= minPeriod ? hrefFor(previous) : null}
        label={`Ir a ${formatPeriod(previous)}`}
        direction="prev"
      />
      <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold tracking-tight">
        {formatPeriod(period)}
      </p>
      <Arrow
        href={next <= maxPeriod ? hrefFor(next) : null}
        label={`Ir a ${formatPeriod(next)}`}
        direction="next"
      />
    </div>
  );
}

function Arrow({
  href,
  label,
  direction,
}: Readonly<{
  href: string | null;
  label: string;
  direction: "prev" | "next";
}>) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const shared =
    "flex size-11 shrink-0 items-center justify-center rounded-full touch-manipulation";

  if (!href) {
    return (
      <span
        aria-hidden="true"
        className={cn(shared, "text-muted-foreground/30")}
      >
        <Icon className="size-5" />
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      scroll={false}
      className={cn(
        shared,
        "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
      )}
    >
      <MonthNavArrowIcon direction={direction} />
    </Link>
  );
}
