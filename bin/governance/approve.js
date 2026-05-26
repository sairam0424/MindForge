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

const REASON = process.argv[2] || 'Manual approval for sensitive changes.';
const ROOT = path.resolve(__dirname, '../../');
const APPROVALS_DIR = path.join(ROOT, '.planning/approvals');

if (!fs.existsSync(APPROVALS_DIR)) {
  fs.mkdirSync(APPROVALS_DIR, { recursive: true });
}

async function approve() {
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  const id = `MF-AUTH-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date().toISOString();
  
  // Calculate a mock signature based on current state (can be hardened with real crypto sign later)
  const signature = crypto.createHash('sha256')
    .update(`${id}:${REASON}:${timestamp}:${os.hostname()}`)
    .digest('hex');

  const record = {
    id,
    project: pkg.name,
    version: pkg.version,
    tier: 3,
    approved_by: process.env.USER || 'MindForge User',
    timestamp,
    reason: REASON,
    signature: `sha256:${signature}`
  };

  const filename = `approval-${id.toLowerCase()}.json`;
  const filePath = path.join(APPROVALS_DIR, filename);

  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  
  console.log('\n✅ Governance approval generated!\n');
  console.log(`ID:       ${id}`);
  console.log(`Reason:   ${REASON}`);
  console.log(`File:     .planning/approvals/${filename}`);
  console.log('\nCommit this file to unblock Tier 3 gates in CI.\n');
}

approve().catch(err => {
  console.error(`❌ Approval failed: ${err.message}`);
  process.exit(1);
});
