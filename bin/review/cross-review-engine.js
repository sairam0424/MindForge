/**
 * MindForge v2 — Cross-Review Engine
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ModelClient = require('../models/model-client');
const { synthesizeFindings, extractVerdict } = require('./finding-synthesizer');
const { write: writeReport } = require('./review-report-writer');
const KnowledgeCapture = require('../memory/knowledge-capture');

const PRIMARY_PROMPT = `You are a senior codebase architect performing a code review.
Focus on: architectural alignment, logic correctness, maintainability, and complexity.
Format every finding as: **[SEVERITY]** \`file:line\` — description
Severities: LOW, MEDIUM, HIGH, CRITICAL.
Finish with "### Verdict: APPROVE" or "### Verdict: REQUEST_CHANGES".`;

const ADVERSARIAL_PROMPT = `You are a paranoid security auditor reviewing code written by a competitor.
Your goal is to find bugs, security holes, and edge cases they missed. 
Be critical. Trust nothing. 
Format every finding as: **[SEVERITY]** \`file:line\` — description
Severities: LOW, MEDIUM, HIGH, CRITICAL.
Finish with "### Verdict: APPROVE" or "### Verdict: REQUEST_CHANGES".`;

async function runCrossReview(params) {
  const {
    phaseNum,
    diff,
    context = '',
    models = ['claude-3-5-sonnet-20240620', 'gpt-4o'],
    sessionId = 'unknown'
  } = params;

  process.stdout.write(`⚡ Starting cross-model review for Phase ${phaseNum}...\n`);

  const reviews = [];
  
  // Round 1: Primary
  process.stdout.write(`  Round 1 (${models[0]}): `);
  const r1 = await ModelClient.complete({
    model: models[0],
    systemPrompt: PRIMARY_PROMPT,
    userMessage: `Context:\n${context}\n\nDiff:\n${diff}`,
    taskName: `review-primary-phase-${phaseNum}`,
    sessionId,
    phaseNum
  });
  reviews.push({ model: models[0], content: r1.content, role: 'primary', cost_usd: r1.cost_usd });
  process.stdout.write(`done ($${r1.cost_usd.toFixed(4)})\n`);

  // Round 2: Adversarial
  process.stdout.write(`  Round 2 (${models[1]}): `);
  const r2 = await ModelClient.complete({
    model: models[1],
    systemPrompt: ADVERSARIAL_PROMPT,
    userMessage: `Context:\n${context}\n\nDiff:\n${diff}`,
    taskName: `review-adversarial-phase-${phaseNum}`,
    sessionId,
    phaseNum
  });
  reviews.push({ model: models[1], content: r2.content, role: 'adversarial', cost_usd: r2.cost_usd });
  process.stdout.write(`done ($${r2.cost_usd.toFixed(4)})\n`);

  // Synthesis
  const synthesis = synthesizeFindings(reviews);
  
  const result = {
    phase: phaseNum,
    reviews,
    synthesis,
    total_cost_usd: reviews.reduce((sum, r) => sum + r.cost_usd, 0),
    timestamp: new Date().toISOString()
  };

  const reportPath = writeReport(phaseNum, result);
  process.stdout.write(`✅ Cross-review complete. Saved to ${reportPath}\n`);

  // Auto-capture knowledge from review report
  try {
    const captured = KnowledgeCapture.captureFromCrossReview(reportPath);
    if (captured.length > 0) {
      process.stdout.write(`🧠 Knowledge Graph: Captured ${captured.length} security/quality findings.\n`);
    }
  } catch (err) {
    process.stdout.write(`⚠️ Knowledge Capture failed: ${err.message}\n`);
  }
  
  return result;
}

module.exports = { runCrossReview, parseFindings: synthesizeFindings.parseFindings, extractVerdict };

if (require.main === module) {
  const args = process.argv.slice(2);
  const phase = args.find(a => a.startsWith('--phase='))?.split('=')[1] || 'full';
  const diff = args.find(a => a.startsWith('--diff='))?.split('=')[1] || 'HEAD';
  const context = args.find(a => a.startsWith('--context='))?.split('=')[1] || '';
  if (args.includes('--help') || args.length === 0) {
    console.log('MindForge PR Review — Cross-model review engine');
    console.log('Usage: node bin/review/cross-review-engine.js [--diff=HEAD] [--phase=full] [--context=...]');
    console.log('  --diff     Git ref or diff target (default: HEAD)');
    console.log('  --phase    Review phase: full|security|quality|performance (default: full)');
    console.log('  --context  Additional context string for the review');
    process.exit(0);
  }
  console.log(`[MindForge PR Review] Starting ${phase} review of ${diff}...`);
  runCrossReview({ phaseNum: phase, diff, context })
    .then(result => { console.log(JSON.stringify(result, null, 2)); process.exit(0); })
    .catch(err => { console.error('Review failed:', err.message); process.exit(1); });
}
