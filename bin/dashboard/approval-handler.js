/**
 * MindForge v2 — Approval Handler
 * Handles POST /api/approve/:id — approve or reject governance requests.
 * Reads/writes APPROVAL-*.json files in .planning/approvals/
 */
'use strict';

const fs   = require('fs');
const path = require('path');

// Paths resolved lazily for testing
const getPaths = () => ({
  approvals: path.join(process.cwd(), '.planning', 'approvals'),
  audit:     path.join(process.cwd(), '.planning', 'AUDIT.jsonl'),
});

/**
 * Process an approval decision from the dashboard.
 * @param {string} approvalId - The APPROVAL UUID
 * @param {string} decision   - 'approve' or 'reject'
 * @param {string} comment    - Optional comment
 * @param {string} approver   - Approver identifier (email or name)
 * @returns {{ success, decision, message }}
 */
function processDecision(approvalId, decision, comment, approver, confirmationId = null) {
  // Input validation
  if (!approvalId || typeof approvalId !== 'string') {
    return { success: false, error: 'Invalid approval ID' };
  }

  // Sanitize approvalId — only allow UUID characters
  if (!/^[a-f0-9-]{36}$/.test(approvalId)) {
    return { success: false, error: 'Malformed approval ID format' };
  }

  if (!['approve', 'reject'].includes(decision)) {
    return { success: false, error: 'Decision must be "approve" or "reject"' };
  }

  // Find the approval file
  const paths    = getPaths();
  const filePath = path.join(paths.approvals, `APPROVAL-${approvalId}.json`);
  if (!fs.existsSync(filePath)) {
    return { success: false, error: `Approval not found: ${approvalId}` };
  }

  let approval;
  try {
    approval = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return { success: false, error: 'Cannot parse approval file' };
  }

  // Validate approval is still pending
  if (approval.status !== 'pending') {
    return { success: false, error: `Approval already ${approval.status}` };
  }

  // Check expiry
  if (approval.expires_at && new Date(approval.expires_at) < new Date()) {
    return { success: false, error: 'Approval has expired' };
  }

  // TIER 3 CONFIRMATION — require typing the plan ID
  if (approval.tier === 3 && decision === 'approve') {
    const expectedConfirmation = `${approval.phase}-${approval.plan}`;
    if (!confirmationId || confirmationId.trim() !== expectedConfirmation) {
      return {
        success: false,
        error: `Tier 3 approval requires typing the plan ID "${expectedConfirmation}" to confirm.`,
        confirmation_required: true,
        expected: expectedConfirmation,
        tier3_warning: 'This is a Tier 3 change (auth/payment/PII). Review the code diff before approving.',
      };
    }
  }

  // Write AUDIT entry FIRST (before updating file)
  writeAuditEntry({
    id:          require('crypto').randomBytes(8).toString('hex'),
    timestamp:   new Date().toISOString(),
    event:       decision === 'approve' ? 'approval_granted' : 'approval_rejected',
    approval_id: approvalId,
    tier:        approval.tier,
    phase:       approval.phase,
    plan:        approval.plan,
    resolved_by: approver || 'dashboard',
    comment:     comment || null,
    agent:       'mindforge-dashboard',
    session_id:  'dashboard',
  });

  // Update approval file
  const updated = {
    ...approval,
    status:       decision === 'approve' ? 'approved' : 'rejected',
    resolved_at:  new Date().toISOString(),
    resolved_by:  approver || 'dashboard',
    comment:      comment || null,
    resolution_channel: 'mindforge-dashboard',
  };

  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));

  return {
    success:     true,
    decision,
    approval_id: approvalId,
    tier:        approval.tier,
    message:     `${approval.tier === 3 ? 'Tier 3' : 'Tier 2'} approval ${decision}d for Plan ${approval.phase}-${approval.plan}`,
  };
}

function writeAuditEntry(entry) {
  try {
    const paths = getPaths();
    if (!fs.existsSync(path.dirname(paths.audit))) return;
    // UC-04b: unified, hash-chained, durable append into the single verifiable chain.
    const { appendAuditEntrySync } = require('../autonomous/audit-writer');
    appendAuditEntrySync(paths.audit, entry);
  } catch { /* ignore AUDIT write failures */ }
}

function listApprovals() {
  const paths = getPaths();
  if (!fs.existsSync(paths.approvals)) return [];
  return fs.readdirSync(paths.approvals)
    .filter(f => f.startsWith('APPROVAL-') && f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(paths.approvals, f), 'utf8')); }
      catch { return null; }
    })
    .filter(Boolean);
}

module.exports = { processDecision, listApprovals };
