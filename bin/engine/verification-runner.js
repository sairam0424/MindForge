'use strict';

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const MAX_OUTPUT_LENGTH = 2000;

/**
 * Stage definitions — each maps a stage name to its command and optional skip condition.
 */
const STAGE_DEFS = {
  tests: {
    command: 'node tests/run-all.js',
    skipIf: null,
  },
  lint: {
    command: 'npx eslint . --max-warnings=0',
    skipIf: null,
  },
  audit: {
    command: 'node bin/verify-audit.js',
    skipIf: null,
  },
  typecheck: {
    command: 'npx tsc --noEmit',
    skipIf: (cwd) => !fs.existsSync(path.join(cwd, 'tsconfig.json')),
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

  // Check skip condition
  if (def.skipIf && def.skipIf(cwd)) {
    return { name, status: 'skip', durationMs: 0, output: '' };
  }

  const start = Date.now();
  let output = '';
  let status = 'pass';

  try {
    const result = execSync(def.command, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
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
  lines.push('| Stage | Status | Duration |');
  lines.push('|-------|--------|----------|');

  for (const stage of result.stages) {
    const emoji = statusEmoji[stage.status] || '?';
    const duration = stage.durationMs > 0 ? `${stage.durationMs}ms` : '-';
    lines.push(`| ${stage.name} | ${emoji} ${stage.status} | ${duration} |`);
  }

  lines.push('');
  lines.push(`**Summary:** ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.skipped} skipped (${result.summary.totalDurationMs}ms total)`);
  lines.push('');

  return lines.join('\n');
}

module.exports = { runVerification, formatReport };
