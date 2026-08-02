"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavItems } from "./nav-items";

type Props = {
  isAdmin: boolean;
  hasAmenities: boolean;
};

export function BottomNav({ isAdmin, hasAmenities }: Readonly<Props>) {
  const pathname = usePathname();
  const items = getNavItems(isAdmin, hasAmenities);

  return (
    <nav
      aria-label="Navegación principal"
      data-print-hide
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/85 backdrop-blur-md supports-backdrop-filter:bg-background/70 lg:hidden"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className="group/nav-item flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-1.5 text-[11px] font-medium touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <NavItemVisual Icon={Icon} label={item.label} active={active} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * El ítem se pinta como activo apenas lo tocás, sin esperar a que la ruta
 * termine de cargar. La navegación tarda lo mismo, pero deja de sentirse como
 * que el toque no hizo nada: la respuesta es inmediata y el contenido llega
 * cuando llega.
 *
 * Ojo con dos cosas de accesibilidad:
 * - `aria-current` NO sigue al pending, sigue al pathname real: decirle al
 *   lector de pantalla que ya estás en una página a la que todavía no
 *   llegaste es mentirle. El resaltado es visual, el estado es semántico.
 * - El resaltado solo lo ve quien ve. Por eso va también la región `status`,
 *   que anuncia "Cargando…" mientras dura. Se renderiza siempre (vacía) para
 *   que el lector la tenga registrada antes de que aparezca el texto.
 */
function NavItemVisual({
  Icon,
  label,
  active,
}: Readonly<{ Icon: LucideIcon; label: string; active: boolean }>) {
  const { pending } = useLinkStatus();
  const highlighted = active || pending;

  return (
    <>
      <span role="status" className="sr-only">
        {pending ? `Cargando ${label}…` : ""}
      </span>
      <span
        className={cn(
          "relative flex h-9 w-12 items-center justify-center rounded-2xl transition-all duration-300 ease-out",
          highlighted
            ? "bg-foreground text-background scale-100 shadow-sm"
            : "bg-transparent scale-95 group-hover/nav-item:bg-muted group-active/nav-item:scale-90",
        )}
      >
        <Icon
          aria-hidden="true"
          className="size-4.5 transition-all duration-300"
          strokeWidth={highlighted ? 2.4 : 2}
        />
      </span>
      <span
        className={cn(
          "leading-none transition-colors",
          highlighted
            ? "font-semibold text-foreground"
            : "font-medium text-muted-foreground group-hover/nav-item:text-foreground",
        )}
      >
        {label}
      </span>
    </>
  );
}
