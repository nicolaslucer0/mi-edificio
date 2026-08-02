"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * `true` cuando la media query da positivo. En el servidor devuelve `false`,
 * o sea que la primera pintura asume mobile: es el caso más común y el que
 * evita que el layout salte en el teléfono.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
