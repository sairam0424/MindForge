/**
 * MindForge Semantic Hub & Ghost Pattern Verification
 * v4.2.5 — Cross-Repo Sync Verification
 */

const semanticHub = require('../bin/memory/semantic-hub');
const ghostDetector = require('../bin/memory/ghost-pattern-detector');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

async function verifyMemoryMesh() {
  console.log('--- MindForge Memory Mesh Verification ---');

  // Override global path for testing
  const testGlobalBase = path.join(os.tmpdir(), 'mindforge-global-test');
  semanticHub.globalPath = testGlobalBase;

  try {
    // 1. Initialize Global Store Mock
    await fs.mkdir(testGlobalBase, { recursive: true });
    
    // Seed a "Ghost Pattern" (failure from another repo)
    const ghostPattern = {
      id: 'GHOST-001',
      type: 'ghost-pattern',
      tags: ['security', 'env-leak', 'failure', 'p0'],
      failureContext: 'Environment variables leaked via insecure logging in Repo-X.',
      mitigationStrategy: 'Use MindForge-Nexus localized masking.'
    };
    
    await fs.writeFile(
      path.join(testGlobalBase, 'pattern-library.jsonl'), 
      JSON.stringify(ghostPattern) + '\n'
    );

    console.log('[Test 1] Global Seeded with Ghost Pattern:');
    console.log(` - Ghost ID: ${ghostPattern.id} (Tags: ${ghostPattern.tags.join(',')})`);
    console.log(' ✅ Success');

    // 2. Proposed (Local) Pattern Analysis
    const proposedPattern = {
      id: 'LOCAL-ADR-005',
      tags: ['security', 'env-leak'], // Overlaps with the ghost pattern!
      description: 'New logging service implementation.'
    };

    console.log(`[Test 2] Analyzing Proactive Risk for: ${proposedPattern.id}...`);
    const risks = await ghostDetector.analyzeRisk(proposedPattern);

    if (risks.length === 0) {
      throw new Error('FAILED: Ghost pattern detector missed the overlap');
    }

    console.log(` - Detected ${risks.length} Risk(s):`);
    risks.forEach(r => {
      console.log(`   [${r.riskLevel}] ${r.description}`);
      console.log(`   [Mitigation] ${r.mitigation}`);
    });

    if (risks[0].riskLevel !== 'CRITICAL') {
      throw new Error('FAILED: Risk level calculation incorrect');
    }
    console.log(' ✅ Success');

    // 3. Library Sync Logic
    console.log('[Test 3] Syncing Local pattern-library to Global...');
    // Ensure local library exists for testing
    const localLib = '.mindforge/memory/pattern-library.jsonl';
    const localContent = JSON.stringify({ id: 'LOCAL-SAFE-001', tags: ['performance'], description: 'Standard optimization' });
    await fs.writeFile(localLib, localContent + '\n');

    await semanticHub.syncLibrary('pattern-library.jsonl');
    
    // Verify sync
    const globalData = await fs.readFile(path.join(testGlobalBase, 'pattern-library.jsonl'), 'utf8');
    if (!globalData.includes('LOCAL-SAFE-001')) {
      throw new Error('FAILED: Local pattern not found in global store after sync');
    }
    console.log(' ✅ Success');

    console.log('--- All Memory Mesh Tests Passed 🚀 ---');
    process.exit(0);
  } catch (err) {
    console.error('--- Memory Mesh Verification Failed ❌ ---');
    console.error(err.message);
    process.exit(1);
  }
}

verifyMemoryMesh();
