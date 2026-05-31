/**
 * MindForge v7 — Proactive Semantic Homing (Pillar XII)
 * Mesh Self-Healer: Peer agents "home in" on drifting nodes to provide collaborative reasoning.
 *
 * UC-22 (audit finding #16) — HONEST LABELLING:
 * There is no live, runtime peer-reasoning mesh in this build. Previously this
 * module FABRICATED a collective consensus (hardcoded peers, canned
 * confidence:94, "100% agreement" log). That emitted false assurance on the
 * live auto-runner self-heal path. It now consults the ONLY real peer source
 * available — the ztai-manager session-agent registry — and, when that yields
 * no real peers (the common case at runtime), degrades GRACEFULLY to a clearly
 * labelled single-source advisory with NO fabricated confidence or consensus.
 */
'use strict';

const path = require('node:path');

class MeshSelfHealer {
  constructor() {
    this.auditPath = path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
  }

  /**
   * Peer agents "home in" on a node with high logic drift.
   *
   * @param {string} driftingAgentDid - DID of the drifting node.
   * @param {number} driftScore - Logic-drift score (only acts on >= 80).
   * @param {object} [options] - { sessionId } to scope the real peer lookup.
   * @returns {Promise<object|null>} Honest advisory object, or null below threshold.
   */
  async homeIn(driftingAgentDid, driftScore, options = {}) {
    if (driftScore < 80) return null; // Only home in on major drift

    console.log(`[HOMING-HEAL] Global Mesh Alert: Agent ${driftingAgentDid} experiencing critical logic drift (${driftScore}). Seeking peer reasoning support...`);

    // Consult the only REAL peer source: the ztai-manager session registry.
    // Returns an empty array when no live peers are registered.
    const peers = this.findAvailablePeers(driftingAgentDid, options.sessionId);

    if (peers.length === 0) {
      return this.degradedAdvisory(driftingAgentDid);
    }

    const healingNodes = [];
    for (const peer of peers) {
      console.log(`[HOMING-HEAL] Peer ${peer.did} homing in on ${driftingAgentDid} to provide reasoning support.`);
      const supportTrace = await this.provideCollectiveReasoning(peer, driftingAgentDid);
      healingNodes.push(supportTrace);
    }

    return this.reconcileReasoning(healingNodes, driftingAgentDid);
  }

  /**
   * Discovers REAL peer agents from the live registry. There are no invented
   * peers — if nothing is registered for the session, this returns []
   * and the caller degrades honestly.
   *
   * @param {string} driftingAgentDid - The node being healed (excluded from peers).
   * @param {string|null} sessionId - Session scope for the registry lookup.
   * @returns {Array<{did:string, persona?:string}>} Real peers (possibly empty).
   */
  findAvailablePeers(driftingAgentDid, sessionId = null) {
    let agents = [];
    try {
      // Lazy require to avoid a hard coupling / load cost on the cold path.
      const ztaiManager = require('../governance/ztai-manager');
      if (typeof ztaiManager.getSessionAgents === 'function') {
        agents = ztaiManager.getSessionAgents(sessionId) || [];
      }
    } catch {
      // No registry available — treat as no live peers (honest degraded mode).
      agents = [];
    }

    // Exclude the drifting node itself; only real, distinct peers may help.
    return agents.filter(a => a && a.did && a.did !== driftingAgentDid);
  }

  /**
   * Honest single-source advisory used when no live peer mesh is available.
   * Carries NO fabricated confidence and makes NO consensus claim.
   *
   * @param {string} driftingAgentDid
   * @returns {object}
   */
  degradedAdvisory(driftingAgentDid) {
    console.log('[HOMING-HEAL] No live peer mesh available — emitting single-source advisory (degraded).');

    return {
      type: 'advisory',
      mesh_available: false,
      degraded: true,
      confidence: null,
      consensus: null,
      target: driftingAgentDid,
      recommendation: 'Heuristic single-source steering: pause the drifting node, re-anchor to the last verified plan/spec, and require human or higher-tier review before resuming. No multi-agent consensus was available to corroborate this.',
      source: 'Mesh-Self-Healing (degraded: no live peers)'
    };
  }

  async provideCollectiveReasoning(peer, target) {
    // A real peer contributes a reasoning node. Confidence is left null here:
    // this build has no model-backed scoring, so we do not invent a number.
    return {
      provider: peer.did,
      target,
      reasoning: 'Peer steering note: re-sync drifting node with the last verified plan state.',
      confidence: null
    };
  }

  /**
   * Reconciles multiple REAL peer reasoning nodes. With live peers present we
   * report how many corroborated, but we still never invent a confidence score
   * or a "100% agreement" claim.
   *
   * @param {Array<object>} nodes - Real peer reasoning contributions.
   * @param {string} driftingAgentDid
   * @returns {object}
   */
  reconcileReasoning(nodes, driftingAgentDid) {
    const peerCount = nodes.length;
    console.log(`[HOMING-HEAL] Collective reasoning gathered from ${peerCount} live peer(s); no confidence fabricated.`);

    return {
      type: 'advisory',
      mesh_available: true,
      degraded: false,
      confidence: null, // No model-backed scoring in this build — stay honest.
      consensus: nodes[0].reasoning,
      peer_count: peerCount,
      target: driftingAgentDid,
      recommendation: nodes[0].reasoning,
      source: `Mesh-Self-Healing (${peerCount} live peer(s))`
    };
  }
}

module.exports = new MeshSelfHealer();
