# Mi edificio

Sistema personal para administrar el consorcio del edificio donde vivo. Cobranza de expensas, registro de gastos del consorcio, balance mensual y panel admin.

Pensado para vecinos mayores: UI muy simple, mobile-first, magic link sin contraseña.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Tailwind v4** + shadcn/ui (estilo `base-nova`) + Plus Jakarta Sans
- **Drizzle ORM** + **Neon Postgres**
- **Auth.js v5** + **Resend** (magic link)
- **Vercel Blob** para comprobantes
- Deploy en **Vercel**

## Setup local

```bash
pnpm install
cp .env.example .env.local
# completar valores en .env.local (ver "Variables de entorno")

pnpm db:push    # crea/actualiza tablas en Neon según el schema
pnpm db:seed    # inserta usuario admin, consorcio, unidad y datos de muestra
pnpm dev        # http://localhost:3000
```

### Variables de entorno

Todas se cargan desde `.env.local` (gitignored).

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (usar el host **pooler**) |
| `AUTH_SECRET` | Clave para firmar sesiones. Generar con `openssl rand -base64 32` |
| `AUTH_URL` | En dev: `http://localhost:3000`. En prod: NO setear, Auth.js lo infiere |
| `AUTH_RESEND_KEY` | API key de Resend |
| `AUTH_RESEND_FROM` | Email "from" del magic link. Sandbox: `onboarding@resend.dev` |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob para subir comprobantes (opcional en local) |

## Comandos útiles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Server de desarrollo |
| `pnpm build` | Build de producción |
| `pnpm db:push` | Pushea cambios de schema a la DB |
| `pnpm db:seed` | Corre el seed (idempotente) |
| `pnpm db:studio` | UI visual de Drizzle ([local.drizzle.studio](https://local.drizzle.studio)) |
| `pnpm lint` | ESLint |

## Roles

- **super_admin**: ve y administra todos los consorcios.
- **admin**: administra un consorcio puntual.
- **owner**: propietario de una unidad.
- **tenant**: inquilino de una unidad.

Un mismo usuario puede tener varios roles en distintos consorcios/unidades. La auth usa pre-registro: solo entran emails que ya existen en la tabla `user`.

## Estructura

```
src/
├── app/
│   ├── (app)/              # rutas autenticadas con app shell (top bar + bottom nav)
│   │   ├── page.tsx        # home con estado de deuda
│   │   ├── expensas/       # vista del residente: tus expensas + cómo pagar
│   │   ├── gastos/         # gastos del consorcio (read-only para todos)
│   │   ├── balance/        # cobrado vs gastado por mes
│   │   ├── admin/          # panel admin (gating en layout.tsx por rol)
│   │   ├── layout.tsx      # auth + shell
│   │   └── template.tsx    # animación de entrada por navegación
│   ├── api/auth/[...nextauth]/   # Auth.js handlers
│   ├── login/              # /login, /login/verificar
│   ├── layout.tsx          # root: fonts, metadata, viewport
│   └── globals.css
├── components/
│   ├── app-shell/          # top-bar, bottom-nav, user-menu
│   └── ui/                 # shadcn primitives
├── lib/
│   ├── actions/            # server actions (admin, expensas, login, auth)
│   ├── db/                 # schema.ts, index.ts (cliente), seed.ts
│   ├── queries/            # consultas de lectura (admin, expenditures, balance, etc.)
│   ├── auth.ts             # config de Auth.js
│   ├── session.ts          # getCurrentUser / requireUser
│   ├── format.ts           # formato ARS, fechas, períodos
│   └── email.ts            # notificaciones Resend
└── proxy.ts                # gating de rutas (Next.js 16: middleware → proxy)
```

## Deploy

1. Crear repo en GitHub y pushear `main`.
2. [vercel.com/new](https://vercel.com/new) → Import → seleccionar el repo.
3. Configurar variables de entorno (mismas que `.env.local`, **NO** setear `AUTH_URL`).
4. Storage → Blob → Create store (conecta automáticamente `BLOB_READ_WRITE_TOKEN`).
5. Cada push a `main` redeploya. PRs generan preview deploys.

## Caveats

- **Resend sandbox** (`onboarding@resend.dev`) solo permite mandar emails al dueño de la API key. Para que vecinos reales reciban magic links, verificar dominio propio en Resend → cambiar `AUTH_RESEND_FROM`.
- **Sin transacciones**: el driver `@neondatabase/serverless` HTTP no soporta transactions. Operaciones que escriben en 2 tablas (claim + expense) son secuenciales y pueden quedar inconsistentes ante fallos. Aceptable para v1; migrar a `neon-serverless` con `Pool` si muerde.
- **Schema con `drizzle-kit push`** (sin migraciones versionadas). Para producción con datos críticos, mover a `drizzle-kit generate` + `migrate`.

## Próximos pasos sugeridos

- Verificar dominio en Resend para abrirlo a vecinos.
- UI admin para invitar vecinos (hoy se cargan por DB Studio).
- Bulk create de expensas (una por unidad de un golpe).
- Página de preferencias de notificaciones por usuario.
- Tests automatizados.
