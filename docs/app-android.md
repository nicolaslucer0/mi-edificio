# Diseño: app de Android

Estado: **propuesta** (pre-desarrollo). Fecha: 2026-08-04.

## Objetivo

Que el vecino baje "Mi edificio" del Play Store y no note ninguna diferencia con
la PWA. Sin duplicar la app, sin una API nueva, sin hacer cada feature dos veces.

## La decisión de fondo: TWA, no WebView

Se empaqueta con **Trusted Web Activity** (Bubblewrap). No es un WebView: es
Chrome renderizando el sitio a pantalla completa, sin barra de navegación.

Tres razones, en orden de peso:

1. **El login.** El magic link llega al mail y se abre desde Gmail. En un WebView
   propio la cookie de sesión cae en Chrome y el WebView queda vacío — y como el
   token de `verificationTokens` es de un solo uso, ya se quemó: no hay
   recuperación. En TWA el navegador es el mismo, así que la sesión aparece
   adentro de la app.
2. **El push.** `push-toggle.tsx:55` chequea `"PushManager" in window`. Android
   WebView no implementa Push API ni Notifications API, así que todo lo de
   `docs/notificaciones-push.md` (VAPID, `public/sw.js`, prefs, los dos crons)
   quedaría muerto y habría que rehacerlo nativo sobre FCM. En TWA lo maneja
   Chrome y sigue funcionando igual.
3. **La plomería.** En un WebView hay que escribir Kotlin para cosas que hoy da
   el navegador gratis: los tres `<input type="file" accept="image/*,application/pdf">`
   de comprobantes (`claim-payment-button.tsx:237`, `credit-panel.tsx:177`,
   `expenditure-form.tsx:330`) no abren nada sin `onShowFileChooser`; el CSV de
   `/api/reportes` viene con `Content-Disposition: attachment` y no descarga nada
   sin un `DownloadListener`; los comprobantes en PDF que streamea
   `/api/receipts/[kind]/[id]` no se renderizan.

A eso se suma que la política de "minimum functionality" de Play es la que
rebota wrappers de WebView, y el TWA es el mecanismo que Google documenta para
publicar una PWA.

**Sobre el deeplink:** sí se puede hacer que el magic link abra la app con App
Links y que el WebView cargue la URL de callback (la cookie la setea el propio
GET, no hay que inyectar ningún token). Pero se verifica con **el mismo
`assetlinks.json`** que pide el TWA, así que no ahorra trabajo, y cuando la
resolución del App Link falla —link wrapping, webmail, Outlook, el mail abierto
en la compu— el WebView se queda sin sesión mientras el TWA entra igual. Además
no arregla nada de los puntos 2 y 3. Y el TWA **ya trae el deeplink**: Bubblewrap
genera el intent filter con `autoVerify` para todo el scope.

## Lo que ya está a favor

`manifest.ts` con `display: standalone` y íconos maskable, service worker con
handler de `fetch` (`public/sw.js`), HTTPS, push funcionando, y "Cerrar sesión"
ya implementado (`user-menu.tsx:74`, vía `signOutAction`).

Falta poco, pero es bloqueante.

## Orden de trabajo

El trabajo de producto (borrar cuenta) es el 80% del esfuerzo, pero **va después
del spike**. Todo este plan se apoya en algo que todavía no verificamos: que el
TWA funcione con *esta* app — que el magic link caiga adentro de la sesión, que
el push sobreviva, que el `assetlinks` verifique. Si eso se traba, no queremos
haber construido la feature entera para una publicación que no pasa.

1. **Abrir los paths públicos en `proxy.ts`.** No depende de nada, se puede hacer
   ya.
2. **Spike del TWA**: `assetlinks.json` con el fingerprint del keystore de debug
   (no hace falta Play App Signing todavía — el archivo acepta un array, y la
   firma de Play se agrega después), Bubblewrap, instalar en un teléfono propio.
   Probar login por magic link y push. Una tarde.
3. **Borrar la cuenta** + `/privacidad` + `/borrar-cuenta`.
4. **Publicar**: internal testing.

---

## Parte 1 — Borrar la cuenta

Play exige, para toda app con cuentas, un camino de borrado **dentro de la app**
y una **URL web** para pedirlo sin instalarla. Hoy no existe ninguno de los dos.

### Por qué no se puede borrar la fila

Ocho columnas apuntan a `user.id` **sin `onDelete: cascade`**, y cuatro son
`notNull`:

| Tabla | Columna | |
|---|---|---|
| `expenditure` | `createdByUserId` | notNull |
| `payment_claim` | `claimedByUserId` | notNull |
| `payment_claim` | `resolvedByUserId` | |
| `unit_credit` | `createdByUserId` | |
| `credit_deposit` | `requestedByUserId` | notNull |
| `credit_deposit` | `resolvedByUserId` | |
| `announcement` | `createdByUserId` | notNull |
| `amenity_reservation` | `reservedByUserId` | notNull |

Un `DELETE FROM user` explota con violación de FK en cuanto el vecino informó un
solo pago. Y aunque no explotara, no querríamos: **el rastro contable no es del
vecino, es de la unidad.** Si se borra quién informó un pago aprobado, el balance
del consorcio queda sin respaldo.

Entonces: **anonimización**, no borrado físico.

### Qué se borra y qué se conserva

| Se borra | |
|---|---|
| `user.email` → null | Es lo que identifica a la persona y lo que usa el login |
| `user.name`, `phone`, `image`, `emailVerified`, `notificationPrefs` → null | PII |
| `account`, `session` | Cascade, ya está |
| `push_subscription` | Cascade. Sin esto le seguirían llegando avisos al teléfono |
| `notification` | Cascade. Es el feed personal de la campanita |
| `membership` | Cascade. Es lo que le da acceso al consorcio y a la unidad |
| `amenity_reservation` futuras | Liberan el turno; una reserva de un fantasma bloquea la pileta |

| Se conserva | |
|---|---|
| `payment_claim`, `credit_deposit`, `unit_credit` | Es la contabilidad de la unidad |
| `expense` | Cuelga de `unit`, ni siquiera toca `user` |
| `expenditure`, `announcement` | Lo que cargó como admin: gastos con comprobante y comunicados del consorcio |

La FK sigue apuntando a la fila anonimizada, así que nada se rompe: las
pantallas de admin muestran "Cuenta dada de baja" en lugar del nombre.

Un efecto lateral que **solo se logra anonimizando**: los joins de
`queries/admin.ts:64` y `:101` son `innerJoin` sobre `users`. Con un borrado
físico, los pagos pendientes de ese vecino desaparecían en silencio de la cola de
aprobación del admin. Con la fila anonimizada quedan donde están.

### Los comprobantes se conservan

Los `receiptUrl` de `payment_claim`, `credit_deposit` y `expenditure` apuntan a
archivos en el Blob privado, y **un comprobante de transferencia es una foto con
el nombre, el CBU y el número de cuenta de la persona**. O sea que anonimizar la
fila de `user` no borra esa PII: queda en el expediente del pago.

**Decisión: se conservan todos**, como respaldo contable del consorcio. Un pago
aprobado sin comprobante no se puede defender si después se discute.

Eso obliga a dos cosas, no son opcionales:

- El diálogo de confirmación **dice** que los comprobantes que subiste se
  conservan como respaldo de los pagos.
- `/privacidad` lo dice también, con el mismo criterio.

Si la app afirma borrar datos que no borra, el problema es peor que el que
estamos resolviendo.

**Deuda pendiente:** borrar o recortar los comprobantes (los de claims rechazados
no respaldan nada) queda para más adelante, fuera de este alcance.

### Columna nueva

`user.deletedAt timestamp` (nullable). Hace falta para distinguir una cuenta dada
de baja de un usuario recién invitado que todavía no tiene mail cargado, y para
que las pantallas sepan qué rotular.

### Cuándo se bloquea el borrado

- **`super_admin`**: no se puede. Es la cuenta que sostiene todo.
- **Único `admin` de un consorcio**: no se puede hasta que haya otro admin. Si
  no, el consorcio queda huérfano: nadie carga expensas ni aprueba pagos.
- **Deuda pendiente**: *no* bloquea. La deuda es de la unidad y sobrevive al
  borrado — es justamente el motivo de anonimizar en vez de borrar. Se avisa en
  el diálogo, no se impide.

### El JWT sobrevive al borrado

La sesión es JWT (`auth.ts:43`), así que la cookie de **otros dispositivos**
sigue siendo válida hasta que expire. El borrado hace `signOut` en el dispositivo
donde se pidió, pero eso no alcanza.

Arreglo: `getCurrentUser` (`session.ts:41`) ya hace una consulta a la base para
traer memberships. Se cambia por un select de `user` con left join a
`membership`, y si `deletedAt` no es null devuelve `null` → redirect a `/login`.
Mismo round trip que hoy, cero costo.

Además, en el callback `signIn` (`auth.ts:49`) sumar `isNull(users.deletedAt)` a
la búsqueda por mail. El mail queda en null igual, así que ya no matchea, pero
mejor explícito.

### Flujo del vecino

1. `/mas` → grupo "Vos" → fila **"Cerrar sesión"** y fila **"Borrar mi cuenta"**.
   Hoy el logout vive escondido en un dropdown detrás de un avatar chico; para
   este público va como fila grande y rotulada, igual que el resto de `/mas`.
2. "Borrar mi cuenta" abre una pantalla, no un modal: hay que explicar qué pasa.
   - Qué se borra: tu mail, tu nombre, tus avisos, tu acceso al consorcio.
   - Qué queda: los pagos y las expensas de tu unidad, sin tu nombre.
   - Que si querés volver, el administrador te tiene que invitar de nuevo
     (el login es solo por invitación: `auth.ts:49-57`).
   - Que los comprobantes que subiste se conservan como respaldo de los pagos.
   - Si tenés deuda o un pago esperando validación, se dice acá.
3. Confirmación escribiendo **"BORRAR"**. No un checkbox: es irreversible.
4. Se ejecuta, `signOut`, y cae en una pantalla pública de "listo, se borró".

### Flujo del admin

Cinco lugares traen el nombre de un vecino desde `users`:

| Query | Pantalla |
|---|---|
| `queries/admin.ts:57-58` (`claimedByName`, `claimedByEmail`) | Pagos a aprobar |
| `queries/admin.ts:95-96` (`requestedByName`, `requestedByEmail`) | Depósitos a aprobar |
| `queries/expenditures.ts:118` y `:171` (`createdByName`) | Gastos |
| `queries/users.ts:87` | Usuarios del consorcio |

Ojo con el detalle de los dos primeros: además del nombre traen **el mail**,
porque es el identificador de fallback cuando `name` es null (el mismo criterio
que `getInitials` en `user-menu.tsx:24`). Si anulamos los dos, la pantalla del
admin no queda "sin nombre" — queda **en blanco**.

Por eso `deletedAt` no es opcional: es lo que le permite a la UI renderizar
"Cuenta dada de baja" en vez de un espacio vacío. Los montos y las fechas no
cambian.

---

## Parte 2 — Páginas públicas y paths abiertos

`src/proxy.ts` tiene un matcher que solo excluye `api`, `_next/static`,
`_next/image` y `favicon.ico`, y el callback `authorized` (`auth.ts:66`) solo
deja pasar `/login*`. Todo lo demás redirige a login **sin sesión**.

Eso es un **blocker duro para el TWA**: Google baja `/.well-known/assetlinks.json`
desde sus servidores, sin cookie, y hoy se comería el redirect. Sin ese archivo,
la app abre con barra de URL arriba y no verifica.

Hay que abrir:

- `/.well-known/assetlinks.json` — verificación de Digital Asset Links.
- `/privacidad` — política de privacidad. **Sin esto Play rebota.** Qué se
  recolecta (mail, nombre, teléfono opcional, comprobantes, endpoints de push),
  para qué, con quién se comparte (Neon, Vercel, Resend, Sentry), cuánto se
  retiene y cómo se borra.
- `/borrar-cuenta` — la URL web que pide Play: explica los pasos y deja un mail
  de contacto para quien no pueda entrar a la app.
Los assets van excluidos en el `matcher` (así el middleware ni corre); las dos
páginas, en la allowlist del `authorized` junto a `/login`.

### Estado: hecho, y arregló un bug que veníamos arrastrando

Medido con el dev server y sin cookie, **antes** del fix:

| Path | Antes | Después |
|---|---|---|
| `/.well-known/assetlinks.json` | 307 → `/login` | 404 (todavía no existe el archivo) |
| `/sw.js` | 307 → `/login` | 200 |
| `/manifest.webmanifest` | 307 → `/login` | 200 |
| `/icon`, `/apple-icon` | 307 → `/login` | 200 |
| `/privacidad`, `/borrar-cuenta` | 307 → `/login` | 404 (páginas pendientes) |
| `/`, `/expensas`, `/admin`, `/cuenta` | 307 → `/login` | 307 → `/login` (sin cambios) |

O sea que el manifest **no era alcanzable sin sesión**. Y el `<link
rel="manifest">` que inyecta Next no lleva `crossorigin="use-credentials"`
(verificado en el HTML de `/login`), así que por spec el navegador lo pide **sin
credenciales**: recibía el redirect y parseaba HTML en lugar del manifest.

Sin manifest válido no hay `beforeinstallprompt`, y sin ese evento **Chrome nunca
ofrece instalar la app en Android**. `docs/notificaciones-push.md` le atribuía
ese síntoma al service worker faltante; el SW se construyó, pero el manifest
seguía inalcanzable, así que el prompt igual no salía. Ahora es testeable en un
teléfono de verdad.

De paso: `ServiceWorkerRegister` se monta en el layout raíz (`app/layout.tsx:70`),
así que también corría en `/login`, donde `register("/sw.js")` se comía el
redirect y fallaba en silencio.

---

## Parte 3 — Empaquetado

- `bubblewrap init` apuntando al manifest de producción. `applicationId` estilo
  `ar.com.miedificio.app` — se elige una vez y no se cambia nunca más.
- **Notificaciones**: Android 13+ pide el permiso runtime `POST_NOTIFICATIONS`.
  Bubblewrap lo agrega si se le pide notificaciones al generar el proyecto; si
  no, la campanita falla en silencio en los teléfonos nuevos.
- Play App Signing: el SHA-256 de la firma es lo que va en `assetlinks.json`.
- Cuenta de Play Console: US$ 25 una vez. Con cuenta **personal**, Google pide
  **12 testers durante 14 días corridos** en closed testing antes de habilitar
  producción. Para un edificio, arrancar por **internal testing** (hasta 100
  mails, sin esa espera).
- Listing: ícono 512×512, feature graphic 1024×500, 2+ screenshots, descripción
  corta y larga, cuestionario de content rating, Data Safety.

---

## Decisiones abiertas

1. **Reservas de amenities pasadas**: ¿se borran también o se conservan por si
   hay una discusión sobre quién usó el SUM? La propuesta cancela solo las
   futuras.
2. **Trazabilidad vs privacidad en gastos y comunicados**: un gasto con
   comprobante cargado por un admin que después se da de baja queda como "Cuenta
   dada de baja". ¿Alcanza, o para roles de admin conviene conservar el nombre
   por auditoría?
3. **Pago pendiente de validación**: ¿bloquea el borrado o solo se avisa? Yo
   avisaría — bloquear deja al vecino rehén de que el admin resuelva.
4. **Cuenta de Play personal u organización**: con personal, tu nombre y tu mail
   quedan públicos en el listing. Define también si hay que pasar por los 12
   testers.
5. **Dominio de producción y `applicationId`**: los necesito para el
   `assetlinks.json`.
6. **OTP en vez de magic link**: mejora la UX del login (no hay que saltar a
   Gmail), pero no es requisito del TWA. ¿Entra acá o va aparte?

## Impacto en archivos

- `db/schema.ts` — `user.deletedAt` + migración (`db:push`).
- `lib/actions/account.ts` (nuevo) — server action de borrado: chequeos de
  bloqueo, anonimización y limpieza en una transacción, `signOut`.
- `lib/queries/users.ts` — helper de "¿puede borrarse?" (super_admin, único admin).
- `lib/session.ts` — `getCurrentUser` corta si `deletedAt`.
- `lib/auth.ts` — `signIn` filtra por `deletedAt`.
- `app/(app)/mas/**` + `components/app-shell/nav-items.ts` — filas de cerrar
  sesión y borrar cuenta.
- `app/(app)/cuenta/borrar/**` (nuevo) — pantalla de confirmación.
- `app/privacidad/page.tsx`, `app/borrar-cuenta/page.tsx` (nuevos, públicos).
- `public/.well-known/assetlinks.json` (nuevo).
- `src/proxy.ts` + `lib/auth.ts` — matcher y allowlist.
- `lib/queries/admin.ts` (~57 y ~95), `lib/queries/expenditures.ts` (118, 171),
  `lib/queries/users.ts:87` — traer `deletedAt` en el select.
- Las pantallas que consumen esas queries: `admin/[consorcioId]/aprobar-pagos`,
  `admin/[consorcioId]/gastos`, `admin/[consorcioId]/usuarios`,
  `components/claim-decision-card.tsx`, `components/deposit-decision-card.tsx`.

## Fuera de alcance

- **iOS / App Store.** Otro trámite, otras reglas, y la PWA en iOS ya funciona.
- **FCM nativo.** No hace falta: el push web anda dentro del TWA.
- **Features nativas** (biometría, NFC, widgets). Recién ahí se justificaría
  salir del TWA.
