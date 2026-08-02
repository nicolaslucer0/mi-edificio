import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
    // Los comprobantes se suben por Server Action vía FormData. El default de
    // 1MB rechaza el request antes de correr la validación de 4MB, y una foto
    // de celular casi siempre pesa más. Damos holgura sobre el tope de la UI.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

/**
 * El plugin de Sentry sube los source maps del servidor para que los stack
 * traces se lean con nombres reales en vez de código minificado.
 *
 * Solo corre si hay `SENTRY_AUTH_TOKEN`: sin el token, los builds locales y
 * los previews compilan igual, sin intentar subir nada ni fallar por eso.
 */
export default withSentryConfig(nextConfig, {
  org: "38026836-yy",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    // Los mapas se suben a Sentry y se borran del build: si quedaran
    // publicados, cualquiera puede leer el código del servidor.
    deleteSourcemapsAfterUpload: true,
  },
  // El SDK del navegador no entra porque no existe un archivo de config de
  // cliente, no por estas opciones. Verificado: el bundle quedó en los mismos
  // 1580 KB y "sentry" no aparece en ningún chunk del cliente.
  disableLogger: true,
  telemetry: false,
});
