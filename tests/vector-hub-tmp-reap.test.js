/**
 * Guards against VectorHub leaving a complete copy of the database on disk every time a process
 * exits with a save in flight.
 *
 * THE DEFECT. save() is a two-step chain: writeTmpDurable() writes and fsyncs
 * `<db>.tmp.<pid>.async`, then commitDb() renames it into place. The rename is deliberately the
 * last step — it has to share a critical section with the staleness check, or the guard is
 * bypassable. But a 'exit' handler can only run synchronous code, so a process that exits with a
 * save pending abandons the .then(): the microtask never runs, commitDb never renames, and the tmp
 * file stays. Nothing anywhere deleted it.
 *
 * Measured in this repository before the fix: 176 orphaned `celestial.db.tmp.<pid>.async` files
 * totalling 1.8 GB, against a live database of 10.6 MB. Every orphan is a full export, so the
 * project directory grew by roughly 11 MB per abandoned exit.
 *
 * The trigger is ordinary. nexus-tracer.js is the framework-wide tracing singleton, so any command
 * that traces and then exits hits the window, and bin/migrations/v9-unified-memory.js calls
 * process.exit() without ever calling close().
 *
 * WHY THIS WAS MISSED. The leak was already half-noticed: tests/vector-hub-clobber.test.js asserts
 * these files are GITIGNORED, so the disclosure risk of committing a database copy was handled
 * while the accumulation was not. The contract was "don't commit them", never "don't create them".
 *
 * WHAT IS ASSERTED HERE, and why each one is needed:
 *   1. no orphan survives an abandoned exit          — the leak itself
 *   2. the writes still persist                      — or "delete the tmp file" passes by
 *                                                      discarding data, which is worse than the leak
 *   3. a FAILED save KEEPS its tmp                   — the reap is gated on confirmed durability;
 *                                                      on failure the tmp may be the only copy
 *   4. another pid's orphan is never touched         — scoping. A glob sweep would delete a live
 *                                                      concurrent process's in-flight export
 *
 * Asserted by running real child processes and looking at the real directory, because the property
 * is "no file is left behind after the process is gone" and nothing observable from inside one
 * process establishes that.
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

/**
 * A probe that schedules an async save and then exits WITHOUT close() — what a CLI doing
 * process.exit() after its work does. `_batchSize` is 10 and run() calls _autosave() each time,
 * so ten inserts schedule at least one async save.
 *
 * It prints `pendingSaves=N`, which the tests use for non-vacuity: if N were 0, no save was in
 * flight, the leak window was never opened, and "no orphan" would prove nothing.
 */
const PROBE = `
const path = require('path');
const { VectorHub } = require(process.argv[2]);
if (process.argv[3] === 'break-rename') {
  // Make commitDb throw so saveSync() fails. Same fs module object the hub holds, so assigning
  // the property is enough.
  require('fs').renameSync = () => { throw new Error('probe: rename disabled'); };
}
(async () => {
  const hub = new VectorHub(path.join(process.cwd(), '.mindforge', 'celestial.db'));
  await hub.init();
  hub.run('CREATE TABLE IF NOT EXISTS probe (id INTEGER PRIMARY KEY, v TEXT)');
  for (let i = 0; i < 10; i++) hub.run('INSERT INTO probe (v) VALUES (?)', ['row ' + i]);
  console.log('[probe] pid=' + process.pid + ' pendingSaves=' + hub._pendingSaves);
  process.exit(0);
})().catch((e) => { console.error('[probe] FAILED: ' + e.message); process.exit(9); });
`;

/** A scratch project with a confined HOME, and a probe script inside it. */
function makeProject() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-tmpreap-')));
  // A THROWAWAY HOME, never the operator's: installer-core resolves its registry under
  // os.homedir(), which honours $HOME on POSIX, and this suite has polluted a real
  // ~/.mindforge before. tests/no-home-leak.test.js bans the pattern repo-wide.
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-tmpreap-home-')));
  fs.mkdirSync(path.join(dir, '.mindforge'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'probe.js'), PROBE);
  return { dir, home };
}

function runProbe({ dir, home }, mode) {
  return spawnSync(process.execPath, ['probe.js', HUB, mode || 'normal'], {
    cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home },
  });
}

const tmpExports = (dir) => fs.readdirSync(path.join(dir, '.mindforge'))
  .filter((f) => /^celestial\.db\.tmp\./.test(f));

const cleanup = (p) => {
  fs.rmSync(p.dir, { recursive: true, force: true });
  fs.rmSync(p.home, { recursive: true, force: true });
};

test('a process that exits with a save in flight leaves NO orphaned tmp export', () => {
  const p = makeProject();
  try {
    const RUNS = 3;
    for (let i = 0; i < RUNS; i++) {
      const r = runProbe(p);
      assert.strictEqual(r.status, 0,
        `probe run ${i + 1} did not exit cleanly: ${(r.stderr || '').slice(-300)}`);

      // NON-VACUITY. Without a save actually in flight, the leak window never opens and a clean
      // directory would prove nothing at all.
      const m = /pendingSaves=(\d+)/.exec(r.stdout || '');
      assert.ok(m, `probe did not report its pending-save count. stdout: ${r.stdout}`);
      assert.ok(Number(m[1]) > 0,
        `run ${i + 1} exited with pendingSaves=${m[1]}, so no async save was outstanding and this `
        + 'test exercised nothing. The probe must schedule a save for the assertion to mean anything.');
    }

    assert.deepStrictEqual(tmpExports(p.dir), [],
      `${tmpExports(p.dir).length} tmp export(s) survived ${RUNS} abandoned exits: `
      + `${tmpExports(p.dir).join(', ')}. Each is a FULL copy of the database. Measured in this `
      + 'repository before the fix: 176 such files, 1.8 GB, against a 10.6 MB live database.');
  } finally { cleanup(p); }
});

test('the reap does not buy a clean directory by discarding acknowledged writes', () => {
  // Deleting the tmp file unconditionally would satisfy the test above while losing data — a
  // strictly worse defect than the leak. So assert the rows are actually there afterwards.
  const p = makeProject();
  try {
    const RUNS = 3;
    for (let i = 0; i < RUNS; i++) assert.strictEqual(runProbe(p).status, 0, `run ${i + 1} failed`);

    const read = spawnSync(process.execPath, ['-e', `
      const { VectorHub } = require(${JSON.stringify(HUB)});
      const path = require('path');
      (async () => {
        const h = new VectorHub(path.join(process.cwd(), '.mindforge', 'celestial.db'));
        await h.init();
        console.log('ROWS=' + h.query('SELECT COUNT(*) c FROM probe')[0].c);
        await h.close();
      })();`], { cwd: p.dir, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: p.home } });

    const m = /ROWS=(\d+)/.exec(read.stdout || '');
    assert.ok(m, `could not read the database back: ${(read.stderr || '').slice(-300)}`);
    assert.strictEqual(Number(m[1]), RUNS * 10,
      `expected ${RUNS * 10} rows after ${RUNS} runs of 10 inserts, found ${m[1]}. The exit guard `
      + 'must still persist the batch — reaping the tmp export must not cost durability.');
  } finally { cleanup(p); }
});

test('a FAILED save KEEPS its tmp export — the reap is gated on confirmed durability', () => {
  // This is the assertion that stops the fix from becoming the very data loss the module exists to
  // prevent. When commitDb throws, the abandoned export may be the only copy of those rows on
  // disk. Accumulating one file on a failed write is the correct trade against destroying it.
  const p = makeProject();
  try {
    const r = runProbe(p, 'break-rename');
    assert.strictEqual(r.status, 0, `probe did not exit cleanly: ${(r.stderr || '').slice(-300)}`);

    const left = tmpExports(p.dir);
    assert.ok(left.length > 0,
      'with renameSync throwing, saveSync() cannot persist and must return false, so the tmp '
      + 'export has to be LEFT for a human. Nothing survived, which means the reap ran on an '
      + 'unconfirmed save and deleted the only copy of those rows.');
  } finally { cleanup(p); }
});

test('an export belonging to a DIFFERENT pid is never touched', () => {
  // Scoping. A glob sweep of `*.async` would delete the in-flight export of a concurrent process
  // — reintroducing cross-process data loss under the banner of cleaning up. The reap must address
  // exactly one file: its own pid's.
  const p = makeProject();
  try {
    // A pid this probe cannot have. Real, non-empty content so a survivor is unambiguous.
    const foreign = path.join(p.dir, '.mindforge', 'celestial.db.tmp.999999.async');
    fs.writeFileSync(foreign, 'not-a-real-db-but-must-not-be-deleted');

    const r = runProbe(p);
    assert.strictEqual(r.status, 0, `probe did not exit cleanly: ${(r.stderr || '').slice(-300)}`);

    assert.ok(fs.existsSync(foreign),
      'the reap deleted another pid\'s tmp export. That file may be a live process\'s in-flight '
      + 'write, and removing it is exactly the silent cross-process loss commitDb refuses to '
      + 'commit. Reap only `<db>.tmp.<own pid>.<suffix>`, never a glob.');
    assert.strictEqual(fs.readFileSync(foreign, 'utf8'), 'not-a-real-db-but-must-not-be-deleted',
      'the foreign export survived but its contents changed');

    // And its own orphan is still gone — otherwise this test would pass by the reap doing nothing.
    assert.deepStrictEqual(tmpExports(p.dir), [path.basename(foreign)],
      `expected only the foreign export to remain, found: ${tmpExports(p.dir).join(', ')}`);
  } finally { cleanup(p); }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nVectorHub Tmp Reap: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
