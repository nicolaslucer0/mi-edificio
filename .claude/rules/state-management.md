---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---
# State Management — Zustand + React Query

## Review checks (look for)

- Token or credential stored via `persist()` middleware.
- `axios.get(...)` called directly inside a component without React Query.
- `queryKey` that is a flat string instead of an array.
- Server response data stored in a Zustand store instead of React Query cache.
- `useState` used for data that originates from the server.

## Hard rules (must)

### Zustand (client state)
- Use Zustand for client-only, UI-level state: auth, sidebar, block completion flags.
- **NEVER persist tokens or sensitive data to sessionStorage/localStorage** — keep in-memory only.
- Use `persist` middleware only for non-sensitive UI state.
- Store shape: include state fields and their setters in the same interface.

### React Query (server state)

- Use React Query for ALL server data: fetching, caching, mutation, invalidation.
- **Never** call `axios` or `fetch` directly inside a component body — always wrap in a service function and use `useQuery`/`useMutation`.
- `queryKey` must be an array and include all variable parameters that affect the data.
- Prefer co-locating `queryKey` factories with the service for consistency.

### Separation of concerns

- Zustand: ephemeral UI state, auth session metadata (non-sensitive), sidebar open/close.
- React Query: anything that comes from the server — resources, lists, summaries.
- Do NOT store server responses in Zustand — that is React Query's job.
- Do NOT use React Query for pure UI state (e.g., whether a modal is open).
