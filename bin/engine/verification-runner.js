'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const MAX_OUTPUT_LENGTH = 2000;

/**
 * Detect an ESLint configuration. Flat config (eslint 9+) and the legacy .eslintrc family both
 * count, as does an `eslintConfig` key in package.json, because `npx eslint .` succeeds with any
 * of them and fails with none.
 */
function hasEslintConfig(cwd) {
  const named = [
    'eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs',
    'eslint.config.ts', 'eslint.config.mts', 'eslint.config.cts',
    '.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json',
    '.eslintrc.yml', '.eslintrc.yaml',
  ];
  if (named.some((f) => fs.existsSync(path.join(cwd, f)))) return true;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    return Boolean(pkg.eslintConfig);
  } catch { return false; }
}

/**
 * Stage definitions — each maps a stage name to its command and an optional availability check.
 *
 * `skipIf(cwd)` returns a REASON STRING to skip, or false to run. A bare `true` still skips, for
 * compatibility, but a reason is strongly preferred: an unexplained skip in the report is nearly as
 * unhelpful as an unexplained failure.
 *
 * WHY EVERY STAGE NEEDS ONE. Only `typecheck` had an availability check, so `mindforge verify` on a
 * freshly installed, entirely healthy consumer project reported:
 *
 *     | tests     | ❌ fail |
 *     | lint      | ❌ fail |
 *     | audit     | ❌ fail |
 *     | typecheck | ⏭️ skip |
 *     **Summary:** 0 passed, 3 failed, 1 skipped        exit 1
 *
 * Measured on `node bin/install.js --claude --local` into an empty project: 1,836 files installed,
 * and no `tests/`, no ESLint config and no `bin/verify-audit.js` — because the installer ships none
 * of them, which is correct. So all three stages were reporting the ABSENCE of a tool as the
 * FAILURE of the thing it would have checked. The audit stage's "result" was a raw Node module
 * loader stack trace.
 *
 * "I cannot check this here" and "this is broken" are opposite statements, and a verifier that
 * conflates them is worse than one that runs nothing: it trains its user to ignore red.
 *
 * The recursion guard on `tests` is unchanged and separate — NODE_ENV=test is set by run-all.js and
 * MINDFORGE_VERIFICATION_ACTIVE=1 by this runner, and skipping prevents infinite nesting.
 */
const STAGE_DEFS = {
  tests: {
    command: 'node tests/run-all.js',
    skipIf: (cwd) => {
      if (process.env.MINDFORGE_VERIFICATION_ACTIVE === '1' || process.env.NODE_ENV === 'test') {
        return 'already inside a verification run (recursion guard)';
      }
      if (!fs.existsSync(path.join(cwd, 'tests', 'run-all.js'))) {
        return 'no tests/run-all.js here — the package does not install a test suite';
      }
      return false;
    },
  },
  lint: {
    // `--max-warnings=0` used to be here, which made this stage IMPOSSIBLE to pass in the repo it
    // ships from: measured, `npx eslint .` reports 199 problems / 0 errors / 199 warnings. So
    // `mindforge verify` reported a lint FAILURE on a tree whose lint is green by the project's own
    // definition — a confidently wrong answer, which is worse than no answer.
    //
    // Aligned with the project's own contract rather than a stricter threshold invented here:
    //   package.json  "lint": "eslint ."                      (warnings tolerated)
    //   CI            eslint . --max-warnings=9999            (warnings tolerated)
    //   sdk CI        eslint src/ --max-warnings 0            (strict, but only over sdk/src)
    // Two of the three tolerate warnings and the third is scoped to a different tree, so a
    // repo-wide zero-warning gate was this file's opinion alone. Errors still fail the stage,
    // because eslint exits non-zero on an error regardless of the warning threshold.
    command: 'npx eslint .',
    skipIf: (cwd) => (hasEslintConfig(cwd)
      ? false
      : 'no ESLint configuration here — nothing defines what lint means for this project'),
  },
  audit: {
    command: 'node bin/verify-audit.js',
    // The verifier itself, not the log: an absent AUDIT.jsonl is a legitimate empty chain that
    // verify-audit.js reports on correctly. What cannot be recovered from is the script being
    // missing, which is the state of every consumer install today — the installer does not copy
    // bin/verify-audit.js, so this stage died in Node's module loader and printed the stack trace
    // as its verification result.
    skipIf: (cwd) => (fs.existsSync(path.join(cwd, 'bin', 'verify-audit.js'))
      ? false
      : 'bin/verify-audit.js is not installed here, so the audit chain cannot be verified'),
  },
  typecheck: {
    command: 'npx tsc --noEmit',
    skipIf: (cwd) => (fs.existsSync(path.join(cwd, 'tsconfig.json'))
      ? false
      : 'no tsconfig.json here — nothing to typecheck'),
  },
};

/**
 * Run a single stage, returning a structured result object.
 */
function executeStage(name, cwd) {
  const def = STAGE_DEFS[name];
  if (!def) {
    return { name, status: 'skip', durationMs: 0, output: `Unknown stage: ${name}` };
  }

  // Check availability / skip condition. A reason string is carried through to the report, because
  // an unexplained skip leaves the reader unable to tell "not applicable here" from "silently
  // broken" — the same ambiguity that conflating absence with failure created.
  const skip = def.skipIf && def.skipIf(cwd);
  if (skip) {
    return {
      name,
      status: 'skip',
      durationMs: 0,
      output: typeof skip === 'string' ? skip : '',
      reason: typeof skip === 'string' ? skip : undefined,
    };
  }

  const start = Date.now();
  let output = '';
  let status = 'pass';

  try {
    const env = Object.assign({}, process.env, {
      MINDFORGE_VERIFICATION_ACTIVE: '1',
    });
    const result = execSync(def.command, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
      env,
    });
    output = (result || '').slice(0, MAX_OUTPUT_LENGTH);
  } catch (err) {
    status = 'fail';
    const stdout = err.stdout || '';
    const stderr = err.stderr || '';
    output = (stdout + '\n' + stderr).trim().slice(0, MAX_OUTPUT_LENGTH);
  }

  const durationMs = Date.now() - start;
  return { name, status, durationMs, output };
}

/**
 * Run verification across multiple stages.
 * @param {{ cwd: string, stages: string[] }} opts
 * @returns {Promise<object>} Structured verification result
 */
async function runVerification({ cwd, stages }) {
  const resolvedCwd = path.resolve(cwd);
  const results = [];

  for (const stageName of stages) {
    const result = executeStage(stageName, resolvedCwd);
    results.push(result);
  }

  const passed = results.filter(s => s.status === 'pass').length;
  const failed = results.filter(s => s.status === 'fail').length;
  const skipped = results.filter(s => s.status === 'skip').length;
  const totalDurationMs = results.reduce((sum, s) => sum + s.durationMs, 0);

  return {
    stages: results,
    summary: { passed, failed, skipped, totalDurationMs },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format a verification result as a markdown report.
 * @param {object} result — output from runVerification
 * @returns {string} Markdown report
 */
function formatReport(result) {
  const statusEmoji = { pass: '✅', fail: '❌', skip: '⏭️' };
  const lines = [];

  lines.push('# Verification Report');
  lines.push('');
  lines.push(`**Timestamp:** ${result.timestamp}`);
  lines.push('');
  lines.push('| Stage | Status | Duration | Note |');
  lines.push('|-------|--------|----------|------|');

  for (const stage of result.stages) {
    const emoji = statusEmoji[stage.status] || '?';
    const duration = stage.durationMs > 0 ? `${stage.durationMs}ms` : '-';
    // A skip without its reason is unreadable: this table used to show a bare `⏭️ skip` and left the
    // reader to guess whether the stage was inapplicable or quietly broken. Pipes are escaped so a
    // reason can never break the markdown table.
    const note = stage.status === 'skip' && stage.reason
      ? String(stage.reason).replace(/\|/g, '\\|')
      : '';
    lines.push(`| ${stage.name} | ${emoji} ${stage.status} | ${duration} | ${note} |`);
  }

  lines.push('');
  lines.push(`**Summary:** ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.skipped} skipped (${result.summary.totalDurationMs}ms total)`);

  // Say it outright when NOTHING ran. Adding availability checks fixed the false failures, but it
  // moved a consumer install from "3 failed, exit 1" to "0 failed, exit 0" — and bin/engine/
  // verify-cli.js exits on `failed > 0`, so a script reading $? now sees success for a run that
  // verified nothing. Whether an all-skipped run should exit non-zero is an open maintainer
  // decision and is deliberately NOT pre-empted here; what is not optional is that the report
  // refuses to look like a pass.
  if (result.summary.passed === 0 && result.summary.failed === 0 && result.summary.skipped > 0) {
    lines.push('');
    lines.push('> **NOTHING WAS VERIFIED.** Every stage was skipped, so this report is not '
      + 'evidence that anything works — see the Note column for what was unavailable. A verifier '
      + 'that ran no checks must not be read as a passing verifier.');
  }
  lines.push('');

  return lines.join('\n');
}

// STAGE_DEFS is exported so a test can compare the lint stage's threshold against the project's own
// lint script rather than hardcoding what it expects to find. Read-only by contract: mutating it
// would change every subsequent run in the same process.
module.exports = { runVerification, formatReport, STAGE_DEFS };
