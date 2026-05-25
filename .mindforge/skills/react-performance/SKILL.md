---
name: react-performance
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: react performance, React.memo, useMemo pattern, useCallback pattern, react code splitting, react lazy loading, virtualization, bundle analysis, react profiler, render optimization, unnecessary re-render, react bundle size
compose: performance
---

# Skill — React Performance

## When this skill activates
Any task involving React application performance: reducing unnecessary re-renders,
optimizing bundle size, implementing code splitting, virtualizing long lists,
profiling component render times, or improving Core Web Vitals in React apps.

## Mandatory actions when this skill is active

### Before writing any code
1. **Identify the performance problem with measurement.** Do not guess.
   - Use React DevTools Profiler to record interactions and identify slow renders.
   - Use the browser Performance tab to measure paint times and long tasks.
   - Use `webpack-bundle-analyzer` or `@next/bundle-analyzer` to identify large chunks.
2. Determine the category of problem:
   - Unnecessary re-renders (component renders without visual change)
   - Large bundle size (initial JS payload too big)
   - Long lists without virtualization (DOM thrashing)
   - Expensive computations on every render
   - Layout thrashing (forced synchronous reflows)
3. Set a measurable target before optimizing:
   - LCP target (e.g., < 2.5s)
   - Bundle size budget (e.g., initial JS < 200KB gzipped)
   - Interaction latency (e.g., click-to-render < 100ms)

### During implementation

#### Identifying Re-renders
- Install `@welldone-software/why-did-you-render` in development:
  ```typescript
  // wdyr.ts (import before React)
  import React from "react";
  if (process.env.NODE_ENV === "development") {
    const whyDidYouRender = require("@welldone-software/why-did-you-render");
    whyDidYouRender(React, { trackAllPureComponents: true });
  }
  ```
- Use React DevTools Profiler "Highlight updates" to visually see which components re-render.
- A re-render is wasteful ONLY if:
  1. The component's output is identical to the previous render, AND
  2. The render takes meaningful time (> 1ms measured in Profiler).

#### React.memo
- **When to use**: Component receives the same props frequently AND its render is expensive (> 5ms).
- **When NOT to use**: Simple components (< 1ms render), components that always receive new props.
- Implementation pattern:
  ```typescript
  const ExpensiveList = React.memo(function ExpensiveList({ items, onSelect }: Props) {
    // expensive render logic
    return <ul>{items.map(item => <ListItem key={item.id} item={item} onSelect={onSelect} />)}</ul>;
  });
  ```
- Custom comparison for complex props:
  ```typescript
  const MemoizedChart = React.memo(ChartComponent, (prev, next) => {
    return prev.data.length === next.data.length
      && prev.data[0]?.id === next.data[0]?.id;
  });
  ```

#### useMemo and useCallback
- **Rule**: Do NOT add these by default. Add them ONLY when profiling shows a problem.
- **useMemo** — use when:
  - Computing derived data that is expensive (> 1ms) on every render
  - Passing a computed object/array to a memoized child (reference stability)
  ```typescript
  const sortedItems = useMemo(
    () => items.toSorted((a, b) => a.name.localeCompare(b.name)),
    [items]
  );
  ```
- **useCallback** — use when:
  - Passing a callback to a memoized child component
  - The callback is used as a dependency in a child's useEffect
  ```typescript
  const handleSelect = useCallback((id: string) => {
    setSelected(id);
  }, []);
  ```
- **Never use for**: Simple event handlers on non-memoized elements, values that change every render anyway.

#### Code Splitting
- Split at the route level (every page is a separate chunk):
  ```typescript
  const Dashboard = lazy(() => import("./pages/Dashboard"));
  const Settings = lazy(() => import("./pages/Settings"));

  function App() {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    );
  }
  ```
- Split heavy libraries used in specific features:
  ```typescript
  const ChartModule = lazy(() => import("./components/ChartModule"));
  // Only loaded when user navigates to analytics
  ```
- Use named webpack chunks for debugging: `import(/* webpackChunkName: "chart" */ "./Chart")`.
- Prefetch likely-next routes on hover/focus:
  ```typescript
  const prefetchDashboard = () => import("./pages/Dashboard");
  <Link onMouseEnter={prefetchDashboard} to="/dashboard">Dashboard</Link>
  ```

#### Virtualization (Long Lists)
- Use virtualization when rendering > 50 items in a scrollable container.
- Libraries: `@tanstack/react-virtual` (recommended), `react-window`, `react-virtuoso`.
- Implementation pattern:
  ```typescript
  import { useVirtualizer } from "@tanstack/react-virtual";

  function VirtualList({ items }: { items: Item[] }) {
    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
      count: items.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 48, // estimated row height in px
      overscan: 5, // render 5 extra items above/below viewport
    });

    return (
      <div ref={parentRef} style={{ height: "600px", overflow: "auto" }}>
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
          {virtualizer.getVirtualItems().map(virtualRow => (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size}px`,
                width: "100%",
              }}
            >
              <ListRow item={items[virtualRow.index]} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  ```
- For grids, use the grid virtualizer variant.
- Always provide `estimateSize` close to actual size to avoid layout jumps.

#### Bundle Analysis
- Generate and inspect the bundle:
  ```bash
  # Next.js
  ANALYZE=true next build

  # Vite
  npx vite-bundle-visualizer

  # Webpack
  npx webpack --profile --json > stats.json
  npx webpack-bundle-analyzer stats.json
  ```
- Common wins:
  - Replace `moment` with `date-fns` or `dayjs` (save ~200KB).
  - Replace `lodash` with individual imports: `import groupBy from "lodash/groupBy"`.
  - Use dynamic import for heavy deps used in one feature (chart libs, PDF generators).
  - Ensure tree-shaking: use ESM imports, check `sideEffects` in package.json.
  - Remove unused dependencies: `npx depcheck`.

#### Image Optimization
- Use `next/image` (Next.js) or manual `<img loading="lazy" decoding="async">`.
- Serve WebP/AVIF with `<picture>` fallback for older browsers.
- Always specify `width` and `height` to prevent CLS.
- Use responsive `srcset` for different viewport sizes.
- Lazy load images below the fold; eager load the LCP image.

#### State Management Performance
- Colocate state: keep state as close to where it is used as possible.
- Split context providers: one large context triggers re-renders on every consumer
  for any state change. Split into focused providers.
- Use selector patterns (`useSelector`, Zustand selectors) to subscribe to slices:
  ```typescript
  // Zustand: only re-renders when count changes
  const count = useStore(state => state.count);
  ```
- Avoid putting frequently-changing values (mouse position, scroll offset) in React state.
  Use refs or external stores.

### After implementation
1. Re-profile with React DevTools Profiler and compare flamegraphs.
2. Run Lighthouse and compare scores (LCP, INP, CLS, Total Blocking Time).
3. Verify bundle sizes with analyzer: confirm the target budget is met.
4. Test on a throttled device (Chrome DevTools: 4x CPU slowdown, Slow 3G) to validate
   the optimization matters in realistic conditions.
5. Ensure no visual regressions: the UI must look and behave identically.

## React performance anti-patterns to flag

- `useMemo`/`useCallback` on every single function (adds overhead without benefit).
- Inline object/array literals as props to memoized components (defeats memo).
- Storing derived state that could be computed from existing state/props.
- Re-creating context providers on every render (move value computation to useMemo).
- Using `index` as key in lists that reorder (causes incorrect reconciliation).
- Fetching data inside components without caching (use SWR, React Query, or similar).
- Rendering 1000+ DOM nodes without virtualization.

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Performance problem was identified with profiling tools (not guessed).
- [ ] Measurable improvement demonstrated (before/after numbers).
- [ ] No unnecessary memoization added (each memo justified by measurement).
- [ ] Bundle size budget verified with analyzer.
- [ ] No visual or functional regressions introduced.
- [ ] Optimizations tested on throttled device conditions.
- [ ] Core Web Vitals (LCP, INP, CLS) meet targets.
- [ ] Code splitting applied at route level minimum.
