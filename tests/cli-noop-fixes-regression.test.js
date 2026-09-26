'use strict';
/**
 * Regression coverage for PR #303's two fix classes, both found by live `/verify` driving
 * and independently confirmed by a separate multi-agent review (not just static reading):
 *
 * 1. `metrics`/`tokens`/`harvest`/`self-heal` dispatched to files with no `require.main`
 *    entrypoint, so the CLI printed the router banner and exited 0 with zero further
 *    output, no error. Pinning real output here guards against a silent regression back
 *    to that state (none of the existing tests spawn these as CLI commands — they only
 *    exercise the underlying library functions via `require()`).
 * 2. The two new CLI entrypoints (`tokens --days=`, `self-heal <agentDid> <driftScore>`)
 *    took unvalidated numeric input: a non-numeric `--days` crashed with an uncaught
 *    `RangeError: Invalid time value`, and a non-numeric driftScore silently bypassed the
 *    intended `>= 80` gate (`NaN < 80` is `false` in JS) instead of being rejected.
 */
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const CLI = path.join(REPO_ROOT, 'bin', 'mindforge-cli.js');

let passed = 0,
  failed = 0;
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function run(args) {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

test('metrics produces real output, not a silent no-op', () => {
  const { status, stdout } = run(['metrics']);
  assert.strictEqual(status, 0);
  assert.match(stdout, /Velocity & Quality Metrics/);
  assert.match(stdout, /Sessions tracked/);
});

test('tokens produces real output, not a silent no-op', () => {
  const { status, stdout } = run(['tokens']);
  assert.strictEqual(status, 0);
  assert.match(stdout, /Token Cost Report/);
});

test('harvest produces real output, not a silent no-op', () => {
  const { status, stdout } = run(['harvest']);
  assert.strictEqual(status, 0);
  assert.match(stdout, /HOMING-SCAN/);
});

test('self-heal with no args produces an honest usage message, not a silent no-op', () => {
  const { status, stdout } = run(['self-heal']);
  assert.strictEqual(status, 0);
  assert.match(stdout, /nothing to heal/);
  assert.match(stdout, /Usage: mindforge self-heal/);
});

test('tokens --days=<non-numeric> fails cleanly instead of throwing RangeError', () => {
  const { status, stdout, stderr } = run(['tokens', '--days=abc']);
  assert.notStrictEqual(status, 0, 'must exit non-zero on invalid input');
  assert.match(stderr, /Invalid --days value/);
  assert.doesNotMatch(
    stdout + stderr,
    /RangeError/,
    'must never surface a raw stack trace to the user',
  );
});

test('tokens --days=<valid> still works after the validation guard was added', () => {
  const { status, stdout } = run(['tokens', '--days=1']);
  assert.strictEqual(status, 0);
  assert.match(stdout, /last 1 day\(s\)/);
});

test('self-heal with a non-numeric driftScore is rejected, not silently treated as critical', () => {
  const { status, stdout, stderr } = run([
    'self-heal',
    'did:test:regression',
    'notanumber',
  ]);
  assert.notStrictEqual(status, 0, 'must exit non-zero on invalid driftScore');
  assert.match(stderr, /Invalid driftScore/);
  assert.doesNotMatch(
    stdout,
    /drift \(NaN\)/,
    'must never bypass the >=80 gate via NaN',
  );
});

test('self-heal with a valid below-threshold driftScore still works after the validation guard was added', () => {
  const { status, stdout } = run(['self-heal', 'did:test:regression', '42']);
  assert.strictEqual(status, 0);
  assert.match(stdout, /below threshold/);
});

test('workflow info resolves the exact command string `workflow list` displays', () => {
  const { status, stdout } = run([
    'workflow',
    'info',
    '/mindforge:wf-code-audit',
  ]);
  assert.strictEqual(status, 0);
  assert.match(stdout, /^\ncode-audit/);
});

test('validate-skill: verification-loop skill passes its own gate', () => {
  const { status } = run([
    'validate-skill',
    '.mindforge/skills/verification-loop/SKILL.md',
  ]);
  assert.strictEqual(status, 0);
});

(async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log('  ✅  ' + name);
      passed++;
    } catch (e) {
      console.error('  ❌  ' + name + '\n      ' + e.message);
      failed++;
    }
  }
  console.log(
    '\nCLI No-Op Fixes Regression: ' +
      passed +
      ' passed, ' +
      failed +
      ' failed',
  );
  if (failed > 0) process.exit(1);
})();
