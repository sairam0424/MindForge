# MindForge v2 — QA Engine

## Purpose
Systematic post-phase visual QA.
Analyzes git diff, extracts UI surfaces (pages, routes), and runs tests.

## Test Strategy
For each page found:
1. Load page -> check for JS errors.
2. Verify main content visibility.
3. Test authentication redirects.
4. Document any rendering or logic bugs.

## Outputs
- `QA-REPORT-[N].md`: Detailed phase report.
- `tests/regression/*.test.ts`: Playwright tests for every bug found.
