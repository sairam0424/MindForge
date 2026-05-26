---
description: "Create design system token architecture. Usage: /mindforge:design-tokens [--layers primitive|semantic|component] [--theme dark|light]"
---

<objective>
Create a layered design token architecture with primitive, semantic, and component tokens — supporting theming, documentation, and versioning for a consistent design system.
</objective>

<execution_context>
@.mindforge/skills/design-system/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (optional --layers primitive|semantic|component to focus on specific layer, optional --theme dark|light)
Knowledge: Current design system, brand guidelines, component library, accessibility requirements.
</context>

<process>
1. **Define primitive tokens**: Establish the raw design values:
   - Colors: full palette with numbered scales (gray-100 through gray-900, blue-100 through blue-900)
   - Spacing: base unit (4px or 8px) with scale (0.5x, 1x, 1.5x, 2x, 3x, 4x, 6x, 8x, 12x, 16x)
   - Typography: font families (sans, mono, serif), sizes (xs through 4xl), weights (regular, medium, semibold, bold), line heights (tight, normal, relaxed)
   - Border radius: none, sm, md, lg, xl, full
   - Shadows: sm, md, lg, xl (with offset, blur, spread, color)
   - Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
   - Motion: duration (fast 100ms, normal 200ms, slow 300ms), easing (ease-in, ease-out, ease-in-out)

2. **Map to semantic tokens**: Create meaningful aliases:
   - `color-primary` → blue-600, `color-primary-hover` → blue-700
   - `color-surface` → white, `color-surface-elevated` → gray-50
   - `color-text-primary` → gray-900, `color-text-secondary` → gray-600
   - `color-border` → gray-200, `color-border-focus` → blue-500
   - `color-success` → green-600, `color-warning` → amber-600, `color-error` → red-600
   - `spacing-page` → 6x, `spacing-section` → 4x, `spacing-element` → 2x
   - `font-heading` → sans/bold, `font-body` → sans/regular, `font-code` → mono/regular
   - Ensure all semantic tokens pass WCAG 2.1 AA contrast ratios (4.5:1 for text, 3:1 for UI)

3. **Derive component tokens**: Map semantic tokens to component-specific usage:
   - `button-bg` → color-primary, `button-text` → color-on-primary
   - `button-radius` → radius-md, `button-padding` → spacing-2x spacing-4x
   - `input-border` → color-border, `input-border-focus` → color-border-focus
   - `input-bg` → color-surface, `input-text` → color-text-primary
   - `card-bg` → color-surface-elevated, `card-shadow` → shadow-md
   - `card-radius` → radius-lg, `card-padding` → spacing-4x
   - Each component token references semantic tokens (never primitives directly)

4. **Implement theming**: Support dark and light modes:
   - Dark theme overrides semantic layer only (primitives stay constant)
   - `color-surface` → gray-900 (dark), `color-text-primary` → gray-100 (dark)
   - `color-border` → gray-700 (dark), `color-surface-elevated` → gray-800 (dark)
   - Shadows: reduce opacity in dark mode, add subtle inner glow
   - Ensure all dark theme combinations meet contrast requirements
   - Implementation: CSS custom properties with `[data-theme="dark"]` selector
   - System preference detection: `prefers-color-scheme` media query as default

5. **Document in Storybook**: Create documentation artifacts:
   - Token reference page: all tokens with visual swatches and values
   - Usage guidelines: when to use which semantic token
   - Do/Don't examples: correct vs incorrect token usage
   - Accessibility notes: contrast ratios, focus indicators, motion preferences
   - Migration guide: how to adopt tokens in existing components
   - Playground: interactive token picker for designers

6. **Version the token system**: Establish governance:
   - Semantic versioning for the token package (major.minor.patch)
   - Breaking change: removing a token or changing its type → major bump
   - Addition: new token → minor bump
   - Value change: updating a token value → patch bump
   - Deprecation process: mark deprecated, provide migration path, remove in next major
   - Change log: document every token change with rationale
   - Distribution: npm package, Figma plugin sync, design tool integration

7. **Output token architecture**: Deliver:
   - Token definition files (JSON, CSS custom properties, SCSS variables)
   - Theme configuration (light + dark)
   - TypeScript type definitions for token keys
   - Figma-compatible token export
   - Documentation site structure
   - Integration guide for consuming applications
</process>
