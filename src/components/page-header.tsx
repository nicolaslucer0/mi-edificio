import Link from "next/link";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "violet" | "blue" | "green" | "amber" | "coral" | "teal";

// Clases completas (no interpolar): Tailwind necesita verlas literales.
const TILE_TONES: Record<Tone, string> = {
  violet: "bg-spot-violet-soft text-spot-violet",
  blue: "bg-spot-blue-soft text-spot-blue",
  green: "bg-spot-green-soft text-spot-green",
  amber: "bg-spot-amber-soft text-spot-amber",
  coral: "bg-spot-coral-soft text-spot-coral",
  teal: "bg-spot-teal-soft text-spot-teal",
};

type Props = {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: React.ReactNode;
};

/**
 * Header consistente para las pantallas internas: botón volver + un tile
 * de ícono con el color de la sección (mismo código de colores que el
 * dashboard) + título y subtítulo opcional, con una acción a la derecha.
 */
export function PageHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  icon: Icon,
  tone = "violet",
  action,
}: Readonly<Props>) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={backHref}
        aria-label={backLabel}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-lg" }),
          "touch-manipulation",
        )}
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </Link>
      {Icon && (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-2xl",
            TILE_TONES[tone],
          )}
        >
          <Icon className="size-5" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
