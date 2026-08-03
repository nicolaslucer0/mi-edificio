# Diseño: comunicados y consultas

Estado: **propuesta** (pre-desarrollo). Fecha: 2026-08-03.

## Problema

Los cinco avisos que existen son todos de plata y todos automáticos. Pero lo que
más circula en un consorcio no es plata:

> "Mañana cortan el agua de 9 a 12"
> "Asamblea el jueves 20 a las 19"
> "3° B, te dejaron una encomienda en portería"

Hoy eso va por WhatsApp o por un papel en el ascensor, y **el administrador no
tiene forma de mandar un aviso desde la app**. Del otro lado, el vecino no tiene
forma de preguntarle nada: la app es de una sola vía.

Este documento cubre las dos direcciones, porque son el mismo canal.

## Son dos objetos distintos, no uno

Es tentador modelar todo como "mensajes". No conviene:

- Un **comunicado** es difusión: uno a muchos, sin respuesta esperada, y el
  administrador quiere ver qué mandó.
- Una **consulta** es conversación: uno a uno, con ida y vuelta, y con un estado
  ("¿ya lo resolví?").

Unificarlos empeora los dos casos: un comunicado a 20 unidades se convertiría en
20 conversaciones, y una consulta perdería el hilo.

## Comunicados (admin → vecinos)

### Decisiones tomadas

- **A todo el consorcio o a una unidad.** El default es todo el consorcio; una
  unidad puntual sirve para "te dejaron una encomienda".
- **No se pueden silenciar.** Los otros cinco avisos sí. Este es el canal del
  administrador: si el vecino lo apaga, la función deja de tener sentido. Mismo
  criterio que el magic link, que tampoco es opcional.
- **El mail es opcional y lo decide el admin al mandarlo.** Un corte de agua para
  mañana sí; "se pintó el palier" no. Va un tilde en el formulario.
- **Queda historial**, y no es un extra: "yo nunca me enteré" se responde solo.
- **Botón "copiar para WhatsApp"** en el panel: copia el comunicado ya formateado
  para pegarlo en el grupo del consorcio. Es lo que cubre a los vecinos que
  nunca van a instalar la app, sin pagarle a Meta ni pasar por la verificación
  de negocio de la Business Platform (ver la conversación sobre WhatsApp).

### Modelo de datos

**`announcements`**

| Columna | Tipo | Para qué |
|---|---|---|
| `id` | uuid | |
| `consorcioId` | uuid → `consorcio.id`, cascade | |
| `unitId` | uuid → `unit.id`, nullable, set null | Null = todo el consorcio |
| `title` | text | |
| `body` | text | |
| `emailSent` | boolean, default false | Si además salió por mail |
| `createdByUserId` | text → `user.id` | Quién lo mandó |
| `createdAt` | timestamp | |

Índice por `(consorcioId, createdAt)`, que es como se lista.

### Dónde se lee

- **Widget en el home** con el último comunicado. Entra por el sistema de
  [widgets](./home-widgets.md), así que no hay que tocar `page.tsx`.
- **`/comunicados`**: la lista completa del consorcio actual.
- La notificación apunta a `/comunicados`. No va un ítem nuevo en la barra: se
  llega desde el widget y desde la campanita, y la barra ya tiene seis.

## Consultas (vecinos → admin)

### Decisiones tomadas

- **Es un hilo, no un mensaje suelto.** Con una sola respuesta, el vecino que
  quiere aclarar algo tiene que abrir otra consulta y el admin pierde el
  contexto.
- **Tres estados**: `abierta` (espera al admin), `respondida` (espera al vecino,
  o nada) y `cerrada` (resuelta). El admin es el que cierra.
- **Privadas.** Las ve el autor, los admins del consorcio y el super_admin.
  **Ningún otro vecino**, ni siquiera de la misma unidad si no es el autor. Esto
  es lo contrario del estado de pagos, que es deliberadamente visible.
- **Sin adjuntos en la primera versión.** Para mandar un comprobante ya existe
  "Ya pagué", que lo asocia a la expensa correcta. Sumar adjuntos acá es una
  segunda forma peor de hacer lo mismo.
- **La unidad del autor viaja en la consulta**, para que el admin sepa de qué
  departamento le están escribiendo sin tener que buscarlo.

### Modelo de datos

**`inquiries`**

| Columna | Tipo | Para qué |
|---|---|---|
| `id` | uuid | |
| `consorcioId` | uuid → `consorcio.id`, cascade | |
| `unitId` | uuid → `unit.id`, nullable, set null | Contexto para el admin |
| `createdByUserId` | text → `user.id`, cascade | |
| `subject` | text | |
| `status` | enum `inquiry_status`: `abierta`, `respondida`, `cerrada` | |
| `createdAt` / `lastMessageAt` | timestamp | Se ordena por actividad, no por alta |

**`inquiryMessages`**

| Columna | Tipo |
|---|---|
| `id` | uuid |
| `inquiryId` | uuid → `inquiries.id`, cascade |
| `authorUserId` | text → `user.id` |
| `body` | text |
| `createdAt` | timestamp |

Índices: `(consorcioId, status)` para la bandeja del admin, `(inquiryId, createdAt)`
para el hilo.

`lastMessageAt` se actualiza en cada mensaje: sin eso, ordenar por actividad
obliga a un join con agregación en cada listado.

### Dónde se lee

- **Vecino**: `/consultas` (sus consultas) y `/consultas/[id]` (el hilo).
- **Admin**: `/admin/[consorcioId]/consultas`, con las abiertas primero, y
  tarjeta con contador en el panel del consorcio — igual que "Aprobar pagos",
  que ya usa ese patrón.

## Avisos nuevos

Tres tipos que se suman al enum `notification_type`:

| Tipo | Se dispara | Le llega a | Se puede silenciar |
|---|---|---|---|
| `announcement` | El admin manda un comunicado | Vecinos del consorcio o de la unidad | **No** |
| `inquiry_new` | El vecino abre una consulta | Admins del consorcio | Sí |
| `inquiry_reply` | Cualquiera responde en un hilo | La otra parte | Sí |

Los tres salen por campanita y push sin trabajo extra: `insertNotifications` ya
es el embudo (ver [notificaciones push](./notificaciones-push.md)).

**Cambio necesario en las preferencias:** hoy `PREF_BY_TYPE` es un `Record`
total, así que todo tipo nuevo necesita una preferencia. Pasa a ser parcial y
`prefAllows` devuelve `true` cuando no hay mapeo — que es exactamente "este
aviso no se silencia". `announcement` no lleva entrada; los otros dos sí.

## Autorización

| Acción | Quién |
|---|---|
| Mandar un comunicado | Admin del consorcio (y super_admin) |
| Leer comunicados | Cualquier miembro del consorcio |
| Abrir una consulta | Owner o tenant de una unidad del consorcio |
| Leer/responder una consulta | Su autor, y los admins del consorcio |
| Cerrar una consulta | Solo el admin |

## Límites y reglas

1. **El autor de un comunicado no se notifica a sí mismo.**
2. **Sin adjuntos, sin categorías, sin asignación a un admin puntual.** Un
   consorcio tiene un administrador; asignar no resuelve nada todavía.
3. **Sin acuses de lectura.** Saber quién leyó qué invita a discusiones que la
   app no tiene por qué mediar.
4. **Largo máximo**: título 120, cuerpo 2000. Un comunicado que no entra en 2000
   caracteres es un PDF, no un aviso.

## Fuera de alcance

- **Salida por la API de WhatsApp.** El botón de copiar cubre el caso a costo
  cero. Cuando haya varios consorcios y copiar a mano no escale, se evalúa.
- **Entrada por WhatsApp para registrar pagos.** Ya existe "Ya pagué", que
  registra sin ambigüedad usuario, expensa, monto y comprobante.
- **Consulta enlazada a un comunicado** ("preguntar sobre esto"). Es un
  `announcementId` nullable en `inquiries` y una entrada más; se agrega cuando
  se vea si hace falta.

## Orden de implementación

1. **Comunicados**: schema, envío, widget del home, `/comunicados`, panel del
   admin con el botón de copiar. Es la mitad más chica y la que más se usa.
2. **Consultas**: schema, bandeja del admin, hilo, avisos de ida y vuelta.

## Impacto en archivos (estimado)

- `db/schema.ts` — `announcements`, `inquiries`, `inquiryMessages`, enum
  `inquiry_status`, tres valores nuevos en `notification_type`.
- `lib/notifications.ts` — `notifyAnnouncement`, `notifyInquiryNew`,
  `notifyInquiryReply`; `PREF_BY_TYPE` pasa a parcial.
- `lib/queries/announcements.ts`, `lib/queries/inquiries.ts` (nuevos).
- `lib/actions/announcements.ts`, `lib/actions/inquiries.ts` (nuevos).
- `app/(app)/comunicados/**`, `app/(app)/consultas/**` (nuevos).
- `app/(app)/admin/[consorcioId]/comunicados/**`,
  `app/(app)/admin/[consorcioId]/consultas/**` (nuevos).
- `app/(app)/admin/[consorcioId]/page.tsx` — dos tarjetas más en el panel.
- `components/widgets/comunicados.tsx` (nuevo) + entrada en el registry.
- `components/notification-row.tsx` — ícono y color de los tres tipos nuevos.
