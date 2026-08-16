/**
 * MindForge v11.9.2 — MINDFORGE.md parameter parser + config validator tests (CFG-01)
 * Run: node tests/mindforge-params.test.js
 */
'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');

const { parseParams, readParams } = require('../bin/utils/mindforge-params');

const ROOT = path.resolve(__dirname, '..');
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.error(`  ❌ ${name}\n     ${e.message}`); failed++; }
}

// ── Parser: bracketed form ───────────────────────────────────────────────────
console.log('\nMINDFORGE.md parser — bracketed form:');

test('parses bracketed assignments from the real MINDFORGE.md', () => {
  const params = readParams(path.join(ROOT, 'MINDFORGE.md'));
  // Regression guard for the v11.9.2 bug: the old /^([A-Z_]+)=(.+)$/ parser
  // matched ZERO lines of a bracketed registry, so the validator could never
  // fail and model routing always fell back to hardcoded DEFAULTS.
  assert.ok(Object.keys(params).length >= 40,
    `expected >=40 params, got ${Object.keys(params).length}`);
  // Governance constants — asserted exactly.
  assert.strictEqual(params.MIN_SOUL_SCORE, '7.0');
  assert.strictEqual(params.REACTIVE_MODE, 'true');
  // Model ids churn; assert shape, not a literal, so a topology bump does not
  // break this suite (tests/model-routing.test.js owns the literals).
  for (const k of ['PLANNER', 'EXECUTOR', 'REVIEWER', 'SECURITY']) {
    assert.match(params[k], /^[a-z0-9.-]+$/, `${k} should be a bare model id, got "${params[k]}"`);
  }
});

test('strips quotes, markdown autolinks and trailing # comments', () => {
  const p = parseParams([
    '[MODE] = "Platform Sovereign"',
    '[API_URL] = <http://localhost:3000>',
    '[PQAS_ENFORCED] = false  # simulated by default',
    '[HASH_URL] = http://a/b#frag',
  ].join('\n'));
  assert.strictEqual(p.MODE, 'Platform Sovereign');
  assert.strictEqual(p.API_URL, 'http://localhost:3000');
  assert.strictEqual(p.PQAS_ENFORCED, 'false');
  assert.strictEqual(p.HASH_URL, 'http://a/b#frag');
});

test('captures triple-quoted multi-line blocks and resumes after the fence', () => {
  const p = parseParams('[FORBIDDEN] = """\n- one\n- two\n"""\n[NEXT] = 2\n');
  assert.strictEqual(p.FORBIDDEN, '- one\n- two');
  assert.strictEqual(p.NEXT, '2');
});

test('does not capture section-7 prose bullets or lines inside a fenced block', () => {
  assert.deepStrictEqual(parseParams('- [MIN_SOUL_SCORE] — Minimum SOUL score\n'), {});
  // A plain KEY=value inside a """ block must not leak out as a setting.
  const p = parseParams('[A] = """\nLEAK=bad\n[NOT_A_KEY] = 9\n"""\n');
  assert.deepStrictEqual(Object.keys(p), ['A']);
});

test('handles CRLF line endings', () => {
  assert.deepStrictEqual(parseParams('[K] = v\r\n[J] = w\r\n'), { K: 'v', J: 'w' });
});

test('returns {} for a missing file rather than throwing', () => {
  assert.deepStrictEqual(readParams(path.join(os.tmpdir(), 'no-such-MINDFORGE.md')), {});
});

// ── Parser: legacy plain form ────────────────────────────────────────────────
// examples/starter-project/MINDFORGE.md ships (package.json files[] has
// "examples/") and uses the plain shell-style form exclusively. A bracket-only
// parser silently zeroes all 28 of its keys, and breaks the fixture asserted by
// tests/cli-router.test.js:263-270.
console.log('\nMINDFORGE.md parser — legacy plain KEY=value form:');

test('parses all 28 plain KEY=value lines of the shipped starter example', () => {
  const p = readParams(path.join(ROOT, 'examples', 'starter-project', 'MINDFORGE.md'));
  assert.strictEqual(Object.keys(p).length, 28,
    `starter example must yield 28 keys, got ${Object.keys(p).length}`);
  assert.strictEqual(p.MAX_TASKS_PER_PHASE, '15');
  assert.strictEqual(p.NAME, 'ExampleProject');
});

test('an empty legacy value is legal and is captured as an empty string', () => {
  // This is why LEGACY_RE uses (.*) and not (.+): `DISABLED_SKILLS=` is a real
  // line in the shipped starter example.
  const p = readParams(path.join(ROOT, 'examples', 'starter-project', 'MINDFORGE.md'));
  assert.ok('DISABLED_SKILLS' in p, 'DISABLED_SKILLS= must be captured');
  assert.strictEqual(p.DISABLED_SKILLS, '');
  assert.deepStrictEqual(parseParams('EMPTY=\n'), { EMPTY: '' });
});

test('reads the tests/cli-router.test.js schema-invalid fixture', () => {
  assert.deepStrictEqual(parseParams('# fixture config\n\nMAX_TASKS_PER_PHASE=999\n'),
    { MAX_TASKS_PER_PHASE: '999' });
});

test('a legacy line must start at column 0, so indented code samples are ignored', () => {
  assert.deepStrictEqual(parseParams('    INDENTED=nope\n'), {});
  assert.deepStrictEqual(parseParams('\tTABBED=nope\n'), {});
});

test('the bracketed form wins over the legacy form regardless of file order', () => {
  assert.deepStrictEqual(parseParams('K=legacy\n[K] = bracketed\n'), { K: 'bracketed' });
  assert.deepStrictEqual(parseParams('[K] = bracketed\nK=legacy\n'), { K: 'bracketed' });
});

// ── Model router adoption ────────────────────────────────────────────────────
console.log('\nModel router reads MINDFORGE.md:');

test('short persona keys are aliased onto the canonical *_MODEL keys', () => {
  const Router = require('../bin/models/model-router');
  Router.clearCache();
  const s = Router.getAllSettings();
  assert.strictEqual(s.PLANNER_MODEL, s.PLANNER,
    'PLANNER_MODEL must be resolved from [PLANNER]');
  assert.strictEqual(s.EXECUTOR_MODEL, s.EXECUTOR);
  assert.strictEqual(s.SECURITY_MODEL, s.SECURITY);
  // Keys the registry does not declare still fall back to DEFAULTS.
  assert.ok(String(s.QUICK_MODEL).includes('haiku'));
});

// ── Validator ────────────────────────────────────────────────────────────────
console.log('\nvalidate-config.js:');

function runValidator(cwd, ...args) {
  try {
    const stdout = execFileSync(process.execPath,
      [path.join(ROOT, 'bin', 'validate-config.js'), ...args],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out: stdout };
  } catch (e) {
    return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` };
  }
}

function fixture(mdText) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-cfg-'));
  fs.mkdirSync(path.join(dir, '.mindforge'));
  fs.copyFileSync(path.join(ROOT, '.mindforge', 'MINDFORGE-SCHEMA.json'),
    path.join(dir, '.mindforge', 'MINDFORGE-SCHEMA.json'));
  fs.writeFileSync(path.join(dir, 'MINDFORGE.md'), mdText);
  return dir;
}

const REAL_MD = fs.readFileSync(path.join(ROOT, 'MINDFORGE.md'), 'utf8');

test('the shipped MINDFORGE.md validates and reports a non-zero setting count', () => {
  const r = runValidator(ROOT);
  assert.strictEqual(r.code, 0, r.out);
  const m = r.out.match(/valid — (\d+) settings configured/);
  assert.ok(m, `expected a settings count in output, got: ${r.out}`);
  assert.ok(Number(m[1]) >= 40, `expected >=40 settings, got ${m[1]}`);
});

test('a missing required key fails with exit 1', () => {
  const dir = fixture(REAL_MD.split('\n').filter(l => !l.startsWith('[REACTIVE_MODE]')).join('\n'));
  const r = runValidator(dir);
  assert.strictEqual(r.code, 1, r.out);
  assert.match(r.out, /REACTIVE_MODE is required/);
});

test('an out-of-range number fails with exit 1', () => {
  const dir = fixture(REAL_MD.replace(/\[MIN_SOUL_SCORE\]\s*=\s*7\.0/, '[MIN_SOUL_SCORE] = 42'));
  const r = runValidator(dir);
  assert.strictEqual(r.code, 1, r.out);
  assert.match(r.out, /MIN_SOUL_SCORE: 42 exceeds maximum 10/);
});

test('an invalid enum value fails with exit 1', () => {
  const dir = fixture(REAL_MD.replace('[CONTEXT7_DEPTH] = "EXTENDED"', '[CONTEXT7_DEPTH] = "DEEP"'));
  const r = runValidator(dir);
  assert.strictEqual(r.code, 1, r.out);
  assert.match(r.out, /CONTEXT7_DEPTH/);
});

test('a malformed semver fails the pattern check with exit 1', () => {
  const dir = fixture(REAL_MD.replace(/\[VERSION\] = \d+\.\d+\.\d+/, '[VERSION] = 11.9'));
  const r = runValidator(dir);
  assert.strictEqual(r.code, 1, r.out);
  assert.match(r.out, /VERSION: "11\.9" does not match required pattern/);
});

test('disabling a non-overridable primitive fails with exit 1', () => {
  const dir = fixture(REAL_MD.replace(/\[BLOCK_ON_SECURITY\]\s*=\s*true/, '[BLOCK_ON_SECURITY] = false'));
  const r = runValidator(dir);
  assert.strictEqual(r.code, 1, r.out);
  assert.match(r.out, /BLOCK_ON_SECURITY: non-overridable/);
});

test('a legacy plain-form config is still schema-checked (cli-router.test.js contract)', () => {
  // tests/cli-router.test.js:263-270 asserts exactly this string and exit 1 via
  // `security-scan custom-config.md`. Proven here directly so a parser change
  // that drops legacy support fails in the module that owns it.
  const dir = fixture('# fixture config\n\nMAX_TASKS_PER_PHASE=999\n');
  const r = runValidator(dir);
  assert.strictEqual(r.code, 1, r.out);
  assert.match(r.out, /MAX_TASKS_PER_PHASE: 999 exceeds maximum 50/);
});

test('schema declares a required[] set and every entry has a property def', () => {
  const schema = JSON.parse(
    fs.readFileSync(path.join(ROOT, '.mindforge', 'MINDFORGE-SCHEMA.json'), 'utf8'));
  assert.ok(Array.isArray(schema.required) && schema.required.length > 0,
    'MINDFORGE-SCHEMA.json must declare a non-empty required[]');
  for (const key of schema.required) {
    assert.ok(schema.properties[key], `required key ${key} has no property definition`);
  }
  // additionalProperties:false is deliberately NOT set: the shipped starter
  // example declares 8 keys this schema does not define, and forbidding extras
  // would reject a working install.
  assert.ok(!Object.prototype.hasOwnProperty.call(schema, 'additionalProperties'),
    'additionalProperties must stay unset — see CFG-01 rationale');
});

console.log(`\n${failed === 0 ? '✅' : '❌'} mindforge-params: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
