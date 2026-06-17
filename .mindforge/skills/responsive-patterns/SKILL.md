---
name: responsive-patterns
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
triggers: responsive pattern, mobile first design, container queries pattern, fluid typography, adaptive component design, breakpoint strategy, viewport units, media query architecture, responsive layout pattern, responsive image strategy, css clamp technique, responsive grid system
---

# Skill — Responsive Patterns

## When this skill activates
Any task involving responsive layout architecture, mobile-first design, adaptive
components, fluid sizing, or multi-viewport support.

## Mandatory actions when this skill is active

### Before writing any code
1. Determine if the design is mobile-first or desktop-first (prefer mobile-first).
2. Identify content-based breakpoints (where the layout breaks, not device widths).
3. Decide between page-level media queries vs component-level container queries.

### During implementation
- Use `min-width` media queries for mobile-first progressive enhancement.
- Apply container queries for reusable components that adapt to their parent.
- Use fluid typography with `clamp()` for smooth scaling without breakpoints.
- Prefer CSS Grid for 2D layouts, Flexbox for 1D alignment.
- Use modern viewport units (`dvh`, `svw`, `lvw`) for mobile Safari compatibility.

### After implementation
- Test at minimum: 320px, 768px, 1024px, 1440px viewports.
- Verify no horizontal scroll at any viewport width.
- Check touch targets are minimum 44x44px on mobile.
- Validate images load appropriate sizes (not desktop images on mobile).

## Core strategies

### Mobile-First
```css
/* Base styles (mobile) */
.card { padding: 1rem; }

/* Tablet and up */
@media (min-width: 48rem) {
  .card { padding: 1.5rem; }
}

/* Desktop and up */
@media (min-width: 64rem) {
  .card { padding: 2rem; }
}
```

### Container Queries
```css
.card-container { container-type: inline-size; }

@container (min-width: 400px) {
  .card { display: grid; grid-template-columns: 1fr 2fr; }
}

@container (min-width: 700px) {
  .card { grid-template-columns: 1fr 3fr 1fr; }
}
```

### Fluid Typography
```css
/* Scales from 1rem at 320px to 2rem at 1200px */
h1 { font-size: clamp(1rem, 0.5rem + 2.5vw, 2rem); }

/* Body text with subtle scaling */
body { font-size: clamp(0.875rem, 0.8rem + 0.25vw, 1rem); }
```

### Breakpoint Strategy
- Do NOT use device-based breakpoints (iPhone, iPad, etc.).
- Add a breakpoint when content breaks or becomes unreadable.
- Common content breakpoints: ~30rem, ~48rem, ~64rem, ~80rem.
- Name tokens semantically: `--bp-compact`, `--bp-medium`, `--bp-wide`.

### CSS Grid Layouts
```css
/* Auto-fit responsive grid — no media queries needed */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 1.5rem;
}
```

### Responsive Images
```html
<!-- srcset for resolution switching -->
<img
  srcset="image-400.webp 400w, image-800.webp 800w, image-1200.webp 1200w"
  sizes="(max-width: 48rem) 100vw, (max-width: 64rem) 50vw, 33vw"
  src="image-800.webp"
  alt="Description"
  loading="lazy"
/>

<!-- picture for art direction -->
<picture>
  <source media="(min-width: 64rem)" srcset="wide.webp" />
  <source media="(min-width: 48rem)" srcset="medium.webp" />
  <img src="narrow.webp" alt="Description" />
</picture>
```

### Viewport Units
```css
/* Use dvh for mobile Safari (accounts for address bar) */
.hero { min-height: 100dvh; }

/* svh = smallest viewport height (address bar visible) */
.sticky-footer { height: 100svh; }
```

### Adaptive Components (Slot-Based)
Design components that render different internal layouts based on container size:
- Compact: stacked layout, icon-only buttons.
- Medium: side-by-side layout, abbreviated labels.
- Wide: full layout, expanded content, additional metadata.

## Anti-patterns to avoid
- Fixed pixel widths on containers (use max-width + percentage/auto).
- Device-specific breakpoints (will break on next year's devices).
- Hiding content with `display: none` at breakpoints (serve less content instead).
- Using `vw` for font-size without `clamp()` (too small on mobile, too large on 4K).
- Horizontal scrolling caused by fixed-width elements or overflow.

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Layout works at 320px without horizontal scroll?
- [ ] Typography scales fluidly without jarring jumps?
- [ ] Images serve appropriate sizes per viewport?
- [ ] Touch targets are 44x44px minimum on mobile?
- [ ] Container queries used for reusable component responsiveness?
- [ ] No device-specific breakpoints in the code?
