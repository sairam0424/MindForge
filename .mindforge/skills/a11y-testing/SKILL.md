---
name: a11y-testing
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: a11y testing, axe-core, automated accessibility, screen reader testing, keyboard navigation audit, WCAG compliance test, aria validation, focus management test, color contrast check, accessibility CI, accessibility report, assistive technology
compose: accessibility
---

# Skill — Accessibility Testing

## When this skill activates
Any task involving accessibility testing, WCAG compliance, screen reader validation,
keyboard navigation audits, or automated a11y CI pipelines.

## Mandatory actions when this skill is active

### Before testing accessibility
1. Identify the target WCAG conformance level (A, AA, or AAA).
2. Determine which automated tools are available in the project.
3. Plan manual testing scenarios for what automation cannot catch.

### Automated testing (~30% of issues)

**Unit level (jest-axe):**
```javascript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Integration level (Playwright + axe):**
```javascript
import AxeBuilder from '@axe-core/playwright';

test('page has no a11y violations', async ({ page }) => {
  await page.goto('/dashboard');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

**CI pipeline:**
- Run axe-core on every PR against all critical routes.
- Fail the build on any "critical" or "serious" violations.
- Report "moderate" violations as warnings (fix in next sprint).
- Track violation count over time — must trend downward.

### Manual testing checklist

**Keyboard navigation:**
- [ ] Tab through ALL interactive elements in logical order.
- [ ] Shift+Tab moves backwards correctly.
- [ ] Enter/Space activates buttons and links.
- [ ] Escape closes modals, dropdowns, popovers.
- [ ] Arrow keys navigate within composite widgets (tabs, menus, grids).
- [ ] No keyboard traps (can always Tab out, except modals).
- [ ] Focus indicator is clearly visible on all elements.

**Screen reader testing:**
- [ ] VoiceOver (macOS/iOS) — full user flow.
- [ ] NVDA (Windows) — full user flow.
- [ ] All images have meaningful alt text (or alt="" for decorative).
- [ ] Form inputs have associated labels.
- [ ] Dynamic content changes are announced (aria-live regions).
- [ ] Headings form a logical hierarchy (h1 > h2 > h3, no skips).

**Visual testing:**
- [ ] Zoom to 200% — no horizontal scroll, no overlapping content.
- [ ] Zoom to 400% — content still readable and usable.
- [ ] High contrast mode — all content visible.
- [ ] Reduced motion — animations respect prefers-reduced-motion.

### WCAG conformance levels

**Level A (minimum, always required):**
- All non-text content has text alternative.
- Content is navigable by keyboard.
- No content causes seizures.

**Level AA (target for most applications):**
- Color contrast ratio 4.5:1 for normal text, 3:1 for large text.
- Text can be resized to 200% without loss of content.
- Focus order is meaningful and logical.
- Error messages identify the field and suggest correction.

**Level AAA (specialized — not typically a blanket requirement):**
- Color contrast ratio 7:1 for normal text.
- Sign language interpretation for media.
- Reading level accommodations.

### Focus management

**Modal dialogs:**
- Move focus into the modal when opened.
- Trap focus within the modal (Tab cycles inside).
- Return focus to the trigger element when closed.

**Route changes (SPA):**
- Move focus to the main content heading on navigation.
- Announce the new page to screen readers (aria-live or document.title).

**Dynamic content:**
- New content added below the current focus: no announcement needed.
- New content that requires attention: use aria-live="polite".
- Urgent alerts: use aria-live="assertive" (sparingly).

**Skip links:**
- First focusable element should be "Skip to main content."
- Links to bypass repetitive navigation blocks.

### Color contrast

**Tools:**
- Browser DevTools (Accessibility panel shows contrast ratios).
- axe-core catches contrast violations automatically.
- Contrast checker plugins for design tools (Figma, Sketch).

**Ratios:**
- Normal text (< 18px or < 14px bold): minimum 4.5:1.
- Large text (>= 18px or >= 14px bold): minimum 3:1.
- UI components and graphical objects: minimum 3:1.
- Never convey information by color alone (add icons, patterns, text).

### Reporting format

When reporting accessibility issues, include:
1. **What** — the specific WCAG criterion violated.
2. **Where** — page URL and element selector/description.
3. **Impact** — who is affected and how severely.
4. **Fix** — specific remediation recommendation.
5. **Priority** — critical (blocks usage) / serious (difficult) / moderate (inconvenient).

## Self-check before task completion
- [ ] Did I follow the mandatory actions for this skill?
- [ ] Did I apply the patterns appropriate to the context?
- [ ] Did I verify the implementation meets the criteria above?
- [ ] Did I document decisions and trade-offs made?
