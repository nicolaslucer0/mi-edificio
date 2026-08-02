import "server-only";
import * as Sentry from "@sentry/nextjs";

/**
 * Reporta un error que ya está manejado.
 *
 * Los errores que la app traga a propósito —un mail que no salió, un push que
 * falló, un comprobante que no subió— son justamente los que nadie descubre
 * nunca: la operación sigue y no queda rastro más que un `console.error` en un
 * log que expira. Esto los manda a Sentry además de imprimirlos.
 *
 * Para los errores NO manejados no hace falta llamar a nada: los captura
 * `onRequestError` en `instrumentation.ts`.
 */
export function reportError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  console.error(context?.scope ?? "error", error, context ?? "");
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
