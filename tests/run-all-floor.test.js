/**
 * MindForge — RUNNER-FLOOR: the test runner must be unable to report "I ran nothing".
 *
 * WHY this file exists: tests/run-all.js answered an empty discovery with
 * `console.log('No test files found.'); process.exit(0)`. That exit code is the
 * foundation of every quality claim in the repo — .github/workflows/mindforge-ci.yml
 * gates coverage with `npx c8 --check-coverage --lines 30 node tests/run-all.js`,
 * and .github/workflows/mindforge-release.yml runs `npm test` as the ONLY quality
 * step before `npm publish` — so a partial checkout of tests/, or a discovery
 * regression, would have shipped a green build that executed zero tests.
 *
 * Two independent guards, because either one alone can be fooled:
 *   1. FLOOR   — discoverTests() must find at least FLOOR files. Catches wholesale
 *                collapse (empty tree, wrong directory, a prune rule that eats
 *                everything), which lands at 0 or a handful.
 *   2. RECOUNT — an independently implemented walk of tests/ must agree EXACTLY
 *                with discoverTests(). Catches selective loss, which a slack floor
 *                cannot see. It re-implements the discovery spec documented in
 *                tests/README.md rather than importing SKIP_DIRS, so a regression
 *                in the runner's own prune rule surfaces as a mismatch instead of
 *                being copied into the expectation.
 *
 * Run: node tests/run-all-floor.test.js
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const TESTS_DIR = __dirname;
const RUN_ALL = path.join(TESTS_DIR, 'run-all.js');
const REPO_ROOT = path.join(TESTS_DIR, '..');

// A substring that cannot occur in any tests/-relative path.
const NO_MATCH = 'zz-runner-floor-no-such-pattern-zz';

// 105 *.test.js files on 2026-08-17 (106 including this file). FLOOR sits well
// below that on purpose: its job is to catch discovery COLLAPSE, not routine
// churn. At 90 the suite can lose 16 files to consolidation without reddening the
// build, while a collapse is still caught by a margin of ~90. A floor pinned to the
// exact count buys no extra detection for the collapse class and turns every
// legitimate deletion into a build failure — which is how floors get deleted
// instead of fixed. Selective loss is caught by the RECOUNT guard, not by FLOOR.
const FLOOR = 90;

// Requiring the runner must NOT start a run: main() is behind
// `if (require.main === module)`. If that guard is ever removed, this very require
// launches a nested full-suite run and this file blows its 60s timeout — so the
// require is itself part of the assertion.
const runner = require('./run-all.js');

// An independent implementation of the documented discovery spec: recurse from
// tests/; prune DIRECTORIES named node_modules or beginning with 'tmp-' or '.';
// any non-directory dirent counts iff its name ends in '.test.js' (so a symlink to
// a test file counts, exactly as the runner counts it).
function independentRecount(dir = TESTS_DIR) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      const pruned = e.name === 'node_modules'
        || e.name.startsWith('tmp-')
        || e.name.startsWith('.');
      return pruned ? [] : independentRecount(abs);
    }
    return e.name.endsWith('.test.js') ? [path.relative(TESTS_DIR, abs)] : [];
  }).sort();
}

// Run a runner (the real one, or a copy) and normalize the non-zero throw from
// execFileSync so exit codes can be asserted on directly.
function runRunner(runnerPath, args, cwd) {
  try {
    const stdout = execFileSync(process.execPath, [runnerPath, ...args], {
      encoding: 'utf8',
      timeout: 30000,
      cwd: cwd || REPO_ROOT,
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { status: 0, out: stdout };
  } catch (err) {
    return {
      status: err.status === undefined || err.status === null ? 1 : err.status,
      out: (err.stdout || '') + (err.stderr || ''),
    };
  }
}

// ── 1. The module contract the rest of this file depends on ─────────────────

test('run-all.js exports discoverTests/getSkipReason/getTimeoutMs behind a require.main guard', () => {
  assert.strictEqual(typeof runner.discoverTests, 'function', 'discoverTests must be exported');
  assert.strictEqual(typeof runner.getSkipReason, 'function', 'getSkipReason must be exported');
  assert.strictEqual(typeof runner.getTimeoutMs, 'function', 'getTimeoutMs must be exported');
  const src = fs.readFileSync(RUN_ALL, 'utf8');
  assert.ok(src.includes('require.main === module'),
    'main() must stay behind `require.main === module`, or requiring run-all.js launches a nested full run');
});

// ── 2. The floor ────────────────────────────────────────────────────────────

test(`discoverTests(null) finds at least ${FLOOR} test files`, () => {
  const all = runner.discoverTests(null);
  assert.ok(Array.isArray(all), 'discoverTests must return an array');
  assert.ok(all.length >= FLOOR,
    `discovery collapsed: ${all.length} file(s) found, floor is ${FLOOR}. ` +
    'Either tests/ lost most of its files or discovery is broken.');
});

test(`an independent walk of tests/ also finds at least ${FLOOR} test files`, () => {
  const recount = independentRecount();
  assert.ok(recount.length >= FLOOR,
    `independent recount found ${recount.length} file(s), floor is ${FLOOR}`);
});

test('discoverTests(null) agrees exactly with the independent walk', () => {
  const all = runner.discoverTests(null);
  const recount = independentRecount();
  assert.deepStrictEqual(all, recount,
    `runner discovery and independent recount disagree (${all.length} vs ${recount.length}); ` +
    'if the discovery spec changed on purpose, update independentRecount() to match');
});

test('this file is itself discovered, so the walk is live rather than a stale list', () => {
  const all = runner.discoverTests(null);
  assert.ok(all.includes('run-all-floor.test.js'),
    `run-all-floor.test.js must appear in discovery; got ${all.length} file(s) without it`);
});

// ── 3. Filtering is real, so the floor above is not a filtering artifact ────

test('a --filter narrows the selection instead of being ignored', () => {
  const all = runner.discoverTests(null);
  const one = runner.discoverTests(['run-all-floor']);
  assert.deepStrictEqual(one, ['run-all-floor.test.js'],
    'filter must select exactly the matching file');
  assert.ok(one.length < all.length,
    'a filter must narrow the selection; if it does not, the floor assertions are vacuous');
});

test('an impossible filter selects nothing', () => {
  assert.strictEqual(runner.discoverTests([NO_MATCH]).length, 0,
    'a pattern matching no path must select zero files');
});

// ── 4. Exit codes: nothing ran must never mean success ──────────────────────

test('the runner exits non-zero when --filter selects nothing', () => {
  const r = runRunner(RUN_ALL, [`--filter=${NO_MATCH}`]);
  assert.notStrictEqual(r.status, 0,
    `an empty --filter selection must not exit 0; got ${r.status}\n${r.out}`);
  assert.match(r.out, /matched 0 of \d+ discovered file/,
    `the runner must say the selection was empty; got:\n${r.out}`);
});

test('--allow-empty is the only way an empty --filter selection exits 0', () => {
  const r = runRunner(RUN_ALL, [`--filter=${NO_MATCH}`, '--allow-empty']);
  assert.strictEqual(r.status, 0,
    `--allow-empty must make an empty selection a pass; got ${r.status}\n${r.out}`);
  assert.match(r.out, /--allow-empty given/,
    `the runner must state that the empty selection was allowed; got:\n${r.out}`);
});

test('a runner in an empty tests directory exits non-zero, and --allow-empty cannot suppress it', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-floor-'));
  try {
    // A copy of the runner in an empty directory reproduces "zero files
    // discovered" exactly, with no need to disturb the real tests/ tree.
    const copy = path.join(tmp, 'run-all.js');
    fs.copyFileSync(RUN_ALL, copy);

    const bare = runRunner(copy, [], tmp);
    assert.notStrictEqual(bare.status, 0,
      `zero discovered files must not exit 0; got ${bare.status}\n${bare.out}`);
    assert.match(bare.out, /no \*\.test\.js file discovered/,
      `the runner must name the failure; got:\n${bare.out}`);

    const allowed = runRunner(copy, ['--allow-empty'], tmp);
    assert.notStrictEqual(allowed.status, 0,
      `--allow-empty must NOT suppress zero discovery; got ${allowed.status}\n${allowed.out}`);
  } finally {
    // Cleanup only. Never `process.exit(0)` in a finally — that is precisely how
    // four suites in this repo were made incapable of reporting failure.
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nRunner Floor: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
