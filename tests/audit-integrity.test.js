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

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nAudit Integrity: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
