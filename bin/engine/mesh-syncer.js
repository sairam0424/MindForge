/**
 * MindForge v8 — Federated Mesh Synthesis (FMS)
 * Component: Mesh Syncer (Pillar XVI)
 * 
 * Facilitates secure, signed knowledge handoffs between MindForge nodes.
 */
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const vectorHub = require('../memory/vector-hub');
const ztaiManager = require('../governance/ztai-manager');
const configManager = require('../governance/config-manager');

class MeshSyncer {
  constructor() {
    this.nodeId = configManager.get('mesh.node_id', 'unknown-node');
    this.vhInitialized = false;
  }

  async ensureInit() {
    if (!this.vhInitialized) {
      await vectorHub.init();
      this.vhInitialized = true;
    }
  }

  /**
   * Exports a signed bundle of 'Golden Traces' and 'Skills'.
   * @param {string} bundlePath - Target .mfb file path
   * @param {Object} options - { skillIds: [], traceIds: [], since: ISOString }
   */
  async exportBundle(bundlePath, options = {}) {
    await this.ensureInit();
    console.log(`[MeshSyncer] Exporting bundle from ${this.nodeId}...`);

    // 1. Fetch Traces (Golden ones or since date)
    let traceQuery = vectorHub.db.selectFrom('traces').selectAll();
    if (options.since) {
      traceQuery = traceQuery.where('timestamp', '>', options.since);
    }
    const traces = await traceQuery.limit(100).execute();

    // 2. Fetch Skills
    const skills = await vectorHub.db.selectFrom('skills').selectAll().execute();

    const payload = {
      version: '1.0.0',
      source_node: this.nodeId,
      timestamp: new Date().toISOString(),
      data: { traces, skills }
    };

    // 3. Sign the bundle using ZTAI
    // Note: In v8, we sign the entire payload string to ensure integrity.
    const did = configManager.get('governance.active_did');
    if (!did) {
      throw new Error('[MeshSyncer] No active DID found for signing. Secure identity required.');
    }

    const signature = await ztaiManager.signData(did, JSON.stringify(payload));
    
    const bundle = {
      payload,
      signature,
      did
    };

    await fs.writeFile(bundlePath, JSON.stringify(bundle, null, 2));
    console.log(`[MeshSyncer] Exported ${traces.length} traces and ${skills.length} skills to ${bundlePath}`);
    return bundlePath;
  }

  /**
   * Imports a signed bundle and merges it into the local mesh.
   */
  async importBundle(bundlePath) {
    await this.ensureInit();
    console.log(`[MeshSyncer] Importing bundle from ${bundlePath}...`);

    const raw = await fs.readFile(bundlePath, 'utf8');
    const bundle = JSON.parse(raw);

    // 1. Verify Signature
    const { payload, signature, did } = bundle;
    const isValid = ztaiManager.verifySignature(did, JSON.stringify(payload), signature);

    if (!isValid) {
      throw new Error(`[MeshSyncer] Signature verification FAILED for bundle from ${did}. Knowledge rejected.`);
    }

    console.log(`[MeshSyncer] Signature verified. Source Node: ${payload.source_node}`);

    // 2. Merge Traces
    const traces = payload.data.traces || [];
    for (const trace of traces) {
      await vectorHub.recordTrace({
        ...trace,
        id: `mesh_${payload.source_node}_${trace.id}`, // Trace provenance tagging
        mesh_node_id: payload.source_node
      });
    }

    // 3. Merge Skills
    const skills = payload.data.skills || [];
    for (const skill of skills) {
      await vectorHub.db.insertInto('skills')
        .values({
          skill_id: skill.skill_id,
          name: skill.name,
          description: skill.description,
          path: skill.path,
          success_rate: skill.success_rate,
          last_verified: new Date().toISOString()
        })
        .onConflict(oc => oc.column('skill_id').doUpdateSet({
            success_rate: Math.max(skill.success_rate || 0, 0.5), // Optimistic merge
            last_verified: new Date().toISOString()
        }))
        .execute();
    }

    console.log(`[MeshSyncer] Successfully imported ${traces.length} external traces and ${skills.length} skills.`);
    return true;
  }
}

module.exports = new MeshSyncer();
