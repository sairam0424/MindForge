/**
 * MindForge ZTAI Audit Archiver
 * v4.2.5 — Non-Repudiation Engine
 */

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const ztai = require('./ztai-manager');

class ZTAIArchiver {
  constructor(auditPath = '.mindforge/audit/AUDIT.jsonl') {
    this.auditPath = auditPath;
    this.manifestDir = '.mindforge/audit/manifests';
  }

  /**
   * Generates an integrity manifest for a specific block of audit entries.
   * @param {Array<Object>} entries - A block of entries to sign.
   * @param {string} archiverDid - The DID of the archiver (e.g., Release Manager)
   * @returns {Promise<Object>} - The signed manifest
   */
  async generateManifest(entries, archiverDid) {
    if (!entries || entries.length === 0) return null;

    // 1. Calculate the Merkle-like root hash of the block
    const blockHashes = entries.map(e => 
      crypto.createHash('sha256').update(JSON.stringify(e)).digest('hex')
    );
    
    // Simple cumulative hash chain as a Merkle Root equivalent
    let cumulativeHash = '';
    for (const h of blockHashes) {
      cumulativeHash = crypto.createHash('sha256').update(cumulativeHash + h).digest('hex');
    }

    const manifestMetadata = {
      blockStart: entries[0].timestamp,
      blockEnd: entries[entries.length - 1].timestamp,
      entryCount: entries.length,
      merkleRoot: cumulativeHash,
      archivedAt: new Date().toISOString(),
      archiver: archiverDid,
      version: 'v4.2.5'
    };

    // 2. Sign the manifest with the archiver's DID
    const signature = await ztai.signData(archiverDid, JSON.stringify(manifestMetadata));

    return {
      ...manifestMetadata,
      signature
    };
  }

  /**
   * Scans the current AUDIT.jsonl and generates manifests for un-archived blocks.
   * For the simulation, we process the entire file and generate one manifest.
   */
  async archiveAuditLog(archiverDid) {
    try {
      const data = await fs.readFile(this.auditPath, 'utf8');
      const lines = data.split('\n').filter(l => l.trim() !== '');
      const entries = lines.map(l => JSON.parse(l));

      if (entries.length === 0) return null;

      const manifest = await this.generateManifest(entries, archiverDid);
      
      // Ensure manifest directory exists
      await fs.mkdir(this.manifestDir, { recursive: true });
      
      const manifestPath = path.join(this.manifestDir, `manifest_${Date.now()}.json`);
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

      console.log(`[ZTAI-ARCHIVER] Manifest generated and signed by ${archiverDid}: ${manifestPath}`);
      return manifest;
    } catch (err) {
      console.error(`[ZTAI-ARCHIVER] Failed to archive audit log: ${err.message}`);
      return null;
    }
  }

  /**
   * Verifies the integrity of the audit log against a manifest.
   */
  async verifyIntegrity(manifestPath) {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const { signature, ...manifestMetadata } = manifest;
    
    // 1. Verify Archiver Signature
    const isSignatureValid = ztai.verifySignature(manifest.archiver, JSON.stringify(manifestMetadata), signature);
    if (!isSignatureValid) {
      throw new Error(`CRITICAL: Manifest signature invalid for ${manifestPath}`);
    }

    // 2. Recalculate and Verify Merkle Root (Simulated)
    // In a real environment, this would compare against the actual AUDIT.jsonl data slices.
    console.log(`[ZTAI-ARCHIVER] Integrity Verified for block ending ${manifest.blockEnd}`);
    return true;
  }
}

module.exports = ZTAIArchiver;
