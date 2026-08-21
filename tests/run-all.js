#!/usr/bin/env node
/**
 * MindForge — Unified Test Runner
 * Recursively walks tests/ and executes every file ending in .test.js, each in its
 * own child process, sequentially, with the repo root as cwd. Directories matching
 * SKIP_DIRS are pruned; that prune applies to DIRECTORIES ONLY, never to files.
 *
 * Usage:
 *   node tests/run-all.js
 *   node tests/run-all.js --filter=sdk
 *   node tests/run-all.js --filter=security,audit
 *   node tests/run-all.js --filter=sdk --allow-empty
 *
 * Exit codes:
 *   0  every selected file passed (or was skipped)
 *   1  a file failed, OR nothing was discovered / nothing was selected
 *      (see RUNNER-FLOOR in main() — an empty run is never a pass)
 *
 * Skip mechanism:
 *   If a test file's first line is `// @skip: reason`, it will be skipped.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TESTS_DIR = path.join(__dirname);
// Scratch dirs some suites create (tests/tmp-graph, tests/tmp-learning-test) must
// never contribute test files, or a crashed run leaves behind a phantom suite.
const SKIP_DIRS = /^(tmp-|node_modules$|\.)/;

// ── Parse CLI flags ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const filterArg = args.find(a => a.startsWith('--filter='));
const filterPatterns = filterArg
  ? filterArg.replace('--filter=', '').split(',').map(p => p.trim().toLowerCase())
  : null;
// An empty test selection is a failure by default (see RUNNER-FLOOR in main()).
// --allow-empty is the explicit opt-out for an exploratory --filter, mirroring the
// Jest/Vitest --passWithNoTests precedent. It never applies to zero discovery.
const allowEmpty = args.includes('--allow-empty');

// ── Discover test files ──────────────────────────────────────────────────────

function discoverTests(patterns = filterPatterns) {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const abs = path.join(dir, e.name);
    // SKIP_DIRS must be tested only for directories. Applying it to every dirent
    // also silently dropped FILES whose names begin with 'tmp-' or '.', which the
    // previous flat glob would have run.
    if (e.isDirectory()) return SKIP_DIRS.test(e.name) ? [] : walk(abs);
    return e.name.endsWith('.test.js') ? [path.relative(TESTS_DIR, abs)] : [];
  });
  const testFiles = walk(TESTS_DIR).sort();

  if (patterns) {
    return testFiles.filter(f => patterns.some(p => f.toLowerCase().includes(p)));
  }

  return testFiles;
}

// ── Check skip directive ─────────────────────────────────────────────────────

function getSkipReason(filePath) {
  const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0];
  const match = firstLine.match(/^\/\/\s*@skip:\s*(.+)/);
  return match ? match[1].trim() : null;
}

// ── Check timeout directive ───────────────────────────────────────────────────
// A test file may override the default 60s timeout by placing the following
// directive on its first line:
//   // @timeout: <milliseconds>
// e.g.  // @timeout: 90000

function getTimeoutMs(filePath) {
  const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0];
  const match = firstLine.match(/^\/\/\s*@timeout:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 60000;
}

// ── Execute a single test file ───────────────────────────────────────────────

function runTest(filePath) {
  const startTime = process.hrtime.bigint();
  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  const timeoutMs = getTimeoutMs(filePath);

  try {
    stdout = execFileSync('node', [filePath], {
      encoding: 'utf8',
      timeout: timeoutMs,
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
  // Discovery runs twice when a filter is present: once unfiltered, to prove the
  // suite exists at all, and once filtered, to choose what to run. discoverTests
  // stays the single implementation of the match rule; the extra walk is one
  // readdir of tests/ and costs nothing measurable.
  const allFiles = discoverTests(null);
  const testFiles = filterPatterns ? discoverTests(filterPatterns) : allFiles;

  // RUNNER-FLOOR. This branch used to print 'No test files found.' and exit 0, so
  // an empty suite reported success. Every quality claim in the repo rests on this
  // exit code: mindforge-ci.yml gates coverage with
  // `npx c8 --check-coverage --lines 30 node tests/run-all.js`, and
  // mindforge-release.yml runs `npm test` as the ONLY quality step before
  // `npm publish`. A partial checkout of tests/, or a discovery regression, would
  // therefore have shipped green. (A wrong cwd cannot cause this: TESTS_DIR is
  // resolved from __dirname at line 23, not from process.cwd().) Zero discovered files is never a pass, and
  // --allow-empty deliberately cannot suppress this branch.
  if (allFiles.length === 0) {
    console.error(`\n✗ RUNNER-FLOOR: no *.test.js file discovered under ${TESTS_DIR}`);
    console.error('  Nothing ran, so nothing passed. This is a discovery/checkout failure, not a green suite.');
    process.exit(1);
  }

  // A --filter matching nothing is the same false green in miniature: the caller
  // asked for a selection and got an empty one. Fail it, and offer --allow-empty
  // for the deliberate case, rather than silently exiting 0.
  if (testFiles.length === 0) {
    const selector = `--filter=${filterPatterns.join(',')}`;
    if (allowEmpty) {
      console.log(`\n○ ${selector} matched 0 of ${allFiles.length} discovered file(s); --allow-empty given, treating as pass.`);
      return;
    }
    console.error(`\n✗ RUNNER-FLOOR: ${selector} matched 0 of ${allFiles.length} discovered file(s)`);
    console.error('  Nothing ran, so nothing passed. Fix the filter, or pass --allow-empty if an empty selection is intended.');
    process.exit(1);
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

module.exports = { discoverTests, getSkipReason, getTimeoutMs };

if (require.main === module) main();
