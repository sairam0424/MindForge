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
    // Get list of changed files compared to origin/main or HEAD~1
    const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : 'HEAD~1';
    const diffFiles = execFileSync('git', ['diff', '--name-only', `${base}..HEAD`], { encoding: 'utf8' }).split('\n').filter(Boolean);
    
    let tier = 1;
    let reasons = [];

    // 1. Path-based detection (Tier 3)
    const matchedPath = diffFiles.find(file => SENSITIVE_PATHS.some(p => file.startsWith(p)));
    if (matchedPath) {
      tier = 3;
      reasons.push(`Sensitive path modified: ${matchedPath}`);
    }

    // 2. Pattern-based detection in diff (Tier 3)
    if (tier < 3) {
      const diffContent = execFileSync('git', ['diff', `${base}..HEAD`], { encoding: 'utf8' });
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
