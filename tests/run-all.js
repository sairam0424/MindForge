#!/usr/bin/env node
/**
 * MindForge — Unified Test Runner
 * Discovers and executes all tests/*.test.js files sequentially.
 *
 * Usage:
 *   node tests/run-all.js
 *   node tests/run-all.js --filter=sdk
 *   node tests/run-all.js --filter=security,audit
 *
 * Skip mechanism:
 *   If a test file's first line is `// @skip: reason`, it will be skipped.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TESTS_DIR = path.join(__dirname);

// ── Parse CLI flags ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const filterArg = args.find(a => a.startsWith('--filter='));
const filterPatterns = filterArg
  ? filterArg.replace('--filter=', '').split(',').map(p => p.trim().toLowerCase())
  : null;

// ── Discover test files ──────────────────────────────────────────────────────

function discoverTests() {
  const entries = fs.readdirSync(TESTS_DIR);
  const testFiles = entries
    .filter(f => f.endsWith('.test.js'))
    .filter(f => f !== 'run-all.js')
    .sort();

  if (filterPatterns) {
    return testFiles.filter(f => filterPatterns.some(p => f.toLowerCase().includes(p)));
  }

  return testFiles;
}

// ── Check skip directive ─────────────────────────────────────────────────────

function getSkipReason(filePath) {
  const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0];
  const match = firstLine.match(/^\/\/\s*@skip:\s*(.+)/);
  return match ? match[1].trim() : null;
}

// ── Execute a single test file ───────────────────────────────────────────────

function runTest(filePath) {
  const startTime = process.hrtime.bigint();
  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  try {
    stdout = execFileSync('node', [filePath], {
      encoding: 'utf8',
      timeout: 60000,
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    exitCode = err.status || 1;
    stdout = err.stdout || '';
    stderr = err.stderr || '';
  }

  const endTime = process.hrtime.bigint();
  const durationMs = Number(endTime - startTime) / 1_000_000;

  return { exitCode, stdout, stderr, durationMs };
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const testFiles = discoverTests();

  if (testFiles.length === 0) {
    console.log('No test files found.');
    process.exit(0);
  }

  console.log(`\nMindForge Test Runner — ${testFiles.length} file(s) discovered\n`);
  console.log('─'.repeat(60));

  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;
  const results = [];

  for (const file of testFiles) {
    const filePath = path.join(TESTS_DIR, file);
    const skipReason = getSkipReason(filePath);

    if (skipReason) {
      console.log(`  ○ SKIP  ${file} (${skipReason})`);
      skipCount++;
      results.push({ file, status: 'skipped', reason: skipReason, durationMs: 0 });
      continue;
    }

    const { exitCode, stdout, stderr, durationMs } = runTest(filePath);
    const duration = durationMs.toFixed(0);

    if (exitCode === 0) {
      console.log(`  ✓ PASS  ${file} (${duration}ms)`);
      passCount++;
      results.push({ file, status: 'passed', durationMs });
    } else {
      console.log(`  ✗ FAIL  ${file} (${duration}ms)`);
      if (stderr) {
        const lines = stderr.split('\n').slice(0, 8);
        lines.forEach(line => console.log(`         ${line}`));
      } else if (stdout) {
        const lines = stdout.split('\n').slice(-8);
        lines.forEach(line => console.log(`         ${line}`));
      }
      failCount++;
      results.push({ file, status: 'failed', durationMs });
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  const total = passCount + failCount + skipCount;
  const totalTime = results.reduce((sum, r) => sum + r.durationMs, 0).toFixed(0);

  console.log('\n' + '─'.repeat(60));
  console.log(`\nResults: ✓ ${passCount} passed, ✗ ${failCount} failed, ○ ${skipCount} skipped, ${total} total`);
  console.log(`Time:    ${totalTime}ms\n`);

  if (failCount > 0) {
    const failedFiles = results.filter(r => r.status === 'failed').map(r => r.file);
    console.log('Failed tests:');
    failedFiles.forEach(f => console.log(`  - ${f}`));
    console.log('');
    process.exit(1);
  }
}

main();
