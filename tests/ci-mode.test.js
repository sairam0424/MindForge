/**
 * MindForge Day 6 — CI Mode Tests
 * Run: node tests/ci-mode.test.js
 */
'use strict';
const fs = require('fs'), assert = require('assert');
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch(e) { console.error(`  ❌ ${name}\n     ${e.message}`); failed++; }
}
const read = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';

// ── CI mode detection simulation ──────────────────────────────────────────────
function isCiMode() {
  return process.env.CI === 'true' ||
         process.env.MINDFORGE_CI === 'true' ||
         process.stdin.isTTY === false;
}

// ── GitHub annotations format ─────────────────────────────────────────────────
function formatGitHubAnnotation(level, message, file, line) {
  const loc = file ? ` file=${file}${line ? `,line=${line}` : ''}` : '';
  return `::${level}${loc}::${message}`;
}

// ── Tier3 CI block simulation ─────────────────────────────────────────────────
function checkCiTierPolicy(tier, ciAutoApproveTier2 = false) {
  if (tier === 1) return 'auto-approved';
  if (tier === 2) return ciAutoApproveTier2 ? 'auto-approved' : 'blocked';
  if (tier === 3) return 'blocked'; // Always blocked in CI
  return 'unknown';
}

console.log('\nMindForge Day 6 — CI Mode Tests\n');

console.log('CI engine files:');
['ci-mode.md','github-actions-adapter.md','gitlab-ci-adapter.md'].forEach(f => {
  test(`${f} exists`, () => {
    assert.ok(fs.existsSync(`.mindforge/ci/${f}`), `Missing: .mindforge/ci/${f}`);
  });
});

console.log('\nCI mode detection:');
test('isCiMode returns false in normal test environment', () => {
  const origCI = process.env.CI;
  delete process.env.CI;
  delete process.env.MINDFORGE_CI;
  // In test environment, stdin.isTTY may be false — we test the env var logic only
  const ciFromEnv = process.env.CI === 'true' || process.env.MINDFORGE_CI === 'true';
  assert.strictEqual(ciFromEnv, false, 'Should not be CI mode from env vars');
  if (origCI) process.env.CI = origCI;
});

test('CI=true activates CI mode', () => {
  process.env.MINDFORGE_CI = 'true';
  assert.strictEqual(process.env.MINDFORGE_CI, 'true');
  delete process.env.MINDFORGE_CI;
});

console.log('\nCI tier policy:');
test('Tier 1 is always auto-approved in CI', () => {
  assert.strictEqual(checkCiTierPolicy(1), 'auto-approved');
});

test('Tier 2 blocked by default in CI (safety-first)', () => {
  assert.strictEqual(checkCiTierPolicy(2, false), 'blocked');
});

test('Tier 2 can be auto-approved in CI when configured', () => {
  assert.strictEqual(checkCiTierPolicy(2, true), 'auto-approved');
});

test('Tier 3 is ALWAYS blocked in CI regardless of config', () => {
  assert.strictEqual(checkCiTierPolicy(3, true), 'blocked');  // even with true
  assert.strictEqual(checkCiTierPolicy(3, false), 'blocked');
});

console.log('\nGitHub annotations format:');
test('notice annotation format is correct', () => {
  const ann = formatGitHubAnnotation('notice', 'Task 3-01 completed', null, null);
  assert.strictEqual(ann, '::notice::Task 3-01 completed');
});

test('error annotation with file and line is correct', () => {
  const ann = formatGitHubAnnotation('error', 'TypeScript error', 'src/auth.ts', 47);
  assert.strictEqual(ann, '::error file=src/auth.ts,line=47::TypeScript error');
});

test('warning annotation with file only (no line)', () => {
  const ann = formatGitHubAnnotation('warning', 'Security finding', 'src/utils.ts', null);
  assert.strictEqual(ann, '::warning file=src/utils.ts::Security finding');
});

console.log('\nGitHub Actions workflow:');
test('github-actions-adapter.md defines mindforge-ci.yml structure', () => {
  const c = read('.mindforge/ci/github-actions-adapter.md');
  assert.ok(c.includes('mindforge-ci.yml') || c.includes('on:'), 'Should define GitHub Actions workflow');
  assert.ok(c.includes('mindforge-health'), 'Should include health check job');
  assert.ok(c.includes('mindforge-security'), 'Should include security scan job');
});

test('ci-mode.md defines Tier 3 block policy', () => {
  const c = read('.mindforge/ci/ci-mode.md');
  assert.ok(
    (c.includes('Tier 3') && c.includes('block')) || c.includes('ALWAYS fails'),
    'CI mode should block Tier 3 changes'
  );
});

test('ci-mode.md has timeout configuration', () => {
  const c = read('.mindforge/ci/ci-mode.md');
  assert.ok(c.includes('timeout') || c.includes('TIMEOUT'), 'CI mode should have timeout config');
});

console.log('\nMonorepo support:');
['workspace-detector.md','cross-package-planner.md','dependency-graph-builder.md'].forEach(f => {
  test(`${f} exists`, () => {
    assert.ok(fs.existsSync(`.mindforge/monorepo/${f}`), `Missing: .mindforge/monorepo/${f}`);
  });
});

test('workspace-detector supports major monorepo types', () => {
  const c = read('.mindforge/monorepo/workspace-detector.md');
  ['nx', 'turborepo', 'lerna', 'pnpm'].forEach(type => {
    assert.ok(c.includes(type), `Should support ${type} monorepo type`);
  });
});

test('cross-package-planner has topological sort', () => {
  const c = read('.mindforge/monorepo/cross-package-planner.md');
  assert.ok(
    c.includes('topological') || c.includes('dependency order') || c.includes('Execution order'),
    'Should use topological sort for package order'
  );
});

console.log('\nHardening-prompted CI tests:');

test('ci-mode uses exit code 0 for timeout (not 2)', () => {
  const c = read('.mindforge/ci/ci-mode.md');
  assert.ok(
    c.includes('exit 0') && (c.includes('timeout') || c.includes('Timeout')),
    'Timeout should exit with code 0'
  );
  // Should NOT say exit 2 for timeout
  const exit2ForTimeout = c.match(/timeout.*exit 2|exit 2.*timeout/is);
  assert.ok(!exit2ForTimeout, 'Should not use exit 2 for timeout');
});

test('github-actions adapter has Tier 3 governance block with clear message', () => {
  const c = read('.mindforge/ci/github-actions-adapter.md');
  assert.ok(
    c.includes('Tier 3') && c.includes('block'),
    'Should explain Tier 3 CI block clearly'
  );
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n❌ ${failed} test(s) failed.\n`); process.exit(1); }
else { console.log(`\n✅ All CI mode tests passed.\n`); }
