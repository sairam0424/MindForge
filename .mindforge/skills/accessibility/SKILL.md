---
name: accessibility
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: accessibility, a11y, aria, ARIA, wcag, WCAG, screen reader, keyboard,
          focus, tab order, colour contrast, color contrast, alt text, semantic HTML,
          form label, button, interactive, disabled, skip link, heading hierarchy,
          landmark, live region, modal, dialog, tooltip, dropdown, combobox
---

# Skill — Accessibility Engineering

## When this skill activates
Any task involving UI components, forms, interactive elements, or user-facing HTML.
Load this skill for ALL frontend work — accessibility is not optional.

## Mandatory standard
WCAG 2.1 Level AA is the minimum. This is the legal requirement in most jurisdictions.
Level AAA elements (where achievable without design compromise) are recommended.

## Mandatory actions when this skill is active

### Before writing any UI component
1. Identify the semantic HTML element that best represents the component.
   Use native HTML before ARIA. A `<button>` is always better than a `<div role="button">`.
2. Map all interactive states: default, hover, focus, active, disabled, error, loading.
3. Confirm colour contrast meets WCAG AA:
   - Normal text: contrast ratio ≥ 4.5:1
   - Large text (≥ 18pt or ≥ 14pt bold): contrast ratio ≥ 3:1
   - UI components and graphics: contrast ratio ≥ 3:1

### HTML semantics checklist (apply to every component)

**Structure:**
- [ ] One `<h1>` per page. Heading hierarchy is sequential (h1 → h2 → h3, never skip levels)
- [ ] Landmark roles present: `<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>`
- [ ] Skip navigation link as the first focusable element on every page

**Forms:**
- [ ] Every input has a visible `<label>` (not just placeholder text)
- [ ] Label is programmatically associated: `<label for="id">` or `aria-labelledby`
- [ ] Required fields marked: `required` attribute + visual indicator + aria description
- [ ] Error messages: `role="alert"` or `aria-live="polite"`, associated with field via `aria-describedby`
- [ ] Validation errors describe the problem AND the fix, not just "Invalid input"

**Interactive components:**
- [ ] All interactive elements reachable by Tab key
- [ ] Focus visible: never `outline: none` without a custom visible focus style
- [ ] Keyboard shortcuts documented and not conflicting with browser/OS shortcuts
- [ ] Custom widgets implement the correct ARIA pattern (see ARIA Authoring Practices Guide)

**Images and media:**
- [ ] Decorative images: `alt=""` (empty string, not omitted)
- [ ] Informative images: `alt` describes the information conveyed
- [ ] Complex images (charts, diagrams): `aria-describedby` pointing to a full text description
- [ ] Videos: captions required. Audio descriptions for visual-only information.

**Dynamic content:**
- [ ] Content that updates dynamically: `aria-live="polite"` (non-critical) or `aria-live="assertive"` (critical)
- [ ] Modals/dialogs: focus moves to modal on open, returns to trigger on close, `aria-modal="true"`
- [ ] Loading states: `aria-busy="true"` on the container being updated

### ARIA usage rules
- Use ARIA only when no native HTML element conveys the role
- ARIA roles override native semantics — applying a role to `<button>` changes it
- Required ARIA properties: never use a role without its required properties
  (e.g., `role="checkbox"` requires `aria-checked`)
- Never use `aria-hidden="true"` on focusable elements

### Testing protocol
```bash
# Automated testing (catches ~30-40% of issues)
npx axe-cli https://localhost:3000

# Keyboard testing (manual — must be done for every interactive component)
# 1. Tab through every interactive element — order must be logical
# 2. Activate every control with Enter/Space — must work
# 3. Navigate dropdowns/menus with arrow keys
# 4. Escape dismisses modals and dropdowns

# Screen reader testing (minimum: test with NVDA + Chrome on Windows OR
#                                     VoiceOver + Safari on macOS)
# Key checks:
# - Every interactive element announced with role, name, and state
# - Dynamic updates announced appropriately
# - Images described correctly

# Contrast checking
# Install: axe DevTools browser extension or Colour Contrast Analyser
```

## Self-check before task completion
- [ ] Ran `axe-cli` — zero violations
- [ ] Keyboard navigation tested manually
- [ ] All interactive elements have accessible names
- [ ] Colour contrast meets 4.5:1 for text
- [ ] Focus management correct for modals and dynamic content
- [ ] No `aria-hidden` on focusable elements
