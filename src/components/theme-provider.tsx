"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Pone la clase `.dark` en el <html> según lo que haya elegido el usuario.
 *
 * La paleta oscura ya existía entera en globals.css y las clases `dark:` están
 * repartidas por toda la app: lo único que faltaba era alguien que activara la
 * clase.
 *
 * `disableTransitionOnChange` corta las transiciones de color mientras cambia
 * el tema. Sin eso, como media app tiene `transition-colors`, el cambio se ve
 * como un barrido desprolijo en vez de un corte limpio.
 */
export function ThemeProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
