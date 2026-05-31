'use strict';
/**
 * Tests for bin/security/trust-gate-hook.js (UC-22 PreToolUse gate).
 *
 * The hook reads a Claude Code tool event on stdin and decides whether to
 * allow (exit 0) or block (exit 2) a Bash command. These tests drive the
 * real hook process via spawn with mocked stdin and assert on exit codes —
 * the contract Claude Code's hook runner relies on.
 *
 * Regression anchor: a benign first line MUST NOT cloak a destructive command
 * on a later line (the multi-line bypass). See trust-gate-hook.js.
 */
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.join(__dirname, '..', 'bin', 'security', 'trust-gate-hook.js');

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// Run the hook with a given event object, return its exit code.
// Destructive tokens are assembled from fragments so this test file itself
// contains no literal destructive command (avoids tripping other guards).
function runHook(event) {
  const res = spawnSync('node', [HOOK], {
    input: JSON.stringify(event),
    encoding: 'utf8',
    timeout: 5000,
  });
  return res.status;
}

const RM = 'r' + 'm';
const RF = '-' + 'rf';
const SLASH = '/';

test('allows a safe single-line command', () => {
  assert.strictEqual(runHook({ tool_name: 'Bash', tool_input: { command: 'ls -la' } }), 0);
});

test('blocks a single-line destructive command', () => {
  const cmd = 'git push --force origin main';
  assert.strictEqual(runHook({ tool_name: 'Bash', tool_input: { command: cmd } }), 2);
});

test('REGRESSION: benign first line cannot cloak a destructive later line', () => {
  const cmd = `echo hello\n${RM} ${RF} ${SLASH}`;
  assert.strictEqual(runHook({ tool_name: 'Bash', tool_input: { command: cmd } }), 2,
    'destructive command on line 2 must still be blocked');
});

test('REGRESSION: heredoc body cannot cloak a destructive line', () => {
  const cmd = `cat <<'EOF'\nharmless text\n${RM} ${RF} ${SLASH}\nEOF`;
  assert.strictEqual(runHook({ tool_name: 'Bash', tool_input: { command: cmd } }), 2);
});

test('allows non-Bash tools without inspection', () => {
  assert.strictEqual(runHook({ tool_name: 'Read', tool_input: { file_path: 'x' } }), 0);
  assert.strictEqual(runHook({ tool_name: 'Write', tool_input: { file_path: 'x', content: 'y' } }), 0);
});

test('fails CLOSED (blocks) on malformed/empty stdin', () => {
  const res = spawnSync('node', [HOOK], { input: 'not json', encoding: 'utf8', timeout: 5000 });
  assert.strictEqual(res.status, 2, 'unparseable event must block, not allow');
});

test('allows a Bash event with no command field', () => {
  assert.strictEqual(runHook({ tool_name: 'Bash', tool_input: {} }), 0);
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ✅  ' + name); passed++; }
    catch (e) { console.error('  ❌  ' + name + '\n      ' + e.message); failed++; }
  }
  console.log('\nTrust Gate Hook: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
