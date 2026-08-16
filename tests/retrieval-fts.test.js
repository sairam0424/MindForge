'use strict';
/**
 * FTS-01 — retrieval invariants for bin/memory/vector-hub.js.
 *
 * 16 of the 19 cases below fail against v11.9.2 as shipped (verified: 3 passed,
 * 16 failed). Three defects:
 *   - the whole query was wrapped as ONE FTS phrase, so a multi-word query whose
 *     words are not adjacent in the document matched nothing;
 *   - FTS4 has no ranker, so even after OR-joining, the top-k was docid order
 *     and mean recall@10 measured 0.0000;
 *   - the traces_search DELETE keyed on trace_id while the traces PK is id, so
 *     inserting a span deleted its sibling spans' index rows (2,255 of 5,082
 *     content-bearing traces — 44.4% — were unsearchable in the live database).
 *
 * It also pins the golden set to a corpus that actually exists and to a
 * committed recall floor, so a rename in bin/ or .mindforge/skills/ can no
 * longer silently zero the retrieval eval.
 *
 * Every database this file opens lives under os.tmpdir(); .mindforge/celestial.db
 * is never touched.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { VectorHub, buildFtsTerms } = require('../bin/memory/vector-hub');
const { buildDocCorpus, runGoldenSetEval } = require('../bin/eval/eval-harness');
const goldenSet = require('../bin/eval/golden-set-retrieval.json');

const LEGACY_FTS_DDL =
  'CREATE VIRTUAL TABLE traces_search USING fts4(trace_id, content, agent, tokenize=porter)';

let passed = 0;
let failed = 0;
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// Each VectorHub installs its own process 'exit' guard and never removes it
// (pre-existing behaviour, see _installExitGuard). This file opens ~14 hubs on
// purpose, which trips Node's default 10-listener warning; raise the ceiling so
// the suite output stays clean rather than emitting a misleading leak warning.
process.setMaxListeners(64);

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mindforge-fts01-'));
let seq = 0;
async function freshHub() {
  const hub = new VectorHub(path.join(tmpRoot, `fts-${seq++}.db`));
  await hub.init();
  return hub;
}
const count = (hub, sql) => hub.query(sql)[0].c;

// ── query builder ───────────────────────────────────────────────────────────

test('buildFtsTerms splits a multi-word query into one term each, not a phrase', () => {
  assert.deepStrictEqual(buildFtsTerms('audit hash chain'), ['"audit"', '"hash"', '"chain"']);
});

test('buildFtsTerms keeps an explicit phrase path for exact-adjacency callers', () => {
  assert.deepStrictEqual(buildFtsTerms('audit hash chain', { phrase: true }), ['"audit hash chain"']);
});

test('buildFtsTerms neutralises FTS operators and metacharacters', () => {
  assert.deepStrictEqual(buildFtsTerms('AND OR NOT * "test"'), ['"test"']);
  assert.deepStrictEqual(buildFtsTerms('  *** !!! '), []);
  assert.deepStrictEqual(buildFtsTerms(''), []);
  assert.deepStrictEqual(buildFtsTerms('   ', { phrase: true }), []);
});

test('buildFtsTerms REJECTS a non-string query instead of searching "[object Object]"', () => {
  assert.throws(() => buildFtsTerms({ limit: 3 }), TypeError);
  assert.throws(() => buildFtsTerms(['a']), TypeError);
  assert.throws(() => buildFtsTerms(null), /received null/);
  assert.throws(() => buildFtsTerms(undefined), TypeError);
  assert.throws(() => buildFtsTerms(7), /received number/);
});

test('buildFtsTerms dedupes terms case-insensitively and caps expansion', () => {
  assert.deepStrictEqual(buildFtsTerms('a a A'), ['"a"']);
  const many = Array.from({ length: 100 }, (_, i) => `t${i}`).join(' ');
  assert.strictEqual(buildFtsTerms(many).length, 32);
});

// ── defect (a): phrase wrap ─────────────────────────────────────────────────

test('multi-word query with non-adjacent terms returns rows', async () => {
  const hub = await freshHub();
  try {
    await hub.recordTrace({
      id: 'sp-a', trace_id: 'tr-a', event: 'reasoning_trace', agent: 'mf-analyzer',
      content: 'Optimizing the celestial mesh for high-frequency synchronization.',
    });
    const or = await hub.searchTraces('mesh synchronization retry policy');
    assert.ok(or.length >= 1, `OR-join must match, got ${or.length}`);
    const phrase = await hub.searchTraces('mesh synchronization retry policy', { phrase: true });
    assert.strictEqual(phrase.length, 0, 'phrase path must still require adjacency');
  } finally { await hub.close(); }
});

test('searchTraces propagates the non-string TypeError to the caller', async () => {
  const hub = await freshHub();
  try {
    await assert.rejects(() => hub.searchTraces({ limit: 3 }), TypeError);
    await assert.rejects(() => hub.searchKnowledge({ limit: 3 }), TypeError);
  } finally { await hub.close(); }
});

// ── the ranking half of the fix ─────────────────────────────────────────────

test('tf-idf ranking puts the rare-term match first, not docid order', async () => {
  const hub = await freshHub();
  try {
    // 40 near-identical common documents, then the one that actually answers the
    // query — last by docid, so an unranked OR-join can never surface it.
    for (let i = 0; i < 40; i++) {
      await hub.recordTrace({
        id: `noise-${i}`, trace_id: `tr-${i}`, event: 'span_started',
        content: 'routine heartbeat sync ok',
      });
    }
    await hub.recordTrace({
      id: 'needle', trace_id: 'tr-needle', event: 'span_started',
      content: 'routine heartbeat sync ok quantum entanglement anomaly',
    });
    const rows = await hub.searchTraces('quantum anomaly heartbeat');
    assert.ok(rows.length > 0, 'expected hits');
    assert.strictEqual(rows[0].id, 'needle', `expected needle first, got ${rows[0].id}`);
  } finally { await hub.close(); }
});

test('a rare second term outranks a repeated common term', async () => {
  const hub = await freshHub();
  try {
    for (let i = 0; i < 20; i++) {
      await hub.recordTrace({ id: `f${i}`, trace_id: 't', event: 'e', content: 'alpha filler' });
    }
    await hub.recordTrace({ id: 'both', trace_id: 't', event: 'e', content: 'alpha beta' });
    await hub.recordTrace({
      id: 'repeat', trace_id: 't', event: 'e',
      content: 'alpha alpha alpha alpha alpha alpha alpha alpha',
    });
    const rows = await hub.searchTraces('alpha beta');
    assert.strictEqual(rows[0].id, 'both', `expected 'both' first, got ${rows[0].id}`);
  } finally { await hub.close(); }
});

test('a rare term is not lost behind a term that overflows the candidate pool', async () => {
  const hub = await freshHub();
  try {
    // FTS_RANK_POOL is 2000 per term. Write more than that many rows carrying a
    // common term, then one FINAL row (highest docid) that also carries a rare
    // one. A single OR-joined MATCH would fill its pool with the 2000 oldest
    // docids and could never rank — or even see — the last row.
    hub._batchSize = Number.MAX_SAFE_INTEGER; // avoid 210 full DB exports
    for (let i = 0; i < 2100; i++) {
      await hub.recordTrace({
        id: `bulk-${i}`, trace_id: `tr-${i}`, event: 'span_started',
        content: 'celestial mesh routine telemetry',
      });
    }
    await hub.recordTrace({
      id: 'late-needle', trace_id: 'tr-late', event: 'span_started',
      content: 'celestial mesh zzneedletoken4412',
    });
    const rows = await hub.searchTraces('celestial zzneedletoken4412');
    assert.strictEqual(rows[0].id, 'late-needle', `expected late-needle first, got ${rows.length ? rows[0].id : 'nothing'}`);
  } finally { await hub.close(); }
});

// ── defect (b): wrong PK on the FTS delete ──────────────────────────────────

test('every span of a trace stays independently searchable', async () => {
  const hub = await freshHub();
  try {
    for (let i = 1; i <= 3; i++) {
      await hub.recordTrace({
        id: `sp-${i}`, trace_id: 'tr-shared', event: 'reasoning_trace',
        agent: 'mf-tester', content: `sibling payload number ${i}`,
      });
    }
    assert.strictEqual(count(hub, 'SELECT COUNT(*) c FROM traces_search'), 3);
    for (let i = 1; i <= 3; i++) {
      const rows = await hub.searchTraces(`payload number ${i}`);
      assert.ok(rows.some(r => r.id === `sp-${i}`), `sp-${i} unsearchable`);
    }
  } finally { await hub.close(); }
});

test('traces_search rowcount stays at parity with content-bearing traces', async () => {
  const hub = await freshHub();
  try {
    for (let i = 0; i < 40; i++) {
      await hub.recordTrace({
        trace_id: `tr-${i % 5}`, event: 'span_started',
        content: i % 4 === 0 ? null : `payload ${i}`,
      });
    }
    const base = hub.query(
      'SELECT COUNT(*) c FROM traces WHERE content IS NOT NULL AND content <> ?', ['']
    )[0].c;
    const idx = count(hub, 'SELECT COUNT(*) c FROM traces_search');
    assert.strictEqual(idx, base, `parity broken: with-content=${base} traces_search=${idx}`);
  } finally { await hub.close(); }
});

test('re-recording the same span id upserts rather than duplicates', async () => {
  const hub = await freshHub();
  try {
    await hub.recordTrace({ id: 's1', trace_id: 'tr-u', event: 'e', content: 'first revision' });
    await hub.recordTrace({ id: 's1', trace_id: 'tr-u', event: 'e', content: 'second revision' });
    assert.strictEqual(count(hub, 'SELECT COUNT(*) c FROM traces_search'), 1);
    const rows = await hub.searchTraces('revision');
    assert.strictEqual(rows.length, 1);
    assert.ok(rows[0].content.includes('second'));
  } finally { await hub.close(); }
});

test('searchTraces never returns duplicate rows and honours a clamped limit', async () => {
  const hub = await freshHub();
  try {
    for (let i = 1; i <= 25; i++) {
      await hub.recordTrace({
        id: `sp${i}`, trace_id: 'one-trace', event: 'e', content: 'shared token here',
      });
    }
    const rows = await hub.searchTraces('shared token');
    assert.strictEqual(rows.length, 10, 'default limit is 10');
    assert.strictEqual(new Set(rows.map(r => r.id)).size, rows.length, 'duplicate ids returned');
    assert.strictEqual((await hub.searchTraces('shared token', { limit: 25 })).length, 25);
    assert.strictEqual((await hub.searchTraces('shared token', { limit: 0 })).length, 10);
    assert.strictEqual((await hub.searchTraces('shared token', { limit: 9999 })).length, 25);
  } finally { await hub.close(); }
});

test('searchKnowledge still accepts a bare numeric limit (back-compat)', async () => {
  const hub = await freshHub();
  try {
    for (let i = 0; i < 5; i++) {
      await hub.saveKnowledge({ id: `k${i}`, type: 'doc', content: `durable content ${i}` });
    }
    assert.strictEqual((await hub.searchKnowledge('durable content', 2)).length, 2);
    assert.strictEqual((await hub.searchKnowledge('durable content')).length, 5);
  } finally { await hub.close(); }
});

// ── migration / backfill ────────────────────────────────────────────────────

test('a legacy trace_id-keyed traces_search is rebuilt from traces on init', async () => {
  const hub = await freshHub();
  try {
    for (let i = 1; i <= 6; i++) {
      await hub.recordTrace({
        id: `m${i}`, trace_id: `tr-${i % 2}`, event: 'e', content: `migrated row ${i}`,
      });
    }
    // Simulate the v11.9.2 on-disk shape: old schema, one row per trace_id.
    hub._db.run('DROP TABLE traces_search');
    hub._db.run(LEGACY_FTS_DDL);
    hub._db.run(
      'INSERT INTO traces_search (trace_id, content, agent) VALUES (?, ?, ?)',
      ['tr-0', 'migrated row 6', null]
    );
    assert.strictEqual(count(hub, 'SELECT COUNT(*) c FROM traces_search'), 1, 'legacy fixture');

    const first = hub._ensureTracesSearchSchema();
    assert.strictEqual(first.migrated, true);
    assert.strictEqual(first.indexed, 6);
    assert.strictEqual(first.expected, 6);

    const ddl = hub.query('SELECT sql FROM sqlite_master WHERE name = ?', ['traces_search'])[0].sql;
    assert.ok(/fts4\s*\(\s*id\s*,/i.test(ddl), `schema not migrated: ${ddl}`);
    assert.ok((await hub.searchTraces('migrated row 3')).some(r => r.id === 'm3'));

    // Idempotent: a second call must not rebuild or duplicate.
    const second = hub._ensureTracesSearchSchema();
    assert.strictEqual(second.migrated, false);
    assert.strictEqual(count(hub, 'SELECT COUNT(*) c FROM traces_search'), 6);
  } finally { await hub.close(); }
});

test('rebuildTracesSearch is explicitly re-runnable and self-reporting', async () => {
  const hub = await freshHub();
  try {
    for (let i = 1; i <= 5; i++) {
      await hub.recordTrace({ id: `r${i}`, trace_id: 'tr-r', event: 'e', content: `row ${i}` });
    }
    await hub.recordTrace({ id: 'blank', trace_id: 'tr-r', event: 'e', content: null });
    // Simulate index rot (what the trace_id-keyed DELETE produced).
    hub._db.run('DELETE FROM traces_search');
    assert.strictEqual(count(hub, 'SELECT COUNT(*) c FROM traces_search'), 0);
    assert.deepStrictEqual(hub.rebuildTracesSearch(), { indexed: 5, expected: 5 });
    assert.deepStrictEqual(hub.rebuildTracesSearch(), { indexed: 5, expected: 5 });
    assert.ok((await hub.searchTraces('row 4')).some(r => r.id === 'r4'));
  } finally { await hub.close(); }
});

// ── golden set / eval gate ──────────────────────────────────────────────────

test('every golden-set relevant id resolves to a real document', () => {
  const corpus = buildDocCorpus();
  const ids = [...new Set(goldenSet.queries.flatMap(q => q.relevant))];
  const unresolved = ids.filter(id => !corpus.has(id));
  assert.ok(corpus.size > 100, `corpus too small: ${corpus.size}`);
  assert.deepStrictEqual(unresolved, [], `golden ids with no document: ${unresolved.join(', ')}`);
});

test('golden-set eval is executable and clears the committed baseline floor', async () => {
  const floor = goldenSet.baseline.gateMinRecall;
  const res = await runGoldenSetEval({ k: 10 });
  assert.strictEqual(res.perQuery.length, goldenSet.queries.length);
  assert.deepStrictEqual(res.unresolvedRelevantIds, []);
  for (const q of res.perQuery) {
    assert.ok(q.retrieved.length > 0, `query returned nothing: ${q.query}`);
  }
  console.log(`      [measured] recall@10 = ${res.meanRecallAtK.toFixed(4)}, nDCG@10 = ${res.meanNDCG.toFixed(4)}, corpus = ${res.corpusSize} docs (committed baseline ${goldenSet.baseline.meanRecallAtK}, floor ${floor})`);
  assert.ok(
    res.meanRecallAtK >= floor,
    `retrieval regression: recall@10 ${res.meanRecallAtK.toFixed(4)} < committed floor ${floor}`
  );
});

(async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  PASS  ${name}`);
      passed++;
    } catch (e) {
      console.error(`  FAIL  ${name}\n      ${e.message}`);
      failed++;
    }
  }
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* best effort */ }
  console.log(`\nRetrieval FTS: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
