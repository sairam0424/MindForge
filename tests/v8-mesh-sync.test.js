/**
 * MindForge v8 — Federated Mesh Synthesis (FMS) Verification Test
 * Tests cross-project knowledge sharing and secure bundle import.
 */
'use strict';

const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// CONF-A: this suite used to require the configManager singleton at module scope and
// then call configManager.set('mesh.node_id', ...) — which rewrote the TRACKED
// .mindforge/config.json. That file is listed in package.json files[], so whatever
// value a test happened to write last ('beta-node') shipped to every consumer as
// their federation identity, and governance.active_did churned the working tree on
// every `npm test`. Fix: build a throwaway mirror root under os.tmpdir(), chdir into
// it, and require the engine modules only AFTER that chdir. Require order is
// load-bearing: ConfigManager captures configPath in its constructor
// (bin/governance/config-manager.js:14) and VectorHub resolves dbPath from
// process.cwd() (bin/memory/vector-hub.js:150), both at construction time.
// realpathSync: on macOS os.tmpdir() is /var/... but process.cwd() reports the
// resolved /private/var/..., so the mirror-escape assertions below would
// false-positive without it.
const MIRROR = fsSync.realpathSync(fsSync.mkdtempSync(path.join(os.tmpdir(), 'mf-v8-mesh-')));
const ORIGINAL_CWD = process.cwd();
const MIRROR_CONFIG = path.join(MIRROR, '.mindforge', 'config.json');
const MIRROR_DB = path.join(MIRROR, '.mindforge', 'celestial.db');

fsSync.mkdirSync(path.join(MIRROR, '.mindforge', 'memory'), { recursive: true });
// A minimal seed of only the keys this suite reads and writes — deliberately NOT a
// copy of the real config. Copying would re-introduce the coupling this fix removes,
// and pinning a "version" here would create a fresh literal to go stale on the next
// release bump. Nothing in this code path reads config.version.
fsSync.writeFileSync(
  MIRROR_CONFIG,
  JSON.stringify({ governance: {}, mesh: { node_id: 'auto', peers: [] } }, null, 2)
);
process.chdir(MIRROR);

const meshSyncer = require('../bin/engine/mesh-syncer');
const vectorHub = require('../bin/memory/vector-hub');
const ztaiManager = require('../bin/governance/ztai-manager');
const configManager = require('../bin/governance/config-manager');

async function runTest() {
  console.log('[TEST] Starting v8 Federated Mesh Synthesis Verification...');

  try {
    // Isolation self-check. Without it the chdir above could be deleted and this
    // suite would go back to writing the tracked repo files while still reporting
    // PASS — the same defect class as a gate that exits 0 on every input.
    // Both run BEFORE init(): reading vectorHub.dbPath instantiates the lazy singleton
    // but touches no filesystem, so a regression aborts before anything is written.
    if (configManager.configPath !== MIRROR_CONFIG) {
      throw new Error(`configManager escaped the mirror root: ${configManager.configPath}`);
    }
    if (vectorHub.dbPath !== MIRROR_DB) {
      throw new Error(`vectorHub escaped the mirror root: ${vectorHub.dbPath}`);
    }

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
    // process.exitCode, not process.exit(1): a hard exit here pre-empts the finally
    // block below, which would strand the mirror root in os.tmpdir() on every
    // failing run and skip the cwd restore.
    process.exitCode = 1;
  } finally {
    // Restore cwd before teardown — rmSync on the process's own cwd leaves an
    // unresolvable cwd behind on some platforms.
    process.chdir(ORIGINAL_CWD);
    // The mirror must be removed from an 'exit' listener, NOT here. VectorHub.init()
    // installs its own process.once('exit') flush (_installExitGuard), and that flush
    // calls saveSync() -> _ensureDir(), which re-creates .mindforge/ and re-writes
    // celestial.db. Deleting the mirror before process.exit() therefore leaks a fresh
    // multi-MB temp directory on every single run. 'exit' listeners fire in
    // registration order and init() already ran, so this listener — registered later —
    // is guaranteed to run after that flush.
    process.on('exit', () => {
      fsSync.rmSync(MIRROR, { recursive: true, force: true });
    });
    // Forced exit retained (sql.js/WASM holds handles open) but it must propagate the
    // outcome rather than overwrite it — the same fix already shipped in
    // tests/v8-skill-evolution.test.js.
    process.exit(process.exitCode || 0);
  }
}

runTest();
