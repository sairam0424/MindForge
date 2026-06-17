#!/usr/bin/env node
'use strict';

/**
 * verify-cli.js — Entrypoint for the `verify` CLI command.
 * Calls the unified verification runner across all stages and writes
 * the formatted report to .planning/VERIFICATION.md.
 */

const path = require('path');
const fs = require('fs');
const { runVerification, formatReport } = require('./verification-runner');

const STAGES = ['tests', 'lint', 'audit', 'typecheck'];
const CWD = process.env.MINDFORGE_ROOT || path.resolve(__dirname, '../..');

async function main() {
  const planningDir = path.join(CWD, '.planning');
  if (!fs.existsSync(planningDir)) {
    fs.mkdirSync(planningDir, { recursive: true });
  }

  const result = await runVerification({ cwd: CWD, stages: STAGES });
  const report = formatReport(result);

  fs.writeFileSync(path.join(planningDir, 'VERIFICATION.md'), report);
  process.stdout.write(report + '\n');
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Verification runner failed:', err.message);
  process.exit(1);
});
