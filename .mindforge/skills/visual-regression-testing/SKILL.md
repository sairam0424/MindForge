---
name: visual-regression-testing
version: 1.0.0
min_mindforge_version: 10.0.8
status: stable
triggers: visual regression, screenshot test, pixel diff, visual baseline, chromatic, percy, visual snapshot, component screenshot, visual comparison, layout shift detection, visual approval, screenshot diff
compose: testing-standards
---

# Visual Regression Testing

## When this skill activates

This skill activates when implementing screenshot-based testing, configuring visual diff tools, managing visual baselines, or investigating unexpected UI changes. It applies to component-level visual testing (Storybook), page-level screenshots, and responsive layout verification.

## Mandatory actions when this skill is active

### Before

1. Determine the scope: component-level (individual components in isolation) or page-level (full page renders).
2. Select the tooling approach (Playwright screenshots, Chromatic, Percy, BackstopJS).
3. Identify dynamic content that must be stabilized (timestamps, avatars, animations, ads).
4. Define viewport sizes to capture (mobile: 375px, tablet: 768px, desktop: 1440px minimum).
5. Establish the pixel diff threshold (recommended: 0.1% for strict, 0.5% for lenient).
6. Confirm baseline images exist or plan initial baseline capture.

### During

**Core Workflow:**
1. Capture baseline screenshots (the "known good" state).
2. Make code changes (feature, refactor, dependency update).
3. Capture new screenshots under identical conditions.
4. Run pixel diff comparison between baseline and new.
5. Review diffs: approve intentional changes, reject regressions.
6. Update baselines for approved changes.

**Handling Dynamic Content (Critical):**
- **Timestamps/dates**: Mock to a fixed date (`2024-01-15T10:00:00Z`).
- **Avatars/images**: Use deterministic placeholder images.
- **Animations**: Disable CSS animations and transitions during capture.
- **Cursor blink**: Hide input cursors via CSS override.
- **Loading states**: Wait for network idle and all images loaded before capture.
- **Random content**: Seed random generators or use fixed test data.
- **Third-party widgets**: Hide or mock (chat widgets, analytics banners).

**Component-Level Testing (Storybook + Chromatic):**
- Every component gets a story with representative states (default, loading, error, empty, overflow).
- Chromatic captures each story as a visual baseline automatically.
- Review changes in Chromatic UI with side-by-side comparison.
- Use `args` and `decorators` to control component state deterministically.
- Group related stories to reduce noise in review.

**Page-Level Testing (Playwright/BackstopJS):**
- Navigate to page, wait for full render (network idle + specific element visible).
- Capture at multiple viewports for responsive verification.
- Use `page.screenshot({ fullPage: true })` for scroll content.
- Clip to specific regions when full-page comparison is too noisy.
- Set `maxDiffPixelRatio` threshold in Playwright config.

**Diff Thresholds:**
- **0.0%**: Exact match required. Use only for pixel-perfect components (logos, icons).
- **0.1%**: Strict. Catches anti-aliasing differences across OS/browser combos.
- **0.5%**: Standard. Tolerates minor rendering engine differences.
- **1.0%**: Lenient. Use for pages with slight layout flexibility.
- Above 1%: Likely a real regression — always investigate.

**CI Integration:**
- Run visual tests on every PR (component-level at minimum).
- Full page-level suite on merge to main or nightly.
- Store baseline images in version control or dedicated storage (LFS for large sets).
- Block merge if unapproved visual diffs exist.
- Provide direct links to diff viewer in PR comments.

**Approval Workflow:**
- Designer or frontend lead reviews visual diffs before approval.
- Bulk approve when changes are intentional (theme update, design system change).
- Document WHY a visual change was approved (link to design ticket).
- Never auto-approve visual diffs — human review is the point.

### After

1. All visual diffs are reviewed and explicitly approved or rejected.
2. Baselines are updated to reflect the new approved state.
3. Dynamic content is fully stabilized (no flaky screenshots).
4. Responsive breakpoints are covered (minimum 3 viewport widths).
5. CI pipeline gates merge on unapproved visual changes.

## Self-check before task completion

- [ ] Dynamic content is fully mocked/frozen (no timestamps, no random data in screenshots).
- [ ] Screenshots are captured after full render (network idle, fonts loaded, animations disabled).
- [ ] Diff threshold is explicitly configured and appropriate for the content type.
- [ ] Multiple viewport sizes are tested (mobile, tablet, desktop at minimum).
- [ ] Approval workflow is defined (who reviews, how to approve, where to document).
- [ ] Baseline images are stored durably and versioned with the code.
- [ ] CI blocks deployment on unapproved visual regressions.
- [ ] Flakiness is below 1% (re-run same code twice, expect identical screenshots).
