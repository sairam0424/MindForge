/**
 * MindForge v8 Autonomous Skill Evolution (ASE) Verification Test
 * Tests the self-improvement loop: Trace Mining -> Synthesis -> Skill Persistence.
 */
const skillEvolver = require('../bin/engine/skill-evolver');
const vectorHub = require('../bin/memory/vector-hub');
const semanticHub = require('../bin/memory/semantic-hub');

async function runTest() {
  console.log('[TEST] Starting v8 Autonomous Skill Evolution Verification...');

  try {
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
            console.error('❌ Skill was synthesized but not found in the Database!');
        }
    } else {
        console.error('❌ ASE failed to synthesize a skill from the golden cluster.');
    }

  } catch (err) {
    console.error(`[TEST] Error: ${err.message}`);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTest();
