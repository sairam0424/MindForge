#!/usr/bin/env node
/**
 * MindForge Skill Validator — v1.0.0
 * Validates SKILL.md files against schema and content requirements.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const NO_COLOR = ARGS.includes('--no-color');

const colors = {
  reset:  NO_COLOR ? '' : '\x1b[0m',
  red:    NO_COLOR ? '' : '\x1b[31m',
  green:  NO_COLOR ? '' : '\x1b[32m',
  yellow: NO_COLOR ? '' : '\x1b[33m',
  cyan:   NO_COLOR ? '' : '\x1b[36m',
  bold:   NO_COLOR ? '' : '\x1b[1m'
};

function main() {
  const target = ARGS[0];
  if (!target || ARGS.includes('--help') || ARGS.includes('-h')) {
    console.log('\nUsage: mindforge-cc validate-skill <path-to-SKILL.md>\n');
    process.exit(0);
  }

  const filePath = path.resolve(process.cwd(), target);
  if (!fs.existsSync(filePath)) {
    console.error(`${colors.red}❌ File not found: ${filePath}${colors.reset}`);
    process.exit(1);
  }

  console.log(`\n${colors.bold}MindForge Skill Validator — ${path.basename(filePath)}${colors.reset}`);
  console.log('─'.repeat(60));

  const content = fs.readFileSync(filePath, 'utf8');
  const results = { schema: [], content: [], quality: [], valid: true };

  // ── Level 1: Schema ─────────────────────────────────────────────────────────
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    results.schema.push({ ok: false, msg: 'Missing frontmatter (--- delimiters)' });
    results.valid = false;
  } else {
    results.schema.push({ ok: true, msg: 'Frontmatter delimiters present' });
    const fmLines = fmMatch[1].split('\n');
    const fm = {};
    fmLines.forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) fm[parts[0].trim()] = parts.slice(1).join(':').trim();
    });

    // name
    if (!fm.name) {
      results.schema.push({ ok: false, msg: 'Missing field: name' });
      results.valid = false;
    } else if (!/^[a-z][a-z0-9-]+$/.test(fm.name)) {
      results.schema.push({ ok: false, msg: `Invalid name format: ${fm.name} (must be kebab-case)` });
      results.valid = false;
    } else {
      results.schema.push({ ok: true, msg: `name: ${fm.name}` });
    }

    // version
    if (!fm.version) {
      results.schema.push({ ok: false, msg: 'Missing field: version' });
      results.valid = false;
    } else if (!/^\d+\.\d+\.\d+$/.test(fm.version)) {
      results.schema.push({ ok: false, msg: `Invalid version: ${fm.version} (must be x.y.z)` });
      results.valid = false;
    } else {
      results.schema.push({ ok: true, msg: `version: ${fm.version}` });
    }

    // status
    const validStatuses = ['stable', 'beta', 'alpha', 'deprecated'];
    if (!fm.status || !validStatuses.includes(fm.status)) {
      results.schema.push({ ok: false, msg: `Invalid status: ${fm.status}` });
      results.valid = false;
    } else {
      results.schema.push({ ok: true, msg: `status: ${fm.status}` });
    }

    // triggers
    if (!fm.triggers) {
      results.schema.push({ ok: false, msg: 'Missing field: triggers' });
      results.valid = false;
    } else {
      const triggers = fm.triggers.split(',').map(t => t.trim()).filter(Boolean);
      if (triggers.length < 5) {
        results.schema.push({ ok: false, msg: `Too few triggers: ${triggers.length} (min: 5)` });
        results.valid = false;
      } else {
        results.schema.push({ ok: true, msg: `triggers: ${triggers.length} keywords` });
      }
    }
  }

  // ── Level 2: Content ────────────────────────────────────────────────────────
  results.content.push({
    id: 'size',
    ok: content.length >= 1024 && content.length <= 200 * 1024,
    weight: 0.1,
    msg: `File size: ${(content.length / 1024).toFixed(1)}KB (1KB-200KB)`
  });

  results.content.push({
    id: 'actions',
    ok: /##\s+(Mandatory actions|When this skill is active)/i.test(content),
    weight: 0.2,
    msg: 'Mandatory actions section present'
  });

  results.content.push({
    id: 'checklist',
    ok: /- \[ \]/.test(content),
    weight: 0.1,
    msg: 'Self-check/checklist items found'
  });

  results.content.push({
    id: 'security',
    ok: !/IGNORE ALL PREVIOUS/i.test(content),
    weight: 0.2,
    msg: 'No injection patterns detected'
  });

  // ── Level 3: Quality (v5 7-Dimension Scoring) ───────────────────────────────
  const dimensions = [
    { id: 'schema', weight: 0.15, ok: results.schema.every(r => r.ok), name: 'Schema Compliance' },
    { id: 'triggers', weight: 0.15, ok: results.schema.some(r => r.msg.includes('triggers') && r.ok), name: 'Trigger Density' },
    { id: 'actions', weight: 0.20, ok: results.content.some(r => r.id === 'actions' && r.ok), name: 'Mandatory Coverage' },
    { id: 'security', weight: 0.20, ok: results.content.some(r => r.id === 'security' && r.ok), name: 'Security Sanitization' },
    { id: 'clarity', weight: 0.10, ok: content.split('\n').length > 50, name: 'Doc Clarity' },
    { id: 'edges', weight: 0.10, ok: /edge cases|error handling/i.test(content), name: 'Edge Case Handling' },
    { id: 'examples', weight: 0.10, ok: /example|Usage/i.test(content), name: 'Example Fidelity' }
  ];

  let totalScore = 0;
  dimensions.forEach(d => {
    if (d.ok) totalScore += d.weight * 10;
  });

  results.certificationScore = parseFloat(totalScore.toFixed(1));

  // ── Output ──────────────────────────────────────────────────────────────────
  console.log(`${colors.cyan}${colors.bold}Schema validation:${colors.reset}`);
  results.schema.forEach(r => console.log(`  ${r.ok ? colors.green + '✅' : colors.red + '❌'} ${r.msg}`));

  console.log(`\n${colors.cyan}${colors.bold}Content validation:${colors.reset}`);
  results.content.forEach(r => {
    if (!r.ok) results.valid = false;
    console.log(`  ${r.ok ? colors.green + '✅' : colors.red + '❌'} ${r.msg}`);
  });

  console.log(`\n${colors.cyan}${colors.bold}Enterprise Certification (7D):${colors.reset}`);
  dimensions.forEach(d => {
    console.log(`  ${d.ok ? colors.green + '✅' : colors.red + '❌'} ${d.name.padEnd(25)} [Weight: ${(d.weight * 100).toFixed(0)}%]`);
  });
  
  const scoreColor = results.certificationScore >= 7.0 ? colors.green : colors.yellow;
  console.log(`\n  ${colors.bold}Certification Score: ${scoreColor}${results.certificationScore}/10.0${colors.reset}`);

  console.log('─'.repeat(60));

  const isEnterprise = ARGS.includes('--enterprise');
  if (isEnterprise && results.certificationScore < 7.0) {
    console.error(`${colors.red}❌ FAILURE: Skill does not meet the minimum Enterprise Certification Score (7.0).${colors.reset}`);
    results.valid = false;
  }

  if (results.valid) {
    console.log(`${colors.green}${colors.bold}Result: VALID${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}Result: INVALID${colors.reset}`);
    process.exit(1);
  }
}

main();
