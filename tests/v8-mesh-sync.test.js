/**
 * MindForge v8 — Federated Mesh Synthesis (FMS) Verification Test
 * Tests cross-project knowledge sharing and secure bundle import.
 */
const meshSyncer = require('../bin/engine/mesh-syncer');
const vectorHub = require('../bin/memory/vector-hub');
const ztaiManager = require('../bin/governance/ztai-manager');
const configManager = require('../bin/governance/config-manager');
const path = require('node:path');
const fs = require('node:fs/promises');

async function runTest() {
  console.log('[TEST] Starting v8 Federated Mesh Synthesis Verification...');

  try {
    await vectorHub.init();
    
    // 1. Provision Node Alpha Identity (Tier 3)
    console.log('[TEST] Provisioning Node Alpha identity...');
    const alphaDid = await ztaiManager.registerAgent('mf-analyzer', 3);
    configManager.set('governance.active_did', alphaDid);
    configManager.set('mesh.node_id', 'alpha-node');

    // 2. Seed Alpha Reasoning Data
    console.log('[TEST] Seeding Alpha reasoning data...');
    const alphaTraceId = `tr_alpha_${Math.random().toString(36).substr(2, 5)}`;
    await vectorHub.recordTrace({
        id: `alpha_seeding_${Math.random().toString(36).substr(2, 5)}`,
        trace_id: alphaTraceId,
        event: 'reasoning_trace',
        agent: 'mf-analyzer',
        content: 'Alpha node optimization sequence.',
        drift_score: 0.1
    });

    // 3. Export Bundle from Alpha
    console.log('[TEST] Exporting bundle from Alpha...');
    const bundlePath = path.join(process.cwd(), '.mindforge', 'alpha-bundle.mfb');
    await meshSyncer.exportBundle(bundlePath);

    // 4. Provision Node Beta Identity
    console.log('[TEST] Provisioning Node Beta identity...');
    const betaDid = await ztaiManager.registerAgent('mf-synthesizer', 3);
    configManager.set('governance.active_did', betaDid);
    configManager.set('mesh.node_id', 'beta-node');

    // 5. Import Bundle into Beta
    console.log('[TEST] Importing bundle into Beta...');
    await meshSyncer.importBundle(bundlePath);

    // 6. Verification of Cross-Node Intelligence
    const results = vectorHub.query(
        'SELECT * FROM traces WHERE mesh_node_id = ?',
        ['alpha-node']
    );

    if (results.length > 0) {
        process.stdout.write('✅ MindForge v8 Federated Mesh Synthesis Passed.\n');
        console.log(`[TEST] Successfully verified ${results.length} traces imported with Alpha provenance.`);
    } else {
        throw new Error('Federated knowledge import failed — no traces with alpha-node provenance found!');
    }

  } catch (err) {
    console.error(`[TEST] ❌ Error: ${err.message}`);
    process.exit(1);
  } finally {
    // Cleanup
    try {
        await fs.unlink(path.join(process.cwd(), '.mindforge', 'alpha-bundle.mfb'));
    } catch(e) { /* intentionally empty */ }
    process.exit(0);
  }
}

runTest();
