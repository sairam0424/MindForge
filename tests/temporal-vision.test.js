/**
 * MindForge v3 — Temporal Vision Test Suite
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const TemporalHub = require('../bin/engine/temporal-hub');
const HindsightInjector = require('../bin/hindsight-injector');

const TEST_PLAN_DIR = path.join(process.cwd(), '.planning');
const HISTORY_DIR   = path.join(TEST_PLAN_DIR, 'history');

// Mock setup
if (!fs.existsSync(TEST_PLAN_DIR)) fs.mkdirSync(TEST_PLAN_DIR, { recursive: true });

async function runTests() {
  console.log('🧪 Starting Temporal Vision Verification...\n');

  try {
    // 1. Create a dummy file in .planning
    const testFile = path.join(TEST_PLAN_DIR, 'TEMPORAL-TEST.md');
    fs.writeFileSync(testFile, 'Initial State: $T_0$');
    console.log('✅ Created test file in .planning');

    // 2. Capture state
    const auditId = 'a0b1c2d3-e4f5-6789-abcd-ef0123456789';
    const snapshotDir = await TemporalHub.captureState(auditId, { task: 'Verification Test' });
    assert(fs.existsSync(snapshotDir), 'Snapshot directory should exist');
    assert(fs.existsSync(path.join(snapshotDir, 'TEMPORAL-TEST.md')), 'Snapshot file should exist');
    console.log('✅ TemporalHub.captureState works');

    // 3. Modify original file
    fs.writeFileSync(testFile, 'Modified State: $T_1$');
    console.log('✅ Modified original file');

    // 4. Verify History
    const history = TemporalHub.getHistory();
    assert(history.length > 0, 'History should not be empty');
    assert(history[0].id === auditId, 'Latest history ID should match');
    console.log('✅ TemporalHub.getHistory works');

    // 5. Rollback
    const rollbackSuccess = await TemporalHub.rollbackTo(auditId);
    assert(rollbackSuccess === true, 'Rollback should return success');
    const content = fs.readFileSync(testFile, 'utf8');
    assert(content === 'Initial State: $T_0$', 'Rollback did not restore file content correctly');
    console.log('✅ TemporalHub.rollbackTo works');

    // 6. Hindsight Injection
    const injectResult = await HindsightInjector.inject(auditId, 'Recovering from $T_1$ failure');
    assert(injectResult.success === true, 'Hindsight injection should succeed');
    assert(fs.existsSync(path.join(HISTORY_DIR, injectResult.event.id)), 'New snapshot for injection should exist');
    console.log('✅ HindsightInjector.inject works');

    // Cleanup
    // fs.unlinkSync(testFile);
    // Note: We leave history for manual inspection if needed, or implement cleanup test.

    // ── `temporal cleanup` must actually delete ────────────────────────────────
    //
    // THE DEFECT. The whole cleanup branch was:
    //
    //     console.log('🧹 Cleaning up old temporal snapshots...');
    //     // Logic for cleanup (e.g., keep last 100)
    //     console.log('✅ Cleanup complete.');
    //
    // It printed success and deleted nothing, every time, while .planning/history/ grew without
    // bound. The collector had existed all along (TemporalHub.gc, already used by auto-runner.js and
    // the 10.7.0 migration) — the CLI simply never called it.
    //
    // SPAWNED WITH A TEMP CWD, never run in-process. TemporalHub.gc resolves its target as
    // `path.join(process.cwd(), '.planning', 'history')` and recursively deletes directories inside
    // it. This repository currently holds 50 real snapshots there, so an in-process call from a test
    // would delete the developer's own history — the rest of this file operates on the live
    // .planning/ deliberately, which is exactly why this one must not.
    {
      const { spawnSync } = require('child_process');
      const os = require('os');
      const CLI = path.join(__dirname, '..', 'bin', 'engine', 'temporal-cli.js');
      const work = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-temporal-gc-')));
      const hist = path.join(work, '.planning', 'history');
      try {
        fs.mkdirSync(hist, { recursive: true });
        // Three current, three backdated past the 30-day policy.
        for (const n of ['fresh-1', 'fresh-2', 'fresh-3']) {
          fs.mkdirSync(path.join(hist, n));
          fs.writeFileSync(path.join(hist, n, 'snap.json'), '{}');
        }
        const old = Date.now() - 60 * 24 * 60 * 60 * 1000;
        for (const n of ['old-1', 'old-2', 'old-3']) {
          fs.mkdirSync(path.join(hist, n));
          fs.writeFileSync(path.join(hist, n, 'snap.json'), '{}');
          fs.utimesSync(path.join(hist, n), new Date(old), new Date(old));
        }
        assert.strictEqual(fs.readdirSync(hist).length, 6, 'fixture must start with 6 snapshots');

        const run = (args) => spawnSync(process.execPath, [CLI, ...args],
          { cwd: work, encoding: 'utf8', timeout: 60000,
            env: { PATH: process.env.PATH, HOME: work } });

        // --dry-run must change NOTHING. A destructive verb needs a way to look first.
        const dry = run(['cleanup', '--dry-run']);
        assert.match(dry.stdout, /DRY RUN/, `--dry-run must say so: ${dry.stdout}`);
        assert.strictEqual(fs.readdirSync(hist).length, 6,
          '--dry-run deleted snapshots; it must only report the plan');

        // And the real thing must delete exactly the expired ones.
        const applied = run(['cleanup']);
        const left = fs.readdirSync(hist).sort();
        assert.deepStrictEqual(left, ['fresh-1', 'fresh-2', 'fresh-3'],
          'cleanup must remove the three expired snapshots and keep the three current ones, got: '
          + `${left.join(', ')}\n${applied.stdout}${applied.stderr}`);
        assert.match(applied.stdout, /Deleted:\s+3/,
          `it must report the real count, not a fixed success line: ${applied.stdout}`);

        // NON-VACUITY, and the shape of the original bug: with nothing to delete it must report ZERO
        // rather than announcing a completed cleanup. "✅ Cleanup complete." over 0 deletions is what
        // made the no-op invisible for so long.
        const again = run(['cleanup']);
        assert.match(again.stdout, /Deleted:\s+0/,
          `a second run has nothing to remove and must say 0: ${again.stdout}`);
        assert.ok(!/✅ Cleanup complete/.test(again.stdout),
          'the old unconditional success line is back');
      } finally { fs.rmSync(work, { recursive: true, force: true }); }
    }
    console.log('  ✅ temporal cleanup deletes expired snapshots and reports the real count');

    console.log('\n✨ ALL TEMPORAL TESTS PASSED ✨');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
