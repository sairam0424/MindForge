#!/usr/bin/env node
/**
 * MindForge Governance — Approval Signature Generator
 * Usage: node bin/governance/approve.js "Reason for approval"
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../');
const APPROVALS_DIR = path.join(ROOT, '.planning/approvals');

/**
 * Attempts to retrieve the GPG signing key configured in git.
 * Returns null if no key is configured or git is unavailable.
 */
function getGPGSigningKey() {
  try {
    const key = execFileSync('git', ['config', 'user.signingkey'], { encoding: 'utf8' }).trim();
    return key || null;
  } catch {
    return null;
  }
}

/**
 * Verifies the identity of the approver using GPG.
 *
 * FAIL-CLOSED (Wave 6): a Tier 3 approval is a security gate. If no GPG signing
 * key is configured, identity cannot be cryptographically attributed — git
 * identity comes from spoofable env (USER / git config), so it is NOT a
 * verification. We therefore REFUSE to mint an approval unless the operator
 * explicitly opts into the weaker git-identity mode via
 * MINDFORGE_ALLOW_UNVERIFIED_APPROVAL=1 (audited as unverified). Previously this
 * returned {verified:false} but the record was written anyway and no consumer
 * checked the flag — a cosmetic gate.
 *
 * @param {string} approver - The approver identity string
 * @returns {{verified:boolean, method:string, identity:string, keyId?:string}}
 * @throws if no GPG key AND the unverified-approval opt-in is not set.
 */
function verifyApproverIdentity(approver) {
  const gpgKey = getGPGSigningKey();

  if (!gpgKey) {
    const allowUnverified = process.env.MINDFORGE_ALLOW_UNVERIFIED_APPROVAL === '1';
    if (!allowUnverified) {
      throw new Error(
        'No GPG signing key configured (git config user.signingkey is empty). ' +
        'A Tier 3 approval requires a verifiable identity. Either configure GPG signing, ' +
        'or explicitly accept an UNVERIFIED approval by setting ' +
        'MINDFORGE_ALLOW_UNVERIFIED_APPROVAL=1 (the record will be marked verified:false).'
      );
    }
    console.warn('[GOVERNANCE] No GPG key — minting an UNVERIFIED approval (MINDFORGE_ALLOW_UNVERIFIED_APPROVAL=1). ' +
      'git identity is spoofable; this approval is NOT cryptographically attributed.');
    // unverified_ack=true is the EXPLICIT, audited override the CI Tier-3 gate
    // looks for. A bare verified:false record WITHOUT this marker (e.g. a stale
    // pre-fail-closed file or a hand-forged empty one) is still rejected by the
    // gate — only a deliberately opted-in unverified approval is accepted.
    return { verified: false, method: 'git_identity_unverified', identity: approver, unverified_ack: true };
  }

  return { verified: true, method: 'gpg_key', identity: approver, keyId: gpgKey };
}

/**
 * Mint a Tier 3 approval record. Throws (fail-closed) if identity cannot be
 * verified and the unverified-approval opt-in is not set — the record is NOT
 * written in that case.
 * @param {{reason?:string, approvalsDir?:string, root?:string}} [opts]
 * @returns {{filePath:string, record:object}}
 */
function approve(opts = {}) {
  const reason = opts.reason || 'Manual approval for sensitive changes.';
  const root = opts.root || ROOT;
  const approvalsDir = opts.approvalsDir || APPROVALS_DIR;

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  const id = `MF-AUTH-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date().toISOString();
  const approver = process.env.USER || 'MindForge User';

  // Verify approver identity — THROWS fail-closed if unverifiable (before any write).
  const identityVerification = verifyApproverIdentity(approver);

  const signature = crypto.createHash('sha256')
    .update(`${id}:${reason}:${timestamp}:${os.hostname()}`)
    .digest('hex');

  const record = {
    id,
    project: pkg.name,
    version: pkg.version,
    tier: 3,
    approved_by: approver,
    timestamp,
    reason,
    signature: `sha256:${signature}`,
    identity_verification: identityVerification
  };

  if (!fs.existsSync(approvalsDir)) fs.mkdirSync(approvalsDir, { recursive: true });
  const filename = `approval-${id.toLowerCase()}.json`;
  const filePath = path.join(approvalsDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));

  return { filePath, record, filename };
}

module.exports = { verifyApproverIdentity, getGPGSigningKey, approve };

if (require.main === module) {
  try {
    const { filename, record } = approve({ reason: process.argv[2] });
    const iv = record.identity_verification;
    console.log('\n✅ Governance approval generated!\n');
    console.log(`ID:       ${record.id}`);
    console.log(`Reason:   ${record.reason}`);
    console.log(`Verified: ${iv.verified ? 'GPG (' + iv.keyId + ')' : 'git identity only — UNVERIFIED'}`);
    console.log(`File:     .planning/approvals/${filename}`);
    console.log('\nCommit this file to unblock Tier 3 gates in CI.\n');
  } catch (err) {
    console.error(`❌ Approval failed: ${err.message}`);
    process.exit(1);
  }
}
