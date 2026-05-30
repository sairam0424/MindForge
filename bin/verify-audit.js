#!/usr/bin/env node
'use strict';
const { verifyAuditChain } = require('./governance/audit-verifier');
const auditPath = process.argv[2] || '.planning/AUDIT.jsonl';
const result = verifyAuditChain(auditPath);
if (result.valid) {
  process.stdout.write(`✅ audit chain valid: ${result.count} entries\n`);
  process.exit(0);
} else {
  process.stderr.write(`❌ audit chain BROKEN at entry ${result.brokenAt}: ${result.reason}\n`);
  process.exit(1);
}
