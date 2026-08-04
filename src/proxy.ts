export { auth as proxy } from "@/lib/auth";

export const config = {
  /**
   * Todo pasa por el proxy salvo lo que tiene que ser público.
   *
   * Dos cosas que no son obvias: los archivos de `public/` también entran acá
   * (el runtime no los excluye, los excluimos nosotros), y todo lo que queda
   * adentro y no está en la allowlist de `authorized` termina redirigido a
   * `/login` — también para un cliente que no es un navegador y no tiene cookie.
   *
   * - `.well-known` → el `assetlinks.json` del TWA lo baja Google desde sus
   *   servidores, sin sesión. Si se come el redirect, la app de Android no
   *   verifica el dominio y abre con la barra de URL arriba. Ver
   *   `docs/app-android.md`.
   * - `manifest.webmanifest`, `sw.js` y los íconos → los pide el navegador para
   *   instalar la PWA y para el push, y no siempre manda la cookie.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|\\.well-known|manifest\\.webmanifest|sw\\.js|icon|apple-icon).*)",
  ],
};
