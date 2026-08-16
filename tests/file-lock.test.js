/**
 * MindForge — LOCK-01: fail-closed advisory file lock + concurrent audit append.
 *
 * Every audit assertion here runs against a FRESH mkdtemp AUDIT.jsonl. Nothing in
 * this suite reads or writes .planning/AUDIT.jsonl — earlier suites that appended
 * test rows into the real chain had to be deleted, so do not reintroduce that. The
 * audit path is always `path.join(tmpDir(), 'AUDIT.jsonl')`.
 *
 * Run: node tests/file-lock.test.js
 */
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path');
const { spawn } = require('child_process');
const assert = require('assert');
let passed = 0, failed = 0; const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const { withFileLock } = require('../bin/utils/file-lock');
const { appendAuditEntrySync } = require('../bin/autonomous/audit-writer');
const { verifyAuditChain } = require('../bin/governance/audit-verifier');
const { hashAuditEntry } = require('../bin/governance/audit-hash');

const WRITER = require.resolve('../bin/autonomous/audit-writer');

function tmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mf-lock-')); }
function rmTmp(d) { fs.rmSync(d, { recursive: true, force: true }); }

/** Spawns `n` children running `script` with the shared audit file as argv[2]. */
function spawnWorkers(script, file, n) {
  return Promise.all(Array.from({ length: n }, (_, w) => new Promise(res =>
    spawn(process.execPath, [script, file, `w${w}`], { stdio: ['ignore', 'ignore', 'inherit'] })
      .on('close', res))));
}

function readEntries(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
}

test('withFileLock: FAILS CLOSED when the lock is held (never writes anyway)', () => {
  // The whole point of promoting instinct-cli's lock and NOT .agent/bin/lib/state.cjs's:
  // when the lock cannot be taken we throw. We do not unlink the other holder's lock
  // and write anyway, which is what state.cjs does on its last retry.
  const tmp = tmpDir();
  try {
    const target = path.join(tmp, 'x.jsonl');
    fs.writeFileSync(`${target}.lock`, '');       // a live holder
    let ran = false;
    assert.throws(
      () => withFileLock(target, () => { ran = true; }, { maxTries: 3, waitMs: 5, label: 'probe' }),
      /could not acquire probe lock/);
    assert.strictEqual(ran, false, 'critical section must NOT run when the lock is unavailable');
    assert.strictEqual(fs.existsSync(`${target}.lock`), true,
      'a failed acquire must leave the other holder lockfile alone');
  } finally { rmTmp(tmp); }
});

test('withFileLock: reclaims a stale lock older than staleMs and always releases', () => {
  const tmp = tmpDir();
  try {
    const target = path.join(tmp, 'x.jsonl');
    fs.writeFileSync(`${target}.lock`, '');
    const old = new Date(Date.now() - 11_000);
    fs.utimesSync(`${target}.lock`, old, old);    // orphaned by a killed process
    assert.strictEqual(withFileLock(target, () => 'ok', { staleMs: 10_000 }), 'ok');
    assert.strictEqual(fs.existsSync(`${target}.lock`), false, 'lock must be unlinked on release');
  } finally { rmTmp(tmp); }
});

test('withFileLock: releases the lock even when the critical section throws', () => {
  const tmp = tmpDir();
  try {
    const target = path.join(tmp, 'x.jsonl');
    assert.throws(() => withFileLock(target, () => { throw new Error('boom'); }), /boom/);
    assert.strictEqual(fs.existsSync(`${target}.lock`), false, 'lock must be unlinked on throw');
  } finally { rmTmp(tmp); }
});

test('withFileLock: is re-entrant for the same path in one process (applyDecay -> deprecateEdge)', () => {
  const tmp = tmpDir();
  try {
    const target = path.join(tmp, 'x.jsonl');
    const out = withFileLock(target, () => withFileLock(target, () => 'inner'));
    assert.strictEqual(out, 'inner', 'a nested acquire of the SAME lock must not deadlock');
    assert.strictEqual(fs.existsSync(`${target}.lock`), false, 'lock released after outer section');
  } finally { rmTmp(tmp); }
});

test('appendAuditEntrySync: 8 CONCURRENT processes produce ZERO hash-chain breaks', async () => {
  // LOCK-01 headline regression, run against a TEMP audit file. Measured at HEAD 08a8008
  // with the unpatched writer: 199 of 200 links broken, 4 forks, verify-audit exit 1.
  const tmp = tmpDir();
  try {
    const file = path.join(tmp, 'AUDIT.jsonl');
    const worker = path.join(tmp, 'worker.js');
    fs.writeFileSync(worker, `
      const { appendAuditEntrySync } = require(${JSON.stringify(WRITER)});
      const [file, id] = process.argv.slice(2);
      for (let i = 0; i < 25; i++) appendAuditEntrySync(file, { event: 'probe', worker: id, i });
    `);
    await spawnWorkers(worker, file, 8);

    const entries = readEntries(file);
    assert.strictEqual(entries.length, 200, `all 200 appends must land, got ${entries.length}`);
    let prev = null;
    entries.forEach((e, i) => {
      assert.strictEqual(e.previous_hash, prev, `entry ${i} must chain to its predecessor`);
      prev = e._hash;
    });
    // Also judge it with the SHIPPED verifier, not just this loop.
    assert.deepStrictEqual(verifyAuditChain(file), { valid: true, count: 200 });
  } finally { rmTmp(tmp); }
});

test('appendAuditEntrySync: a warm chain-head cache is re-seeded after another process appends', async () => {
  // Deterministic guard for the half of LOCK-01 that a lock ALONE does not fix. The
  // in-process head cache is only usable while the file is still exactly as long as we
  // left it; once a second process appends, this process MUST re-read the tail. With an
  // unvalidated warm cache this forks (entry 3 chains to entry 1) and it forks even while
  // holding the lock — which is why the lock is necessary but not sufficient.
  const tmp = tmpDir();
  try {
    const file = path.join(tmp, 'AUDIT.jsonl');
    appendAuditEntrySync(file, { event: 'parent-1' });          // warms this process cache
    const child = path.join(tmp, 'child.js');
    fs.writeFileSync(child, `
      const { appendAuditEntrySync } = require(${JSON.stringify(WRITER)});
      appendAuditEntrySync(process.argv[2], { event: 'child-1' });
    `);
    await spawnWorkers(child, file, 1);                          // a genuinely separate process
    appendAuditEntrySync(file, { event: 'parent-2' });           // must NOT reuse the stale head

    const e = readEntries(file);
    assert.strictEqual(e.length, 3, `expected 3 entries, got ${e.length}`);
    assert.strictEqual(e[2].previous_hash, e[1]._hash,
      'the third append must chain to the CHILD entry, not to the stale cached head');
    assert.deepStrictEqual(verifyAuditChain(file), { valid: true, count: 3 });
  } finally { rmTmp(tmp); }
});

test('NEGATIVE CONTROL: the chain assertions above DO fail on an unlocked read-then-write', () => {
  // A gate you cannot make fail is not a gate. This reproduces the defect deterministically
  // — two appenders derive previous_hash from ONE head snapshot, exactly what an unlocked
  // read-then-write permits — and asserts the detectors used above report it. If this test
  // ever starts passing vacuously, the chain assertions have stopped detecting forks and
  // their green result means nothing.
  const tmp = tmpDir();
  try {
    const file = path.join(tmp, 'AUDIT.jsonl');
    appendAuditEntrySync(file, { event: 'seed' });               // one honest entry
    const head = readEntries(file).pop()._hash;

    // Both forged entries chain to `head`: a FORK, the signature of the live defect
    // (.planning/RISK-AUDIT.jsonl lines 755 and 756 both carry previous_hash=d34183e4).
    for (const tag of ['racer-a', 'racer-b']) {
      const stamped = { event: tag, id: tag, timestamp: new Date().toISOString() };
      const _hash = hashAuditEntry(stamped, head);
      fs.appendFileSync(file, JSON.stringify({ ...stamped, previous_hash: head, _hash }) + '\n');
    }

    const result = verifyAuditChain(file);
    assert.strictEqual(result.valid, false,
      'the verifier MUST reject a forked chain — otherwise the tests above prove nothing');
    assert.strictEqual(result.brokenAt, 2, `expected the break at entry 2, got ${result.brokenAt}`);
    assert.strictEqual(result.reason, 'previous_hash mismatch');

    // And the hand-rolled loop used by the headline test must reject it too.
    let prev = null, breaks = 0;
    for (const e of readEntries(file)) {
      if (e.previous_hash !== prev) breaks++;
      prev = e._hash;
    }
    assert.strictEqual(breaks, 1, `expected exactly 1 detected break, got ${breaks}`);
  } finally { rmTmp(tmp); }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nFile Lock: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
