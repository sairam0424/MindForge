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
    const auditId = 'test-audit-001';
    const snapshotDir = TemporalHub.captureState(auditId, { task: 'Verification Test' });
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
    const rollbackSuccess = TemporalHub.rollbackTo(auditId);
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

    console.log('\n✨ ALL TEMPORAL TESTS PASSED ✨');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
