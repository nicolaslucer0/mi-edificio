---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---
# Performance — React / Next.js App Router

## Review checks (look for)
- Sequential `await` calls in Server Components for independent data (use `Promise.all()`).
- Client Component fetching without `initialData` from server (double-fetch waterfall).
- Raw `<img>` tags instead of `next/image`.
- Font loaded via `<link>` or CSS `@import` instead of `next/font`.
- Heavy component imported directly instead of via `next/dynamic`.
- Inline object/array literals passed as props to frequently-rendering children.
- Array index used as React `key` in dynamic lists.
- Page without `metadata` export.

## Hard rules (must)

### Eliminate data waterfalls (critical)
- **Server Components**: use `Promise.all()` for independent parallel fetches. Sequential `await` for independent data is a waterfall.
- **Client Components**: seed React Query with `initialData` from the Server Component to avoid a client-side fetch on first render.
- Never `await` one fetch, then `await` another when they are independent.

### Bundle size optimization (critical)
- Use `next/dynamic` with `ssr: false` for heavy Client Components not needed on first render (rich text editors, charts, date pickers).
- Prefer **named imports** over barrel imports for large libraries to enable tree-shaking.
- Never import server-only modules (node APIs, database clients) in Client Components.

### Image optimization
- **Always** use `next/image` — never raw `<img>` tags for content images.
- Provide explicit `width` and `height` to prevent layout shift (CLS).
- Add `priority` to above-the-fold images (hero, header logo).
- Use `loading="lazy"` (default) for below-fold images — do not override with `loading="eager"` unless necessary.

### Font optimization
- Use `next/font` for all custom fonts — it eliminates layout shift and self-hosts the font.
- Apply font variable at the root layout only — do not redeclare per component.
- Never load fonts via `<link>` in `<head>` or CSS `@import url()`.

### Re-render optimization
- Avoid creating **new objects or arrays inline** as props — they break referential equality and cause unnecessary re-renders.
- Use `useCallback` for event handlers passed to memoized children.
- Use `useMemo` for expensive computations — not as a default, only when profiling confirms a cost.
- With React Compiler enabled, manual `useMemo`/`useCallback` is often unnecessary — avoid premature optimisation.

### List rendering
- Virtualise or paginate lists with more than **50 items** — render only what is visible.
- Always provide a stable, unique `key` — never use array index as key for dynamic lists.

### Metadata and SEO
- Export `metadata` or `generateMetadata` from every `page.tsx` — never leave pages with no title/description.
- Use `generateMetadata` for dynamic routes that need data-driven metadata.
