---
name: design-system
version: 1.0.0
min_mindforge_version: 10.0.7
status: stable
triggers: design system architecture, component library design, design token system, storybook documentation, variant pattern design, theme architecture, atomic design pattern, component documentation standard, design system versioning, token based theming, component catalog, ui component library
---

# Design System

## When this skill activates

This skill activates when the user is designing, building, or maintaining a design
system or component library. This includes design token architecture, atomic design
methodology, component API design, Storybook documentation, variant patterns, theme
architecture (dark/light/custom), design system versioning strategy, contribution
models, and component catalog organization.

## Mandatory actions

### Before

1. Identify the target frameworks and platforms (React, Vue, Svelte, iOS, Android, web components).
2. Determine the team size and contribution model (centralized team vs federated).
3. Assess existing UI components and visual inconsistencies to address.
4. Review brand guidelines and design specifications (Figma, Sketch, or equivalent).
5. Identify theming requirements (dark mode, white-label, multi-brand).

### During

**Design Tokens:**
- **Primitive tokens:** Raw values with no semantic meaning (colors: `blue-500: #3B82F6`, spacing: `space-4: 16px`, typography: `font-size-lg: 18px`).
- **Semantic tokens:** Meaningful aliases that reference primitives (`color-primary: {blue-500}`, `color-text-default: {gray-900}`, `spacing-inline-md: {space-4}`).
- **Component tokens:** Scoped to specific components (`button-padding-x: {spacing-inline-md}`, `button-bg-primary: {color-primary}`).
- Store tokens in a tool-agnostic format (JSON/YAML) and generate platform-specific outputs (CSS custom properties, Swift/Kotlin constants, SCSS variables).
- Use Style Dictionary or Tokens Studio for token transformation pipelines.
- Token naming convention: `{category}-{property}-{variant}-{state}` (e.g., `color-text-primary-hover`).

**Atomic Design Methodology:**
- **Atoms:** Smallest indivisible elements (Button, Input, Icon, Label, Badge).
- **Molecules:** Groups of atoms functioning together (SearchBar = Input + Button, FormField = Label + Input + ErrorMessage).
- **Organisms:** Complex sections composed of molecules (Header = Logo + Nav + SearchBar, Card = Image + Title + Description + Actions).
- **Templates:** Page layouts without real content (defines the skeleton/grid).
- **Pages:** Templates populated with real content (final implementation).
- Not every component fits neatly — use atomic levels as guidance, not strict rules.

**Component API Design:**
- Props interface is the public contract. Design it carefully.
- Use variants via props, not CSS class names (`<Button variant="primary">` not `<Button className="btn-primary">`).
- Prefer composition over configuration (slot-based patterns, children, render props).
- Limit prop count: if > 8 props, consider splitting into sub-components.
- Use TypeScript/PropTypes for full type safety on component interfaces.
- Default props to the most common use case (progressive disclosure).
- Forward refs and spread remaining props for extensibility.

**Storybook Documentation:**
- One story file per component, co-located with the component source.
- Stories for every meaningful state: default, hover, focus, disabled, loading, error, empty.
- Use args/controls for interactive prop exploration.
- Include the a11y addon and verify each story passes accessibility checks.
- Write MDX documentation pages for usage guidelines and do/don't examples.
- Chromatic or Percy for visual regression testing on every PR.

**Versioning:**
- Semantic versioning (semver) for the component library package.
- **Major:** Breaking API changes (prop removal, renamed component, changed behavior).
- **Minor:** New components, new variants, additive features.
- **Patch:** Bug fixes, accessibility improvements, style corrections.
- Maintain a changelog (auto-generated from conventional commits).
- Support at least one previous major version during migration period.
- Pin design system version in consuming applications.

**Theming:**
- CSS custom properties for runtime theme switching (no rebuild required).
- Theme object structure mirrors semantic token hierarchy.
- Support: light, dark, and system-preference (prefers-color-scheme).
- White-label: allow consumers to override semantic tokens without touching components.
- Test all components in all supported themes (visual regression).
- Provide a ThemeProvider component for React/Vue context-based theming.

**Contribution Model:**
- RFC process for new components (proposal → review → build → document → release).
- Review criteria: accessibility, responsiveness, theme support, documentation, tests.
- Component readiness checklist before merging into the system.
- Deprecation policy: announce → mark deprecated → migration guide → remove after N versions.
- Office hours or design system team review for proposed additions.

**Accessibility (Built-in):**
- Every component must meet WCAG 2.1 AA as a minimum.
- Keyboard navigation, focus management, and ARIA attributes are non-negotiable.
- Color contrast ratios enforced via tokens (4.5:1 for text, 3:1 for UI elements).
- Screen reader testing as part of component QA.
- Document accessibility patterns in component documentation.

### After

1. Verify token pipeline generates correct outputs for all target platforms.
2. Confirm Storybook coverage includes all component states and variants.
3. Validate theme switching works across all components without visual regressions.
4. Check accessibility audit passes for every component in the catalog.
5. Ensure versioning and changelog are current and accurate.
6. Validate contribution documentation is clear for new contributors.

## Self-check before task completion

- [ ] Design tokens follow the three-tier hierarchy (primitive → semantic → component).
- [ ] Components follow atomic design principles with clear categorization.
- [ ] Component APIs use props for variants and composition for flexibility.
- [ ] Storybook documents all states with interactive controls and accessibility checks.
- [ ] Versioning follows semver with a maintained changelog.
- [ ] Theming supports light/dark/system with CSS custom properties.
- [ ] Contribution model includes RFC process and readiness checklist.
- [ ] Accessibility meets WCAG 2.1 AA across all components and themes.
