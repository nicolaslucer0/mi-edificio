import * as Sentry from "@sentry/nextjs";

/**
 * Reporte de errores del servidor.
 *
 * Va solo en el servidor a propósito: el SDK del cliente suma cerca de 80 KB
 * al bundle, y los usuarios de esta app abren desde teléfonos viejos con
 * conexiones flojas. Los errores que importan —acciones de servidor, base de
 * datos, cron, envío de push— pasan todos por acá. Si algún día hace falta
 * también el del navegador, es un archivo más.
 *
 * Sin `SENTRY_DSN` el SDK queda apagado y la app anda igual: en local no manda
 * nada y en producción arranca cuando se carga la variable.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN),

  // Sin performance monitoring: consume la cuota del plan gratis muy rápido y
  // acá lo que se quiere saber es qué se rompió, no cuánto tardó.
  tracesSampleRate: 0,

  // No mandar cookies ni headers de la request: la sesión viaja ahí.
  sendDefaultPii: false,

  environment: process.env.VERCEL_ENV ?? "development",
});
