"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPrimaryNavItems, navDirection } from "./nav-items";

type Props = {
  isAdmin: boolean;
  hasAmenities: boolean;
  /** A dónde va "Admin". Ver `getNavItems`. */
  adminHref?: string;
};

export function BottomNav({
  isAdmin,
  hasAmenities,
  adminHref,
}: Readonly<Props>) {
  const pathname = usePathname();
  const items = getPrimaryNavItems(isAdmin, hasAmenities, adminHref);

  const matchedIndex = items.findIndex((item) => item.isActive(pathname));
  /**
   * Las pantallas que se llegan desde "Más" (gastos, novedades, mi cuenta,
   * amenities) no tienen ítem propio en la barra. La pastilla se queda en
   * "Más", que es de donde salieron: así la barra nunca queda sin marcar y
   * siempre se ve por dónde volver.
   */
  const currentIndex = matchedIndex === -1 ? items.length - 1 : matchedIndex;

  /**
   * El ítem tocado, junto con la ruta desde la que se lo tocó.
   *
   * La pastilla se corre en el toque, sin esperar a que cargue la ruta: la
   * navegación tarda lo mismo, pero deja de sentirse como que el toque no
   * entró. Guardar de dónde salimos es lo que después lo da de baja solo:
   * cuando `pathname` cambia, este dato ya es de la pantalla anterior y la
   * pastilla vuelve a mandarse por la ruta real. Sin efectos ni limpieza.
   */
  const [tapped, setTapped] = useState<{ index: number; from: string } | null>(
    null,
  );
  const shownIndex =
    tapped && tapped.from === pathname ? tapped.index : currentIndex;

  return (
    <nav
      aria-label="Navegación principal"
      data-print-hide
      className="vt-bottom-nav nav-progress fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/85 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-md supports-backdrop-filter:bg-background/70 lg:hidden"
    >
      <ul
        className="relative mx-auto grid max-w-2xl"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {/* La pastilla es una sola para toda la barra y vive en su propia capa,
            debajo de los ítems. Se corre de a celdas: un 100% de `translate` es
            exactamente el ancho de un ítem. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1.5 left-0 h-9 transition-[translate] duration-300 ease-settle"
          style={{
            width: `${100 / items.length}%`,
            translate: `${shownIndex * 100}% 0`,
          }}
        >
          <span className="mx-auto block h-9 w-12 rounded-2xl bg-foreground shadow-sm" />
        </span>

        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            // El z-index es para quedar por encima de la pastilla, que al ser
            // absoluta se dibujaría tapando los íconos. Va en el `li` y no en el
            // link porque los ítems de un grid respetan z-index sin necesidad de
            // `position`, y así no hay un `relative` de adorno.
            <li key={item.href} className="z-10">
              <Link
                href={item.href}
                aria-current={item.isActive(pathname) ? "page" : undefined}
                aria-label={item.label}
                transitionTypes={navDirection(currentIndex, index)}
                onClick={() => setTapped({ index, from: pathname })}
                className="group/nav-item flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-1.5 text-[11px] font-medium touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <NavItemVisual
                  Icon={Icon}
                  label={item.label}
                  highlighted={index === shownIndex}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Ojo con dos cosas de accesibilidad:
 * - `aria-current` NO sigue a la pastilla, sigue al pathname real: decirle al
 *   lector de pantalla que ya estás en una página a la que todavía no llegaste
 *   es mentirle. El resaltado es visual, el estado es semántico.
 * - El resaltado solo lo ve quien ve. Por eso va también la región `status`,
 *   que anuncia "Cargando…" mientras dura. Se renderiza siempre (vacía) para
 *   que el lector la tenga registrada antes de que aparezca el texto.
 *
 * La etiqueta no cambia de grosor al activarse aunque en negrita se lea un poco
 * mejor: cambiaba de ancho y se corría sola, y al lado de una pastilla que se
 * desliza ese temblorcito se nota. El color alcanza para distinguirla.
 */
function NavItemVisual({
  Icon,
  label,
  highlighted,
}: Readonly<{ Icon: LucideIcon; label: string; highlighted: boolean }>) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span role="status" className="sr-only">
        {pending ? `Cargando ${label}…` : ""}
      </span>

      {/* `data-nav-pending` es la marca que la barra mira con `:has()` para
          prender su línea de progreso (ver `.nav-progress` en globals.css). El
          dato vive acá adentro —`useLinkStatus` solo funciona dentro de un
          Link— y la línea tiene que cruzar la barra entera: en vez de subir el
          estado con un efecto, lo lee el CSS. */}
      <span
        data-nav-pending={pending ? "" : undefined}
        className={cn(
          "flex h-9 w-12 items-center justify-center transition-[scale,color] duration-300 ease-out",
          highlighted
            ? "scale-100 text-background"
            : "scale-95 text-foreground group-active/nav-item:scale-90",
        )}
      >
        <Icon
          aria-hidden="true"
          className="size-4.5"
          strokeWidth={highlighted ? 2.4 : 2}
        />
      </span>
      <span
        className={cn(
          "leading-none transition-colors",
          highlighted ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </>
  );
}
