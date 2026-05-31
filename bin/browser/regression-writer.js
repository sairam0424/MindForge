/**
 * MindForge v2 — Regression Writer
 */
'use strict';

const fs    = require('fs');
const path  = require('path');

function write(bug, phaseNum) {
  const dir = path.join(process.cwd(), 'tests', 'regression');
  fs.mkdirSync(dir, { recursive: true });
  const name = `phase${phaseNum}-${bug.surface.replace(/\//g, '-').slice(1) || 'home'}.test.ts`;

  // Embed the bug's surface and failure signal as safely-escaped JS string
  // literals. JSON.stringify escapes quotes, backticks and ${...} so a
  // freeform bug.error cannot break out of the generated source.
  const surfaceLit = JSON.stringify(bug.surface);
  const errorLit   = JSON.stringify(bug.error);

  // The generated test reproduces the original failure conditions and asserts
  // the page no longer exhibits THIS bug's signal — it is NOT a body-visibility
  // tautology that passes for any page.
  const content = `
import { test, expect } from '@playwright/test';

// Regression guard for the bug originally observed on ${bug.surface}:
//   ${String(bug.error).replace(/[\r\n]+/g, ' ')}
// This test fails again if that failure signal re-appears (console error,
// page text, or a >=400 HTTP status on the affected surface).
const SURFACE = ${surfaceLit};
const BUG_SIGNAL = ${errorLit};

test('Regression: ' + SURFACE + ' [' + BUG_SIGNAL + ']', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  const response = await page.goto(SURFACE);

  // 1. The affected surface must load without the original HTTP failure.
  if (response) {
    expect(response.status(), 'surface re-returned a failing HTTP status').toBeLessThan(400);
  }

  // 2. The specific failure signal must not re-appear in the console.
  expect(
    consoleErrors.some((line) => line.includes(BUG_SIGNAL)),
    'console re-emitted the original error: ' + BUG_SIGNAL
  ).toBeFalsy();

  // 3. ...nor be surfaced in the rendered page text.
  const bodyText = await page.textContent('body');
  expect(
    (bodyText || '').includes(BUG_SIGNAL),
    'page re-rendered the original error: ' + BUG_SIGNAL
  ).toBeFalsy();

  // 4. Smoke check: the page actually rendered something.
  expect(await page.isVisible('body')).toBeTruthy();
});
`;
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}

module.exports = { write };
