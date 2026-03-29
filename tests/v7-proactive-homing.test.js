/**
 * MindForge v7 — Pillar XII (Proactive Semantic Homing) Verification
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');
const intentHarvester = require('../bin/autonomous/intent-harvester');
const meshSelfHealer = require('../bin/autonomous/mesh-self-healer');

async function testProactiveHoming() {
  console.log('--- Testing Proactive Semantic Homing (Pillar XII) ---');

  // 1. Setup Mock Backlog
  const planningDir = path.join(process.cwd(), '.planning');
  if (!fs.existsSync(planningDir)) fs.mkdirSync(planningDir);
  
  const mockBacklog = [
    { id: 'task_001', description: 'Optimization Refactor', status: 'unassigned', required_skills: ['Refactor Specialist'] }
  ];
  fs.writeFileSync(path.join(planningDir, 'BACKLOG.json'), JSON.stringify(mockBacklog, null, 2));

  // 2. Test Intent Harvesting
  console.log('Step 1: Testing Proactive Intent Harvesting...');
  const tasks = await intentHarvester.idleScan();
  assert.strictEqual(tasks.length, 1, 'Failed to harvest backlog tasks');

  const agent = { did: 'did:mindforge:agent-1', skills: ['Refactor Specialist'] };
  const claimedTask = await intentHarvester.intentGrab(agent, tasks);
  
  assert.notStrictEqual(claimedTask, null, 'Agent failed to claim high-affinity task');
  assert.strictEqual(claimedTask.assigned_to, agent.did, 'Task assignment mismatch');
  console.log('✅ Intent Harvesting successful.');

  // 3. Test Mesh Self-Healing
  console.log('\nStep 2: Testing Mesh Self-Healing (Drift Recovery)...');
  const recovery = await meshSelfHealer.homeIn('did:mindforge:drifting-agent', 85);
  
  assert.strictEqual(recovery.type, 'collective_repair', 'Mesh self-healing failed to generate recovery vector');
  assert.ok(recovery.consensus, 'Mesh recovery consensus missing');
  console.log('✅ Mesh Self-Healing successful (Recovery vector generated).');

  console.log('\n--- Proactive Homing Verification Complete ---');
  
  // Cleanup
  fs.unlinkSync(path.join(planningDir, 'BACKLOG.json'));
}

testProactiveHoming().catch(err => {
  console.error('❌ Proactive Homing Test Failed:', err);
  process.exit(1);
});
