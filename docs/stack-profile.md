# Stack Profile

| Campo | Valor |
|-------|-------|
| Lenguaje | TypeScript ^5 |
| Framework | Next.js 16.2.4 (App Router) + React 19.2.4 |
| Test runner | N/A (no configurado) |
| Linter | ESLint ^9 (`npm run lint`) |
| ORM / DB | Drizzle ORM ^0.45 + PostgreSQL (Neon serverless) |
| Auth | Auth.js (next-auth 5.0.0-beta) — magic link vía Resend |
| Storage | Vercel Blob (`@vercel/blob` ^2.3) — store privado |
| CI/CD | N/A (deploy en Vercel) |
| Estructura | single-app |

**Paths security-sensitive:** `src/lib/auth*`, `src/lib/actions/**` (Server Actions), `src/app/api/**` (route handlers), `src/lib/db/schema.ts` (schema/migraciones).

Detectado automáticamente el 2026-07-13. Actualizar si el stack cambia.
