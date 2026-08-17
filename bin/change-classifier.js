#!/usr/bin/env node
/**
 * MindForge Change Classifier
 * Categorizes changes into Tiers based on risk and sensitivity.
 */

'use strict';

const { execSync, execFileSync } = require('child_process');
const fs = require('fs');

// Matched with String.prototype.startsWith against repo-relative diff paths.
//
// Two groups, because this file SHIPS (package.json files[] includes bin/) and therefore runs
// against two different trees:
//
//   (a) CONSUMER paths — a project that installed MindForge. Measured against MindForge's own
//       tree these match ZERO tracked files, which is correct: they describe the consumer's
//       layout, not the framework's. Do not remove them.
//   (b) FRAMEWORK paths — MindForge's OWN trust surface, which control-plane.yml classifies on
//       every push and PR to this repo. These were absent, so the detector protected the five
//       markdown files under .mindforge/governance/ while leaving the 15 executable modules
//       under bin/governance/ — the audit hasher, the verifier, RBAC, the policy engine and
//       approve.js itself — unclassified. Editing the prose ABOUT governance tripped Tier 3;
//       editing the code that enforces it did not.
const SENSITIVE_PATHS = [
  // (a) consumer-project layout
  'auth/',
  'payment/',
  'security/',
  // (b) MindForge's own trust surface
  'bin/governance/',        // audit-hash, audit-verifier, rbac, policy-engine, approve
  'bin/security/',          // trust-gate-hook and friends — NOT matched by 'security/'
  'bin/hooks/',             // instinct-capture-hook, context-monitor
  'bin/models/',
  '.agent/hooks/',          // the hook dispatcher the installer copies
  '.claude/settings.json',  // hook registration
  '.agent/settings.json',
  '.planning/approvals/',   // the approval records themselves
  '.github/workflows/',
  '.mindforge/governance/'
];

const SENSITIVE_PATTERNS = [
  /jwt/i,
  /bcrypt/i,
  /stripe/i,
  /apiKey/i,
  /password/i,
  /secret/i,
  /token/i,
  /PII/
];

/** True if `rev` resolves to an object in this clone (false on a shallow/partial fetch). */
function revExists(rev) {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${rev}^{commit}`], { stdio: 'pipe' });
    return true;
  } catch { return false; }
}

/** The pre-push tip GitHub reports for a push event, or '' if unavailable. */
function pushBefore() {
  if (process.env.MINDFORGE_PUSH_BEFORE) return process.env.MINDFORGE_PUSH_BEFORE;
  // Read the event payload rather than requiring the workflow to thread a variable through.
  // A fix that depends on someone remembering `env: BEFORE: ${{ github.event.before }}` is a
  // fix that silently reverts the first time a workflow is copied.
  const p = process.env.GITHUB_EVENT_PATH;
  if (!p || !fs.existsSync(p)) return '';
  try { return JSON.parse(fs.readFileSync(p, 'utf8')).before || ''; } catch { return ''; }
}

/**
 * Resolve the commit range to classify.
 *
 * A push is a RANGE, not a commit. The old code used HEAD~1..HEAD whenever GITHUB_BASE_REF was
 * unset, so on a push it inspected only the tip. Measured: two commits where the first adds
 * auth/login.js with a hardcoded password and the second is docs-only classify as TIER=1 on a
 * push and TIER=3 as a PR — the sensitive file rides in completely unclassified. control-plane.yml
 * triggers on `push: [main, develop]`, and this repo has allow_rebase_merge enabled, so the
 * multi-commit push is the normal case, not an edge case.
 *
 * @returns {{range:string, how:string}}
 * @throws {Error} with .failClosed when a CI push range cannot be resolved.
 */
function resolveRange() {
  // Pull request: three-dot diffs against the MERGE-BASE, so a branch that is merely behind
  // its base does not pick up base-only changes. (Two-dot here caused Tier-3 false positives.)
  if (process.env.GITHUB_BASE_REF) {
    return { range: `origin/${process.env.GITHUB_BASE_REF}...HEAD`, how: 'pull_request' };
  }

  const inCiPush = process.env.GITHUB_EVENT_NAME === 'push';
  if (inCiPush) {
    const before = pushBefore();
    const isBranchCreation = /^0{40}$/.test(before);
    if (before && !isBranchCreation && revExists(before)) {
      return { range: `${before}..HEAD`, how: 'push' };
    }
    // Fail CLOSED. Every remaining case genuinely cannot be scoped: a new branch has no prior
    // tip, and a shallow clone cannot reach `before`. Falling back to HEAD~1 here is what let
    // a sensitive commit ride in behind a benign tip.
    const why = isBranchCreation ? 'branch creation (before is all-zeros)'
      : !before ? 'no `before` in the push event payload'
        : `\`before\` (${before.slice(0, 12)}) is not present in this clone — shallow fetch?`;
    const err = new Error(`cannot scope the push range: ${why}`);
    err.failClosed = true;
    throw err;
  }

  // Local invocation (`mindforge classify`). HEAD~1..HEAD is a developer convenience, not a
  // gate, and must never be reached in CI — the branch above owns every CI push.
  return { range: 'HEAD~1..HEAD', how: 'local' };
}

function classify() {
  try {
    const { range, how } = resolveRange();
    const diffFiles = execFileSync('git', ['diff', '--name-only', range], { encoding: 'utf8' }).split('\n').filter(Boolean);
    if (process.env.MINDFORGE_CLASSIFY_DEBUG) console.error(`[classify] ${how}: ${range} (${diffFiles.length} file(s))`);

    // Test and documentation files are excluded from the sensitive-PATTERN scan below: a test
    // asserting on "password"/key patterns, or a doc mentioning secrets, is not a sensitive
    // change and must not trip Tier 3. (Path-based detection still covers genuinely sensitive
    // source paths.) This is the fix for test-only PRs being misclassified as Tier 3.
    const isTestOrDoc = (f) =>
      /(^|\/)(tests?|__tests__|docs)\//.test(f) || /\.(test|spec)\.[cm]?[jt]s$/.test(f) || f.endsWith('.md');

    let tier = 1;
    let reasons = [];

    // 1. Path-based detection (Tier 3)
    const matchedPath = diffFiles.find(file => SENSITIVE_PATHS.some(p => file.startsWith(p)));
    if (matchedPath) {
      tier = 3;
      reasons.push(`Sensitive path modified: ${matchedPath}`);
    }

    // 2. Pattern-based detection in diff (Tier 3) — non-test/doc files only
    if (tier < 3) {
      const scanFiles = diffFiles.filter(f => !isTestOrDoc(f));
      const diffContent = scanFiles.length
        ? execFileSync('git', ['diff', range, '--', ...scanFiles], { encoding: 'utf8' })
        : '';
      for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.test(diffContent)) {
          tier = 3;
          reasons.push(`Sensitive pattern detected: ${pattern}`);
          break;
        }
      }
    }

    // 3. Simple change (Tier 1 vs 2)
    if (tier < 3) {
      if (diffFiles.length > 10 || diffFiles.some(f => f.endsWith('.js') || f.endsWith('.ts'))) {
        tier = 2; // Significant logic change
        if (diffFiles.length > 10) {
          reasons.push(`Large changeset: ${diffFiles.length} files modified`);
        } else {
          const jsFile = diffFiles.find(f => f.endsWith('.js') || f.endsWith('.ts'));
          if (jsFile) reasons.push(`JavaScript/TypeScript file modified: ${jsFile}`);
        }
      }
    }

    console.log(`TIER=${tier}`);
    console.log(`REASONS=${reasons.join('; ')}`);
    
    // Write to GITHUB_OUTPUT if available
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `tier=${tier}\n`);
    }

    return tier;
  } catch (err) {
    // Fail closed: an unscopeable change is treated as maximum risk. Emit the SAME
    // TIER=/REASONS= lines as the success path so every consumer — the workflow's stdout
    // parsing, GITHUB_OUTPUT, and a human reading the log — sees tier 3 rather than nothing.
    // Previously only GITHUB_OUTPUT was written, so anything reading stdout saw no tier at all.
    const reason = err.failClosed
      ? `Fail-closed: ${err.message}`
      : `Fail-closed: classification error — ${err.message}`;
    console.log('TIER=3');
    console.log(`REASONS=${reason}`);
    console.error(`❌ Classification could not be scoped — defaulting to Tier 3. ${err.message}`);
    if (process.env.GITHUB_ACTIONS) {
      console.error(`::error title=Change classification failed closed::${reason}`);
    }
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, 'tier=3\n');
    }
    // Exit 0 deliberately: this step's contract is to REPORT a tier, and the downstream gate
    // is what blocks. Exiting non-zero here would fail the job before the gate can annotate
    // why. That contract is only honest while a gate actually consumes tier 3 — see
    // tests/change-classifier.test.js, which pins that the tier-3 consumer exists.
    return 3;
  }
}

module.exports = { classify, resolveRange, revExists, pushBefore, SENSITIVE_PATHS, SENSITIVE_PATTERNS };

// Behind a require.main guard so tests can import the pure pieces without triggering a run.
// bin/mindforge-cli.js:51 spawns this file as a script, which still executes normally.
if (require.main === module) classify();
