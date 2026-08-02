"use client";

import {
  createContext,
  useContext,
  useTransition,
  type TransitionStartFunction,
} from "react";
import { cn } from "@/lib/utils";

type FilterTransition = {
  pending: boolean;
  start: TransitionStartFunction;
};

const FilterPendingContext = createContext<FilterTransition | null>(null);

/**
 * Comparte el estado "cargando" entre los filtros y los resultados.
 *
 * Hace falta porque una navegación dentro de `startTransition` mantiene la
 * vista vieja en pantalla y no dispara `loading.tsx`: sin esto, filtrar deja
 * la lista quieta y desactualizada, sin ninguna señal de que algo está
 * pasando. Los filtros disparan la transición; los resultados la escuchan.
 */
export function FilterPendingProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [pending, start] = useTransition();
  return (
    <FilterPendingContext.Provider value={{ pending, start }}>
      {children}
    </FilterPendingContext.Provider>
  );
}

export function useFilterPending(): FilterTransition {
  const context = useContext(FilterPendingContext);
  if (!context) {
    throw new Error(
      "useFilterPending necesita estar dentro de <FilterPendingProvider>.",
    );
  }
  return context;
}

/**
 * Sostiene los resultados en pantalla, atenuados, mientras llegan los nuevos.
 * Mejor que un skeleton: no salta el layout y se sigue viendo de qué estamos
 * hablando.
 */
export function PendingResults({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  const { pending } = useFilterPending();
  return (
    <div
      aria-busy={pending}
      className={cn(
        "flex flex-col gap-6 transition-opacity duration-200 motion-reduce:transition-none",
        pending && "pointer-events-none opacity-50",
        className,
      )}
    >
      {children}
    </div>
  );
}
