/**
 * MindForge — HandoverManager (Pillar VII: Dynamic Human-Agent Handover)
 * Packages Nexus State Bundles for bidirectional steering and human escalation.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ceg = require('./context-entropy-guard');

class HandoverManager {
  constructor(config = {}) {
    this.handoffPath = path.join(process.cwd(), '.planning', 'handoffs');
  }

  /**
   * Packages a Nexus State Bundle for human review.
   * @param {Object} state - Current execution state (audit, memory, goals)
   * @returns {string} - Path to the state bundle.
   */
  createNexusBundle(state) {
    if (!fs.existsSync(this.handoffPath)) {
      fs.mkdirSync(this.handoffPath, { recursive: true });
    }

    const bundleId = `bundle_${crypto.randomBytes(6).toString('hex')}`;
    const bundle = {
      id: bundleId,
      timestamp: new Date().toISOString(),
      version: '5.0.0-nexus',
      context: {
        phase: state.phase,
        wave: state.wave,
        last_events: state.recentEvents,
        memory_shards: state.memoryShards || []
      },
      // v6.4.0: Context Entropy Guard applied for active noise suppression
      reasoning_snapshot: (Array.isArray(state.reasoningTrace)) ? ceg.compress(state.reasoningTrace) : state.reasoningTrace,
      steering_requirements: state.blocks || []
    };

    const bundlePath = path.join(this.handoffPath, `${bundleId}.json`);
    fs.writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));

    console.log(`[DHH-BUNDLE] Nexus State Bundle packaged: ${bundlePath}`);
    return bundlePath;
  }

  /**
   * Injects human steering into the agentic flow.
   * @param {string} bundleId - The bundle being steered.
   * @param {Object} steeringRequest - Human instructions/overrides.
   */
  injectSteering(bundleId, steeringRequest) {
    const steerPath = path.join(process.cwd(), '.planning', 'STEER.json');
    const instruction = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      bundle_id: bundleId,
      type: 'HUMAN_OVERRIDE',
      instruction: steeringRequest.instruction,
      priority: 'CRITICAL'
    };

    fs.appendFileSync(steerPath, JSON.stringify(instruction) + '\n');
    console.log(`[DHH-STEER] Human instruction injected into autonomous stream [Ref: ${bundleId}]`);
  }
}

module.exports = HandoverManager;
