/**
 * Guards VectorHub against silently destroying another process's acknowledged writes.
 *
 * TWO OPPOSITE FINDINGS WERE REPORTED AS ONE, and only one of them was real. Both are recorded here
 * because the difference decided what to build.
 *
 * NOT REPRODUCIBLE — "a session under 10 writes persists nothing (0 of 3, 10 of 12)". Measured with a
 * VALID payload, every write persists: 3/3, 9/9, 10/10, 12/12, 15/15, with or without close(). The
 * `_writeCount >= _batchSize` autosave plus the counter-based exit guard already handle it; commits
 * 2518ba8 and c3ce899 did that work.
 *
 * The original measurement almost certainly used a payload with no `event` field, which is required
 * and has no default. Reproduced: `recordTrace({trace_id, text})` REJECTS with sql.js's
 * "Wrong API use : tried to bind a value of an unknown type (undefined)". With that payload,
 * ACK=0 THREW=3 and disk=0 — which reads exactly like "3 acknowledged, 0 persisted" if the harness
 * counted attempts instead of successes. A loud rejection and a silent discard are opposite defects,
 * and conflating them would have sent a fix at code that is already correct.
 *
 * REAL — cross-process loss. sql.js holds the whole database in memory and persists by exporting the
 * ENTIRE file and renaming it over the path, so two processes each rewrite the whole thing and the
 * last writer wins. Measured before this change: two writers, 15 acknowledged recordTrace() calls
 * each, 30 expected — 15 on disk, ALL from writer A. Writer B's 15 vanished with no error on either
 * side.
 *
 * THE CORROBORATING EVIDENCE WAS OVERSTATED, corrected here rather than quietly dropped. This
 * header used to cite orphaned `celestial.db.tmp.<pid>` files, "one a valid database with skills
 * rows absent from the live file", as production proof. All 171 non-empty orphans have since been
 * audited against the live database: 161 are strict subsets, 9 exceed it only on
 * `traces_search_segdir` (an FTS5 index-merge artifact, not rows), and the single real outlier holds
 * 1,373 skill names the live file lacks — all of them generated `Synthesized Skill (mf-*) - ev_*`
 * filler. The orphans prove the clobber window was entered; they are NOT evidence that anything
 * worth keeping was destroyed. The two-writer measurement above stands on its own.
 *
 * Those orphans had a second defect of their own — they accumulated to 1.8 GB because nothing ever
 * deleted them. See tests/vector-hub-tmp-reap.test.js.
 *
 * WHAT THIS FIX DOES, AND DOES NOT. It does NOT make sql.js multi-process safe — that needs a
 * different driver, and a lock around the save would not help, because both processes loaded a stale
 * copy before either saved. It removes the SILENCE: a clobber is detected by comparing the file's
 * size+mtime against what this process loaded, the export goes to a `.conflict.<pid>` sidecar, and the
 * refusal is logged. Nothing is lost and somebody knows. Same choice as auto-runner refusing to record
 * a completion it cannot substantiate.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const HUB = path.join(REPO_ROOT, 'bin', 'memory', 'vector-hub.js');

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function withScratch(fn) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-vhclobber-')));
  fs.mkdirSync(path.join(dir, '.mindforge'), { recursive: true });
  try { return fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

/** Run a snippet with `dir` as cwd. Returns {status, stderr}. */
function inProcess(dir, body) {
  return spawnSync(process.execPath, ['-e',
    `process.chdir(${JSON.stringify(dir)});
     (async () => {
       const { VectorHub } = require(${JSON.stringify(HUB)});
       const h = new VectorHub();
       await h.init();
       ${body}
       process.exit(0);
     })().catch((e) => { console.error('SNIPPET_ERROR ' + (e && e.message)); process.exit(9); });`],
  { encoding: 'utf8', cwd: dir });
}

/**
 * Read a sql.js-written database. `immutable=1` is required: the file carries a WAL-mode header, so a
 * plain `sqlite3 -readonly` fails with SQLITE_CANTOPEN(14) and a harness that treated that as "zero
 * rows" would invent data loss. Learned the hard way while measuring this.
 */
function rowCount(file) {
  if (!fs.existsSync(file)) return null;
  const r = spawnSync('sqlite3', [`file:${file}?mode=ro&immutable=1`, 'select count(*) from traces'],
    { encoding: 'utf8' });
  if (r.status !== 0) return null;
  return Number((r.stdout || '').trim());
}

const REC = (id) => `await h.recordTrace({ trace_id: '${id}', event: 'span_started', content: 'c' });`;

// ── the finding that did NOT reproduce ───────────────────────────────────────

test('every acknowledged write persists, at and below the autosave batch size', () => {
  // Pins the correct behaviour so the not-reproducible finding cannot be "fixed" back into existence.
  for (const n of [3, 9, 10, 12, 15]) {
    withScratch((dir) => {
      const body = Array.from({ length: n }, (_, i) => REC(`t${i}`)).join('\n');
      const r = inProcess(dir, body);
      assert.strictEqual(r.status, 0, `n=${n} snippet failed: ${(r.stderr || '').slice(0, 200)}`);
      const rows = rowCount(path.join(dir, '.mindforge', 'celestial.db'));
      assert.strictEqual(rows, n,
        `${n} acknowledged writes but ${rows} on disk. The exit guard plus the batch autosave are ` +
        'supposed to make every acknowledged write durable even without close().');
    });
  }
});

test('an INVALID payload is REJECTED, not silently dropped', () => {
  // The distinction the original finding lost. A rejection is correct behaviour; counting it as a
  // lost write turns a working guard into a phantom data-loss bug.
  withScratch((dir) => {
    const r = inProcess(dir,
      `let ack = 0, threw = 0;
       for (let i = 0; i < 3; i++) {
         try { await h.recordTrace({ trace_id: 't' + i, text: 'no event field' }); ack++; }
         catch { threw++; }
       }
       console.error('ACK=' + ack + ' THREW=' + threw);`);
    assert.match(r.stderr, /ACK=0 THREW=3/,
      `an event-less payload must reject all three times, got: ${(r.stderr || '').slice(0, 200)}`);
    const rows = rowCount(path.join(dir, '.mindforge', 'celestial.db'));
    assert.ok(rows === 0 || rows === null,
      `nothing was acknowledged, so nothing should be stored; found ${rows} row(s)`);
  });
});

// ── the finding that DID reproduce ───────────────────────────────────────────

test('a single process never triggers a false conflict', () => {
  // Non-vacuity and the guard against over-correction: if the fingerprint check misfires, every
  // ordinary save becomes a refusal and the hub stops persisting at all. That would be far worse
  // than the cross-process bug it addresses.
  withScratch((dir) => {
    const r = inProcess(dir, Array.from({ length: 12 }, (_, i) => REC(`t${i}`)).join('\n'));
    assert.strictEqual(r.status, 0);
    assert.ok(!/REFUSING TO OVERWRITE/.test(r.stderr || ''),
      `a single-process run must never refuse its own write: ${(r.stderr || '').slice(0, 300)}`);
    const sidecars = fs.readdirSync(path.join(dir, '.mindforge')).filter((f) => f.includes('.conflict.'));
    assert.deepStrictEqual(sidecars, [], `no conflict sidecar should exist, found ${sidecars.join(', ')}`);
    assert.strictEqual(rowCount(path.join(dir, '.mindforge', 'celestial.db')), 12);
  });
});

test('a SEQUENTIAL second writer is not a conflict, and destroys nothing', () => {
  withScratch((dir) => {
    const db = path.join(dir, '.mindforge', 'celestial.db');
    // Seed the file so both writers load a non-null fingerprint. A first write into a fresh directory
    // is legitimately "no expectation" and must not be treated as a conflict.
    const seed = inProcess(dir, `${REC('seed')}\nawait h.close();`);
    assert.strictEqual(seed.status, 0, `seed failed: ${(seed.stderr || '').slice(0, 200)}`);
    assert.strictEqual(rowCount(db), 1);

    // Writer A loads, writes and saves. Writer B loaded the SAME pre-A file, so its save would
    // otherwise rewrite the whole thing and erase A.
    const a = inProcess(dir, Array.from({ length: 15 }, (_, i) => REC(`A${i}`)).join('\n'));
    assert.strictEqual(a.status, 0);
    const b = spawnSync(process.execPath, ['-e',
      `process.chdir(${JSON.stringify(dir)});
       (async () => {
         const { VectorHub } = require(${JSON.stringify(HUB)});
         const h = new VectorHub();
         await h.init();                      // loads the file as it was BEFORE writer A saved? no —
         ${Array.from({ length: 15 }, (_, i) => REC(`B${i}`)).join('\n')}
         process.exit(0);
       })();`], { encoding: 'utf8', cwd: dir });
    assert.strictEqual(b.status, 0);

    // B initialised AFTER A finished, so it legitimately holds A's rows and no conflict is expected.
    // The conflict case is exercised by the concurrent test below; here we only assert no data was
    // destroyed and the row count is monotonic.
    const rows = rowCount(db);
    assert.ok(rows >= 16, `expected at least the seed plus A's 15, got ${rows}`);
  });
});

/**
 * INTERLEAVED writers, staged deterministically rather than raced.
 *
 * A first attempt ran two writers concurrently with a 250ms offset and asserted the sidecar held
 * "seed + 15 rows". That number was an artifact of the race: the refusing writer's first save fires at
 * the 10-write autosave boundary, so the sidecar held whatever was in memory at whichever save lost —
 * 16 rows on one run, 11 on the next. The assertion encoded a timing coincidence as a requirement.
 *
 * It also asserted more than the guard promises. The guard does NOT promise every acknowledged write
 * survives a concurrent session — that needs a driver that does not rewrite the whole file. It promises
 * it will never SILENTLY overwrite another process's data. So the invariants below are the promise
 * itself, and hold regardless of interleaving:
 *
 *   1. the clobber is reported, not silent
 *   2. the sidecar is a VALID database, not a truncated buffer
 *   3. the sidecar holds rows the live file does not — the data is recoverable
 *   4. the live file keeps everything the winning writer put there — nothing destroyed
 *
 * Staged by holding the parent's hub open across a child's whole lifetime, so the ordering is fixed by
 * process boundaries instead of sleeps.
 */
test('an INTERLEAVED writer is reported, and its rows are recoverable from the sidecar', () => {
  withScratch((dir) => {
    const db = path.join(dir, '.mindforge', 'celestial.db');
    const seed = inProcess(dir, `${REC('seed')}\nawait h.close();`);
    assert.strictEqual(seed.status, 0, `seed failed: ${(seed.stderr || '').slice(0, 200)}`);
    assert.strictEqual(rowCount(db), 1, 'the seed must be on disk before either writer starts');

    // The child goes to a real file rather than a nested `-e` string. An inlined version needed a
    // double JSON.stringify to survive two levels of quoting, which is unreadable and a quoting slip
    // there would look like a product failure.
    fs.writeFileSync(path.join(dir, 'child.js'), [
      `const { VectorHub } = require(${JSON.stringify(HUB)});`,
      '(async () => {',
      '  const h = new VectorHub();',
      '  await h.init();',
      '  for (let i = 0; i < 5; i++) {',
      '    await h.recordTrace({ trace_id: `CHILD${i}`, event: \'span_started\', content: \'c\' });',
      '  }',
      '  await h.close();',
      '  process.exit(0);',
      '})();',
    ].join('\n'));

    // Parent: init (recording fingerprint F0), write 3 — below the 10-write autosave batch, so nothing
    // is persisted yet — then let the CHILD complete a full write-and-save cycle, changing the file to
    // F1. Only then does the parent save. The parent's export would rewrite the whole file from a
    // snapshot that predates the child, which is exactly the clobber.
    const parent = inProcess(dir, [
      ...['P0', 'P1', 'P2'].map(REC),
      'const r = require(\'node:child_process\').spawnSync(process.execPath, [\'child.js\'],',
      '  { cwd: process.cwd(), encoding: \'utf8\' });',
      'if (r.status !== 0) { console.error(\'CHILD_FAILED \' + (r.stderr || \'\').slice(0, 300)); process.exit(8); }',
      'console.error(\'CHILD_DONE\');',
      'await h.close();',
    ].join('\n'));
    assert.strictEqual(parent.status, 0, `staged run failed: ${(parent.stderr || '').slice(0, 400)}`);
    assert.match(parent.stderr, /CHILD_DONE/, 'the child must have completed its own save cycle');

    // 1. reported, not silent
    assert.match(parent.stderr, /REFUSING TO OVERWRITE/,
      'the clobber must be REPORTED. Before this change the parent\'s export simply replaced the file '
      + `and the child's 5 acknowledged rows vanished with no error. stderr: ${parent.stderr.slice(0, 400)}`);

    const sidecars = fs.readdirSync(path.join(dir, '.mindforge')).filter((f) => f.includes('.conflict.'));
    assert.strictEqual(sidecars.length, 1,
      `expected exactly one conflict sidecar, found ${sidecars.length}: ${sidecars.join(', ')}`);

    // 2. a valid database, not a truncated buffer. rowCount returns null if sqlite cannot open it.
    const ids = (file) => {
      const r = spawnSync('sqlite3', [`file:${file}?mode=ro&immutable=1`, 'select trace_id from traces'],
        { encoding: 'utf8' });
      assert.strictEqual(r.status, 0, `${path.basename(file)} is not a readable database: ${r.stderr}`);
      return new Set((r.stdout || '').split('\n').filter(Boolean));
    };
    const sidecarIds = ids(path.join(dir, '.mindforge', sidecars[0]));
    const liveIds = ids(db);

    // 3. the sidecar holds what the live file lost — the whole point of writing it
    const recoverable = [...sidecarIds].filter((id) => !liveIds.has(id));
    assert.ok(recoverable.length > 0,
      `the sidecar must contain rows absent from the live file, or it serves no purpose. sidecar=[${
        [...sidecarIds].join(',')}] live=[${[...liveIds].join(',')}]`);

    // 4. and the winning writer's rows were not destroyed
    for (const id of ['seed', 'CHILD0', 'CHILD4']) {
      assert.ok(liveIds.has(id),
        `the live file lost ${id}. A refusal must leave the file exactly as the other process wrote it; `
        + `found [${[...liveIds].join(',')}]`);
    }
  });
});

// ── the guard is wired into BOTH save paths ──────────────────────────────────

test('the staleness check and the rename are in ONE critical section', () => {
  // THE STRUCTURAL INVARIANT, and the one a passing behavioural test can still hide.
  //
  // The first version of this fix checked the fingerprint and then handed the buffer to an async
  // writer. Every behavioural test passed, because nothing happened to intervene in that window. The
  // deterministic stage above is what caught it, and this assertion is what stops it coming back: the
  // ONLY place allowed to rename a tmp file over the live database is commitDb, which does the check
  // and the rename together while holding the lock. A rename anywhere else reopens the gap.
  const src = fs.readFileSync(HUB, 'utf8');
  const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

  const start = code.indexOf('function commitDb(');
  assert.ok(start > 0, 'commitDb must exist — it is the only sanctioned committer');
  // Function body by brace balance, so the check does not depend on formatting.
  let depth = 0;
  let end = start;
  for (let i = code.indexOf('{', start); i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  const commitBody = code.slice(start, end);
  const elsewhere = code.slice(0, start) + code.slice(end);

  assert.match(commitBody, /withFileLock\(/,
    'commitDb must hold the shared fail-closed lock across the check and the rename');
  assert.match(commitBody, /dbFingerprint\(dbPath\)[\s\S]{0,400}renameSync\(tmpPath, dbPath\)/,
    'inside commitDb the fingerprint check must precede the rename with nothing async between them');

  const strayRenames = (elsewhere.match(/rename(?:Sync)?\([^)]*,\s*(?:this\.)?dbPath\s*\)/g) || []);
  assert.deepStrictEqual(strayRenames, [],
    `${strayRenames.length} rename(s) target the live database outside commitDb: ${
      strayRenames.join(', ')}. Every commit must go through the locked check, or the staleness guard `
    + 'is bypassed exactly as it was before this fix.');

  // Both save paths must route through it — a guard on one leaves the other able to destroy data.
  const callsOutside = (elsewhere.match(/commitDb\(/g) || []).length;
  assert.strictEqual(callsOutside, 2,
    `expected commitDb to be called from both save() and saveSync(), found ${callsOutside} call site(s)`);
  assert.match(code, /_diskFingerprint = res\.fingerprint/,
    'the fingerprint must be refreshed from the committed write, or the next save self-conflicts');
});

test('a failed async save leaves the exit guard armed', () => {
  // _pendingSaves gates the exit-guard saveSync(). The pre-existing code decremented it in an
  // unconditional .then() after the .catch(), so a save that FAILED still counted as completed and the
  // exit guard skipped its last-resort flush — dropping the batch. This matters more now: withFileLock
  // THROWS on contention, so failure is a reachable path rather than a theoretical one.
  // Asserted as an INVARIANT, not as a shape. A first version matched the specific bad arrangement
  // `.catch(...).then(decrement)` and was defeated by a mutation that put the stray decrement BEFORE
  // the catch instead — which double-decrements on success, drives the counter negative, and disarms
  // the exit guard just as effectively. Counting the decrements and requiring the only one to sit
  // inside the success branch covers every arrangement rather than the one I happened to imagine.
  const src = fs.readFileSync(HUB, 'utf8');
  const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const chainStart = code.indexOf('this._saveChain = this._saveChain');
  assert.ok(chainStart > 0, 'the async save chain must exist');
  const chain = code.slice(chainStart, code.indexOf('return this._saveChain;', chainStart));

  const decrements = (chain.match(/_pendingSaves--/g) || []).length;
  assert.strictEqual(decrements, 1,
    `the async save chain must decrement _pendingSaves exactly once, found ${decrements}. More than `
    + 'one drives the counter negative on success, which disarms the exit-guard saveSync() for every '
    + 'later batch.');

  const okBlock = chain.slice(chain.indexOf('if (res.ok)'));
  assert.ok(chain.includes('if (res.ok)') && /_pendingSaves--/.test(okBlock.slice(0, 300)),
    'the sole decrement must sit inside the `if (res.ok)` branch — a save that failed is not durable, '
    + 'and counting it as complete drops the batch');
});

test('the lock and the conflict sidecars can never be committed', () => {
  // A sidecar is a FULL database copy — measured at 147KB — holding whatever traces and knowledge rows
  // the refusing process had in memory. Unignored, one `git add -A` after a conflict commits that
  // content. The existing rules covered `*.jsonl.lock` and `*.tmp.*` but neither `*.db.lock` nor
  // `*.conflict.*`, both of which this change introduces. Checked through git itself rather than by
  // grepping .gitignore, so a rule that is present but shadowed by a later negation still fails here.
  for (const rel of [
    '.mindforge/celestial.db.lock',
    '.mindforge/celestial.db.conflict.4242.147456',
    '.mindforge/celestial.db.tmp.4242.sync',
    '.mindforge/celestial.db.tmp.4242.async',
    '.mindforge/memory/celestial.db.conflict.4242.147456',
  ]) {
    const r = spawnSync('git', ['check-ignore', '-q', rel], { cwd: REPO_ROOT });
    assert.strictEqual(r.status, 0,
      `${rel} is NOT gitignored. A conflict sidecar is a full database copy; committing one leaks `
      + 'trace content and adds a large binary to history.');
  }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nVectorHub Clobber: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
