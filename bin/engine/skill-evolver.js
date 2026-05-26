/**
 * MindForge v8 — Autonomous Skill Evolution (ASE)
 * Component: Skill Evolver (Pillar XVII)
 *
 * Mines successful reasoning patterns to synthesize new reusable skills.
 */
'use strict';

const vectorHub = require('../memory/vector-hub');
const semanticHub = require('../memory/semantic-hub');
const configManager = require('../governance/config-manager');
const crypto = require('node:crypto');

class SkillEvolver {
  constructor() {
    this.vhInitialized = false;
    this.threshold = configManager.get('ase.max_drift_threshold', 0.1);
    this.minCount = configManager.get('ase.min_success_count', 3);
  }

  async ensureInit() {
    if (!this.vhInitialized) {
      await vectorHub.init();
      this.vhInitialized = true;
    }
  }

  /**
   * Main evolution loop.
   */
  async evolve() {
    await this.ensureInit();
    console.log('[ASE] Starting skill evolution cycle...');

    // 1. Mine Golden Traces (Drift < threshold)
    const goldenTraces = vectorHub.query(
      'SELECT * FROM traces WHERE drift_score < ? AND event = ?',
      [this.threshold, 'reasoning_trace']
    );

    if (goldenTraces.length < this.minCount) {
      console.log(`[ASE] Only ${goldenTraces.length} golden traces found. Threshold is ${this.minCount}. Evolution deferred.`);
      return [];
    }

    // 2. Identify Patterns (Group by shared agent + metadata intent)
    const candidates = this._clusterTraces(goldenTraces);
    const evolvedSkills = [];

    for (const cluster of candidates) {
      if (cluster.traces.length >= this.minCount) {
        const skill = await this._synthesize(cluster);
        await semanticHub.saveSkill(skill);
        evolvedSkills.push(skill);
      }
    }

    console.log(`[ASE] Evolution complete. Synthesized ${evolvedSkills.length} new skills.`);
    return evolvedSkills;
  }

  /**
   * Internal heuristic for clustering similar reasoning spans.
   */
  _clusterTraces(traces) {
    const clusters = new Map();

    for (const t of traces) {
      // Group by agent and the first 20 chars of thought as a simple proxy for 'intent'
      const content = t.content || '';
      const key = `${t.agent || 'unknown'}:${content.substring(0, 20)}`;

      if (!clusters.has(key)) {
        clusters.set(key, { traces: [], agent: t.agent, intent: content.substring(0, 50) });
      }
      clusters.get(key).traces.push(t);
    }

    return Array.from(clusters.values());
  }

  /**
   * Synthesize a skill from a cluster of successful traces.
   */
  async _synthesize(cluster) {
    const id = `ev_${crypto.randomBytes(4).toString('hex')}`;

    // Abstract the strategy from the trace content
    const summary = cluster.traces.map(t => `- ${t.content}`).join('\n');

    return {
      id,
      name: `Synthesized Skill (${cluster.agent}) - ${id}`,
      description: `Autonomous adaptation from ${cluster.traces.length} successful golden traces.\nPatterns identified:\n${summary}`,
      success_rate: 1.0, // Initial confidence is high due to mining golden traces
      is_autonomous: true,
      source_trace_id: cluster.traces[0].trace_id,
      path: `ase/evolved/${id}.skill.md`
    };
  }
}

module.exports = new SkillEvolver();
