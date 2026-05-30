/**
 * MindForge — Audit integrity tests (UC-09 durability + UC-04 signing).
 * Run: node tests/audit-integrity.test.js
 */
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path');
const assert = require('assert');
let passed = 0, failed = 0; const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('audit-writer: 50 rapid writes all land as valid JSON lines (no interleave/loss)', async () => {
  const { createAuditWriter } = require('../bin/autonomous/audit-writer');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-aw-'));
  const file = path.join(tmp, 'AUDIT.jsonl');
  try {
    const w = createAuditWriter(file);
    for (let i = 0; i < 50; i++) w.write({ event: 'task', n: i });
    await w.close();
    const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
    assert.strictEqual(lines.length, 50, `expected 50, got ${lines.length}`);
    lines.forEach(l => JSON.parse(l));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('audit-writer: durable flush failure is NON-FATAL (no unhandled rejection, no process exit)', async () => {
  // Regression for Critical #1: flush() is called UN-AWAITED on the threshold
  // (>=10 entries) and timer paths. If the durable write rejects (ENOSPC/EACCES/
  // EIO/EROFS), the orphaned promise must NOT become an unhandledRejection that
  // terminates the process. The .catch() inside flush() must absorb it.
  const { createAuditWriter } = require('../bin/autonomous/audit-writer');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-aw-fail-'));

  // Make a path whose DIRECTORY COMPONENT is actually a FILE — fs.open(..., 'a')
  // then deterministically rejects with ENOTDIR on every platform (no chmod, no
  // root-vs-non-root fragility). This drives the REAL production write path.
  const blocker = path.join(tmp, 'blocker');
  fs.writeFileSync(blocker, 'not a directory');
  const unwritable = path.join(blocker, 'AUDIT.jsonl');

  const unhandled = [];
  const onUnhandled = (reason) => { unhandled.push(reason); };
  process.on('unhandledRejection', onUnhandled);

  try {
    const w = createAuditWriter(unwritable);

    // Write enough entries to cross FLUSH_THRESHOLD (10) and trigger the
    // UN-AWAITED threshold flush() — the exact crash path from the review.
    for (let i = 0; i < 15; i++) w.write({ event: 'task', n: i });

    // close() must resolve (or reject gracefully) WITHOUT crashing the process.
    await assert.doesNotReject(async () => { await w.close(); },
      'close() must resolve even when the durable write fails');

    // Give any orphaned microtasks/rejections a tick to surface.
    await new Promise(r => setTimeout(r, 50));

    assert.strictEqual(unhandled.length, 0,
      `durable flush failure must NOT produce an unhandledRejection (got ${unhandled.length})`);
  } finally {
    process.removeListener('unhandledRejection', onUnhandled);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('audit-writer chains entries: each entry carries previous_hash linking to prior _hash', async () => {
  const { createAuditWriter } = require('../bin/autonomous/audit-writer');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-chain-'));
  const file = path.join(tmp, 'AUDIT.jsonl');
  try {
    const w = createAuditWriter(file);
    w.write({ event: 'a' }); w.write({ event: 'b' }); w.write({ event: 'c' });
    await w.close();
    const entries = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
    assert.ok(entries.every(e => typeof e._hash === 'string'), 'every entry has _hash');
    assert.strictEqual(entries[1].previous_hash, entries[0]._hash, 'entry 2 links to entry 1');
    assert.strictEqual(entries[2].previous_hash, entries[1]._hash, 'entry 3 links to entry 2');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('verify-audit passes on an untampered chain and FAILS CLOSED on a mutated entry', async () => {
  const { createAuditWriter } = require('../bin/autonomous/audit-writer');
  const { verifyAuditChain } = require('../bin/governance/audit-verifier');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-verify-'));
  const file = path.join(tmp, 'AUDIT.jsonl');
  try {
    const w = createAuditWriter(file);
    w.write({ event: 'x' }); w.write({ event: 'y' });
    await w.close();
    const clean = verifyAuditChain(file);
    assert.strictEqual(clean.valid, true, `clean chain must verify: ${JSON.stringify(clean)}`);

    const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
    const tampered = JSON.parse(lines[0]); tampered.event = 'TAMPERED';
    lines[0] = JSON.stringify(tampered);
    fs.writeFileSync(file, lines.join('\n') + '\n');

    const broken = verifyAuditChain(file);
    assert.strictEqual(broken.valid, false, 'tampered chain must fail closed');
    assert.ok(broken.brokenAt !== undefined, 'must report where the chain broke');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('appendAuditEntrySync produces a verifiable chain across mixed callers', async () => {
  const { appendAuditEntrySync } = require('../bin/autonomous/audit-writer');
  const { verifyAuditChain } = require('../bin/governance/audit-verifier');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-unified-'));
  const file = path.join(tmp, 'AUDIT.jsonl');
  try {
    for (let i = 0; i < 5; i++) appendAuditEntrySync(file, { event: 'e' + i, source: i % 2 ? 'A' : 'B' });
    const res = verifyAuditChain(file);
    assert.strictEqual(res.valid, true, `unified appends must verify: ${JSON.stringify(res)}`);
    assert.strictEqual(res.count, 5);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('appendAuditEntrySync chains correctly across separate process-like seedings (cold-cache re-seed)', async () => {
  // Simulates two processes appending to the same file: the cache module-state is
  // shared in-test, so we assert the on-disk chain stays valid even when entries
  // arrive from "different" callers and the function must seed from the file tail.
  const { appendAuditEntrySync } = require('../bin/autonomous/audit-writer');
  const { verifyAuditChain } = require('../bin/governance/audit-verifier');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-unified-x-'));
  const file = path.join(tmp, 'AUDIT.jsonl');
  try {
    appendAuditEntrySync(file, { event: 'proc-a-1', agent: 'auto-runner' });
    appendAuditEntrySync(file, { event: 'proc-b-1', agent: 'nexus-tracer' });
    appendAuditEntrySync(file, { event: 'proc-c-1', agent: 'approval-handler' });
    const entries = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
    assert.strictEqual(entries[0].previous_hash, null, 'first entry has null previous_hash');
    assert.strictEqual(entries[1].previous_hash, entries[0]._hash, 'entry 2 links to entry 1');
    assert.strictEqual(entries[2].previous_hash, entries[1]._hash, 'entry 3 links to entry 2');
    const res = verifyAuditChain(file);
    assert.strictEqual(res.valid, true, `mixed-caller chain must verify: ${JSON.stringify(res)}`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nAudit Integrity: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
