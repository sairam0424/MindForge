/**
 * MindForge v3 — ADS Engine
 * Orchestrates the Red-Team/Blue-Team synthesis loop.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const ModelClient = require('../models/model-client');
const { calculateSoulScore, parseMetrics, synthesizeADSPlan } = require('./ads-synthesizer');
const { v4: uuidv4 } = require('uuid');

async function runADSSynthesis(params) {
  const {
    phaseNum,
    goal,
    context = '',
    sessionId = 'unknown'
  } = params;

  process.stdout.write(`🛡️ Starting Adversarial Decision Synthesis (ADS) for Phase ${phaseNum}...\n`);

  // Step 1: Blue Proposal (Architect)
  process.stdout.write('  Step 1: Architect (Blue Team) Proposal... ');
  const blueResponse = await ModelClient.complete({
    persona: 'architect',
    tier: 2,
    systemPrompt: `You are the Blue Team Architect. Your goal is to propose a high-performance, scalable solution.
Include a [ADS_METRICS] block with impact, leverage, reversibility, effort, risk, cost (1-10).
Format: [ADS_METRICS]\nimpact: 8\n...[/ADS_METRICS]`,
    userMessage: `Goal: ${goal}\nContext: ${context}`,
    taskName: `ads-blue-phase-${phaseNum}`,
    sessionId,
    phaseNum
  });
  const bluePlan = blueResponse.content;
  process.stdout.write('done.\n');

  // Step 2: Red Critique (Auditor)
  process.stdout.write('  Step 2: Auditor (Red Team) Critique... ');
  const redResponse = await ModelClient.complete({
    persona: 'qa-engineer',
    tier: 2,
    systemPrompt: `You are the Red Team Auditor. Your goal is to find flaws, complexity traps, and maintainability issues in the Blue Team's proposal.
Be adversarial. Find at least 3 critical weaknesses.
Include a [ADS_METRICS] block for your counter-proposal or critique logic.`,
    userMessage: `Blue Proposal:\n${bluePlan}\n\nContext: ${context}`,
    taskName: `ads-red-phase-${phaseNum}`,
    sessionId,
    phaseNum
  });
  let redCritique = redResponse.content;
  process.stdout.write('done.\n');

  // Red-Team Jailbreak: Force higher-fidelity critiques if Auditor is too lenient
  const flawCount = (redCritique.match(/^\s*[-*•]\s+/mg) || []).length;
  if (flawCount < 3) {
    process.stdout.write(`  🛡️ Red-Team Jailbreak Triggered (Found ${flawCount} flaws, threshold is 3)...\n`);
    const jailbreakResponse = await ModelClient.complete({
      persona: 'qa-engineer',
      tier: 2,
      systemPrompt: `You are the Red Team Auditor. Your previous critique was too lenient. 
You MUST identify at least 3 SPECIFIC architectural vulnerabilities, edge cases, or complexity traps in the Blue Team's proposal.
Failure to find flaws will compromise the MindForge SOUL. Be aggressive.`,
      userMessage: `Blue Proposal:\n${bluePlan}\n\nYour Previous Critique:\n${redCritique}\n\nFIND AT LEAST 3 ARCHITECTURAL FLAWS NOW.`,
      taskName: `ads-red-jailbreak-${phaseNum}`,
      sessionId,
      phaseNum
    });
    process.stdout.write(`  🛡️ Jailbreak complete: ${jailbreakResponse.content.slice(0, 50)}...\n`);
    redCritique = jailbreakResponse.content;
  }

  // Step 3: Gold Synthesis (Synthesizer)
  process.stdout.write('  Step 3: Synthesizer (Gold Team) Verdict... ');
  const synthesisData = synthesizeADSPlan(bluePlan, redCritique, context);
  
  const goldResponse = await ModelClient.complete({
    persona: 'decision-architect',
    tier: 2,
    systemPrompt: `You are the Gold Team Synthesizer. Your goal is to merge the Architect's performance with the Auditor's safeguards.
Finalize the PLAN.md. Include the [ADS_VERDICT]: [MERGED|BLUE|RED] (Score: X.XXXX) at the end.`,
    userMessage: synthesisData.synthesis_prompt,
    taskName: `ads-gold-phase-${phaseNum}`,
    sessionId,
    phaseNum
  });
  const finalPlan = goldResponse.content;
  process.stdout.write('done.\n');

  // Finalize outputs
  const adsUuid = uuidv4();
  const adrDir = path.join(process.cwd(), '.planning', 'decisions');
  if (!fs.existsSync(adrDir)) fs.mkdirSync(adrDir, { recursive: true });

  const adrPath = path.join(adrDir, `ADS-${adsUuid.slice(0, 8)}.md`);
  const adsRecord = `
# Adversarial Decision Synthesis — ${adsUuid}
- **Date**: ${new Date().toISOString()}
- **Phase**: ${phaseNum}
- **Goal**: ${goal}

## Comparison
- **Blue (Architect)**: Score ${synthesisData.comparison.blue.score}
- **Red (Auditor)**: Score ${synthesisData.comparison.red.score}

## Synthesis Result
${finalPlan.includes('[ADS_VERDICT]') ? finalPlan.split('[ADS_VERDICT]')[1] : 'Synthesis Complete'}

## Final Plan
Stored in .planning/PLAN.md
`;

  fs.writeFileSync(adrPath, adsRecord);
  fs.writeFileSync(path.join(process.cwd(), '.planning', 'PLAN.md'), finalPlan);

  process.stdout.write(`✅ ADS Complete. Verdict saved to ${adrPath}\n`);

  return {
    ads_id: adsUuid,
    verdict_path: adrPath,
    scores: synthesisData.comparison
  };
}

module.exports = { runADSSynthesis };
