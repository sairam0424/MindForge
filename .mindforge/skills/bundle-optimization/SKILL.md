---
name: bundle-optimization
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: bundle optimization, tree shaking, code splitting strategy, dynamic import, chunk naming, preload hint, prefetch strategy, bundle analyzer, unused code elimination, lazy module, vendor splitting, entry point optimization
compose: performance
---

# Skill — Bundle Optimization

## When this skill activates
Any task involving JavaScript/TypeScript bundle size reduction, tree shaking,
code splitting, lazy loading, or front-end performance budgets.

## Mandatory actions when this skill is active

### Before optimizing
1. Run bundle analyzer to identify what is currently large.
2. Set a performance budget (target numbers, not "make it smaller").
3. Measure current metrics: total bundle size, initial load size, LCP impact.

### Performance budgets

| Metric | Target |
|--------|--------|
| Main bundle (gzipped) | < 100KB |
| Total initial JS (gzipped) | < 300KB |
| Largest single chunk | < 150KB |
| Time to Interactive (3G) | < 5s |

### Tree shaking

**Requirements for tree shaking to work:**
- Use ESM (import/export), not CommonJS (require/module.exports).
- Mark packages as side-effect-free: `"sideEffects": false` in package.json.
- Avoid re-exporting everything via barrel files (index.ts with `export * from`).
- Import specific functions: `import { debounce } from 'lodash-es'` not `import _ from 'lodash'`.

**Common tree-shaking failures:**
- CommonJS modules (cannot be statically analyzed).
- Barrel files that import everything regardless of usage.
- Side effects in module top-level scope (global CSS imports, polyfills).
- Dynamic property access: `lib[method]()` prevents dead code elimination.

**Fix barrel file problem:**
```javascript
// BAD: barrel imports everything
import { Button } from '@/components';

// GOOD: direct import only loads Button
import { Button } from '@/components/Button';
```

### Code splitting

**Route-based splitting (most impactful):**
```javascript
// React
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Settings = React.lazy(() => import('./pages/Settings'));

// Next.js: automatic per-page splitting (built-in)
```

**Component-based splitting (for heavy components):**
```javascript
// Only load chart library when chart is rendered
const Chart = React.lazy(() => import('./Chart'));

// With loading state
<Suspense fallback={<ChartSkeleton />}>
  <Chart data={data} />
</Suspense>
```

**Library-based splitting:**
- Heavy libraries (moment, chart.js, monaco-editor) should never be in the main bundle.
- Dynamic import at point of use.
- Consider lighter alternatives (date-fns vs moment, lightweight chart libs).

### Vendor splitting

**Strategy: separate stable code from frequently changing code.**

```javascript
// webpack config
optimization: {
  splitChunks: {
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendor',
        chunks: 'all',
      },
      framework: {
        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
        name: 'framework',
        priority: 10,
      },
    },
  },
}
```

**Benefits:**
- Vendor chunk changes rarely → long cache lifetime.
- Application chunk changes often → short cache lifetime.
- Framework chunk (React) changes almost never → very long cache.

### Preload and prefetch hints

**Preload (critical, needed NOW):**
```html
<link rel="preload" href="/fonts/main.woff2" as="font" crossorigin>
<link rel="preload" href="/critical.js" as="script">
```
- Use for: fonts, above-the-fold images, critical JS/CSS.
- Preload too much = competing bandwidth = slower overall.

**Prefetch (likely needed SOON):**
```html
<link rel="prefetch" href="/next-page-bundle.js">
```
- Use for: next route the user is likely to navigate to.
- Loads during idle time, does not compete with critical resources.
- React Router / Next.js: prefetch on link hover or viewport intersection.

### Analysis tools

**webpack-bundle-analyzer:**
```bash
npx webpack-bundle-analyzer stats.json
```
- Treemap visualization of all chunks.
- Identify unexpectedly large modules.

**source-map-explorer:**
```bash
npx source-map-explorer dist/main.js
```
- Shows byte-level contribution of each module.
- Works with any bundler that produces source maps.

**bundlephobia.com:**
- Check package size before adding a dependency.
- Shows gzipped size, tree-shakeable status, download time.

### Unused code elimination

- **dead code:** code that is never executed (if-false branches, unreachable after return).
- **unused exports:** functions exported but never imported anywhere.
- Detect with: `knip`, `ts-prune`, or bundler warnings.
- Remove aggressively — version control has the history if you need it back.

### Dynamic imports best practices

- Name chunks for debugging: `import(/* webpackChunkName: "chart" */ './Chart')`.
- Error boundary around lazy components (handle load failures gracefully).
- Retry failed chunk loads (network errors) with exponential backoff.
- Use `webpackPreload` / `webpackPrefetch` magic comments where appropriate.

### Monitoring

- CI check: fail build if bundle exceeds budget (bundlesize, size-limit).
- Track bundle size over time in dashboard.
- Alert on sudden increases (new dependency or misconfigured import).
- Compare bundle size in PR comments (relative to main branch).

## Self-check before task completion
- [ ] Did I follow the mandatory actions for this skill?
- [ ] Did I apply the patterns appropriate to the context?
- [ ] Did I verify the implementation meets the criteria above?
- [ ] Did I document decisions and trade-offs made?
