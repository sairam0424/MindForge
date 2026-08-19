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

// ── truncation: what the block covers, and what it does not ──────────────────
//
// GIVES A CODE READER TO A DOC CLAIM THAT HAD NONE. docs/security/ZTAI-OVERVIEW.md describes
// verifyIntegrity()'s truncation behaviour, and until this test nothing pinned it — the suite covered
// happy path, modify, delete, reorder and missing-file, but never truncation. A published claim about
// behaviour with no test is exactly the defect class this repository keeps producing.
//
// It also corrects a WRONG claim. An earlier draft of that document attributed the blind spot to "any
// prefix of a back-linked chain is itself a valid chain". That is true of bin/verify-audit.js and false
// here: `git grep -c previous_hash bin/governance/ztai-archiver.js` returns 0. The archiver selects
// entries by a [blockStart, blockEnd] timestamp window (:141), counts them (:148) and recomputes a
// cumulative root (:156) — three mechanisms, none of them a back-link.
//
// Both halves are asserted deliberately. Asserting only that truncation-into-the-block throws would
// leave the more important half — that truncation beyond it is INVISIBLE — as prose nobody checks.
function auditEntriesAt(n, baseMs, stepMs = 1000) {
  return Array.from({ length: n }, (_, i) => ({
    id: `trunc-${i}`,
    event: 'probe',
    target_id: `T-${i}`,
    agent: 'truncation-probe',
    timestamp: new Date(baseMs + i * stepMs).toISOString(),
  }));
}

test('truncating INTO a covered block fails closed', async () => {
  const { tmpDir, auditPath, archiverDid } = await setup();
  try {
    const base = Date.parse('2026-01-01T00:00:00Z');
    const covered = auditEntriesAt(10, base);
    const archiver = new ZTAIArchiver(auditPath);
    const manifestPath = await generateAndWriteManifest(archiver, tmpDir, covered, archiverDid);

    // Drop the last 3 entries the manifest claims to cover.
    await writeAuditLog(auditPath, covered.slice(0, 7));

    await assert.rejects(
      () => archiver.verifyIntegrity(manifestPath),
      /block entry count mismatch/,
      'truncating into a covered block must trip the entryCount check at ztai-archiver.js:148'
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('truncating BEYOND the covered block is NOT detected — and that is the documented gap', async () => {
  // The uncomfortable half, asserted so the document cannot quietly overstate the guarantee. If a
  // length or head commitment ever lands, THIS TEST FAILS and tells you to update
  // docs/security/ZTAI-OVERVIEW.md — rather than freezing today's gap into a permanent expectation.
  const { tmpDir, auditPath, archiverDid } = await setup();
  try {
    const base = Date.parse('2026-01-01T00:00:00Z');
    const covered = auditEntriesAt(10, base);
    // Appended an hour later, so they fall outside [blockStart, blockEnd] entirely.
    const uncovered = auditEntriesAt(4, base + 60 * 60 * 1000);

    const archiver = new ZTAIArchiver(auditPath);
    const manifestPath = await generateAndWriteManifest(archiver, tmpDir, covered, archiverDid);

    // Control first: with the uncovered tail present, the block still verifies.
    await writeAuditLog(auditPath, [...covered, ...uncovered]);
    assert.strictEqual(await archiver.verifyIntegrity(manifestPath), true,
      'the control must pass, or the truncation result below proves nothing');

    // Now delete the entire uncovered tail. The manifest never referenced it.
    await writeAuditLog(auditPath, covered);
    assert.strictEqual(await archiver.verifyIntegrity(manifestPath), true,
      'truncating entries appended after blockEnd is invisible to verifyIntegrity, because the '
      + '[blockStart, blockEnd] window at ztai-archiver.js:141 never selects them. If this now '
      + 'REJECTS, a length or head commitment has landed — update ZTAI-OVERVIEW.md and invert this.');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('the archiver does not implement back-link chaining, whatever the docs say', async () => {
  // Pins the mechanism itself, so the corrected document cannot drift back to the wrong explanation.
  const src = await fs.readFile(
    path.join(__dirname, '..', 'bin', 'governance', 'ztai-archiver.js'), 'utf8');
  assert.ok(!/previous_hash/.test(src),
    'ztai-archiver.js now references previous_hash — if it genuinely chains entries, the truncation '
    + 'assertions above and the ZTAI-OVERVIEW.md description of the mechanism both need revisiting');
  assert.match(src, /blockStart|blockEnd/,
    'the archiver must still select its block by timestamp window, which is what makes the uncovered '
    + 'tail invisible');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ✅  ' + name); passed++; }
    catch (e) { console.error('  ❌  ' + name + '\n      ' + e.message); failed++; }
  }
  console.log('\nZTAI Archiver Integrity: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
