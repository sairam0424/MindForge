/**
 * MindForge ZTAI 'Enterprise Mode' Verification Suite
 * v4.2.5 — Hardened Verification
 */

const ztai = require('../bin/governance/ztai-manager');
const ZTAIArchiver = require('../bin/governance/ztai-archiver');
const fs = require('node:fs/promises');
const path = require('node:path');

async function verifyEnterpriseMode() {
  console.log('--- MindForge ZTAI Enterprise Mode Verification ---');

  try {
    // 1. Tiered Registration & Provider Selection
    const architectDid = await ztai.registerAgent('architect', 3);
    const analystDid = await ztai.registerAgent('analyst', 1);

    const architectInfo = ztai.getAgent(architectDid);
    const analystInfo = ztai.getAgent(analystDid);

    console.log('[Test 1] Tiered Registration:');
    console.log(` - Architect DID: ${architectDid} (Provider: ${architectInfo.providerType}, Tier: ${architectInfo.tier})`);
    console.log(` - Analyst DID: ${analystDid} (Provider: ${analystInfo.providerType}, Tier: ${analystInfo.tier})`);

    if (architectInfo.providerType !== 'enclave' || analystInfo.providerType !== 'local') {
      throw new Error('FAILED: Provider selection mismatch for tiers');
    }
    console.log(' ✅ Success');

    // 2. Cross-Provider Signing
    const data = 'Mission-critical architectural change: ADR-001';
    const archSignature = await ztai.signData(architectDid, data);
    const analystSignature = await ztai.signData(analystDid, data);

    console.log('[Test 2] Cross-Provider Signing:');
    console.log(` - Architect Signature (Enclave): ${archSignature.substring(0, 16)}...`);
    console.log(` - Analyst Signature (Local): ${analystSignature.substring(0, 16)}...`);

    const isArchValid = ztai.verifySignature(architectDid, data, archSignature);
    const isAnalystValid = ztai.verifySignature(analystDid, data, analystSignature);

    if (!isArchValid || !isAnalystValid) {
      throw new Error('FAILED: Cross-provider signature verification failed');
    }
    console.log(' ✅ Success');

    // 3. Audit Archiver & Manifest Generation
    // Create a dummy audit log for testing
    const auditDir = '.mindforge/audit';
    const auditPath = path.join(auditDir, 'AUDIT.jsonl');
    await fs.mkdir(auditDir, { recursive: true });
    
    const dummyEntries = [
      { timestamp: new Date().toISOString(), event: 'spawn', did: architectDid, signature: archSignature },
      { timestamp: new Date().toISOString(), event: 'plan', did: analystDid, signature: analystSignature }
    ];
    
    await fs.writeFile(auditPath, dummyEntries.map(e => JSON.stringify(e)).join('\n'));

    const archiver = new ZTAIArchiver(auditPath);
    const manifest = await archiver.archiveAuditLog(architectDid);

    console.log('[Test 3] Audit Archiver:');
    console.log(` - Manifest Block: ${manifest.blockStart} to ${manifest.blockEnd}`);
    console.log(` - Merkle Root: ${manifest.merkleRoot}`);
    console.log(` - Manifest Signed by Architect: ${manifest.signature.substring(0, 16)}...`);

    const { signature: manifestSig, ...manifestMetadata } = manifest;
    const isManifestValid = ztai.verifySignature(architectDid, JSON.stringify(manifestMetadata), manifestSig);
    if (!isManifestValid) {
      throw new Error('FAILED: Manifest signature invalid');
    }
    console.log(' ✅ Success');

    // 4. Key Rotation (Enclave)
    console.log('[Test 4] Key Rotation (Enclave):');
    const oldKey = architectInfo.publicKey;
    await ztai.rotateKeys(architectDid);
    const newKey = ztai.getAgent(architectDid).publicKey;

    if (oldKey === newKey) {
      throw new Error('FAILED: Enclave key rotation failed');
    }
    
    // Sign with new rotated key
    const newData = 'Post-rotation action';
    const newSig = await ztai.signData(architectDid, newData);
    if (!ztai.verifySignature(architectDid, newData, newSig)) {
       throw new Error('FAILED: Signature verification failed after rotation');
    }
    console.log(' ✅ Success');

    console.log('--- All ZTAI Enterprise Mode Tests Passed 🚀 ---');
    process.exit(0);
  } catch (err) {
    console.error('--- ZTAI Verification Failed ❌ ---');
    console.error(err.message);
    process.exit(1);
  }
}

verifyEnterpriseMode();
