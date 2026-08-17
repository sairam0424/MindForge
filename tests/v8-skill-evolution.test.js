/**
 * MindForge v8 Autonomous Skill Evolution (ASE) Verification Test
 * Tests the self-improvement loop: Trace Mining -> Synthesis -> Skill Persistence.
 */
'use strict';

const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// CONF-A (same mechanism as tests/v8-mesh-sync.test.js): VectorHub resolves dbPath from
// process.cwd() at construction (bin/memory/vector-hub.js:150), so this suite used to
// write its synthesized 'Synthesized Skill' rows and traces straight into the developer's
// real .mindforge/celestial.db — where they accumulate across runs and can make
// retrieval/eval suites non-deterministic. SemanticHub compounds it with cwd-relative
// paths ('.mindforge/memory', bin/memory/semantic-hub.js:13-15). Fix: chdir into a
// throwaway mirror root and require the engine modules only AFTER the chdir; SkillEvolver
// reads its ASE thresholds via configManager in its constructor, so require order matters.
// realpathSync: process.cwd() reports the resolved /private/var/... on macOS while
// os.tmpdir() returns /var/..., which would false-positive the assertion below.
const MIRROR = fsSync.realpathSync(fsSync.mkdtempSync(path.join(os.tmpdir(), 'mf-v8-ase-')));
const ORIGINAL_CWD = process.cwd();
const MIRROR_DB = path.join(MIRROR, '.mindforge', 'celestial.db');

fsSync.mkdirSync(path.join(MIRROR, '.mindforge', 'memory'), { recursive: true });
// Seed only the ASE knobs SkillEvolver reads (bin/engine/skill-evolver.js:17-18) so the
// run exercises the shipped thresholds rather than the in-code fallbacks.
fsSync.writeFileSync(
  path.join(MIRROR, '.mindforge', 'config.json'),
  JSON.stringify({ ase: { min_success_count: 3, max_drift_threshold: 0.1, auto_verify: false } }, null, 2)
);
process.chdir(MIRROR);

const skillEvolver = require('../bin/engine/skill-evolver');
const vectorHub = require('../bin/memory/vector-hub');

async function runTest() {
  console.log('[TEST] Starting v8 Autonomous Skill Evolution Verification...');

  try {
    // Isolation self-check, deliberately BEFORE init(): without it the chdir above could
    // be removed and this suite would silently resume polluting the real celestial.db
    // while still reporting PASS. Reading vectorHub.dbPath instantiates the lazy
    // singleton but touches no filesystem, so a regression aborts before any write.
    if (vectorHub.dbPath !== MIRROR_DB) {
      throw new Error(`vectorHub escaped the mirror root: ${vectorHub.dbPath}`);
    }

    await vectorHub.init();
    
    // 1. Seed Golden Traces (Success Cluster)
    console.log('[TEST] Seeding Golden Trace cluster...');
    const clusterId = `cluster_${Math.random().toString(36).substr(2, 5)}`;
    
    for (let i = 1; i <= 3; i++) {
        await vectorHub.recordTrace({
            id: `ase_golden_${clusterId}_${i}`,
            trace_id: `tr_ase_${clusterId}`,
            event: 'reasoning_trace',
            agent: 'mf-analyzer',
            content: 'Optimizing the celestial mesh for high-frequency synchronization.',
            drift_score: 0.05 // Well within ASE threshold
        });
    }

    // 2. Seed Noise (Low confidence traces)
    console.log('[TEST] Seeding noise traces...');
    await vectorHub.recordTrace({
        id: `ase_noise_${clusterId}`,
        trace_id: `tr_ase_noise_${clusterId}`,
        event: 'reasoning_trace',
        agent: 'mf-analyzer',
        content: 'Failing to sync... retry policy mismatch.',
        drift_score: 0.85 // High drift
    });

    // 3. Run Evolution
    console.log('[TEST] Triggering ASE Evolution...');
    const evolved = await skillEvolver.evolve();

    console.log(`[TEST] Synthesized ${evolved.length} skills.`);

    // 4. Verification
    if (evolved.length >= 1) {
        const newSkill = evolved[0];
        console.log(`[TEST] Verifying unique skill synthesis: ${newSkill.name}`);
        
        const skillsInDb = vectorHub.query(
            'SELECT * FROM skills WHERE skill_id = ?',
            [newSkill.id]
        );
        
        if (skillsInDb.length > 0) {
            console.log('✅ MindForge v8 Autonomous Skill Evolution Passed.');
        } else {
            // Non-zero code required: logging alone let `finally { process.exit(0) }` report
            // ✓ PASS on both of this suite's failure branches.
            console.error('❌ Skill was synthesized but not found in the Database!');
            process.exitCode = 1;
        }
    } else {
        console.error('❌ ASE failed to synthesize a skill from the golden cluster.');
        process.exitCode = 1;
    }

  } catch (err) {
    console.error(`[TEST] Error: ${err.message}`);
    process.exitCode = 1;
  } finally {
    // Restore cwd before teardown — rmSync on the process's own cwd leaves an
    // unresolvable cwd behind on some platforms.
    process.chdir(ORIGINAL_CWD);
    // The mirror must be removed from an 'exit' listener, NOT here: VectorHub.init()
    // installs a process.once('exit') flush whose saveSync() -> _ensureDir() re-creates
    // .mindforge/ and re-writes celestial.db, so an inline rmSync would leak a fresh
    // multi-MB temp directory every run. 'exit' listeners fire in registration order and
    // init() already ran, so this one is guaranteed to run after that flush.
    process.on('exit', () => {
      fsSync.rmSync(MIRROR, { recursive: true, force: true });
    });
    // Forced exit retained (sql.js/WASM holds handles open) but it must propagate the outcome
    // rather than overwrite it.
    process.exit(process.exitCode || 0);
  }
}

runTest();
