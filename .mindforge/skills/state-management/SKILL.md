---
name: state-management
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
triggers: state management architecture, server state pattern, client state design, zustand store, tanstack query pattern, url state management, form state handling, optimistic update pattern, cache invalidation strategy, state machine design, global state pattern, state synchronization
---

# Skill — State Management

## When this skill activates
Any task involving state architecture decisions, choosing between state libraries,
implementing caching strategies, designing optimistic updates, or modeling complex
UI state flows.

## Mandatory actions when this skill is active

### Before writing any code
1. Categorize the state: Is it server state, client state, URL state, or form state?
2. Select the appropriate tool for the category (see below).
3. Map data flow direction and identify single sources of truth.

### During implementation
- Server state (TanStack Query): define query keys, stale times, cache invalidation triggers, and prefetch points.
- Client state (Zustand): keep stores small and focused, use selectors for render optimization.
- URL state: encode shareable state in search params, decode with validation.
- Form state (react-hook-form): define schema validation (Zod), handle submission lifecycle, surface errors.
- Optimistic updates: update UI immediately, queue mutation, rollback on error with user feedback.

### After implementation
- Verify no prop drilling exists where a store or query would be cleaner.
- Confirm cache invalidation triggers fire correctly on mutations.
- Test offline/error scenarios for optimistic updates.

## State categories and tools

### Server State — TanStack Query
- **Fetch**: `useQuery` with structured query keys (`['todos', { filter }]`).
- **Cache**: configure `staleTime` and `gcTime` per query type.
- **Invalidate**: `queryClient.invalidateQueries` on related mutations.
- **Prefetch**: `queryClient.prefetchQuery` on hover/route transition.

### Client State — Zustand
- Simple global store with typed slices.
- Use selectors (`useStore(state => state.count)`) to prevent unnecessary re-renders.
- Persist to localStorage only when explicitly needed.
- Avoid putting server-fetched data in Zustand — that belongs in TanStack Query.

### URL State
- Search params as state source for filters, pagination, sort.
- Makes state shareable via URL (copy-paste, bookmarks).
- Parse and validate on read (never trust raw URL input).

### Form State — react-hook-form
- Schema validation with Zod (`zodResolver`).
- Handle submission states: idle, submitting, success, error.
- Surface field-level errors immediately, form-level errors on submit.
- Reset form state on successful submission.

## Patterns

### Optimistic Updates
```typescript
// 1. Snapshot previous state
const previous = queryClient.getQueryData(['todos']);
// 2. Optimistically update
queryClient.setQueryData(['todos'], (old) => [...old, newTodo]);
// 3. Mutate server
try { await api.createTodo(newTodo); }
catch {
  // 4. Rollback on error
  queryClient.setQueryData(['todos'], previous);
  toast.error('Failed to create todo');
}
```

### Cache Invalidation Strategies
- **Stale-while-revalidate**: serve cached, refetch in background.
- **Time-based**: `staleTime: 5 * 60 * 1000` for slowly changing data.
- **Event-based**: invalidate on mutation success, WebSocket message, or focus.

### State Machines (XState)
Use for complex flows with defined states and transitions:
- Auth flow (idle → authenticating → authenticated → error).
- Multi-step forms (step1 → step2 → review → submitted).
- Define guards for conditional transitions.

## Anti-patterns to avoid
- Prop drilling through 4+ component levels (use context or store).
- Putting server state in global store (use TanStack Query).
- Global store for state that only one component uses (use local state).
- Over-memoization (`useMemo`/`useCallback` without measured need).
- Derived state stored separately (compute it, don't sync it).

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I categorize all state correctly (server/client/URL/form)?
- [ ] Did I select the right tool for each category?
- [ ] Are optimistic updates properly handling rollback on error?
- [ ] Is cache invalidation tested for mutation scenarios?
- [ ] No prop drilling through more than 2-3 levels?
- [ ] No server state duplicated in client stores?
