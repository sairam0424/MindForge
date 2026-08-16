'use strict';
/**
 * CRYPTO-01 regression suite — TemporalHub metadata integrity comparison.
 *
 * Guards two coupled defects:
 *
 *  1. `_verifyMetadata` compared `integrity.length` (UTF-16 CODE UNITS) against
 *     `expected.length` before `crypto.timingSafeEqual`. Any `integrity` of 64 code
 *     units containing a non-ASCII character is 65+ BYTES, so the guard passed and
 *     timingSafeEqual still threw `RangeError: Input buffers must have the same byte
 *     length`.
 *
 *  2. `rollbackTo` caught that RangeError, sniffed `err.message` for
 *     'integrity verification', did not match, and fell through to
 *     "proceeding without integrity check" — restoring the unverified snapshot and
 *     returning true. The throw was strictly WORSE than returning false.
 *
 * SCOPE NOTE — this is a CORRECTNESS suite, not an authenticity one. HMAC_KEY is the
 * literal 'mindforge-temporal-v3' in shipped source, and an ABSENT SNAPSHOT-META.json
 * still bypasses verification by design (see the 'legacy snapshot' test below). The
 * HMAC also covers only the metadata object, never the snapshot file CONTENTS. Anyone
 * who can write a snapshot dir can forge a valid signature. These tests pin behaviour;
 * they do not claim a security guarantee.
 *
 * STATE SAFETY — `bin/engine/temporal-hub.js` resolves PLANNING_DIR from
 * `process.cwd()` at MODULE LOAD time. Every filesystem test therefore runs in a
 * CHILD PROCESS whose cwd is a fresh `os.tmpdir()` sandbox. Nothing here reads or
 * writes the repository's own .planning directory.
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const HUB_PATH = path.join(__dirname, '..', 'bin', 'engine', 'temporal-hub.js');
const HMAC_KEY = 'mindforge-temporal-v3';

let passed = 0, failed = 0; const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function sign(meta) {
  return {
    ...meta,
    integrity: crypto.createHmac('sha256', HMAC_KEY).update(JSON.stringify(meta)).digest('hex')
  };
}

// ── Part A: `_verifyMetadata` is pure (no filesystem access) ──────────────────
// Safe to exercise in-process: the module's top level only computes paths.

const TemporalHub = require(HUB_PATH);
const BASE = { timestamp: '2026-01-01T00:00:00.000Z', files: ['PLAN.md'] };

test('_verifyMetadata returns true for a correctly signed payload', () => {
  const meta = sign({ id: 'aaaaaaaa-0000-0000-0000-000000000001', ...BASE });
  assert.strictEqual(meta.integrity.length, 64);
  assert.strictEqual(TemporalHub._verifyMetadata(meta), true);
});

test('_verifyMetadata RETURNS FALSE (never throws) for 64 UTF-16 units but 65 bytes', () => {
  // 63 ASCII + one 2-byte character: .length === 64 (passes a code-unit guard)
  // but Buffer.byteLength === 65, which is what timingSafeEqual actually measures.
  const integrity = 'a'.repeat(63) + 'é';
  assert.strictEqual(integrity.length, 64, 'precondition: 64 UTF-16 code units');
  assert.strictEqual(Buffer.byteLength(integrity, 'utf8'), 65, 'precondition: 65 bytes');
  const meta = { id: 'cccccccc-0000-0000-0000-000000000003', ...BASE, integrity };
  let result, threw = null;
  try { result = TemporalHub._verifyMetadata(meta); } catch (e) { threw = e; }
  assert.strictEqual(threw, null,
    `must not throw, got ${threw && threw.constructor.name}: ${threw && threw.message}`);
  assert.strictEqual(result, false);
});

test('_verifyMetadata RETURNS FALSE (never throws) for a 4-byte astral character', () => {
  // One surrogate pair: 2 UTF-16 code units, 4 bytes. 62 ASCII + pair = 64 units / 66 bytes.
  const integrity = 'a'.repeat(62) + '\u{1F600}';
  assert.strictEqual(integrity.length, 64);
  assert.strictEqual(Buffer.byteLength(integrity, 'utf8'), 66);
  let result, threw = null;
  try {
    result = TemporalHub._verifyMetadata({ id: 'x', ...BASE, integrity });
  } catch (e) { threw = e; }
  assert.strictEqual(threw, null,
    `must not throw, got ${threw && threw.constructor.name}: ${threw && threw.message}`);
  assert.strictEqual(result, false);
});

test('_verifyMetadata returns false for absent, non-string and wrong-length integrity', () => {
  for (const integrity of [undefined, null, '', 42, {}, [], 'abc', 'b'.repeat(63), 'b'.repeat(65)]) {
    let result, threw = null;
    try {
      result = TemporalHub._verifyMetadata({ id: 'x', ...BASE, integrity });
    } catch (e) { threw = e; }
    assert.strictEqual(threw, null,
      `integrity=${JSON.stringify(integrity)} must not throw, got ${threw && threw.message}`);
    assert.strictEqual(result, false, `integrity=${JSON.stringify(integrity)} must be false`);
  }
});

test('_verifyMetadata returns false for a same-length but wrong signature', () => {
  assert.strictEqual(
    TemporalHub._verifyMetadata({ id: 'x', ...BASE, integrity: 'b'.repeat(64) }), false);
});

// ── Part B: `rollbackTo` must FAIL CLOSED, in an isolated child process ───────

const CHILD = `
const fs = require('fs'), path = require('path');
const Hub = require(process.env.HUB_PATH);
const P = path.join(process.cwd(), '.planning');
(async () => {
  let ret, threw = null;
  try { ret = await Hub.rollbackTo(process.env.SNAP_ID); }
  catch (e) { threw = e.message; }
  process.stdout.write('\\n@@RESULT@@' + JSON.stringify({
    ret, threw, live: fs.readFileSync(path.join(P, 'PLAN.md'), 'utf8')
  }));
})();
`;

/**
 * Build a throwaway .planning sandbox in os.tmpdir(), attempt a rollback in a child
 * process, and return { ret, threw, live }. `meta` may be an object, a raw string
 * (to plant malformed JSON), or null (to omit SNAPSHOT-META.json entirely).
 */
function rollbackInSandbox(snapId, meta) {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-crypto01-'));
  try {
    const snapDir = path.join(sandbox, '.planning', 'history', snapId);
    fs.mkdirSync(snapDir, { recursive: true });
    fs.writeFileSync(path.join(sandbox, '.planning', 'PLAN.md'), 'LIVE');
    fs.writeFileSync(path.join(snapDir, 'PLAN.md'), 'SNAPSHOT');
    if (meta !== null) {
      fs.writeFileSync(path.join(snapDir, 'SNAPSHOT-META.json'),
        typeof meta === 'string' ? meta : JSON.stringify(meta, null, 2));
    }
    const out = execFileSync(process.execPath, ['-e', CHILD], {
      cwd: sandbox,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, HUB_PATH, SNAP_ID: snapId }
    });
    const marker = out.lastIndexOf('@@RESULT@@');
    assert.notStrictEqual(marker, -1, `child produced no result marker; output was: ${out}`);
    return JSON.parse(out.slice(marker + '@@RESULT@@'.length));
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}

test('rollbackTo RESTORES a correctly signed snapshot (happy path unchanged)', () => {
  const id = 'aaaaaaaa-0000-0000-0000-000000000001';
  const r = rollbackInSandbox(id, sign({ id, ...BASE }));
  assert.strictEqual(r.threw, null, `must not throw: ${r.threw}`);
  assert.strictEqual(r.ret, true);
  assert.strictEqual(r.live, 'SNAPSHOT', 'valid snapshot must be restored');
});

test('rollbackTo FAILS CLOSED on 64-UTF-16-unit / 65-byte integrity (CRYPTO-01)', () => {
  // Before the fix: timingSafeEqual threw RangeError, the caller's message sniff did
  // not match, and it logged "proceeding without integrity check" and restored anyway.
  const id = 'cccccccc-0000-0000-0000-000000000003';
  const r = rollbackInSandbox(id, {
    id, ...BASE, integrity: 'a'.repeat(63) + 'é'
  });
  assert.match(String(r.threw), /failed integrity verification/,
    `must reject, instead ret=${r.ret} threw=${r.threw}`);
  assert.strictEqual(r.live, 'LIVE',
    'unverified snapshot must NOT be restored — live state must be untouched');
});

test('rollbackTo FAILS CLOSED on malformed metadata JSON', () => {
  // A JSON.parse SyntaxError also used to degrade into "proceeding without integrity
  // check", because only the substring 'integrity verification' was re-thrown.
  const r = rollbackInSandbox('dddddddd-0000-0000-0000-000000000004', '{ not json');
  assert.match(String(r.threw), /failed integrity verification/,
    `must reject, instead ret=${r.ret} threw=${r.threw}`);
  assert.strictEqual(r.live, 'LIVE');
});

test('rollbackTo FAILS CLOSED on a tampered same-length signature', () => {
  const id = 'bbbbbbbb-0000-0000-0000-000000000002';
  const r = rollbackInSandbox(id, { id, ...BASE, integrity: 'b'.repeat(64) });
  assert.match(String(r.threw), /failed integrity verification/);
  assert.strictEqual(r.live, 'LIVE');
});

test('legacy snapshot with NO SNAPSHOT-META.json is still tolerated (documented hole)', () => {
  // Deliberately NOT fail-closed: pre-existing behaviour for legacy snapshots. This is
  // also why the HMAC is not an authenticity control — deleting the metadata file
  // bypasses verification outright. Pinned so any future change is a conscious one.
  const r = rollbackInSandbox('ffffffff-0000-0000-0000-000000000006', null);
  assert.strictEqual(r.threw, null, `legacy path must not throw: ${r.threw}`);
  assert.strictEqual(r.ret, true);
  assert.strictEqual(r.live, 'SNAPSHOT');
});

// ── Runner ───────────────────────────────────────────────────────────────────

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nTemporal Integrity (CRYPTO-01): ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
