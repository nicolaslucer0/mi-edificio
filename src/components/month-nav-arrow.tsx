"use client";

import { useLinkStatus } from "next/link";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

/**
 * La flecha del mes, que se convierte en spinner mientras carga.
 *
 * Va en su propio componente cliente porque `useLinkStatus` solo funciona
 * adentro de un `<Link>`, y `MonthNav` tiene que seguir siendo de servidor
 * (recibe `hrefFor`, que es una función y no cruza el límite).
 */
export function MonthNavArrowIcon({
  direction,
}: Readonly<{ direction: "prev" | "next" }>) {
  const { pending } = useLinkStatus();

  if (pending) {
    return (
      <Loader2
        aria-hidden="true"
        className="size-5 animate-spin motion-reduce:animate-none"
      />
    );
  }

  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return <Icon aria-hidden="true" className="size-5" />;
}
