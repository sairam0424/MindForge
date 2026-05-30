/**
 * MindForge — Audit integrity tests (UC-09 durability + UC-04 signing).
 * Run: node tests/audit-integrity.test.js
 */
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path');
const assert = require('assert');
let passed = 0, failed = 0; const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('appendAuditEntrySync: 50 rapid writes all land as valid JSON lines (no loss)', () => {
  // Durability (UC-09): appendAuditEntrySync is synchronous + fsync'd, so every
  // acknowledged write is on disk when the call returns. 50 sequential appends must
  // therefore yield exactly 50 valid JSON lines with no loss or corruption.
  const { appendAuditEntrySync } = require('../bin/autonomous/audit-writer');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-aw-'));
  const file = path.join(tmp, 'AUDIT.jsonl');
  try {
    for (let i = 0; i < 50; i++) appendAuditEntrySync(file, { event: 'task', n: i });
    const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
    assert.strictEqual(lines.length, 50, `expected 50, got ${lines.length}`);
    lines.forEach(l => JSON.parse(l));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('appendAuditEntrySync: a failed durable write surfaces synchronously to the caller (not silently lost)', () => {
  // appendAuditEntrySync is SYNCHRONOUS + fsync'd, so a write failure throws straight
  // to the caller — there is no buffered/un-awaited flush that could swallow it into
  // an unhandledRejection (the failure mode the retired buffered writer guarded
  // against). This asserts the error is not silently dropped: a durably-acknowledged
  // append either lands on disk or throws. We force ENOTDIR by making the path's
  // DIRECTORY COMPONENT a regular file (deterministic on every platform — no chmod,
  // no root-vs-non-root fragility).
  const { appendAuditEntrySync } = require('../bin/autonomous/audit-writer');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-aw-fail-'));
  try {
    const blocker = path.join(tmp, 'blocker');
    fs.writeFileSync(blocker, 'not a directory');
    const unwritable = path.join(blocker, 'sub', 'AUDIT.jsonl');
    assert.throws(() => appendAuditEntrySync(unwritable, { event: 'task' }), /ENOTDIR|EEXIST|ENOENT/,
      'a non-writable audit path must throw to the caller, not silently lose the write');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('appendAuditEntrySync chains entries: each entry carries previous_hash linking to prior _hash', () => {
  const { appendAuditEntrySync } = require('../bin/autonomous/audit-writer');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-chain-'));
  const file = path.join(tmp, 'AUDIT.jsonl');
  try {
    appendAuditEntrySync(file, { event: 'a' });
    appendAuditEntrySync(file, { event: 'b' });
    appendAuditEntrySync(file, { event: 'c' });
    const entries = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
    assert.ok(entries.every(e => typeof e._hash === 'string'), 'every entry has _hash');
    assert.strictEqual(entries[0].previous_hash, null, 'first entry has null previous_hash');
    assert.strictEqual(entries[1].previous_hash, entries[0]._hash, 'entry 2 links to entry 1');
    assert.strictEqual(entries[2].previous_hash, entries[1]._hash, 'entry 3 links to entry 2');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('verify-audit passes on an untampered chain and FAILS CLOSED on a mutated entry', () => {
  const { appendAuditEntrySync } = require('../bin/autonomous/audit-writer');
  const { verifyAuditChain } = require('../bin/governance/audit-verifier');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-verify-'));
  const file = path.join(tmp, 'AUDIT.jsonl');
  try {
    appendAuditEntrySync(file, { event: 'x' });
    appendAuditEntrySync(file, { event: 'y' });
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

test('appendAuditEntrySync seeds previous_hash from the file tail on a COLD cache (new-process re-seed)', async () => {
  // GENUINELY exercises the cold-seed path: the first batch warms the module's
  // in-process _lastHashCache, then we EVICT the module from require.cache and
  // re-require it to get a fresh instance with an EMPTY cache — exactly like a second
  // OS process. The reloaded function must seed previous_hash from the on-disk tail
  // (readLastHash), so the second batch's first entry links to the prior batch's last
  // _hash and the whole on-disk chain stays valid. (Previously this ran in one warm
  // process and never touched the disk-seed branch.)
  const writerPath = require.resolve('../bin/autonomous/audit-writer');
  const { verifyAuditChain } = require('../bin/governance/audit-verifier');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-unified-x-'));
  const file = path.join(tmp, 'AUDIT.jsonl');
  try {
    // Batch 1 — "process A": warms the in-process cache for this path.
    const procA = require(writerPath);
    procA.appendAuditEntrySync(file, { event: 'proc-a-1', agent: 'auto-runner' });
    procA.appendAuditEntrySync(file, { event: 'proc-a-2', agent: 'auto-runner' });

    // Evict + reload → fresh module instance with a COLD _lastHashCache.
    delete require.cache[writerPath];
    const procB = require(writerPath);
    assert.notStrictEqual(procB.appendAuditEntrySync, procA.appendAuditEntrySync,
      'reloaded module must be a distinct instance (cold cache)');

    // Batch 2 — "process B": MUST seed previous_hash from the file tail on disk.
    procB.appendAuditEntrySync(file, { event: 'proc-b-1', agent: 'nexus-tracer' });
    procB.appendAuditEntrySync(file, { event: 'proc-b-2', agent: 'approval-handler' });

    const entries = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
    assert.strictEqual(entries[0].previous_hash, null, 'first entry has null previous_hash');
    assert.strictEqual(entries[1].previous_hash, entries[0]._hash, 'entry 2 links to entry 1');
    // The cold-seed link: entry 3 (first write of the reloaded module) must chain to
    // entry 2's _hash, proving it seeded from disk and not from a stale/empty cache.
    assert.strictEqual(entries[2].previous_hash, entries[1]._hash,
      'cold-cache entry must seed previous_hash from the on-disk tail');
    assert.strictEqual(entries[3].previous_hash, entries[2]._hash, 'entry 4 links to entry 3');
    const res = verifyAuditChain(file);
    assert.strictEqual(res.valid, true, `cold-reseeded chain must verify: ${JSON.stringify(res)}`);
  } finally {
    // Leave a clean, freshly-loaded module for any later tests.
    delete require.cache[writerPath];
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('integration: file-io AuditWriter (nexus/policy path) + appendAuditEntrySync share ONE verifiable chain', async () => {
  // UC-04b regression: file-io.AuditWriter previously used a DIVERGENT hasher
  // (timestamp injected into the material), so its entries could not verify against
  // the canonical chain. This drives BOTH real code paths — the class API used by
  // nexus-tracer/policy-engine AND the direct unified append used by auto-runner/
  // hindsight/skill-registry/approval-handler — into the SAME fresh file and asserts
  // the resulting chain is valid end-to-end.
  const { appendAuditEntrySync } = require('../bin/autonomous/audit-writer');
  const { AuditWriter } = require('../bin/utils/file-io');
  const { verifyAuditChain } = require('../bin/governance/audit-verifier');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-integ-'));
  const file = path.join(tmp, 'AUDIT.jsonl');
  try {
    // auto-runner-style direct append
    appendAuditEntrySync(file, { event: 'auto_mode_started', agent: 'auto-runner' });
    // nexus-tracer / policy-engine path (the formerly-divergent class)
    const w = new AuditWriter(file);
    await w.write({ event: 'reasoning_trace', agent: 'nexus-tracer', thought: 'plan' });
    await w.write({ event: 'span_end', agent: 'nexus-tracer' });
    await w.close();
    // approval-handler / hindsight / skill-registry style direct append
    appendAuditEntrySync(file, { event: 'approval_decision', decision: 'approve', agent: 'dashboard' });

    const res = verifyAuditChain(file);
    assert.strictEqual(res.valid, true, `mixed real-path chain must verify: ${JSON.stringify(res)}`);
    assert.strictEqual(res.count, 4, `expected 4 chained entries, got ${res.count}`);
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
