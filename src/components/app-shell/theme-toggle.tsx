"use client";

import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}> = [
  { value: "light", label: "Claro", hint: "Fondo blanco", icon: Sun },
  { value: "dark", label: "Oscuro", hint: "Fondo negro", icon: Moon },
  {
    value: "system",
    label: "Automático",
    hint: "Sigue al teléfono",
    icon: Monitor,
  },
];

/**
 * Elige entre claro, oscuro y automático.
 *
 * Las tres opciones van escritas, no un botón que cicla: con un botón que
 * cambia solo no se sabe en qué estado quedó ni cuál es el próximo.
 *
 * El ícono del botón se resuelve con CSS (`dark:hidden` / `hidden dark:block`)
 * en vez de leer el tema en JavaScript. Leerlo obligaría a esperar a que el
 * componente monte para no romper la hidratación, y eso deja el botón vacío o
 * parpadeando en la primera pintura.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Cambiar entre modo claro y oscuro"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
      >
        <Sun aria-hidden="true" className="size-5 dark:hidden" />
        <Moon aria-hidden="true" className="hidden size-5 dark:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-52">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className="cursor-pointer"
            >
              <Icon aria-hidden="true" />
              <span className="flex flex-1 flex-col leading-tight">
                <span>{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.hint}
                </span>
              </span>
              {theme === option.value && (
                <Check aria-hidden="true" className="size-4" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
