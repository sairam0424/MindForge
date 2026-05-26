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
  const content = `
import { test, expect } from '@playwright/test';

test('Regression: ${bug.surface} [${bug.error}]', async ({ page }) => {
  await page.goto('${bug.surface}');
  // TODO: Add more specific assertions based on the bug
  expect(await page.isVisible('body')).toBeTruthy();
});
`;
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}

module.exports = { write };
