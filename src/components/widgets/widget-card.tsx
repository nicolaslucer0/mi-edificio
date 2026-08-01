import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TILE_TONES, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

type Props = {
  /** Ancho en desktop. En mobile todos ocupan la fila completa. */
  span?: "full" | "half";
  title?: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: { href: string; label: string; ariaLabel?: string };
  /**
   * No envuelve el contenido en una Card: el widget dibuja la suya porque
   * necesita un aspecto propio (la tarjeta de deuda, por ejemplo).
   */
  bare?: boolean;
  className?: string;
  contentClassName?: string;
  /** Contenido debajo de la card, fuera de ella (links, notas al pie). */
  footer?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Shell común de los widgets del home: la celda de la grilla, el header
 * opcional (ícono + título + acción) y la card con el contenido.
 *
 * Es el widget —vía este shell— el que dibuja su celda. Por eso un widget que
 * devuelve `null` antes de llegar acá no deja un hueco vacío en la grilla.
 */
export function WidgetCard({
  span = "half",
  title,
  icon: Icon,
  tone = "violet",
  action,
  bare = false,
  className,
  contentClassName,
  footer,
  children,
}: Readonly<Props>) {
  return (
    <section
      className={cn("flex flex-col gap-3", span === "full" && "sm:col-span-2")}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {Icon && (
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-xl",
                  TILE_TONES[tone],
                )}
              >
                <Icon className="size-4" />
              </span>
            )}
            {title && (
              <h2 className="truncate text-base font-semibold tracking-tight">
                {title}
              </h2>
            )}
          </div>
          {action && (
            <Link
              href={action.href}
              aria-label={action.ariaLabel}
              className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground touch-manipulation"
            >
              {action.label}
            </Link>
          )}
        </header>
      )}

      {bare ? (
        children
      ) : (
        <Card className={className}>
          <CardContent className={contentClassName}>{children}</CardContent>
        </Card>
      )}

      {footer}
    </section>
  );
}
