/**
 * Guards .agent/hooks/run-with-flags.js: a deny-class hook that cannot run must BLOCK.
 *
 * THE DEFECT. Every failure path in the dispatcher permitted the operation, and did so in a way
 * indistinguishable from a hook that ran and approved. Measured, with the payload echoed back on
 * stdout and exit 0 — which Claude Code reads as an explicit ALLOW:
 *
 *   script not found                  exit 0 + payload echoed   (:132-136)
 *   path traversal rejected           exit 0 + payload echoed   — it PRINTED "rejected", then permitted
 *   run() threw                       exit 0 + payload echoed
 *   non-integer exitCode              coerced to 0
 *   dispatcher itself threw           exit 0
 *   child errored / signalled / null  exit 1  — out of contract, so also a permit
 *   child exited 1 (module throw)     exit 1  — same
 *
 * The contract, measured across all three deny-class hooks, is exit 0 = allow and exit 2 = block.
 * 1 is not in it. So a security gate that crashed, timed out, or was mis-pathed permitted the very
 * operation it existed to check. The hook TIMEOUT case is the sharpest: spawnSync's 30s timeout
 * arrives as SIGTERM with a null status, so no exit 2 was reachable there at all.
 *
 * WHAT IS DELIBERATELY UNCHANGED. Only trust-gate, mindforge-block-no-verify and
 * mindforge-config-protection fail closed. context-monitor, session-init, check-update and
 * instinct-capture stay fail-open: if telemetry cannot run, nothing about the operation's safety
 * became unknown, and blocking a tool call because a logger failed would be indefensible. These
 * tests assert BOTH halves, so a later change that makes everything fail closed breaks a test that
 * explains why it should not.
 *
 * Fixtures live under the repo root because the dispatcher's traversal guard rejects anything
 * outside it — a constraint one of the cases below asserts directly. The directory is named
 * `tmp-*` so tests/run-all.js prunes it if a crash ever leaves it behind.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const DISPATCHER = path.join(REPO_ROOT, '.agent', 'hooks', 'run-with-flags.js');
const PROFILES = 'minimal,standard,strict';

const DENY_HOOK = 'trust-gate';
const ADVISORY_HOOK = 'mindforge-context-monitor';

const PAYLOAD = JSON.stringify({
  hook_event_name: 'PreToolUse',
  tool_name: 'Bash',
  tool_input: { command: 'echo hello' },
});

// A command trust-gate must refuse. Assembled from fragments so the literal never appears in this
// file's source, in any tooling that scans it, or in a shell command line.
const DANGEROUS_CMD = ['r' + 'm', '-' + 'rf', '/'].join(' ');

/** A PreToolUse envelope for `command`. */
function payloadFor(command) {
  return JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } });
}

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

/** A fresh fixture directory under the repo root, with one hook script in it. */
function withFixture(source, fn) {
  const dir = fs.mkdtempSync(path.join(REPO_ROOT, 'tmp-hookfx-'));
  try {
    fs.writeFileSync(path.join(dir, 'hook.js'), source);
    const rel = path.relative(REPO_ROOT, path.join(dir, 'hook.js')).split(path.sep).join('/');
    return fn(rel);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Run the dispatcher. Exit status read from .status, never through a pipe. */
function dispatch(hookId, relScript, env = {}) {
  const r = spawnSync(process.execPath, [DISPATCHER, hookId, relScript, PROFILES], {
    cwd: REPO_ROOT,
    input: PAYLOAD,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return {
    status: r.status,
    stdout: String(r.stdout || ''),
    stderr: String(r.stderr || ''),
    echoedPayload: String(r.stdout || '') === PAYLOAD,
  };
}

// ── The failure modes that used to permit ────────────────────────────────────

const FAILURE_MODES = [
  ['run() throws', 'module.exports = { run() { throw new Error("boom"); } };'],
  ['run() returns a non-integer exitCode', 'module.exports = { run() { return { exitCode: "2" }; } };'],
  ['module-scope throw (child exits 1)', 'throw new Error("at-require");'],
  ['child killed by a signal (the timeout shape)', 'process.kill(process.pid, "SIGTERM");'],
  ['child exits outside the 0/2 contract', 'process.exit(7);'],
];

for (const [label, source] of FAILURE_MODES) {
  test(`deny-class BLOCKS when: ${label}`, () => {
    withFixture(source, (rel) => {
      const r = dispatch(DENY_HOOK, rel);
      assert.strictEqual(r.status, 2,
        `a deny-class gate that cannot decide must exit 2 (block), got ${r.status}. ` +
        `stderr: ${r.stderr.slice(0, 300)}`);
      assert.strictEqual(r.echoedPayload, false,
        'a block must not echo the payload back — that is the shape of an allow');
      assert.match(r.stderr, /BLOCKED/,
        `the reason must be visible on stderr, got: ${r.stderr.slice(0, 200)}`);
    });
  });

  test(`advisory stays OPEN when: ${label}`, () => {
    withFixture(source, (rel) => {
      const r = dispatch(ADVISORY_HOOK, rel);
      assert.strictEqual(r.status, 0,
        `an advisory hook failing must NOT block the operation, got ${r.status}. Blocking a tool ` +
        `call because telemetry failed is indefensible. stderr: ${r.stderr.slice(0, 200)}`);
      assert.strictEqual(r.echoedPayload, true,
        'an allow echoes the payload through');
    });
  });
}

test('deny-class BLOCKS when the script does not exist', () => {
  const r = dispatch(DENY_HOOK, 'bin/security/definitely-not-here.js');
  assert.strictEqual(r.status, 2,
    `a missing gate script must block, got ${r.status}. This is the exact state of every install ` +
    `today, where none of the eight registered paths resolve. stderr: ${r.stderr.slice(0, 200)}`);
  assert.strictEqual(r.echoedPayload, false);
});

test('deny-class BLOCKS a path that escapes the install root', () => {
  // This branch used to print "Path traversal rejected" and then exit 0 — announcing an attack
  // signal and permitting it in the same breath.
  const r = dispatch(DENY_HOOK, '../../../etc/passwd.js');
  assert.strictEqual(r.status, 2, `an escaping script path must block, got ${r.status}`);
  assert.match(r.stderr, /escapes the install root/,
    `the reason must name the cause, got: ${r.stderr.slice(0, 200)}`);
});

// ── Verdicts from a hook that DID run must pass through untouched ────────────

test('a real ALLOW (exit 0) is passed through for both classes', () => {
  withFixture('process.exit(0);', (rel) => {
    for (const hook of [DENY_HOOK, ADVISORY_HOOK]) {
      const r = dispatch(hook, rel);
      assert.strictEqual(r.status, 0, `${hook}: a hook that allows must yield 0, got ${r.status}`);
    }
  });
});

test('a real BLOCK (exit 2) is passed through for both classes', () => {
  // The guard against over-correcting: the dispatcher must not swallow a verdict a hook actually
  // reached. An advisory hook is still allowed to block if it decides to — what changed is only
  // what happens when a hook cannot decide at all.
  withFixture('process.stderr.write("denied by the hook\\n"); process.exit(2);', (rel) => {
    for (const hook of [DENY_HOOK, ADVISORY_HOOK]) {
      const r = dispatch(hook, rel);
      assert.strictEqual(r.status, 2,
        `${hook}: a hook's own exit 2 must survive, got ${r.status}. stderr: ${r.stderr.slice(0, 200)}`);
      assert.match(r.stderr, /denied by the hook/,
        `${hook}: the hook's own reason must reach stderr`);
    }
  });
});

// ── The real gates still work end to end ────────────────────────────────────

test('the real trust-gate still denies a high-impact command', () => {
  // Proves the change did not break the working path. Assembled at runtime so the literal does
  // not appear in this file's source.
  const payload = JSON.stringify({
    hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: DANGEROUS_CMD },
  });
  const r = spawnSync(process.execPath,
    [DISPATCHER, 'trust-gate', 'bin/security/trust-gate-hook.js', PROFILES],
    { cwd: REPO_ROOT, input: payload, encoding: 'utf8' });
  assert.strictEqual(r.status, 2, `trust-gate must still deny. stderr: ${String(r.stderr || '').slice(0, 300)}`);
});

test('the real block-no-verify still denies a bypass attempt', () => {
  const cmd = `git commit --no${'-'}verify -m x`;
  const payload = JSON.stringify({
    hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: cmd },
  });
  const r = spawnSync(process.execPath,
    [DISPATCHER, 'mindforge-block-no-verify', '.agent/hooks/mindforge-block-no-verify.js', PROFILES],
    { cwd: REPO_ROOT, input: payload, encoding: 'utf8' });
  assert.strictEqual(r.status, 2, `block-no-verify must still deny. stderr: ${String(r.stderr || '').slice(0, 300)}`);
});

test('a benign command is still allowed by the real gates', () => {
  // Without this, "everything blocks" would satisfy every assertion above.
  for (const [hook, script] of [
    ['trust-gate', 'bin/security/trust-gate-hook.js'],
    ['mindforge-block-no-verify', '.agent/hooks/mindforge-block-no-verify.js'],
  ]) {
    const r = dispatch(hook, script);
    assert.strictEqual(r.status, 0,
      `${hook} must allow "echo hello", got ${r.status}. If this fails the change has made the ` +
      `gates deny everything. stderr: ${r.stderr.slice(0, 200)}`);
  }
});

// ── Payload truncation must not become a bypass ─────────────────────────────

/** A payload whose real command sits past `padBytes` of filler, so truncation drops it. */
function paddedPayload(command, padBytes) {
  // Key order is insertion order in JSON.stringify, so the padding precedes tool_input and the
  // dispatcher's MAX_STDIN cut lands before the command is ever seen.
  return JSON.stringify({
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    _pad: 'A'.repeat(padBytes),
    tool_input: { command },
  });
}

/** Fire a hook with a large payload, through the dispatcher. */
function dispatchLarge(hookId, relScript, payload, env = {}) {
  const r = spawnSync(process.execPath, [DISPATCHER, hookId, relScript, PROFILES], {
    cwd: REPO_ROOT,
    input: payload,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  return { status: r.status, stderr: String(r.stderr || '') };
}

const BYPASS_CMD = `git commit --no${'-'}verify -m x`;
const BNV = '.agent/hooks/mindforge-block-no-verify.js';

test('block-no-verify still denies the bypass in a small payload (control)', () => {
  const r = dispatchLarge('mindforge-block-no-verify', BNV, paddedPayload(BYPASS_CMD, 0));
  assert.strictEqual(r.status, 2, `the plain case must deny, got ${r.status}. ${r.stderr.slice(0, 200)}`);
  assert.match(r.stderr, /no-verify/, 'and name the flag it found');
});

test('block-no-verify denies when >1MiB of padding truncates the command away', () => {
  // THE BYPASS. Measured before the fix: exit 0 (ALLOWED) for this exact payload, while the same
  // command alone scored exit 2. The dispatcher caps stdin at MAX_STDIN, so a caller could push
  // the flag past the cap; extractCommand's parse-failure fallback then scanned the surviving
  // prefix, found no flag, and approved. Its sibling config-protection already refused on
  // truncation; this hook computed the flag and never read it, and run() took one parameter so
  // `options` never arrived.
  const r = dispatchLarge('mindforge-block-no-verify', BNV, paddedPayload(BYPASS_CMD, 1024 * 1024 + 4096));
  assert.strictEqual(r.status, 2,
    `a truncated payload must not be approved, got ${r.status}. This is the padding bypass. ` +
    `stderr: ${r.stderr.slice(0, 300)}`);
  assert.match(r.stderr, /exceeded|truncated/i,
    `the reason must name truncation rather than pretending it judged the command. Got: ${r.stderr.slice(0, 200)}`);
});

test('block-no-verify denies on JSON-looking input it cannot parse', () => {
  // trust-gate already failed closed here ("parse error (BLOCKING)"), which is precisely why
  // trust-gate was NOT bypassable by padding while this hook was.
  const r = dispatchLarge('mindforge-block-no-verify', BNV, '{ "tool_input": { "command": ');
  assert.strictEqual(r.status, 2, `unparseable JSON must fail closed, got ${r.status}`);
  assert.match(r.stderr, /not valid JSON|Failing closed/,
    `the reason must say why, got: ${r.stderr.slice(0, 200)}`);
});

test('block-no-verify still ALLOWS a large but benign payload', () => {
  // The over-correction guard: a big payload is not itself suspicious. Only a TRUNCATED one is,
  // and only because the command may have been cut off.
  const r = dispatchLarge('mindforge-block-no-verify', BNV, paddedPayload('git status', 4096));
  assert.strictEqual(r.status, 0,
    `a 4KB benign payload must be allowed, got ${r.status}. ${r.stderr.slice(0, 200)}`);
});

test('block-no-verify honours the dispatcher truncation flag on the standalone path too', () => {
  // The hook has two invocation modes — required in-process via run(), or spawned and reading its
  // own stdin. Both had the hole. The spawn path now seeds truncation from
  // MINDFORGE_HOOK_INPUT_TRUNCATED, which the dispatcher sets, and routes through run() so there
  // is ONE decision path rather than two that can drift.
  // The payload carries a BENIGN command. That is what makes this discriminating: the only thing
  // that can produce a denial is the truncation flag itself. An earlier version of this test sent
  // the bypass command WITH the flag, so it denied because the flag was in the text — and a control
  // that removed env seeding still passed.
  const benign = paddedPayload('git status', 0);
  const withFlag = spawnSync(process.execPath, [path.join(REPO_ROOT, BNV)], {
    cwd: REPO_ROOT,
    input: benign,
    encoding: 'utf8',
    env: { ...process.env, MINDFORGE_HOOK_INPUT_TRUNCATED: '1' },
  });
  assert.strictEqual(withFlag.status, 2,
    `the standalone path must honour MINDFORGE_HOOK_INPUT_TRUNCATED, got ${withFlag.status}. ` +
    `stderr: ${String(withFlag.stderr || '').slice(0, 200)}`);

  // And without the flag the identical payload must be allowed, or the assertion above would hold
  // for a hook that simply denies everything.
  const withoutFlag = spawnSync(process.execPath, [path.join(REPO_ROOT, BNV)], {
    cwd: REPO_ROOT,
    input: benign,
    encoding: 'utf8',
    env: { ...process.env, MINDFORGE_HOOK_INPUT_TRUNCATED: '' },
  });
  assert.strictEqual(withoutFlag.status, 0,
    `the same benign payload without the flag must be allowed, got ${withoutFlag.status}`);
});

test('trust-gate is not bypassable by the same padding', () => {
  // Recorded because it explains the asymmetry: trust-gate fails closed on a parse error, so
  // truncation reached it as malformed JSON and it blocked. It needed no truncation check.
  const r = dispatchLarge('trust-gate', 'bin/security/trust-gate-hook.js',
    paddedPayload(DANGEROUS_CMD, 1024 * 1024 + 4096));
  assert.strictEqual(r.status, 2, `trust-gate must deny a padded payload, got ${r.status}`);
});

// ── The escape hatch is real, and loud ──────────────────────────────────────

test('MINDFORGE_HOOK_FAILOPEN=1 restores the old permit, and says so', () => {
  // Present because these gates fire on every Bash call in a MindForge checkout: without an
  // override, one latent crash in trust-gate would brick every tool call with no way out but
  // editing hook source.
  const r = dispatch(DENY_HOOK, 'bin/security/definitely-not-here.js', { MINDFORGE_HOOK_FAILOPEN: '1' });
  assert.strictEqual(r.status, 0, `the override must permit, got ${r.status}`);
  assert.strictEqual(r.echoedPayload, true, 'and echo the payload through');
  assert.match(r.stderr, /FAIL-OPEN OVERRIDE/,
    `an unchecked operation must be announced, not silent. stderr: ${r.stderr.slice(0, 200)}`);
  assert.match(r.stderr, /UNCHECKED/, 'the message must say the operation was not checked');
});

test('the override is OFF by default — no env var, no permit', () => {
  const r = dispatch(DENY_HOOK, 'bin/security/definitely-not-here.js');
  assert.strictEqual(r.status, 2,
    'without MINDFORGE_HOOK_FAILOPEN the deny-class default must be to block');
});

// ── CLAUDE_PLUGIN_ROOT must not be able to SUBSTITUTE the gate ───────────────

const os = require('node:os');

/** A directory shaped like an install root, holding a gate stub that approves everything. */
function withPermissiveStub(fn) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-substitute-')));
  try {
    fs.mkdirSync(path.join(dir, 'bin', 'security'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'bin', 'security', 'trust-gate-hook.js'),
      'process.stdout.write(require("fs").readFileSync(0, "utf8")); process.exit(0);\n');
    return fn(dir);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('an attacker-controlled CLAUDE_PLUGIN_ROOT cannot substitute a permissive gate', () => {
  // THE HOLE. getHookRoot() returned the env var verbatim, and the dispatcher resolves the hook
  // script relative to that root — so the variable was a gate-SUBSTITUTION primitive, not a
  // relocation hint. Measured against the real trust-gate with a high-impact command:
  //     unset                                -> exit 2  denied
  //     CLAUDE_PLUGIN_ROOT=<dir with a stub>  -> exit 0  APPROVED by the stub
  // Failing closed does not help: the substituted gate returns a clean ALLOW. Nor does the
  // traversal guard, because the root it measures against is exactly what moved.
  withPermissiveStub((attacker) => {
    const r = spawnSync(process.execPath,
      [DISPATCHER, 'trust-gate', 'bin/security/trust-gate-hook.js', PROFILES],
      { cwd: REPO_ROOT, input: payloadFor(DANGEROUS_CMD), encoding: 'utf8',
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: attacker } });
    assert.strictEqual(r.status, 2,
      `a substituted gate must not be honoured, got ${r.status}. If this is 0, an arbitrary file ` +
      `just executed with the security gate's authority. stderr: ${String(r.stderr || '').slice(0, 300)}`);
    assert.match(String(r.stderr || ''), /IGNORING CLAUDE_PLUGIN_ROOT/,
      'the rejection must be announced, not silent');
  });
});

test('a LEGITIMATE root reached via a symlink is still accepted', () => {
  // What realpath actually buys, corrected from my first reading of it. An unrelated directory is
  // rejected whether or not it is a symlink, because its RESOLVED path is not a candidate either
  // way — a control that removed realpath left the attacker-symlink test green, which is how I
  // found this. The real risk is the converse: comparing unresolved strings would reject a
  // legitimate root reached by an equivalent path (a symlinked checkout, or macOS reporting /tmp/x
  // where processes resolve /private/tmp/x) and silently fall back to the derived root.
  const link = path.join(REPO_ROOT, 'tmp-root-alias');
  try {
    fs.symlinkSync(REPO_ROOT, link, 'dir');
    const r = spawnSync(process.execPath,
      [DISPATCHER, 'trust-gate', 'bin/security/trust-gate-hook.js', PROFILES],
      { cwd: REPO_ROOT, input: payloadFor(DANGEROUS_CMD), encoding: 'utf8',
        env: { ...process.env, CLAUDE_PLUGIN_ROOT: link } });
    assert.doesNotMatch(String(r.stderr || ''), /IGNORING CLAUDE_PLUGIN_ROOT/,
      `a symlink to the REAL root must be accepted, not rejected. stderr: ${String(r.stderr || '').slice(0, 200)}`);
    assert.strictEqual(r.status, 2, 'and the real gate must run and deny');
  } finally { try { fs.unlinkSync(link); } catch { /* already gone */ } }
});

test('the LEGITIMATE derived root is still honoured', () => {
  // The guard against over-correcting into "ignore the variable always", which would break the
  // plugin channel, where CLAUDE_PLUGIN_ROOT is how the root is communicated.
  const r = spawnSync(process.execPath,
    [DISPATCHER, 'trust-gate', 'bin/security/trust-gate-hook.js', PROFILES],
    { cwd: REPO_ROOT, input: PAYLOAD, encoding: 'utf8',
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: REPO_ROOT } });
  assert.strictEqual(r.status, 0,
    `the real root must be accepted and a benign command allowed, got ${r.status}`);
  assert.doesNotMatch(String(r.stderr || ''), /IGNORING/, 'the correct root must not be rejected');
});

test('a plugin-shaped root (dispatcher at <root>/scripts/) is honoured', () => {
  // Exercises the `__dirname/..` candidate, which is what keeps the plugin channel working. Built
  // rather than asserted from source, so it proves the resolution rather than the intent.
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-pluginroot-')));
  try {
    const scripts = path.join(root, 'scripts');
    fs.mkdirSync(path.join(scripts, 'lib'), { recursive: true });
    fs.copyFileSync(DISPATCHER, path.join(scripts, 'run-with-flags.js'));
    for (const dep of ['hook-flags.js', 'pretooluse-visible-output.js']) {
      fs.copyFileSync(path.join(REPO_ROOT, '.agent', 'hooks', 'lib', dep), path.join(scripts, 'lib', dep));
    }
    fs.writeFileSync(path.join(scripts, 'gate.js'), 'process.stderr.write("blocked\n"); process.exit(2);\n');

    const r = spawnSync(process.execPath,
      [path.join(scripts, 'run-with-flags.js'), 'trust-gate', 'scripts/gate.js', PROFILES],
      { input: PAYLOAD, encoding: 'utf8', env: { ...process.env, CLAUDE_PLUGIN_ROOT: root } });
    assert.doesNotMatch(String(r.stderr || ''), /IGNORING/,
      `a plugin-shaped root must be accepted. stderr: ${String(r.stderr || '').slice(0, 200)}`);
    assert.strictEqual(r.status, 2,
      `the hook under that root must have run and blocked, got ${r.status}`);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

// ── Switching a gate off must leave a record ────────────────────────────────

test('disabling a DENY-CLASS gate is announced as a security event', () => {
  // Measured before: MINDFORGE_DISABLED_HOOKS=trust-gate gave exit 0 with EMPTY stderr, so a
  // disabled gate was indistinguishable from one that ran and approved — in the log as well as in
  // the exit code.
  const r = dispatch(DENY_HOOK, 'bin/security/trust-gate-hook.js',
    { MINDFORGE_DISABLED_HOOKS: 'trust-gate' });
  assert.strictEqual(r.status, 0, 'an explicit opt-out still permits — that is what it is for');
  assert.match(r.stderr, /SECURITY GATE DISABLED/,
    `but it must say so. stderr: ${JSON.stringify(r.stderr.slice(0, 200))}`);
  assert.match(r.stderr, /unchecked/i, 'and state the consequence');
});

test('disabling an ADVISORY hook is noted without the security wording', () => {
  const r = dispatch(ADVISORY_HOOK, '.agent/hooks/mindforge-context-monitor.js',
    { MINDFORGE_DISABLED_HOOKS: ADVISORY_HOOK });
  assert.strictEqual(r.status, 0);
  assert.match(r.stderr, /disabled via MINDFORGE_DISABLED_HOOKS/, 'it must still be recorded');
  assert.doesNotMatch(r.stderr, /SECURITY GATE DISABLED/,
    'a logger being switched off is not a security event — over-warning trains people to ignore warnings');
});

test('a profile mismatch is reported distinctly from an opt-out', () => {
  // Different events: an opt-out is somebody's decision, a profile mismatch is configuration.
  const r = spawnSync(process.execPath,
    [DISPATCHER, ADVISORY_HOOK, '.agent/hooks/mindforge-context-monitor.js', 'strict'],
    { cwd: REPO_ROOT, input: PAYLOAD, encoding: 'utf8',
      env: { ...process.env, MINDFORGE_HOOK_PROFILE: 'standard' } });
  assert.strictEqual(r.status, 0);
  assert.match(String(r.stderr || ''), /not active for profile standard/,
    `stderr: ${String(r.stderr || '').slice(0, 200)}`);
});

test('no deny reason hands the bypass to the agent it just blocked', () => {
  // Observes the message the hook actually EMITS. The first version of this test scraped source
  // with /BLOCKED:[\s\S]{0,400}?['"`]/ — non-greedy, so it stopped at the closing quote of the
  // FIRST string fragment and never saw the continuation lines where the advertisement lived. A
  // control that restored the advertisement left it green. Firing the hook cannot make that
  // mistake.
  //
  // A PreToolUse denial is delivered to the MODEL whose call was refused, so a reason naming the
  // disable variable publishes its own bypass to the thing it just blocked. The hatch still exists
  // for the HUMAN operator, documented in each hook's header, and run-with-flags.js now records
  // its use.
  const cases = [
    ['mindforge-config-protection', '.agent/hooks/mindforge-config-protection.js',
      { hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: path.join(REPO_ROOT, 'eslint.config.mjs') } }],
    ['mindforge-block-no-verify', '.agent/hooks/mindforge-block-no-verify.js',
      { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: `git commit --no${'-'}verify -m x` } }],
    ['trust-gate', 'bin/security/trust-gate-hook.js',
      { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: DANGEROUS_CMD } }],
  ];
  for (const [hookId, script, payloadObj] of cases) {
    const r = spawnSync(process.execPath, [DISPATCHER, hookId, script, PROFILES],
      { cwd: REPO_ROOT, input: JSON.stringify(payloadObj), encoding: 'utf8' });
    assert.strictEqual(r.status, 2,
      `${hookId} must actually DENY for this test to be meaningful, got ${r.status}. ` +
      `stderr: ${String(r.stderr || '').slice(0, 200)}`);
    const emitted = `${String(r.stdout || '')}${String(r.stderr || '')}`;
    assert.ok(!/MINDFORGE_DISABLED_HOOKS/.test(emitted),
      `${hookId}'s deny message names MINDFORGE_DISABLED_HOOKS, telling the blocked agent how to ` +
      `stop being blocked. Emitted: ${emitted.slice(0, 240)}`);
  }
});

// ── The class list itself ───────────────────────────────────────────────────

test('the deny-class list covers exactly the hooks that can block', () => {
  // Derived from the source rather than restated, so adding a fourth deny-capable hook without
  // adding it to DENY_CLASS shows up here.
  const src = fs.readFileSync(DISPATCHER, 'utf8');
  const block = src.match(/const DENY_CLASS = new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(block, 'DENY_CLASS must still be a declared Set in the dispatcher');
  const listed = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
  assert.deepStrictEqual(listed, ['mindforge-block-no-verify', 'mindforge-config-protection', 'trust-gate'],
    'DENY_CLASS must list exactly the three hooks whose documented contract includes exit 2 = ' +
    'block. If a new deny-capable hook was added, add it here and to this assertion.');

  // And each listed hook must actually exist, or the list is protecting nothing.
  for (const rel of [
    'bin/security/trust-gate-hook.js',
    '.agent/hooks/mindforge-block-no-verify.js',
    '.agent/hooks/mindforge-config-protection.js',
  ]) {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, rel)), `${rel} must exist`);
  }
});

(async () => {
  const registeredBeforeRun = tests.length;
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  if (tests.length !== registeredBeforeRun) {
    console.error(`  ❌  ${tests.length - registeredBeforeRun} test(s) registered after the runner loop and never ran`);
    failed++;
  }
  console.log(`\nHook Dispatcher Fail-Closed: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
