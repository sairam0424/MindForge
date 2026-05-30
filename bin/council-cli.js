#!/usr/bin/env node
'use strict';
/**
 * MindForge — Council CLI (UC-22)
 *
 * Thin CLI wrapper around council-runtime.runCouncil. Provides the injectable
 * model function via ModelClient and formats structured output for the
 * /mindforge:council command.
 *
 * Usage:
 *   node bin/council-cli.js "Should we adopt event sourcing for the payments domain?"
 *   node bin/council-cli.js --id payment-es "Should we adopt event sourcing?"
 *
 * Exit codes:
 *   0 — PROCEED
 *   1 — REVISE
 *   2 — NO_CONSENSUS
 *   3 — Runtime error
 */
const path = require('path');
const { runCouncil } = require('./engine/council-runtime');
const ModelClient = require('./models/model-client');

const VOICE_SYSTEM_PROMPTS = {
  architect: `You are the Architect voice in a decision council. You focus on system design, scalability, maintainability, and long-term architectural integrity. Evaluate the decision from a structural perspective.`,
  skeptic: `You are the Skeptic voice in a decision council. You challenge assumptions, identify risks, hidden costs, and failure modes. Your job is to stress-test the proposal.`,
  pragmatist: `You are the Pragmatist voice in a decision council. You focus on delivery timelines, team capacity, incremental value, and practical trade-offs. Favor what ships reliably.`,
  critic: `You are the Critic voice in a decision council. You evaluate quality, correctness, edge cases, and whether the solution meets its stated goals without over-engineering.`,
};

const POSITION_INSTRUCTION = `
Respond with ONLY a JSON object (no markdown fences, no prose) in this exact shape:
{
  "recommendation": "PROCEED" or "REVISE",
  "confidence": <number between 0 and 1>,
  "rationale": "<1-3 sentence explanation>"
}
Do NOT include any text outside the JSON object.`;

/**
 * Injectable model function for runCouncil — calls ModelClient.complete per voice.
 */
async function councilModel({ voice, question }) {
  const systemPrompt = (VOICE_SYSTEM_PROMPTS[voice] || VOICE_SYSTEM_PROMPTS.architect) +
    '\n' + POSITION_INSTRUCTION;

  const result = await ModelClient.complete({
    persona: 'council',
    tier: 2,
    systemPrompt,
    userMessage: `Decision under review:\n${question}`,
    maxTokens: 300,
    temperature: 0.4,
    taskName: `council-${voice}`,
  });

  // Parse the JSON response from the model
  const content = (result.content || '').trim();
  let parsed;
  try {
    // Strip markdown fences if model adds them despite instructions
    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Council voice "${voice}" returned unparseable response: ${content.slice(0, 200)}`);
  }

  return {
    recommendation: parsed.recommendation,
    confidence: parsed.confidence,
    rationale: parsed.rationale,
  };
}

// --- CLI argument parsing ---
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { question: null, decisionId: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--id' && args[i + 1]) {
      opts.decisionId = args[++i];
    } else if (!args[i].startsWith('-')) {
      opts.question = opts.question ? `${opts.question} ${args[i]}` : args[i];
    }
  }
  return opts;
}

// --- Formatted output ---
function formatOutput(result) {
  const lines = [];
  lines.push('');
  lines.push('=== COUNCIL VERDICT ===');
  lines.push('');
  lines.push(`Question: ${result.question}`);
  lines.push('');
  lines.push('--- Positions ---');
  for (const pos of result.positions) {
    const icon = pos.recommendation === 'PROCEED' ? '[+]' : '[-]';
    lines.push(`  ${icon} ${pos.voice.toUpperCase()} (${pos.recommendation}, confidence: ${pos.confidence.toFixed(2)})`);
    lines.push(`      ${pos.rationale}`);
  }
  lines.push('');
  lines.push(`--- Consensus: ${(result.consensus * 100).toFixed(1)}% ---`);
  lines.push('');
  lines.push(`VERDICT: ${result.verdict}`);

  if (result.verdict === 'NO_CONSENSUS' && result.dissent.length > 0) {
    lines.push('');
    lines.push('--- Dissent (full split) ---');
    for (const d of result.dissent) {
      lines.push(`  * ${d.voice.toUpperCase()} (${d.recommendation}): ${d.rationale}`);
    }
  } else if (result.dissent.length > 0) {
    lines.push('');
    lines.push('--- Dissent ---');
    for (const d of result.dissent) {
      lines.push(`  * ${d.voice.toUpperCase()}: ${d.rationale}`);
    }
  }

  lines.push('');
  lines.push('Council is advisory -- you have final say.');
  lines.push('');
  return lines.join('\n');
}

// --- Main ---
async function main() {
  const { question, decisionId } = parseArgs(process.argv);

  if (!question) {
    process.stderr.write('Usage: node bin/council-cli.js [--id <decision-id>] "<question>"\n');
    process.exit(3);
  }

  try {
    const result = await runCouncil(question, {
      model: councilModel,
      writeDecision: true,
      decisionId: decisionId || undefined,
    });

    // Output structured JSON to stdout for programmatic consumption
    console.log(JSON.stringify(result, null, 2));

    // Output formatted human-readable summary to stderr
    process.stderr.write(formatOutput(result));

    // Exit code reflects verdict
    const exitCode = result.verdict === 'PROCEED' ? 0
      : result.verdict === 'REVISE' ? 1
      : 2;
    process.exit(exitCode);
  } catch (err) {
    process.stderr.write(`[council-cli] ERROR: ${err.message}\n`);
    process.exit(3);
  }
}

main();
