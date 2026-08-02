"use client";

import { useEffect } from "react";

/**
 * Registra el service worker apenas carga la app.
 *
 * Va global y no dentro de la pantalla de avisos porque el SW hace dos cosas:
 * habilita el push y, con su handler de `fetch`, es lo que hace que Chrome
 * ofrezca instalar la app en Android. Si solo se registrara al activar los
 * avisos, la instalación seguiría sin ofrecerse.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Después del load: registrar durante el arranque compite con la carga
    // de la página por el mismo ancho de banda.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("No se pudo registrar el service worker", error);
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
