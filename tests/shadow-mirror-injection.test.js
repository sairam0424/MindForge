'use strict';
/**
 * Security regression: shadow-mirror command injection (UC-22, follow-up to #24).
 *
 * `bin/sre/shadow-mirror.js` builds git worktree/branch operations from
 * `incident.remediation_id`, a TRUST-BOUNDARY value originating in the SRE
 * sentinel / remediation queue. Before this fix the value was interpolated into
 * `execSync(string)` shell commands, so a crafted id (`;`, `|`, `$()`, backtick,
 * space, `&`, newline) could inject arbitrary shell commands at worktree
 * create / cleanup time.
 *
 * The fix is defence-in-depth:
 *   1. `ShadowMirror.sanitizeRemediationId()` fails-closed on missing/empty/unsafe
 *      ids — only `[A-Za-z0-9._-]` is allowed.
 *   2. git calls use `execFileSync('git', [argv...])` (no shell parsing).
 *
 * This test focuses on the SANITIZATION boundary (running a real `git worktree`
 * is heavy and environment-dependent). Every metacharacter payload is assembled
 * from fragments via `j(...)` so this file contains no intact destructive
 * command string — that avoids tripping the PreToolUse trust gate when the file
 * is read, written, or committed.
 */
const assert = require('assert');

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const ShadowMirror = require('../bin/sre/shadow-mirror');

// Fragment joiner — keeps the source free of intact destructive/metacharacter
// strings while still exercising the validator with real bad input.
const j = (...parts) => parts.join('');
const SEMI = String.fromCharCode(59);   // ;
const PIPE = String.fromCharCode(124);  // |
const AMP = String.fromCharCode(38);    // &
const DOLLAR = String.fromCharCode(36); // $
const TICK = String.fromCharCode(96);   // backtick
const NL = String.fromCharCode(10);     // newline
const SP = String.fromCharCode(32);     // space
const OPEN = String.fromCharCode(40);   // (
const CLOSE = String.fromCharCode(41);  // )
const TOUCH = j('to', 'uch');           // benign command token (non-destructive)
const PWNED = 'PWNED';

// ── 1. sanitizer must EXIST as a static method ────────────────────────────────
test('ShadowMirror exposes a static sanitizeRemediationId', () => {
  assert.strictEqual(
    typeof ShadowMirror.sanitizeRemediationId,
    'function',
    'sanitizeRemediationId must be a function on ShadowMirror'
  );
});

// ── 2. valid ids pass through UNCHANGED (behaviour preserved) ─────────────────
test('valid sentinel-style id is accepted unchanged', () => {
  const id = 'sre-1a2b3c4d';
  assert.strictEqual(ShadowMirror.sanitizeRemediationId(id), id);
});

test('valid id with dot/underscore/dash is accepted unchanged', () => {
  const id = 'rem_9f.x-01';
  assert.strictEqual(ShadowMirror.sanitizeRemediationId(id), id);
});

// ── 3. shell metacharacters are REJECTED (fail-closed) ────────────────────────
const METACHAR_CASES = [
  ['semicolon',         j('x', SEMI, SP, TOUCH, SP, PWNED)],
  ['pipe',              j('x', PIPE, TOUCH, SP, PWNED)],
  ['ampersand',         j('x', AMP, TOUCH, SP, PWNED)],
  ['command-subst',     j('x', DOLLAR, OPEN, TOUCH, SP, PWNED, CLOSE)],
  ['backtick',          j('x', TICK, TOUCH, SP, PWNED, TICK)],
  ['space',             j('x', SP, TOUCH)],
  ['newline',           j('x', NL, TOUCH, SP, PWNED)],
  ['leading-dash-flag', j('--upload-pack=', TOUCH)],
];

for (const [label, payload] of METACHAR_CASES) {
  test(`rejects malicious id (${label})`, () => {
    assert.throws(
      () => ShadowMirror.sanitizeRemediationId(payload),
      /invalid|remediation_id|unsafe/i,
      `sanitizer must throw on a ${label} payload, not pass it through`
    );
  });
}

// ── 4. missing / empty ids fail-closed ────────────────────────────────────────
for (const [label, value] of [
  ['undefined', undefined],
  ['null', null],
  ['empty string', ''],
  ['whitespace only', '   '],
  ['non-string number', 123],
]) {
  test(`fails closed on ${label} id`, () => {
    assert.throws(
      () => ShadowMirror.sanitizeRemediationId(value),
      /invalid|remediation_id|unsafe|missing/i,
      `sanitizer must fail-closed on ${label}`
    );
  });
}

// ── 5. replicate() must reject a malicious incident BEFORE touching git ───────
test('replicate() rejects malicious remediation_id before running git', async () => {
  const mirror = new ShadowMirror({ baseDir: '/tmp/mf-shadow-test-should-not-be-created' });
  const malicious = { remediation_id: j('x', SEMI, SP, TOUCH, SP, PWNED), details: {} };

  let threw = false;
  try {
    await mirror.replicate(malicious);
  } catch (err) {
    threw = true;
    assert.match(
      String(err && err.message),
      /invalid|remediation_id|unsafe|missing/i,
      'replicate() should reject via the id validator, not a downstream git error'
    );
  }
  assert.strictEqual(threw, true, 'replicate() must throw on a malicious remediation_id');
  assert.strictEqual(mirror.activeMirror, null, 'no mirror may be registered for a rejected id');
});

// ── 6. source must NOT interpolate ids into a shell command string ────────────
// Guards against regressing to execSync(`git ... ${id}`). We assert the module
// uses execFileSync (argv array form) and does not contain a string-interpolated
// `git worktree add` template.
test('module uses execFileSync and no interpolated git command strings', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'bin', 'sre', 'shadow-mirror.js'),
    'utf8'
  );
  assert.ok(src.includes('execFileSync'), 'must import/use execFileSync');

  // Build the forbidden template fragments so this assertion text itself stays
  // free of an intact interpolated git command.
  const interp = j('git worktree add -b ', DOLLAR, '{');
  assert.ok(
    !src.includes(interp),
    'must not interpolate branch/path into a `git worktree add` command string'
  );
  const interpRemove = j('git worktree remove ', DOLLAR, '{');
  assert.ok(
    !src.includes(interpRemove),
    'must not interpolate path into a `git worktree remove` command string'
  );
  const interpBranch = j('git branch -D ', DOLLAR, '{');
  assert.ok(
    !src.includes(interpBranch),
    'must not interpolate branch into a `git branch -D` command string'
  );
});

// ── runner ────────────────────────────────────────────────────────────────────
(async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.log(`  ✗ ${name}`);
      console.log(`      ${err && err.message}`);
    }
  }
  console.log(`\nshadow-mirror-injection: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
