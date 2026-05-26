---
description: @mindforge qa [--phase N] [--auto]
---
# /mindforge:qa

## Usage
`@mindforge qa [--phase N] [--auto]`

## Description
Runs systematic visual QA on UI surfaces changed in the current phase.
Analyzes git diff to find pages, navigates to them, and looks for errors.

## Options
- `--phase N`: Target specific phase for reporting (defaults to current).
- `--auto`: Automatically run after successful wave execution if configured.

## Output
- `QA-REPORT-[N].md`: Found bugs with screenshots.
- `tests/regression/*.test.ts`: Playwright tests to prevent bug recurrence.
