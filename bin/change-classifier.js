#!/usr/bin/env node
/**
 * MindForge Change Classifier
 * Categorizes changes into Tiers based on risk and sensitivity.
 */

'use strict';

const { execSync, execFileSync } = require('child_process');
const fs = require('fs');

const SENSITIVE_PATHS = [
  'auth/',
  'payment/',
  'security/',
  '.github/workflows/',
  '.mindforge/governance/',
  'bin/models/'
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

function classify() {
  try {
    // Get list of changed files compared to origin/<base> or HEAD~1.
    // Three-dot (...) diffs against the MERGE-BASE, so on a PR branch that is behind its base
    // we see ONLY this branch's own changes — not unrelated commits already on the base.
    // (Two-dot here caused Tier-3 false positives by pulling in base-only changes.)
    const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'HEAD~1';
    const range = process.env.GITHUB_BASE_REF ? `${base}...HEAD` : `${base}..HEAD`;
    const diffFiles = execFileSync('git', ['diff', '--name-only', range], { encoding: 'utf8' }).split('\n').filter(Boolean);

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
    console.error(`❌ Classification failed: ${err.message}`);
    // Default to Tier 3 for safety if classification fails
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, 'tier=3\n');
    }
    process.exit(0); // Don't fail the pipeline yet, let the gate handle it
  }
}

classify();
