---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---
# Architecture Review — Next.js App Router (React)

## Review checks (look for)
- `'use client'` on a component with `async`/`await` at the top level.
- `process.env` accessed inside a Client Component (use `NEXT_PUBLIC_*` env vars for client-side values, or `next-runtime-env` if the project uses it).
- Business logic inside `components/ui/` components.
- Synchronous access to `params` or `searchParams` in Next.js 15+ pages (must be awaited).
- Missing `error.tsx` or `loading.tsx` for routes that perform async data fetching.

## Hard rules (must)

### Server vs Client Component boundary
- **Server Components** (default): fetch data, no hooks, no browser APIs. **Client Components** (`'use client'`): interactive, hooks, event handlers.
- Never add `'use client'` to a component with server-side `async/await`. Pass data down as props.

### Component layers
- `components/ui/`: stateless, no stores/queries/side effects. `composites/`: business-aware. `features/<domain>/components/`: domain-coupled.
- No business logic in `ui/`. No direct API calls in components — route through services.

### Next.js 15+ — `params` and `searchParams` are Promises, must be awaited in pages, layouts, and route handlers.

### Server Actions — `'use server'` at file or function level. Preferred over Route Handlers for mutations. Never expose sensitive logic.

### File conventions
- `page.tsx` (route UI), `layout.tsx` (shell), `loading.tsx` (Suspense wrapper), `error.tsx` (boundary, must be `'use client'`), `not-found.tsx`.
- Use route groups `(groupName)` for shared layouts without affecting URL. Handle loading/error at route level. Use `<Suspense>` for partial async content.

### API routes and middleware
- Route handlers: thin — validate, call service, return. No business logic. Use `process.env.*` (never `NEXT_PUBLIC_*`).
- `middleware.ts`: cross-cutting only (auth, redirects, headers). Always define a `matcher`.
