'use strict';
/**
 * MindForge ZTAI Archiver — Audit Integrity Verification Suite (UC-22)
 *
 * Regression guard for audit finding #15 (HIGH, false-assurance):
 * verifyIntegrity() must RECOMPUTE the Merkle root from the live AUDIT.jsonl
 * and reject any tampered / deleted / reordered block. A manifest with a
 * valid archiver signature is NOT sufficient — the underlying log must match.
 */

const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const ztai = require('../bin/governance/ztai-manager');
const ZTAIArchiver = require('../bin/governance/ztai-archiver');

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// Distinct, ordered ISO timestamps so block selection by [blockStart, blockEnd]
// is deterministic.
function buildEntries(count) {
  const base = Date.parse('2026-01-01T00:00:00.000Z');
  const entries = [];
  for (let i = 0; i < count; i++) {
    entries.push({
      timestamp: new Date(base + i * 1000).toISOString(),
      event: 'spawn',
      seq: i,
      payload: `entry-${i}`
    });
  }
  return entries;
}

async function writeAuditLog(auditPath, entries) {
  await fs.writeFile(auditPath, entries.map(e => JSON.stringify(e)).join('\n') + '\n');
}

async function setup() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ztai-archiver-'));
  const auditPath = path.join(tmpDir, 'AUDIT.jsonl');
  const archiverDid = await ztai.registerAgent('release-manager', 3);
  return { tmpDir, auditPath, archiverDid };
}

// Generate a manifest from the entries and persist it to disk, returning its path.
async function generateAndWriteManifest(archiver, tmpDir, entries, archiverDid) {
  const manifest = await archiver.generateManifest(entries, archiverDid);
  const manifestPath = path.join(tmpDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
}

test('happy path: verifyIntegrity returns true for an untampered audit log', async () => {
  const { tmpDir, auditPath, archiverDid } = await setup();
  try {
    const entries = buildEntries(5);
    await writeAuditLog(auditPath, entries);

    const archiver = new ZTAIArchiver(auditPath);
    const manifestPath = await generateAndWriteManifest(archiver, tmpDir, entries, archiverDid);

    const result = await archiver.verifyIntegrity(manifestPath);
    assert.strictEqual(result, true, 'untampered log must verify');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('tamper regression: modifying one entry must fail verification (UC-22 anchor)', async () => {
  const { tmpDir, auditPath, archiverDid } = await setup();
  try {
    const entries = buildEntries(5);
    await writeAuditLog(auditPath, entries);

    const archiver = new ZTAIArchiver(auditPath);
    const manifestPath = await generateAndWriteManifest(archiver, tmpDir, entries, archiverDid);

    // Tamper: mutate a field of one entry WITHOUT touching timestamps,
    // so block selection still picks the same range but the root differs.
    const tampered = entries.map((e, i) =>
      i === 2 ? { ...e, payload: 'ATTACKER-INJECTED' } : { ...e }
    );
    await writeAuditLog(auditPath, tampered);

    await assert.rejects(
      () => archiver.verifyIntegrity(manifestPath),
      /CRITICAL/,
      'tampered entry must be rejected (fail-closed)'
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('deletion: removing an entry must fail verification', async () => {
  const { tmpDir, auditPath, archiverDid } = await setup();
  try {
    const entries = buildEntries(5);
    await writeAuditLog(auditPath, entries);

    const archiver = new ZTAIArchiver(auditPath);
    const manifestPath = await generateAndWriteManifest(archiver, tmpDir, entries, archiverDid);

    // Delete a middle entry (timestamps stay within original [start, end]).
    const truncated = entries.filter((_, i) => i !== 2);
    await writeAuditLog(auditPath, truncated);

    await assert.rejects(
      () => archiver.verifyIntegrity(manifestPath),
      /CRITICAL/,
      'deleted entry must be rejected (fail-closed)'
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('reorder: swapping two entries must fail verification', async () => {
  const { tmpDir, auditPath, archiverDid } = await setup();
  try {
    const entries = buildEntries(5);
    await writeAuditLog(auditPath, entries);

    const archiver = new ZTAIArchiver(auditPath);
    const manifestPath = await generateAndWriteManifest(archiver, tmpDir, entries, archiverDid);

    // Reorder two adjacent entries (same set, different chain order).
    const reordered = entries.map(e => ({ ...e }));
    const swap = reordered[1];
    reordered[1] = reordered[2];
    reordered[2] = swap;
    await writeAuditLog(auditPath, reordered);

    await assert.rejects(
      () => archiver.verifyIntegrity(manifestPath),
      /CRITICAL/,
      'reordered entries must be rejected (fail-closed)'
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('missing audit file: verifyIntegrity fails closed (does not silently pass)', async () => {
  const { tmpDir, auditPath, archiverDid } = await setup();
  try {
    const entries = buildEntries(3);
    await writeAuditLog(auditPath, entries);

    const archiver = new ZTAIArchiver(auditPath);
    const manifestPath = await generateAndWriteManifest(archiver, tmpDir, entries, archiverDid);

    // Remove the audit log entirely — non-repudiation must not pass blind.
    await fs.rm(auditPath, { force: true });

    await assert.rejects(
      () => archiver.verifyIntegrity(manifestPath),
      /CRITICAL/,
      'missing audit log must fail closed'
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ✅  ' + name); passed++; }
    catch (e) { console.error('  ❌  ' + name + '\n      ' + e.message); failed++; }
  }
  console.log('\nZTAI Archiver Integrity: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
