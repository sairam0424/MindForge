#!/usr/bin/env node
'use strict';

/**
 * verify-cli.js — Entrypoint for the `verify` CLI command.
 * Calls the unified verification runner across all stages, prints the formatted report, and writes it
 * to .planning/VERIFICATION.md only when asked with --write.
 *
 * WHY --write RATHER THAN ALWAYS. `.planning/VERIFICATION.md` is TRACKED (`git ls-files` returns it),
 * and this file used to overwrite it on every run — so a contributor who ran the project's own
 * verification dirtied a tracked file and had to remember to discard it. Nothing reads the root
 * report: the only other reference is tests/e2e.test.js:399, and that reads
 * `.planning/phases/1/VERIFICATION-1.md`, a per-phase fixture in a generated project, not this file.
 * The report was already printed to stdout, so gating the file loses no information.
 *
 * Untracking the file is the other half and belongs to the operator (`git rm --cached` plus a
 * .gitignore entry). This change is correct either way: with the file untracked, --write becomes a
 * convenience; while it stays tracked, --write is what stops the dirtying.
 */

const path = require('path');
const fs = require('fs');
const { runVerification, formatReport } = require('./verification-runner');

const STAGES = ['tests', 'lint', 'audit', 'typecheck'];
const CWD = process.env.MINDFORGE_ROOT || path.resolve(__dirname, '../..');
const REPORT_NAME = 'VERIFICATION.md';

async function main() {
  const shouldWrite = process.argv.slice(2).includes('--write');

  const result = await runVerification({ cwd: CWD, stages: STAGES });
  const report = formatReport(result);

  if (shouldWrite) {
    const planningDir = path.join(CWD, '.planning');
    if (!fs.existsSync(planningDir)) {
      fs.mkdirSync(planningDir, { recursive: true });
    }
    const reportPath = path.join(planningDir, REPORT_NAME);
    fs.writeFileSync(reportPath, report);
    process.stdout.write(`Report written to ${reportPath}\n`);
  }

  process.stdout.write(report + '\n');
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Verification runner failed:', err.message);
  process.exit(1);
});
