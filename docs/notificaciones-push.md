# Diseño: notificaciones push

Estado: **propuesta** (pre-desarrollo). Fecha: 2026-08-02.

## Problema

Hoy los avisos importantes —se cargó una expensa nueva, te confirmaron el pago,
hay un pago esperando validación— salen por dos canales: la campanita adentro de
la app y un mail. La campanita solo la ve quien ya entró, y el mail se pierde
entre todo lo demás. El resultado es que el vecino se entera tarde, o no se
entera.

Queremos que el aviso **llegue al teléfono**, como el de cualquier app.

## Lo que falta antes que nada: el service worker

La app **no tiene service worker**. Tiene `manifest.ts`, íconos y el
`InstallPrompt`, pero no hay SW. Eso arrastra dos consecuencias:

1. **En Android probablemente nunca se ofrece instalar.** Chrome solo dispara
   `beforeinstallprompt` si hay un service worker con handler de `fetch`. La
   rama Android de `InstallPrompt` está escuchando un evento que no llega; la de
   iOS funciona porque son instrucciones manuales.
2. **Sin service worker no hay push.** Es requisito del navegador, no una
   opción.

O sea que el SW es el cuello de botella de todo esto, y de paso arregla la
instalación en Android.

## Lo que ya está a favor

Los avisos están **embudados en una sola función**. Las tres
`notifyClaimToValidate`, `notifyPaymentResolved` y `notifyNewExpense` terminan
todas en `insertNotifications`, y el filtro por preferencias
(`prefAllows`) corre antes.

**Ese es el punto de enganche:** el push se manda desde adentro de
`insertNotifications`, así que sale para los tres avisos de hoy y para todos los
que agreguemos después, sin tocar cada uno. No hay que rehacer nada.

## Decisiones tomadas

- **Push como tercer canal, no como reemplazo.** La campanita y el mail siguen.
  Un push no leído se pierde para siempre; la campanita queda.
- **Una suscripción por dispositivo, no por usuario.** El mismo vecino puede
  tener el teléfono y la computadora. Cada uno se suscribe y se da de baja por
  separado.
- **El permiso se pide desde un botón, nunca al cargar.** Los navegadores
  penalizan pedirlo de entrada y el usuario que rechaza no puede volver atrás
  sin ir a la configuración del navegador. Va un botón explícito: "Activar
  avisos en este teléfono".
- **Se respetan las preferencias que ya existen.** `notificationPrefs` filtra
  igual que hoy: si apagaste "nueva expensa", no llega ni el mail ni el push.
- **Suscripción muerta = se borra.** Cuando el servicio de push responde 404 o
  410, el endpoint ya no existe (el vecino desinstaló, limpió datos). Se elimina
  la fila en el momento, sin reintentos.

## Modelo de datos

Tabla nueva **`pushSubscriptions`**:

| Columna | Tipo | Para qué |
|---|---|---|
| `id` | uuid | |
| `userId` | text → `user.id`, cascade | De quién es el dispositivo |
| `endpoint` | text, único | La URL que da el navegador; identifica al dispositivo |
| `p256dh` | text | Clave pública del navegador, para cifrar el mensaje |
| `auth` | text | Secreto de autenticación del navegador |
| `userAgent` | text (nullable) | Para poder listar "Chrome en Android" en Cuenta |
| `createdAt` | timestamp | |

Índice por `userId` (se consulta al mandar) y único en `endpoint` (el navegador
puede reenviar la misma suscripción; el alta es un upsert).

**No se guarda nada del contenido de los avisos acá:** eso ya vive en la tabla
`notifications`.

## Flujos

### Activar (vecino)

1. En **Cuenta** hay una tarjeta "Avisos en este dispositivo" con el estado
   actual y un botón.
2. Al tocarlo se pide el permiso del navegador, se crea la suscripción con la
   clave pública VAPID y se manda al servidor.
3. El servidor la guarda y **manda un push de prueba en el momento**: sin eso el
   vecino no tiene forma de saber si funcionó.
4. Si el permiso está denegado a nivel navegador, el botón se reemplaza por la
   explicación de cómo habilitarlo, porque desde la página ya no se puede pedir
   de nuevo.

### Enviar (servidor)

Dentro de `insertNotifications`, después de escribir en la base:

1. Buscar las suscripciones de los destinatarios.
2. Mandar en paralelo con `web-push`, con el mismo título y cuerpo que ya se
   arman para la campanita, más el `href` como dato para el click.
3. Los errores **no cortan la operación**: si falla el push, la expensa ya se
   creó igual. Mismo criterio que el `safe()` que ya envuelve a los `notify*`.
4. 404 o 410 → borrar esa suscripción.

### Recibir (service worker)

- `push` → mostrar la notificación con el ícono de la app.
- `notificationclick` → si ya hay una ventana de la app abierta, enfocarla y
  navegar al `href`; si no, abrirla ahí.

## La letra chica de iOS

Web Push funciona en iOS **desde 16.4 y solo si la app está agregada a la
pantalla de inicio**. En Safari normal no existe, y no hay forma de saltearlo.

Con nuestro público eso cambia una prioridad: **"agregar a inicio" pasa a ser
parte del onboarding**, no un extra que ofrecemos de costado. El `InstallPrompt`
que ya existe tiene que volverse más explícito para iOS, y la tarjeta de Cuenta
tiene que explicar por qué el botón no está disponible cuando se abre desde
Safari.

## Dos cosas que aparecieron en el camino

1. **`dueDateReminder` es una preferencia que no hace nada.** Está en
   `NotificationPrefs` y el usuario "puede" apagarla, pero no hay ningún cron
   que mande recordatorios de vencimiento — el único cron es el reporte mensual
   del día 1. O se implementa (es el aviso más útil de todos: "tu expensa vence
   mañana") o se saca de las preferencias.
2. **Ninguna pantalla edita las preferencias.** `notificationPrefs` se guarda y
   se respeta, pero no hay UI para cambiarla: nadie puede apagar nada. La
   tarjeta de avisos en Cuenta es el lugar natural para las dos cosas.

## Impacto en archivos (estimado)

- `public/sw.js` (nuevo) — service worker: `fetch`, `push`, `notificationclick`.
- `components/service-worker-register.tsx` (nuevo) — lo registra en el cliente.
- `db/schema.ts` — tabla `pushSubscriptions` + migración.
- `lib/push.ts` (nuevo) — claves VAPID, envío, borrado de suscripciones muertas.
- `lib/notifications.ts` — `insertNotifications` manda push además de escribir.
- `lib/actions/push.ts` (nuevo) — suscribir y desuscribir.
- `app/(app)/cuenta/**` — tarjeta "Avisos en este dispositivo" + preferencias.
- `components/install-prompt.tsx` — instrucciones de iOS más explícitas.
- Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. La pública
  también como `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, que la necesita el navegador.

## Fuera de alcance

- **Empaquetar la app para las tiendas** (Capacitor). El push es prerrequisito
  de eso igual, y sin tiendas ya resuelve el problema real, que es que el aviso
  llegue. Ver la conversación sobre app nativa: Flutter queda descartado porque
  obliga a construir una API que hoy no existe y a hacer cada feature dos veces.
- **Notificaciones agrupadas o resumen diario.** Con el volumen de un consorcio
  (una expensa por mes, algún pago suelto) no hace falta.
