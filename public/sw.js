/**
 * Service worker de Mi edificio.
 *
 * Hace dos cosas, y las dos hacen falta:
 *
 * 1. Recibe las notificaciones push y las muestra. Sin service worker no hay
 *    push: es requisito del navegador, no una opción.
 * 2. Tiene un handler de `fetch`. Chrome solo ofrece instalar la app si existe
 *    uno, así que sin esto el "agregar a pantalla de inicio" de Android nunca
 *    se ofrece solo.
 *
 * No cachea nada a propósito: la app muestra plata y deudas, y servir una
 * pantalla vieja desde el caché sería peor que no mostrarla. El handler deja
 * pasar todo a la red.
 */

self.addEventListener("install", () => {
  // Tomar el control sin esperar a que se cierren las pestañas viejas.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Sin caché: el navegador resuelve todo contra la red como siempre.
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Mi edificio", body: event.data.text(), href: "/" };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Mi edificio", {
      body: payload.body ?? undefined,
      icon: "/icon",
      badge: "/icon",
      lang: "es-AR",
      // Agrupa por destino: dos avisos de la misma pantalla no apilan dos
      // globos, se reemplazan.
      tag: payload.href ?? "mi-edificio",
      renotify: true,
      data: { href: payload.href ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href ?? "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Si la app ya está abierta, se enfoca esa ventana en vez de abrir otra.
      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(href);
          return;
        }
      }

      await self.clients.openWindow(href);
    })(),
  );
});
