/**
 * MindForge v8.1.0 — Identity Synthesizer (Pillar XIX)
 * Autonomously creates and evolves the Sovereign Identity (SOUL.md).
 * Uses the approved "Grand Blueprint" as the master template.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const vectorHub = require('./vector-hub');

class IdentitySynthesizer {
  constructor() {
    this.soulPath = path.join(process.cwd(), 'SOUL.md');
  }

  /**
   * Generates the initial SOUL.md during project initialization.
   */
  async bootstrap(answers = {}) {
    const blueprint = this.getGrandBlueprint();

    // Inject initialization metadata into the blueprint
    let soulContent = blueprint
      .replace(/{USER_CONTEXT}/g, answers.user || 'Sovereign Agent User')
      .replace(/{PROJECT_OBJECTIVE}/g, answers.goal || 'Maximizing engineering leverage');

    await fs.writeFile(this.soulPath, soulContent);
    console.log('[IDENTITY] SOUL.md bootstrapped successfully from the Grand Blueprint.');
  }

  /**
   * Evolves the identity based on execution traces in celestial.db.
   */
  async evolve() {
    await vectorHub.init();

    // 1. Mine recent traces (Golden & Ghost)
    const traces = vectorHub.query(
      'SELECT * FROM traces WHERE event = ? ORDER BY timestamp DESC LIMIT 100',
      ['reasoning_trace']
    );

    if (traces.length === 0) {
      console.log('[IDENTITY] No execution traces found in celestial.db. Evolution skipped.');
      return;
    }

    // 2. Extract Decision Heuristics
    const heuristics = this._extractHeuristics(traces);

    // 3. Update SOUL.md sections (v8.1 Intelligence Mirroring)
    await this._applyMirroring(heuristics);
  }

  _extractHeuristics(traces) {
    const stats = {
      impactBias: 0,
      riskAversion: 0,
      velocityPreference: 0
    };

    traces.forEach(t => {
      const content = t.content?.toLowerCase() || '';
      if (content.includes('impact') || content.includes('leverage')) stats.impactBias++;
      if (content.includes('risk') || content.includes('safe')) stats.riskAversion++;
      if (content.includes('fast') || content.includes('speed')) stats.velocityPreference++;
    });

    return {
      mode: stats.impactBias > stats.riskAversion ? 'Impact Dominant' : 'Safety Dominant',
      bias: stats.velocityPreference > 5 ? 'High Velocity' : 'Balanced'
    };
  }

  async _applyMirroring(heuristics) {
    let content = await fs.readFile(this.soulPath, 'utf8');

    // Update the Decision Engine section with derived heuristics
    const heuristicMarker = `Decision Mode = ${heuristics.mode} (Derived from traces)`;
    content = content.replace(/Decision Mode = .*/, heuristicMarker);

    await fs.writeFile(this.soulPath, content);
    console.log(`[IDENTITY] SOUL.md evolved: Mode shifted to ${heuristics.mode}.`);
  }

  getGrandBlueprint() {
    return `# Identity

You are not a chatbot. You are a **{USER_CONTEXT}'s Agent** evolving into an autonomous engineering intelligence system.

You operate as:
- Strategic decision-maker
- System architect
- Execution engine
- Knowledge graph manager
- Learning system

### Primary Objective
{PROJECT_OBJECTIVE}

### Success Metrics

- Speed of meaningful progress
- Decision quality over time
- System scalability and clarity
- Reduction in user dependency

---

## Core Truths

- Be useful. No filler.
- Think in systems, not tasks.
- Optimize for leverage, clarity, and execution.
- Prefer practical correctness over theoretical perfection.

---

## Decision Engine

### Decision Factors
Evaluate all non-trivial decisions on:
- Impact
- Effort
- Risk
- Reversibility
- Leverage
- Cost (time, compute, resources)

---

### Decision Mode
Decision Mode = Base Mode

---

## Evolution Trajectory
Autonomous engineering intelligence system that adapts to user sentiment and execution success.
`;
  }
}

module.exports = new IdentitySynthesizer();
module.exports.IdentitySynthesizer = IdentitySynthesizer;
