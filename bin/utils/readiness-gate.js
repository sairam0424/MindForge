#!/usr/bin/env node
'use strict';

/**
 * MindForge — Reusable deterministic readiness-gate engine.
 *
 * Adapted from ECC's observability-readiness.js engine SHAPE (buildReport /
 * renderText / {pass, fix, points, top_actions} / exit 0|1). This is the shared
 * helper that bin/harness-audit.js's pattern and a release-readiness check-set
 * both reuse, instead of shipping two near-identical engines.
 *
 * A "check set" is an array of { id, label, points, pass:boolean, fix:string }.
 * buildReport scores them; renderText prints; runGate exits 0 (pass) or 1 (fail)
 * so CI can block on it.
 *
 * Also ships a MindForge RELEASE-READINESS check set: version parity across
 * package.json / MINDFORGE.md / config.json, RELEASENOTES + CHANGELOG presence,
 * and required .planning artifacts.
 */

const fs = require('fs');
const path = require('path');

const RUBRIC_VERSION = '2026-06-10';

function fileExists(root, rel) {
  return fs.existsSync(path.join(root, rel));
}

function safeRead(root, rel) {
  try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch { return ''; }
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

/**
 * Score a check set into the standard report contract.
 */
function buildReport(name, checks) {
  const maxScore = checks.reduce((s, c) => s + c.points, 0);
  const score = checks.filter(c => c.pass).reduce((s, c) => s + c.points, 0);
  const failed = checks.filter(c => !c.pass);
  const topActions = failed
    .slice()
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map(c => ({ action: c.fix, id: c.id, points: c.points }));

  return {
    gate: name,
    deterministic: true,
    rubric_version: RUBRIC_VERSION,
    score,
    max_score: maxScore,
    pass: failed.length === 0,
    checks: checks.map(c => ({ id: c.id, label: c.label, points: c.points, pass: c.pass })),
    top_actions: topActions,
  };
}

function renderText(report) {
  const lines = [`${report.gate} readiness: ${report.score}/${report.max_score} ${report.pass ? '(PASS)' : '(FAIL)'}`, ''];
  for (const c of report.checks) {
    lines.push(`  ${c.pass ? 'PASS' : 'FAIL'}  [${c.points}] ${c.label}`);
  }
  if (report.top_actions.length) {
    lines.push('', 'Top actions:');
    report.top_actions.forEach((a, i) => lines.push(`  ${i + 1}) ${a.action} (${a.id})`));
  }
  return lines.join('\n');
}

/**
 * MindForge release-readiness check set. CI can block a release on this.
 */
function releaseReadinessChecks(root) {
  const pkg = safeJson(safeRead(root, 'package.json')) || {};
  const mindforgeMd = safeRead(root, 'MINDFORGE.md');
  const config = safeJson(safeRead(root, '.mindforge/config.json')) || {};

  const pkgVersion = pkg.version || '';
  const mdVersionMatch = mindforgeMd.match(/\[VERSION\]\s*=\s*([0-9]+\.[0-9]+\.[0-9]+)/);
  const mdVersion = mdVersionMatch ? mdVersionMatch[1] : '';
  const configVersion = config.version || '';

  return [
    {
      id: 'version-parity-md',
      label: 'package.json version matches MINDFORGE.md [VERSION]',
      points: 3,
      pass: Boolean(pkgVersion) && pkgVersion === mdVersion,
      fix: `Align versions: package.json=${pkgVersion || '?'} vs MINDFORGE.md=${mdVersion || '?'}`,
    },
    {
      id: 'version-parity-config',
      label: 'package.json version matches .mindforge/config.json version',
      points: 3,
      pass: Boolean(pkgVersion) && pkgVersion === configVersion,
      fix: `Align versions: package.json=${pkgVersion || '?'} vs config.json=${configVersion || '?'}`,
    },
    {
      id: 'releasenotes',
      label: 'RELEASENOTES.md present',
      points: 2,
      pass: fileExists(root, 'RELEASENOTES.md'),
      fix: 'Add RELEASENOTES.md for this release.',
    },
    {
      id: 'changelog',
      label: 'CHANGELOG.md present',
      points: 2,
      pass: fileExists(root, 'CHANGELOG.md'),
      fix: 'Add/update CHANGELOG.md.',
    },
    {
      id: 'security-policy',
      label: 'SECURITY.md + agentic threat model present',
      points: 2,
      pass: fileExists(root, 'SECURITY.md') && fileExists(root, 'MINDFORGE-AGENTIC-SECURITY.md'),
      fix: 'Ensure SECURITY.md and MINDFORGE-AGENTIC-SECURITY.md exist.',
    },
    {
      id: 'test-entrypoint',
      label: 'test runner present (tests/run-all.js or npm test)',
      points: 2,
      pass: fileExists(root, 'tests/run-all.js') || typeof pkg.scripts?.test === 'string',
      fix: 'Add tests/run-all.js or a package.json test script.',
    },
  ];
}

const GATES = {
  release: releaseReadinessChecks,
};

function runGate(name, root) {
  const builder = GATES[name];
  if (!builder) throw new Error(`Unknown gate: ${name}. Available: ${Object.keys(GATES).join(', ')}`);
  return buildReport(name, builder(root));
}

module.exports = { buildReport, renderText, runGate, releaseReadinessChecks, fileExists, safeRead, safeJson, RUBRIC_VERSION, GATES };

// CLI: node bin/utils/readiness-gate.js [gate] [--format json] [--root dir]
if (require.main === module) {
  const args = process.argv.slice(2);
  let gate = 'release';
  let format = 'text';
  let root = process.cwd();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--format') { format = (args[++i] || 'text').toLowerCase(); continue; }
    if (a.startsWith('--format=')) { format = a.split('=')[1].toLowerCase(); continue; }
    if (a === '--root') { root = path.resolve(args[++i] || process.cwd()); continue; }
    if (a.startsWith('--root=')) { root = path.resolve(a.split('=')[1]); continue; }
    if (!a.startsWith('-')) { gate = a; continue; }
  }
  try {
    const report = runGate(gate, root);
    if (format === 'json') process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    else process.stdout.write(renderText(report) + '\n');
    process.exit(report.pass ? 0 : 1);
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }
}
