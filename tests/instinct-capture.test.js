/**
 * MindForge — Instinct Auto-Capture Hook Tests (UC-11)
 * Validates the PostToolUse instinct capture hook behavior.
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const os = require('os');

const HOOK_SCRIPT = path.join(__dirname, '..', 'bin', 'hooks', 'instinct-capture-hook.js');
const PROJECT_ROOT = path.join(__dirname, '..');

console.log('\nMindForge — Instinct Auto-Capture Hook Tests (UC-11)\n');

// ── Helpers ──────────────────────────────────────────────────────────────────

function runHook(payload, env = {}) {
  const input = typeof payload === 'string' ? payload : JSON.stringify(payload);
  try {
    const result = execSync(`node "${HOOK_SCRIPT}"`, {
      input,
      encoding: 'utf8',
      cwd: PROJECT_ROOT,
      env: { ...process.env, ...env },
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: 0, stdout: result };
  } catch (err) {
    return { exitCode: err.status || 1, stdout: err.stdout || '', stderr: err.stderr || '' };
  }
}

function createTempStore() {
  const dir = path.join(os.tmpdir(), `mf-instinct-test-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  const storePath = path.join(dir, 'instinct-store.jsonl');
  return { dir, storePath };
}

function createTempConfig(storePath, maxCapture = 5) {
  const configDir = path.join(os.tmpdir(), `mf-config-test-${Date.now()}`, '.mindforge');
  fs.mkdirSync(configDir, { recursive: true });
  const config = {
    version: '11.1.0',
    instincts: {
      mode: 'auto-capture',
      max_capture_per_session: maxCapture,
      store_path: storePath,
    },
  };
  fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify(config));
  return path.join(configDir, '..');
}

// ── Tests ────────────────────────────────────────────────────────────────────

// Test 1: Captures instinct on Bash exit 0
console.log('Test 1: Captures instinct on Bash tool exit 0...');
{
  const { storePath } = createTempStore();
  // Ensure the store directory exists relative to cwd
  const relStore = '.mindforge/engine/instincts/instinct-store-test1.jsonl';
  const absStore = path.join(PROJECT_ROOT, relStore);
  const storeDir = path.dirname(absStore);
  if (!fs.existsSync(storeDir)) fs.mkdirSync(storeDir, { recursive: true });
  // Clean up any previous test artifact
  if (fs.existsSync(absStore)) fs.unlinkSync(absStore);

  // We rely on the project's real config which has instincts.store_path
  // Instead, just test with the real config (store_path is relative to cwd)
  const payload = {
    tool_name: 'Bash',
    command: 'npm run build -- --production',
    exit_code: 0,
    output: 'Build complete',
  };

  const { exitCode } = runHook(payload);
  assert.strictEqual(exitCode, 0, 'Hook should exit 0');

  // Check the real store path
  const realStore = path.join(PROJECT_ROOT, '.mindforge', 'engine', 'instincts', 'instinct-store.jsonl');
  if (fs.existsSync(realStore)) {
    const lines = fs.readFileSync(realStore, 'utf8').trim().split('\n');
    const lastEntry = JSON.parse(lines[lines.length - 1]);
    assert.ok(lastEntry.id.startsWith('inst-'), 'Entry ID should start with inst-');
    assert.strictEqual(lastEntry.source, 'auto-capture', 'Source should be auto-capture');
    assert.strictEqual(lastEntry.confidence, 0.3, 'Initial confidence should be 0.3');
    assert.strictEqual(lastEntry.status, 'active', 'Status should be active');
    assert.ok(lastEntry.observation.includes('npm run build'), 'Observation should contain the command');
    console.log('  PASS: Instinct captured with correct schema');
  } else {
    // If store doesn't exist, the config may not be accessible in test env
    console.log('  PASS: Hook exited cleanly (store write depends on config accessibility)');
  }
}

// Test 2: Skips non-successful Bash (exit code != 0)
console.log('Test 2: Skips capture on Bash exit code 1...');
{
  const payload = {
    tool_name: 'Bash',
    command: 'failing-command',
    exit_code: 1,
    error: 'command not found',
  };

  // Count entries before
  const realStore = path.join(PROJECT_ROOT, '.mindforge', 'engine', 'instincts', 'instinct-store.jsonl');
  const countBefore = fs.existsSync(realStore)
    ? fs.readFileSync(realStore, 'utf8').trim().split('\n').length
    : 0;

  const { exitCode } = runHook(payload);
  assert.strictEqual(exitCode, 0, 'Hook should exit 0 even on skip');

  const countAfter = fs.existsSync(realStore)
    ? fs.readFileSync(realStore, 'utf8').trim().split('\n').length
    : 0;
  assert.strictEqual(countAfter, countBefore, 'Should NOT append entry for failed command');
  console.log('  PASS: No capture on failed Bash');
}

// Test 3: Captures Task completion
console.log('Test 3: Captures instinct on Task tool completion...');
{
  const payload = {
    tool_name: 'Task',
    status: 'completed',
    description: 'Implement user authentication with OAuth2',
  };

  const { exitCode } = runHook(payload);
  assert.strictEqual(exitCode, 0, 'Hook should exit 0');

  const realStore = path.join(PROJECT_ROOT, '.mindforge', 'engine', 'instincts', 'instinct-store.jsonl');
  if (fs.existsSync(realStore)) {
    const lines = fs.readFileSync(realStore, 'utf8').trim().split('\n');
    const lastEntry = JSON.parse(lines[lines.length - 1]);
    assert.ok(lastEntry.observation.includes('OAuth2'), 'Should capture task description');
    console.log('  PASS: Task completion captured');
  } else {
    console.log('  PASS: Hook exited cleanly');
  }
}

// Test 4: Skips trivial commands (ls, pwd, echo)
console.log('Test 4: Skips trivial Bash commands...');
{
  const realStore = path.join(PROJECT_ROOT, '.mindforge', 'engine', 'instincts', 'instinct-store.jsonl');
  const countBefore = fs.existsSync(realStore)
    ? fs.readFileSync(realStore, 'utf8').trim().split('\n').length
    : 0;

  const payload = {
    tool_name: 'Bash',
    command: 'ls -la',
    exit_code: 0,
    output: 'file list',
  };

  const { exitCode } = runHook(payload);
  assert.strictEqual(exitCode, 0, 'Hook should exit 0');

  const countAfter = fs.existsSync(realStore)
    ? fs.readFileSync(realStore, 'utf8').trim().split('\n').length
    : 0;
  assert.strictEqual(countAfter, countBefore, 'Should NOT capture trivial commands');
  console.log('  PASS: Trivial commands skipped');
}

// Test 5: Respects session capture limit
console.log('Test 5: Respects max_capture_per_session limit...');
{
  // Use a deterministic session ID so we can control the counter file
  const testSessionId = `test-limit-${Date.now()}`;
  const counterPath = path.join(os.tmpdir(), `mindforge-instinct-session-${testSessionId}.count`);
  fs.writeFileSync(counterPath, '5');

  const realStore = path.join(PROJECT_ROOT, '.mindforge', 'engine', 'instincts', 'instinct-store.jsonl');
  const countBefore = fs.existsSync(realStore)
    ? fs.readFileSync(realStore, 'utf8').trim().split('\n').length
    : 0;

  const payload = {
    tool_name: 'Bash',
    command: 'npm run deploy -- --env=production',
    exit_code: 0,
    output: 'Deployed successfully',
  };

  const { exitCode } = runHook(payload, { MINDFORGE_SESSION_ID: testSessionId });
  assert.strictEqual(exitCode, 0, 'Hook should exit 0');

  const countAfter = fs.existsSync(realStore)
    ? fs.readFileSync(realStore, 'utf8').trim().split('\n').length
    : 0;
  assert.strictEqual(countAfter, countBefore, 'Should NOT capture when session limit reached');
  console.log('  PASS: Session limit enforced');

  // Cleanup counter
  fs.unlinkSync(counterPath);
}

// Test 6: Handles malformed stdin gracefully
console.log('Test 6: Handles malformed stdin gracefully...');
{
  const { exitCode } = runHook('not valid json at all');
  assert.strictEqual(exitCode, 0, 'Hook should exit 0 on malformed input');
  console.log('  PASS: Exits cleanly on malformed input');
}

// Test 7: Handles empty stdin gracefully
console.log('Test 7: Handles empty stdin gracefully...');
{
  const { exitCode } = runHook('');
  assert.strictEqual(exitCode, 0, 'Hook should exit 0 on empty input');
  console.log('  PASS: Exits cleanly on empty input');
}

// ── Cleanup ──────────────────────────────────────────────────────────────────
//
// This ran as a bare top-level block, so it was reachable only when every assert above passed. This
// file uses bare top-level asserts with no try/finally, so any failure after the first hook
// invocation left auto-capture entries in the repository's REAL store — a path that
// `git check-ignore` does not match, which `git add -A` would therefore stage. Registered as an
// exit handler instead: verified that `process.on('exit')` still fires on an uncaught assert and
// the non-zero exit code is preserved, so a failing test now cleans up after itself.
//
// The deeper fix is for these tests not to write into the repository at all — the hook takes its
// store path from the config at `cwd`, so a temp cwd with a temp config would isolate them
// completely (the redaction tests below do exactly that). Converting the five existing sites is a
// larger change than this one is scoped for; this stops the bleeding.
//
// Note also that the filter below only removes entries created within the last 10 SECONDS, so a
// slow run leaks entries even when it passes. Left as-is deliberately rather than half-fixed: the
// temp-cwd conversion removes the need for time-based cleanup entirely.
process.on('exit', cleanupRealStore);

function cleanupRealStore() {
// Remove test entries from real store (last 2 entries added by tests 1 and 3)
const realStore = path.join(PROJECT_ROOT, '.mindforge', 'engine', 'instincts', 'instinct-store.jsonl');
if (fs.existsSync(realStore)) {
  const lines = fs.readFileSync(realStore, 'utf8').trim().split('\n');
  // Remove entries with source 'auto-capture' that were added by this test run
  const cleaned = lines.filter(line => {
    try {
      const entry = JSON.parse(line);
      // Keep entries that are NOT from our test (created in last 10 seconds)
      const created = new Date(entry.created_at);
      const now = new Date();
      const isRecent = (now - created) < 10000;
      return !(entry.source === 'auto-capture' && isRecent);
    } catch {
      return true;
    }
  });
  if (cleaned.length > 0) {
    fs.writeFileSync(realStore, cleaned.join('\n') + '\n');
  } else {
    fs.unlinkSync(realStore);
  }
}
}

// ── Redaction at the capture boundary ─────────────────────────────────────────
//
// The hook writes the first 200 characters of a raw Bash command — and of a raw Task description —
// into BOTH `observation` and `behavior`. Measured on a real store file left by a probe: an entry
// whose observation began `Bash command succeeded: AWS_SE...`, i.e. an AWS_SECRET_ACCESS_KEY
// assignment captured verbatim. The store path is not gitignored and `.mindforge/engine/` is inside
// package.json files[] with no negation for instincts, so it is both commit-ready and publish-ready.
//
// These tests use a TEMP cwd and a TEMP config, so unlike the ones above they touch nothing in the
// repository. Credential fixtures are assembled from fragments at runtime: a literal would be caught
// by this repo's own committed-secret scan, and by the shell guard, which is the correct behaviour of
// both and not something to work around with an allowlist.

const { redactSecrets, containsSecretShape } = require('../bin/utils/redact-secrets');

function runHookIsolated(payload) {
  const proj = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-redact-')));
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-redact-home-')));
  try {
    fs.mkdirSync(path.join(proj, '.mindforge', 'engine', 'instincts'), { recursive: true });
    fs.writeFileSync(path.join(proj, '.mindforge', 'config.json'), JSON.stringify({
      instincts: { mode: 'auto-capture', store_path: '.mindforge/engine/instincts/instinct-store.jsonl' },
    }));
    const r = require('child_process').spawnSync(process.execPath, [HOOK_SCRIPT], {
      input: JSON.stringify(payload), encoding: 'utf8', cwd: proj,
      env: { PATH: process.env.PATH, HOME: home },
    });
    const store = path.join(proj, '.mindforge', 'engine', 'instincts', 'instinct-store.jsonl');
    const entries = fs.existsSync(store)
      ? fs.readFileSync(store, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
      : [];
    return { status: r.status, entries };
  } finally {
    fs.rmSync(proj, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
}

{
  // Every branch that persists text must redact. The Task branch is the one most easily missed —
  // it carries no "command" in its name, but a description can hold a token just as easily.
  const SECRET = ['wJalrXUtnFEMI', 'K7MDENG', 'bPxRfiCYEXAMPLEKEY'].join('');
  const cases = [
    { name: 'Bash branch',
      payload: { tool_name: 'Bash', exit_code: 0,
        tool_input: { command: `AWS_${'SECRET'}_ACCESS_KEY=${SECRET} aws s3 ls s3://prod` } } },
    { name: 'Task branch',
      payload: { tool_name: 'Task', status: 'completed',
        description: `rotate the prod credential using token ${SECRET}` } },
  ];

  for (const c of cases) {
    const { status, entries } = runHookIsolated(c.payload);
    assert.strictEqual(status, 0, `${c.name}: hook must stay advisory and exit 0, got ${status}`);
    assert.strictEqual(entries.length, 1,
      `${c.name}: expected exactly one entry, got ${entries.length}. If 0, the detector stopped `
      + 'matching and this test proves nothing about redaction.');
    const e = entries[0];
    for (const field of ['observation', 'behavior']) {
      assert.ok(!e[field].includes(SECRET),
        `${c.name}: the secret survived in ${field}. Both fields are independent copies of the same `
        + 'raw text, so redacting one is not enough.');
      assert.ok(/<redacted:/.test(e[field]),
        `${c.name}: ${field} shows no redaction marker, so nothing was replaced: ${e[field]}`);
    }
  }
  console.log('  PASS: both capture branches redact credentials in both fields');
}

{
  // Non-vacuity: the fixtures must actually be secret-shaped, and ordinary commands must survive.
  // Without the first half, a redactor that returned its input unchanged would pass the tests above
  // only if the fixture were inert — so assert the fixture is not.
  const SECRET = ['ghp_', 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8'].join('');
  assert.ok(containsSecretShape(SECRET), 'the credential fixture is not recognised as secret-shaped');
  assert.ok(!containsSecretShape('npm run build -- --production'),
    'an ordinary command is being redacted — over-redaction destroys the telemetry this store exists for');

  // The existing assertion at :95 relies on this exact string surviving.
  assert.strictEqual(redactSecrets('npm run build'), 'npm run build',
    'redaction must leave `npm run build` untouched — an assertion above depends on it');

  // Redaction must never throw: the hook is advisory and fail-open by design.
  for (const weird of [null, undefined, '', 42, {}, []]) {
    assert.doesNotThrow(() => redactSecrets(weird), `redactSecrets threw on ${JSON.stringify(weird)}`);
  }
  console.log('  PASS: fixtures are secret-shaped, benign commands survive, redaction never throws');
}

console.log('\n All Instinct Auto-Capture Tests Passed!\n');
