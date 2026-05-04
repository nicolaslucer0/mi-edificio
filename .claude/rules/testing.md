---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "src/**/*.spec.ts"
  - "src/**/*.spec.tsx"
---
# Unit Testing — React / Next.js (Jest + React Testing Library)

> **Nota:** Si el proyecto define una UI library en `.claude/project-rules.md`, reemplazar las referencias genericas por la libreria concreta del proyecto.

## Review checks (look for)

- Direct import from the project's UI library in test files (should use centralized mock).
- Test asserting on internal state instead of rendered output.
- Missing `data-testid` on interactive elements.
- Coverage < 80% for new files.
- Tests using `getByText` on dynamic strings instead of `getByTestId`.

## Hard rules (must)
- **Never import the UI library directly** in tests — always use the centralized mock defined in the project's `__mocks__/` directory.
- **Never test implementation details** — do not assert on internal component state, refs, or private methods. Query the DOM via `data-testid` for stable element selection; use `getByRole`/`getByLabel`/`getByText` only for elements with clear semantic meaning and stable text.
- **Coverage gate**: statements, branches, functions, lines >= 80%.
- Co-locate tests: `src/features/<domain>/schemas/__tests__/mySchema.test.ts`, `src/components/composites/MyComponent/__tests__/index.test.tsx`.

## Mocking strategy

### UI library — always use centralized mock
```typescript
// Replace 'your-ui-library' with the project's actual UI library package name
jest.mock('your-ui-library');
```

### Auth / session context

```typescript
import { mockReadOnlyUser } from "__mocks__/authContext";
jest.mock("@/lib/context", () => ({
  useAuthContext: () => mockReadOnlyUser,
}));
```

### Fixtures in `__mocks__/`

- Define fixture files per domain: `authContext.ts`, `<resource>.ts`, `<resource>Form.ts`, etc.
- Export typed mock objects that match the data shapes used in the application.

## Schema test pattern

```typescript
import { myFeatureSchema } from "@/features/<domain>/schemas";

describe("myFeatureSchema", () => {
  it("should validate correct data", () => {
    const result = myFeatureSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should fail when fieldA is empty", () => {
    const result = myFeatureSchema.safeParse({ ...validData, fieldA: "" });
    expect(result.success).toBe(false);
    const errors = result.error!.issues.map((i) => i.path.join("."));
    expect(errors).toContain("fieldA");
  });
});
```

## Component test pattern (React Testing Library)

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render with correct data-testid', () => {
    render(<MyComponent />);
    expect(screen.getByTestId('my-component')).toBeInTheDocument();
  });

  it('should call onSubmit when submit button is clicked', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MyComponent onSubmit={onSubmit} />);
    await user.click(screen.getByTestId('submit-button'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
```

## data-testid conventions (must be present in interactive elements)

- Use descriptive, kebab-case identifiers: `my-component`, `submit-button`, `filter-dropdown`.
- For dynamic lists, include an identifier: `product-card-{id}`, `dropdown-option-{value}`.
- Follow a consistent naming pattern agreed upon in the project (e.g., `{component-type}-{name}`).
