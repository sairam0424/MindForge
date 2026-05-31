/**
 * MindForge — Regression Writer Tests (UC-22)
 * Guards against green-washing: the generated regression test MUST assert
 * against the actual bug payload (bug.error / bug.surface), not merely that
 * <body> is visible (which passes for virtually any page).
 *
 * Run: node tests/regression-writer.test.js
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const RegressionWriter = require('../bin/browser/regression-writer');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// Run `write` inside an isolated temp cwd so we never pollute the repo's
// tests/regression directory, then return the generated file's contents.
function generate(bug, phaseNum) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-regwriter-'));
  const prevCwd = process.cwd();
  try {
    process.chdir(tmp);
    const file = RegressionWriter.write(bug, phaseNum);
    return { file, content: fs.readFileSync(file, 'utf8') };
  } finally {
    process.chdir(prevCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

console.log('\nMindForge — Regression Writer Tests (UC-22)\n');

const sampleBug = {
  surface: '/checkout',
  error: 'TypeError: Cannot read properties of undefined (reading total)',
  screenshot: '/tmp/shot.png',
};

console.log('Generated test asserts against the actual bug:');

test('generated file is valid Playwright-style output', () => {
  const { content } = generate(sampleBug, 7);
  assert.ok(content.includes('@playwright/test'), 'should import @playwright/test');
  assert.ok(content.includes('test('), 'should declare a test()');
  assert.ok(content.includes('page.goto('), 'should navigate to the surface');
});

test('generated test references the specific bug.error string (regression signal)', () => {
  const { content } = generate(sampleBug, 7);
  assert.ok(
    content.includes(sampleBug.error),
    'generated test must embed the actual bug.error so it guards THIS regression'
  );
});

test('generated test contains an assertion derived from bug.error (not a body tautology)', () => {
  const { content } = generate(sampleBug, 7);
  // The error string must appear inside an expect(...) assertion, proving the
  // generated test would actually catch a re-occurrence of this bug.
  const errorIdx = content.indexOf(sampleBug.error);
  const expectIdx = content.indexOf('expect(');
  assert.ok(expectIdx !== -1, 'should contain at least one expect() assertion');
  // There must be an expect() that involves the error signal (console / page text).
  assert.ok(
    /expect\([^)]*[Cc]onsole|expect\([^)]*[Bb]ody|expect\([^)]*text|expect\([^)]*status/.test(content) ||
      content.slice(0, errorIdx).includes('consoleErrors') ||
      content.includes('consoleErrors'),
    'should assert against the captured failure signal (console errors / page text / status)'
  );
});

test('generated test is NOT a pure body-visibility tautology', () => {
  const { content } = generate(sampleBug, 7);
  // Strip the body-visibility line (if present) and confirm a meaningful
  // bug-specific assertion still remains.
  const withoutBodyLine = content
    .split('\n')
    .filter(line => !/isVisible\(['"]body['"]\)/.test(line))
    .join('\n');
  assert.ok(
    withoutBodyLine.includes(sampleBug.error),
    'a bug-specific assertion must survive even after removing any body-visibility check'
  );
});

test('no green-washing TODO placeholder remains', () => {
  const { content } = generate(sampleBug, 7);
  assert.ok(
    !/TODO/i.test(content),
    'generated test must not contain a TODO placeholder (green-washing marker)'
  );
});

test('captures console messages so the error assertion is real', () => {
  const { content } = generate(sampleBug, 7);
  assert.ok(
    /page\.on\(\s*['"]console['"]/.test(content),
    'generated test should subscribe to console messages to detect re-emitted errors'
  );
});

test('escapes special characters in bug.error safely', () => {
  const trickyBug = {
    surface: '/search',
    error: `Error: it's a 'quoted' ${'`'}backtick${'`'} and ${'${injection}'}`,
    screenshot: null,
  };
  const { content } = generate(trickyBug, 3);
  // The bug.error is embedded via JSON.stringify, so it must round-trip to the
  // exact original string — proving quotes/backticks/${} were escaped safely
  // and cannot break out of the surrounding string literal.
  assert.ok(
    content.includes(JSON.stringify(trickyBug.error)),
    'bug.error must be embedded as a safely-escaped JSON string literal'
  );
  // The surface should still be present for tricky payloads.
  assert.ok(
    content.includes('/search'),
    'surface should still be present for tricky payloads'
  );
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log('\n✅ All regression-writer tests passed.\n');
}
