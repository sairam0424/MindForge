#!/usr/bin/env node
'use strict';
const { verifyAuditChain } = require('./governance/audit-verifier');
const auditPath = process.argv[2] || '.planning/AUDIT.jsonl';
const result = verifyAuditChain(auditPath);
if (result.missing) {
  // Not a break: a project that has never written an audit entry has no chain to break. Measured
  // before this branch existed: an absent log printed "❌ audit chain BROKEN at entry 0: unreadable:
  // ENOENT..." and exited 1 — indistinguishable from real tamper detection to a brand-new user.
  process.stdout.write(`ℹ️  no audit log yet at ${auditPath} — one will be created on first audited action\n`);
  process.exit(0);
} else if (result.valid) {
  process.stdout.write(`✅ audit chain valid: ${result.count} entries\n`);
  process.exit(0);
} else {
  process.stderr.write(`❌ audit chain BROKEN at entry ${result.brokenAt}: ${result.reason}\n`);
  process.exit(1);
}
