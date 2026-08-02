import * as Sentry from "@sentry/nextjs";

/**
 * Next llama a esto una vez, al arrancar el servidor.
 *
 * Solo se inicializa en el runtime de Node: las funciones edge no corren nada
 * de esta app.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
}

/**
 * Captura todo error no manejado que ocurra renderizando una página, una
 * acción de servidor o un route handler. Es el que agarra lo que hoy no se
 * entera nadie.
 */
export const onRequestError = Sentry.captureRequestError;
