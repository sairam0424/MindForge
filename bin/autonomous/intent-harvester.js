/**
 * MindForge v7 — Proactive Semantic Homing (Pillar XII)
 * Intent Harvester: Proactively scans and claims unassigned tasks.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

class IntentHarvester {
  constructor() {
    this.planningDir = path.join(process.cwd(), '.planning');
    this.backlogPath = path.join(this.planningDir, 'BACKLOG.json');
    this.handoffPath = path.join(this.planningDir, 'HANDOFF.json');
  }

  /**
   * Scans for unassigned intent in the backlog and peer handoffs.
   */
  async idleScan() {
    console.log('[HOMING-SCAN] Agents transitioning to "Proactive Hunter" mode. Scanning FIM for unassigned intent...');
    
    const tasks = [];
    if (fs.existsSync(this.backlogPath)) {
      const backlog = JSON.parse(fs.readFileSync(this.backlogPath, 'utf8'));
      tasks.push(...backlog.filter(t => t.status === 'unassigned' || t.status === 'pending'));
    }

    if (fs.existsSync(this.handoffPath)) {
      const handoff = JSON.parse(fs.readFileSync(this.handoffPath, 'utf8'));
      tasks.push(...(handoff.open_intents || []));
    }

    return tasks;
  }

  /**
   * Autonomous task claiming based on agent Skill-Score.
   */
  async intentGrab(agent, tasks) {
    if (tasks.length === 0) return null;

    console.log(`[HOMING-GRAB] Agent ${agent.did} evaluating ${tasks.length} unassigned intents...`);
    
    // Sort tasks by Skill-Match affinity
    const prioritized = tasks.map(task => ({
      task,
      score: this.calculateAffinity(agent, task)
    })).sort((a, b) => b.score - a.score);

    const bestMatch = prioritized[0];
    if (bestMatch.score > 70) {
      console.log(`[HOMING-GRAB] High affinity detected (${bestMatch.score}). Agent ${agent.did} claiming: ${bestMatch.task.description}`);
      return this.claimTask(agent, bestMatch.task);
    }

    return null;
  }

  calculateAffinity(agent, task) {
    // Simulated skill-affinity calculation
    const skills = agent.skills || [];
    const taskReqs = task.required_skills || [];
    
    const matchCount = taskReqs.filter(s => skills.includes(s)).length;
    return (matchCount / Math.max(taskReqs.length, 1)) * 100;
  }

  async claimTask(agent, task) {
    task.assigned_to = agent.did;
    task.status = 'active';
    task.claimedAt = new Date().toISOString();
    
    // Update local state (in a real system this would be a atomic mesh update)
    return task;
  }
}

module.exports = new IntentHarvester();

// CLI Support — `mindforge harvest` (see bin/mindforge-cli.js's dispatch table).
// Was previously a silent no-op: this file exported an already-constructed
// instance and nothing ever called a method on it when spawned directly.
if (require.main === module) {
  (async () => {
    const harvester = new IntentHarvester();
    const tasks = await harvester.idleScan();
    if (tasks.length === 0) {
      console.log('[HOMING-SCAN] No unassigned intent found in .planning/BACKLOG.json or HANDOFF.json.');
    } else {
      console.log(`[HOMING-SCAN] Found ${tasks.length} unassigned intent(s):`);
      tasks.forEach((t) => console.log(`  - ${t.description || t.id || JSON.stringify(t)}`));
    }
  })().catch((err) => {
    console.error('[HOMING-SCAN] failed:', err.message);
    process.exit(1);
  });
}
