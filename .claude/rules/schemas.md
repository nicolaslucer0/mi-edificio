---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---
# Schemas & Naming Conventions — Zod / React / Next.js TypeScript

## Review checks (look for)
- Cross-field validation (`.refine`/`.superRefine`) inside a block schema. `z.any()` or `z.string().nonempty()` usage.
- Schema/type not exported from `schemas/index.ts`. Missing `z.infer<typeof ...>`. Validator complexity > 15.
- `any` outside `BaseFormValues`. `type` for plain object shape (use `interface`).
- Default export in non-page/layout file. Hook not prefixed with `use`. Hardcoded strings (use constants).

## Layer structure (must follow exactly)
All paths under `features/<domain>/schemas/`:
- `enums.ts` — shared Zod enums. `helpers.ts` — shared helpers. `base.schema.ts` — BaseFormValues.
- `blocks/<block>.schema.ts` — field-group schemas (single responsibility).
- `sections/<section>.schema.ts` — composition with `.and()` + `.superRefine()`.
- `sections/<section>.validators.ts` — cross-field validators.
- `payload.schema.ts` — API payload (BFF format). `index.ts` — barrel exports (always update).

## Schema rules (must)
- **Blocks**: define at `blocks/<name>.schema.ts`. Never add cross-field validations — they belong in section validators.
- Use `z.string().min(1)` for required strings (`nonempty()` removed in Zod v4). No `z.any()` — use `z.unknown()`.
- **Sections**: compose blocks with `.and()`, apply cross-field validation via `.superRefine(runAllValidators)`.
- **Validators**: single responsibility, complexity < 15. Report errors via `ctx.addIssue({ code: 'custom', path, message })`. Group in `Record<string, Validator[]>`.
- **Barrel exports**: export public schemas/types from `schemas/index.ts`. In non-schema code, prefer consuming schemas through that barrel instead of deep-importing individual schema files.
- **Performance exception**: this barrel rule is scoped to the `features/<domain>/schemas/` public API. It is not a general recommendation to use barrels everywhere; if a client-side, bundle-sensitive path is better served by a direct import per `rules/app-performance.md`, follow the performance guidance.
- **Form integration** (optional): when using `react-hook-form`, connect schemas via `zodResolver` from `@hookform/resolvers/zod`.

## Naming conventions (must)
- `interface` for object shapes/props. `type` for unions/intersections. No `any` — use `unknown` (exception: `BaseFormValues`).
- One component per file, name matches export. `page.tsx`/`layout.tsx` may use default exports; UI components may also use `export default` when following the design-system guidance. For all other files, prefer named exports.
- Hooks: `use` prefix (`useFilters`). Stores: `use` + `Store` suffix (`useAuthStore`). Services: action + resource (`fetchProduct`).
- Schema names: blocks `<name>FieldSchema`, sections `<name>Schema`, payloads `<resource>PayloadSchema`.
- Files: components `PascalCase.tsx`, hooks/services/utils `camelCase.ts`, schemas `<name>.schema.ts`, tests `<name>.test.ts(x)` in `__tests__/`.
- Constants `UPPER_SNAKE_CASE`, enum values `PascalCase`. Live in `lib/constants/` or `features/<domain>/constants/`.
