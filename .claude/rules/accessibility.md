---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---
# Accessibility & UI Guidelines — React / Next.js

## Review checks (look for)
- `<div onClick>` or `<span onClick>` used as interactive elements.
- Icon-only `<button>` without `aria-label`.
- `<input>` or `<select>` without an associated `<label>` or `aria-label`.
- `outline-none` (or prefixed equivalent) without a `focus-visible:ring-*` replacement.
- Images (`<img>` or `<Image>`) missing `alt`.
- `transition: all` in CSS — replace with specific properties.
- Animations without a `prefers-reduced-motion` guard.
- Error messages with no guidance ("Invalid input" → explain what is expected).
- Navigation implemented with `<button>` instead of `<Link>`.
- Buttons or links with generic labels ("Delete", "Submit", "Click here") — must follow action + object pattern ("Delete product", "Save changes").

## Hard rules (must)

### Semantic HTML
- Use `<button>` for actions that trigger JS logic. Use `<a>` / `<Link>` for navigation.
- Never use `<div onClick>` or `<span onClick>` as interactive elements — they are not keyboard-accessible.
- Use semantic elements first (`<nav>`, `<main>`, `<section>`, `<article>`, `<header>`, `<footer>`) before reaching for ARIA.
- Headings must be hierarchical: `<h1>` → `<h2>` → `<h3>`. Never skip levels.

### ARIA labels and roles
- Icon-only buttons (no visible text) **must** have `aria-label`. For wording requirements (action + object pattern), see **Content and copy** below.
- Decorative icons must have `aria-hidden="true"`.
- Async UI updates (toasts, inline validation, loading results) must use `aria-live="polite"`.
- Do NOT add ARIA roles to elements that already have the correct implicit role.

### Form accessibility
- Every `<input>`, `<select>`, `<textarea>` must have `<label>` (via `htmlFor`) or `aria-label`.
- Correct `type` attribute (`email`, `tel`, `number`, etc.). Add `autocomplete`. Disable `spellCheck` on emails/codes.
- Errors inline, adjacent to the field. On submit, focus first invalid field. Never block paste.

### Focus management
- Interactive elements must have a visible focus indicator. Use `focus-visible:ring-*` Tailwind utilities (with the project's prefix if configured).
- Never use `outline-none` without providing an alternative focus style.
- Prefer `:focus-visible` (keyboard focus only) over `:focus` (all focus including mouse click).

### Images
- Every `<Image>` / `<img>` must have `alt`. Decorative images: `alt=""`. Never omit — screen readers read the filename.

### Animations and motion
- **Always** guard with `prefers-reduced-motion`. Animate only `transform` and `opacity` (never `width`/`height`/`margin` — layout triggers).
- Never `transition: all`. Animations must be interruptible.

### Typography, content and touch
- `text-balance` (or prefixed equivalent) on headings; `tabular-nums` for number columns.
- Ellipsis `…` not `...`; curly quotes `"` `"` in content (not straight quotes).
- Buttons/links: specific labels — "Delete product" not "Delete"; "Save changes" not "Submit".
- Errors: include guidance on how to fix. Second person ("Your session expired").
- `touch-action: manipulation` on tap targets (removes 300ms delay). Min 44x44px (WCAG 2.5.5).
- `overscroll-behavior: contain` on modals/overlays.
