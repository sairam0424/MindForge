/**
 * Guards auto-runner.executeWave against fabricating completions.
 *
 * THE DEFECT. The per-task body was, in full:
 *
 *     try {
 *       this.writeAudit({ event: 'task_started',   ... });
 *       this.writeAudit({ event: 'task_completed', ... duration_ms: Date.now() - taskStart });
 *       this.completedTasks.add(task.id);
 *       return { taskId: task.id, status: 'fulfilled' };
 *     } catch (err) { ... }
 *
 * Nothing between the two writes. No dispatch. Consequences, all three measurable:
 *   1. every task recorded as completed, with duration_ms ~0;
 *   2. the catch block unreachable, because nothing in the try could throw;
 *   3. the hash-chained audit log — the one component of this project that is genuinely
 *      production-grade and independently verifiable — became a tamper-evident record of false
 *      statements. That is worse than no record: it survives `node bin/verify-audit.js` and carries
 *      the authority of the chain.
 *
 * WHAT WAS AND WAS NOT TRUE, measured rather than inherited from the audit that raised it:
 *   - `grep -c '"event":"task_completed"' .planning/AUDIT.jsonl` -> 0 across a 3056-entry chain.
 *     Also 0 task_started, 0 wave_started, 0 task_failed. The live log was NOT contaminated.
 *   - No module under bin/ requires auto-runner; every repo-wide match is a comment, a test, or an
 *     "extracted from" note, and bin/mindforge-cli.js does not reference it.
 * So the defect was LATENT: the code would have lied the first time anything invoked it, and nothing
 * had. The finding as originally written ("the audit log records task_completed for work that never
 * executed") describes the code's behaviour, not the log's contents. Worth stating precisely, because
 * "your audit trail is corrupt" and "your audit trail would be corrupted if you used this path" call
 * for different responses.
 *
 * THE FIX IS A REFUSAL, not a default. wave-executor.js:133 defaults its own `executor` to
 * `async () => {}` — a silent no-op — which is the same shape of mistake one layer down. So
 * taskExecutor is deliberately NOT defaulted: absent, the wave aborts with ONE honest entry.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const AUTO_RUNNER = path.join(REPO_ROOT, 'bin', 'autonomous', 'auto-runner.js');

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

/**
 * auto-runner resolves .planning/ from process.cwd() at construction, so each case runs in its own
 * scratch dir. cwd is restored in the finally block — a leaked chdir would make every later test in
 * this file write into the previous case's audit log.
 */
async function inScratch(fn) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-wavedispatch-')));
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
  const prev = process.cwd();
  process.chdir(dir);
  try {
    // Required fresh per case: the module caches paths off cwd at require time.
    delete require.cache[require.resolve(AUTO_RUNNER)];
    const AutoRunner = require(AUTO_RUNNER);
    return await fn(dir, AutoRunner);
  } finally {
    process.chdir(prev);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function auditEvents(dir) {
  const file = path.join(dir, '.planning', 'AUDIT.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return { event: '<unparseable>' }; }
  });
}

function makeRunner(AutoRunner, opts, taskIds) {
  const r = new AutoRunner({ phase: '1', ...opts });
  r.waves = [{ tasks: taskIds.map((id) => ({ id, name: id.toUpperCase() })) }];
  r.currentWaveIndex = 0;
  return r;
}

// ── the refusal ──────────────────────────────────────────────────────────────

test('with NO executor the wave aborts and writes zero completions', async () => {
  await inScratch(async (dir, AutoRunner) => {
    const r = makeRunner(AutoRunner, {}, ['t1', 't2', 't3']);
    await assert.rejects(() => r.executeWave({}), /no task executor wired/,
      'a wave that cannot dispatch must throw, not resolve');

    const events = auditEvents(dir);
    const completed = events.filter((e) => e.event === 'task_completed');
    assert.deepStrictEqual(completed, [],
      `${completed.length} task_completed entries were written for a wave that ran nothing. This is ` +
      'the defect: a hash-chained, verifiable record of statements that are false.');
    assert.strictEqual(events.filter((e) => e.event === 'task_started').length, 0,
      'not even task_started may be written — a started-never-finished task is still a claim about work');

    const aborted = events.filter((e) => e.event === 'wave_aborted');
    assert.strictEqual(aborted.length, 1,
      `expected exactly ONE wave_aborted entry, got ${aborted.length}. One honest entry replaces N ` +
      'false ones; silence would be almost as bad, because then nothing records the refusal.');
    assert.match(aborted[0].reason, /no task executor/i, 'the entry must say WHY it aborted');
    assert.strictEqual(aborted[0].task_count, 3, 'and how many tasks were affected');
  });
});

test('completedTasks is not advanced by a wave that ran nothing', async () => {
  // The second half of the fabrication: the old code also added every task id to completedTasks, so
  // a subsequent hasNextWave() reported the wave finished.
  await inScratch(async (dir, AutoRunner) => {
    const r = makeRunner(AutoRunner, {}, ['t1', 't2']);
    await r.executeWave({}).catch(() => {});
    assert.strictEqual(r.completedTasks.size, 0,
      `completedTasks holds ${r.completedTasks.size} id(s) after a wave that dispatched nothing — ` +
      'the runner would then believe the wave was done');
  });
});

// ── the dispatch ─────────────────────────────────────────────────────────────

test('with an executor every task is dispatched exactly once', async () => {
  await inScratch(async (dir, AutoRunner) => {
    const seen = [];
    const r = makeRunner(AutoRunner, { taskExecutor: async (t) => { seen.push(t.id); } }, ['t1', 't2', 't3']);
    await r.executeWave({});
    assert.deepStrictEqual(seen.sort(), ['t1', 't2', 't3'],
      `executor saw ${JSON.stringify(seen)} — every pending task must be dispatched exactly once`);
    assert.strictEqual(r.completedTasks.size, 3);
  });
});

test('duration_ms reflects real elapsed work, not zero', async () => {
  // The tell that distinguished the fabrication from real execution: every duration was ~0ms because
  // the two writes were adjacent. A test asserting only "task_completed exists" would have passed
  // against the broken code.
  const DELAY = 25;
  await inScratch(async (dir, AutoRunner) => {
    const r = makeRunner(AutoRunner, {
      taskExecutor: async () => { await new Promise((s) => setTimeout(s, DELAY)); },
    }, ['t1', 't2']);
    await r.executeWave({});
    const completed = auditEvents(dir).filter((e) => e.event === 'task_completed');
    assert.strictEqual(completed.length, 2);
    for (const e of completed) {
      assert.ok(e.duration_ms >= DELAY - 5,
        `duration_ms=${e.duration_ms} for a task that slept ${DELAY}ms. A near-zero duration means ` +
        'task_completed was written without waiting for the work.');
    }
  });
});

test('a throwing executor is recorded as FAILED, and the catch is finally reachable', async () => {
  // Before the fix the catch block could not execute, because nothing in the try could throw. So
  // task_failed was dead code and a real failure would have been recorded as a completion.
  await inScratch(async (dir, AutoRunner) => {
    const r = makeRunner(AutoRunner, {
      taskExecutor: async (t) => { if (t.id === 't2') throw new Error('boom'); },
    }, ['t1', 't2', 't3']);
    await r.executeWave({}).catch(() => {});

    const events = auditEvents(dir);
    const failedIds = events.filter((e) => e.event === 'task_failed').map((e) => e.task_id);
    const doneIds = events.filter((e) => e.event === 'task_completed').map((e) => e.task_id);
    assert.deepStrictEqual(failedIds, ['t2'],
      `expected t2 to be recorded failed, got ${JSON.stringify(failedIds)}`);
    assert.ok(!doneIds.includes('t2'),
      't2 threw, so it must NOT also appear as completed — that would be the original defect ' +
      'reappearing in a narrower form');
    assert.ok(!r.completedTasks.has('t2'), 'a failed task must not be marked complete');
    assert.match(events.find((e) => e.event === 'task_failed').error, /boom/,
      'the recorded error must be the real one, not a placeholder');
  });
});

// ── the shape of the fix ─────────────────────────────────────────────────────

test('taskExecutor is NOT silently defaulted to a no-op', async () => {
  // wave-executor.js:133 does `const { executor = async () => {} } = context`, which is how a wave
  // came to report every task fulfilled while dispatching nothing. Defaulting here would rebuild
  // exactly that. Assert the absence of a default rather than trusting the code to stay honest.
  const src = fs.readFileSync(AUTO_RUNNER, 'utf8');
  const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  // Assert the STRICT FORM is present, rather than trying to enumerate every bad one. The first
  // version of this check tested for `taskExecutor = async () =>` and therefore missed
  // `options.taskExecutor || (async () => {})` — the realistic way someone reintroduces the default.
  // A negative list only catches the variants its author happened to imagine; pinning the one
  // acceptable shape fails on all of them.
  assert.match(code, /this\.taskExecutor\s*=\s*typeof options\.taskExecutor === 'function'\s*\?\s*options\.taskExecutor\s*:\s*null/,
    'the constructor must assign taskExecutor via the strict typeof-ternary, so ANY defaulting form ' +
    '(||, ??, or a direct function literal) fails this test rather than only the ones enumerated here');
  assert.ok(!/taskExecutor\s*(=|\|\||\?\?)\s*\(?async/.test(code),
    'taskExecutor must not be defaulted to a no-op — an absent executor must abort the wave');
  assert.match(code, /typeof this\.taskExecutor !== 'function'/,
    'executeWave must explicitly check for a callable executor before writing any task event');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nWave Executor Dispatch: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
