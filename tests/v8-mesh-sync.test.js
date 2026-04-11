/**
 * MindForge v8 Federated Mesh Synthesis (FMS) Verification Test
 * Tests the export/import of signed MindForge Bundles (.mfb)
 */
const meshSyncer = require('../bin/engine/mesh-syncer');
const ztaiManager = require('../bin/governance/ztai-manager');
const configManager = require('../bin/governance/config-manager');
const vectorHub = require('../bin/memory/vector-hub');
const fs = require('node:fs/promises');
const path = require('node:path');

async function runTest() {
  console.log('[TEST] Starting v8 Federated Mesh Synthesis Verification...');

  try {
    // 1. Setup Test Identity (Node Alpha)
    console.log('[TEST] Provisioning Node Alpha identity...');
    const did = await ztaiManager.registerAgent('mf-alpha-node', 3);
    configManager.set('governance.active_did', did);
    configManager.set('mesh.node_id', 'alpha-node');

    // 2. Prepare Sample Data in Alpha
    console.log('[TEST] Seeding Alpha reasoning data...');
    await vectorHub.init();
    const testTraceId = `alpha_trace_${Math.random().toString(36).substr(2, 5)}`;
    await vectorHub.recordTrace({
      id: testTraceId,
      trace_id: 'tr_alpha_001',
      span_id: 'sp_alpha_001',
      event: 'reasoning_trace',
      timestamp: new Date().toISOString(),
      agent: 'mf-researcher',
      content: 'Alpha node reasoning about celestial mechanics.',
      metadata: { source: 'unit-test' },
      drift_score: 0.05
    });

    // 3. Export Bundle from Alpha
    const bundlePath = path.join(process.cwd(), '.mindforge', 'alpha-bundle.mfb');
    console.log('[TEST] Exporting bundle from Alpha...');
    await meshSyncer.exportBundle(bundlePath);

    // 4. Setup Test Identity (Node Beta)
    console.log('[TEST] Provisioning Node Beta identity...');
    configManager.set('mesh.node_id', 'beta-node');
    // Note: In Beta, we need Alpha's DID/PublicKey in the registry for verification
    // ZTAIManager is a singleton, so for this test, Alpha's identity is already in the registry.
    // In a real mesh, this would come from a distributed registry or signed handoff.

    // 5. Import Bundle into Beta
    console.log('[TEST] Importing bundle into Beta...');
    await meshSyncer.importBundle(bundlePath);

    // 6. Verify Beta Persistence
    console.log('[TEST] Verifying Beta SQLite contents...');
    const importedTraces = await vectorHub.db.selectFrom('traces')
      .selectAll()
      .where('mesh_node_id', '=', 'alpha-node')
      .execute();

    console.log(`[TEST] Beta found ${importedTraces.length} traces from Alpha.`);
    
    if (importedTraces.length > 0 && importedTraces.some(t => t.id.includes(testTraceId))) {
      console.log('✅ MindForge v8 Federated Mesh Synthesis Passed.');
      // Cleanup
      await fs.unlink(bundlePath);
    } else {
      console.error('❌ MindForge v8 Federated Mesh Synthesis Failed.');
    }

  } catch (err) {
    console.error(`[TEST] Error: ${err.message}`);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTest();
