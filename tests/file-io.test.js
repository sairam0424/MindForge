/**
 * MindForge — File I/O utility tests (bin/utils/file-io.js)
 * Run: node tests/file-io.test.js
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const {
  readJSON,
  writeJSON,
  readJSONL,
  readJSONSync,
  atomicWriteJSON,
  atomicWriteJSONAsync,
  AuditWriter,
} = require('../bin/utils/file-io');

let passed = 0;
let failed = 0;

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

// Helper: create a throwaway temp directory per test
function mkTmp(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `mf-fio-${prefix}-`));
}

// ── readJSON ──────────────────────────────────────────────────────────────────

test('readJSON returns parsed object from a valid JSON file', async () => {
  const tmp = mkTmp('rj');
  try {
    const file = path.join(tmp, 'data.json');
    fs.writeFileSync(file, JSON.stringify({ hello: 'world', n: 42 }));
    const result = await readJSON(file);
    assert.deepStrictEqual(result, { hello: 'world', n: 42 });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('readJSON returns null when file does not exist', async () => {
  const result = await readJSON(path.join(os.tmpdir(), 'mf-nonexistent-999.json'));
  assert.strictEqual(result, null);
});

test('readJSON rejects on invalid JSON', async () => {
  const tmp = mkTmp('rj-bad');
  try {
    const file = path.join(tmp, 'bad.json');
    fs.writeFileSync(file, '{not valid json');
    await assert.rejects(() => readJSON(file), SyntaxError);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('readJSON handles nested objects and arrays', async () => {
  const tmp = mkTmp('rj-nested');
  try {
    const data = { a: [1, 2, 3], b: { c: true, d: null } };
    const file = path.join(tmp, 'nested.json');
    fs.writeFileSync(file, JSON.stringify(data));
    const result = await readJSON(file);
    assert.deepStrictEqual(result, data);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ── writeJSON ─────────────────────────────────────────────────────────────────

test('writeJSON writes pretty-printed JSON with trailing newline', async () => {
  const tmp = mkTmp('wj');
  try {
    const file = path.join(tmp, 'out.json');
    await writeJSON(file, { key: 'value', num: 7 });
    const raw = fs.readFileSync(file, 'utf8');
    assert.ok(raw.endsWith('\n'), 'file must end with newline');
    const parsed = JSON.parse(raw);
    assert.deepStrictEqual(parsed, { key: 'value', num: 7 });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('writeJSON creates intermediate directories when they do not exist', async () => {
  const tmp = mkTmp('wj-mkdir');
  try {
    const file = path.join(tmp, 'nested', 'deep', 'data.json');
    await writeJSON(file, { created: true });
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.strictEqual(parsed.created, true);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('writeJSON overwrites existing file', async () => {
  const tmp = mkTmp('wj-ow');
  try {
    const file = path.join(tmp, 'overwrite.json');
    await writeJSON(file, { v: 1 });
    await writeJSON(file, { v: 2 });
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.strictEqual(parsed.v, 2);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ── readJSONL ─────────────────────────────────────────────────────────────────

test('readJSONL returns array of parsed objects from a JSONL file', async () => {
  const tmp = mkTmp('rjl');
  try {
    const file = path.join(tmp, 'log.jsonl');
    fs.writeFileSync(file, '{"a":1}\n{"b":2}\n{"c":3}\n');
    const result = await readJSONL(file);
    assert.deepStrictEqual(result, [{ a: 1 }, { b: 2 }, { c: 3 }]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('readJSONL returns empty array when file does not exist', async () => {
  const result = await readJSONL(path.join(os.tmpdir(), 'mf-no-such-file.jsonl'));
  assert.deepStrictEqual(result, []);
});

test('readJSONL respects limit option', async () => {
  const tmp = mkTmp('rjl-lim');
  try {
    const file = path.join(tmp, 'log.jsonl');
    fs.writeFileSync(file, '{"n":1}\n{"n":2}\n{"n":3}\n{"n":4}\n');
    const result = await readJSONL(file, { limit: 2 });
    assert.deepStrictEqual(result, [{ n: 1 }, { n: 2 }]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('readJSONL respects reverse option', async () => {
  const tmp = mkTmp('rjl-rev');
  try {
    const file = path.join(tmp, 'log.jsonl');
    fs.writeFileSync(file, '{"n":1}\n{"n":2}\n{"n":3}\n');
    const result = await readJSONL(file, { reverse: true });
    assert.deepStrictEqual(result, [{ n: 3 }, { n: 2 }, { n: 1 }]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('readJSONL combines reverse and limit', async () => {
  const tmp = mkTmp('rjl-rl');
  try {
    const file = path.join(tmp, 'log.jsonl');
    fs.writeFileSync(file, '{"n":1}\n{"n":2}\n{"n":3}\n{"n":4}\n');
    const result = await readJSONL(file, { reverse: true, limit: 2 });
    assert.deepStrictEqual(result, [{ n: 4 }, { n: 3 }]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('readJSONL handles empty file gracefully', async () => {
  const tmp = mkTmp('rjl-empty');
  try {
    const file = path.join(tmp, 'empty.jsonl');
    fs.writeFileSync(file, '');
    const result = await readJSONL(file);
    assert.deepStrictEqual(result, []);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ── readJSONSync ──────────────────────────────────────────────────────────────

test('readJSONSync returns parsed object synchronously', () => {
  const tmp = mkTmp('rjs');
  try {
    const file = path.join(tmp, 'sync.json');
    fs.writeFileSync(file, JSON.stringify({ sync: true }));
    const result = readJSONSync(file);
    assert.deepStrictEqual(result, { sync: true });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('readJSONSync returns null when file does not exist', () => {
  const result = readJSONSync(path.join(os.tmpdir(), 'mf-no-sync-file.json'));
  assert.strictEqual(result, null);
});

test('readJSONSync throws on invalid JSON', () => {
  const tmp = mkTmp('rjs-bad');
  try {
    const file = path.join(tmp, 'bad.json');
    fs.writeFileSync(file, 'not json at all');
    assert.throws(() => readJSONSync(file), SyntaxError);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ── atomicWriteJSON ───────────────────────────────────────────────────────────

test('atomicWriteJSON writes readable JSON', () => {
  const tmp = mkTmp('awj');
  try {
    const file = path.join(tmp, 'atomic.json');
    atomicWriteJSON(file, { atomic: true, val: 99 });
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepStrictEqual(parsed, { atomic: true, val: 99 });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('atomicWriteJSON leaves no .tmp file after write', () => {
  const tmp = mkTmp('awj-tmp');
  try {
    const file = path.join(tmp, 'final.json');
    atomicWriteJSON(file, { clean: true });
    const files = fs.readdirSync(tmp);
    const tmpFiles = files.filter(f => f.includes('.tmp.'));
    assert.strictEqual(tmpFiles.length, 0, 'no temp files should remain');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('atomicWriteJSON overwrites existing content safely', () => {
  const tmp = mkTmp('awj-ow');
  try {
    const file = path.join(tmp, 'ow.json');
    atomicWriteJSON(file, { v: 1 });
    atomicWriteJSON(file, { v: 2 });
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.strictEqual(parsed.v, 2);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ── atomicWriteJSONAsync ──────────────────────────────────────────────────────

test('atomicWriteJSONAsync writes readable JSON asynchronously', async () => {
  const tmp = mkTmp('awja');
  try {
    const file = path.join(tmp, 'async-atomic.json');
    await atomicWriteJSONAsync(file, { async: true, num: 55 });
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepStrictEqual(parsed, { async: true, num: 55 });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('atomicWriteJSONAsync leaves no .tmp file after write', async () => {
  const tmp = mkTmp('awja-tmp');
  try {
    const file = path.join(tmp, 'final-async.json');
    await atomicWriteJSONAsync(file, { clean: true });
    const files = fs.readdirSync(tmp);
    const tmpFiles = files.filter(f => f.includes('.tmp.'));
    assert.strictEqual(tmpFiles.length, 0, 'no temp files should remain');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('atomicWriteJSONAsync output is round-trip equal to input', async () => {
  const tmp = mkTmp('awja-rt');
  try {
    const data = { nested: { arr: [1, 2, 3], flag: false }, str: 'hello' };
    const file = path.join(tmp, 'rt.json');
    await atomicWriteJSONAsync(file, data);
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepStrictEqual(parsed, data);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ── AuditWriter ───────────────────────────────────────────────────────────────

test('AuditWriter: flush() and close() resolve without error', async () => {
  const tmp = mkTmp('aw-flush');
  try {
    const file = path.join(tmp, 'audit.jsonl');
    const writer = new AuditWriter(file);
    await writer.flush();
    await writer.close();
    // No assertion needed — reaching here means no throw
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('AuditWriter: initLastHash returns without error on missing file', async () => {
  const file = path.join(os.tmpdir(), 'mf-aw-no-such-file.jsonl');
  const writer = new AuditWriter(file);
  await writer.initLastHash();
  // _lastHash should remain null when file is absent
  assert.strictEqual(writer._lastHash, null);
});

test('AuditWriter: initLastHash reads _hash from last JSONL entry', async () => {
  const tmp = mkTmp('aw-lasthash');
  try {
    const file = path.join(tmp, 'audit.jsonl');
    fs.writeFileSync(file, '{"event":"a","_hash":"hash-aaa"}\n{"event":"b","_hash":"hash-bbb"}\n');
    const writer = new AuditWriter(file);
    await writer.initLastHash();
    assert.strictEqual(writer._lastHash, 'hash-bbb');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('AuditWriter: initLastHash leaves _lastHash null when file has no _hash field', async () => {
  const tmp = mkTmp('aw-nohash');
  try {
    const file = path.join(tmp, 'audit.jsonl');
    fs.writeFileSync(file, '{"event":"a"}\n');
    const writer = new AuditWriter(file);
    await writer.initLastHash();
    assert.strictEqual(writer._lastHash, null);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// ── Results ───────────────────────────────────────────────────────────────────

(async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ${name}`);
      console.error(`     ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error(`\n❌ ${failed} test(s) failed.\n`);
    process.exit(1);
  } else {
    console.log('\n✅ All file-io tests passed.\n');
  }
})();
