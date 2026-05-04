---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---
# Styling — TailwindCSS + UI Library

> **Nota:** Esta rule usa placeholders genericos. Si el proyecto define `.claude/project-rules.md`, las reglas del proyecto (prefijo CSS, libreria UI, tokens) tienen prioridad.

## Review checks (look for)

- TailwindCSS class without the project's configured prefix (if any).
- Raw `<input>`, `<select>`, `<button>` elements where the project's UI library offers a component.
- Arbitrary color or spacing values (e.g., `text-[#ff0000]`, `p-[13px]`).
- `style={{ }}` inline styles for values that could be expressed with Tailwind classes.

## Hard rules (must)

### TailwindCSS prefix (critical — only if the project uses a prefix)
- If the project configures a Tailwind prefix in `tailwind.config.ts`, ALL utilities must use it. Raw Tailwind classes without the prefix are **purged at build time** and will produce no visual output.
- Check `tailwind.config.ts` for `prefix` value. If not set, standard Tailwind classes apply.

### UI component library

- If the project defines a UI library in `project-rules.md`, use it for **all** standard UI primitives.
- **Never replace library components with raw HTML equivalents** unless the library does not offer the component.
- Check `project-rules.md` for the component mapping table.

### Design tokens

- Colors and spacing come from the project's design tokens — do not use arbitrary values.
- Exception: `calc()` expressions for layout constraints (e.g., `min-h-[calc(100vh-80px)]`) are acceptable.

### Font

- Apply custom fonts at root layout only via `next/font` — do not re-declare per component.
