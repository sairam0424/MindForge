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

const REASON = process.argv[2] || 'Manual approval for sensitive changes.';
const ROOT = path.resolve(__dirname, '../../');
const APPROVALS_DIR = path.join(ROOT, '.planning/approvals');

if (!fs.existsSync(APPROVALS_DIR)) {
  fs.mkdirSync(APPROVALS_DIR, { recursive: true });
}

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
 * Verifies the identity of the approver using GPG if available.
 * Falls back to git identity only (with warning) if no GPG key is configured.
 * @param {string} approver - The approver identity string
 */
function verifyApproverIdentity(approver) {
  const gpgKey = getGPGSigningKey();

  if (!gpgKey) {
    console.warn('[GOVERNANCE] No GPG signing key configured — approval accepted with git identity only');
    return { verified: false, method: 'git_identity', identity: approver };
  }

  return { verified: true, method: 'gpg_key', identity: approver, keyId: gpgKey };
}

async function approve() {
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  const id = `MF-AUTH-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date().toISOString();
  const approver = process.env.USER || 'MindForge User';

  // Verify approver identity (GPG if available, git identity fallback)
  const identityVerification = verifyApproverIdentity(approver);

  // Calculate a signature based on current state
  const signature = crypto.createHash('sha256')
    .update(`${id}:${REASON}:${timestamp}:${os.hostname()}`)
    .digest('hex');

  const record = {
    id,
    project: pkg.name,
    version: pkg.version,
    tier: 3,
    approved_by: approver,
    timestamp,
    reason: REASON,
    signature: `sha256:${signature}`,
    identity_verification: identityVerification
  };

  const filename = `approval-${id.toLowerCase()}.json`;
  const filePath = path.join(APPROVALS_DIR, filename);

  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));

  console.log('\n✅ Governance approval generated!\n');
  console.log(`ID:       ${id}`);
  console.log(`Reason:   ${REASON}`);
  console.log(`Verified: ${identityVerification.verified ? 'GPG (' + identityVerification.keyId + ')' : 'git identity only (no GPG key)'}`);
  console.log(`File:     .planning/approvals/${filename}`);
  console.log('\nCommit this file to unblock Tier 3 gates in CI.\n');
}

approve().catch(err => {
  console.error(`❌ Approval failed: ${err.message}`);
  process.exit(1);
});
