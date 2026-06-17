/**
 * MindForge — Append Queue concurrency + durability tests (UC-09)
 * Run: node tests/append-queue.test.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('interleaved concurrent appends never corrupt lines (all valid JSON, no partial writes)', async () => {
  const { createAppendQueue } = require('../bin/utils/append-queue');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-aq-'));
  const file = path.join(tmp, 'log.jsonl');
  try {
    const q = createAppendQueue(file);
    const writes = [];
    for (let i = 0; i < 200; i++) {
      writes.push(q.append(JSON.stringify({ n: i, payload: 'x'.repeat(50) })));
    }
    await Promise.all(writes);
    await q.drain();
    const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
    assert.strictEqual(lines.length, 200, `expected 200 lines, got ${lines.length}`);
    const seen = new Set();
    for (const line of lines) {
      const obj = JSON.parse(line);
      seen.add(obj.n);
    }
    assert.strictEqual(seen.size, 200, 'all 200 distinct records must be present (no lost updates)');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('append resolves only after data is durably written (readable immediately after await)', async () => {
  const { createAppendQueue } = require('../bin/utils/append-queue');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-aq2-'));
  const file = path.join(tmp, 'log.jsonl');
  try {
    const q = createAppendQueue(file);
    await q.append(JSON.stringify({ durable: true }));
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(/"durable":true/.test(content), 'data must be on disk once append() resolves');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nAppend Queue: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
