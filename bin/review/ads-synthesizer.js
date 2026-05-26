/**
 * MindForge v3 — ADS Synthesizer
 * Implements the SOUL.md Decision Scoring and Plan Merging logic.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_METRICS = {
  impact: 5,
  leverage: 5,
  reversibility: 5,
  effort: 5,
  risk: 5,
  cost: 5
};

/**
 * Calculates the SOUL Decision Score based on the formula in SOUL.md:
 * Score = (Impact * Leverage * Reversibility) / (Effort * Risk * Cost)
 * 
 * Each factor is expected to be a value between 1 and 10.
 */
function calculateSoulScore(metrics) {
  const m = { ...DEFAULT_METRICS, ...metrics };
  const {
    impact,
    leverage,
    reversibility,
    effort,
    risk,
    cost
  } = m;

  // Formula: (I * L * R) / (E * Rk * C)
  const numerator = impact * leverage * reversibility;
  const denominator = effort * risk * cost;

  const score = denominator === 0 ? 0 : (numerator / denominator);
  return parseFloat(score.toFixed(4));
}

/**
 * Parses metrics from a model's response string.
 * Expects a block like:
 * [ADS_METRICS]
 * impact: 8
 * leverage: 7
 * reversibility: 5
 * effort: 4
 * risk: 3
 * cost: 2
 * [/ADS_METRICS]
 */
function parseMetrics(text) {
  const metrics = { ...DEFAULT_METRICS };
  const match = text.match(/\[ADS_METRICS\]([\s\S]*?)\[\/ADS_METRICS\]/);
  if (!match) return metrics;

  const lines = match[1].trim().split('\n');
  for (const line of lines) {
    const [key, val] = line.split(':').map(s => s.trim());
    if (key && !isNaN(val)) {
      metrics[key.toLowerCase()] = parseFloat(val);
    }
  }
  return metrics;
}

/**
 * Merges the Blue (Performance) and Red (Maintainability/Simple) plans.
 * Currently performs a structural merge focusing on conflict resolution.
 */
function synthesizeADSPlan(bluePlan, redCritique, context = '') {
  // In a production implementation, this would involve a 3rd model call (the Synthesizer).
  // This helper prepares the input for that call.
  
  const blueMetrics = parseMetrics(bluePlan);
  const redMetrics = parseMetrics(redCritique);

  const blueScore = calculateSoulScore(blueMetrics);
  const redScore = calculateSoulScore(redMetrics);

  return {
    comparison: {
      blue: { metrics: blueMetrics, score: blueScore },
      red: { metrics: redMetrics, score: redScore }
    },
    synthesis_prompt: `
Context:
${context}

Blue Proposal (Architect):
${bluePlan}

Red Critique (Auditor):
${redCritique}

Decision Scores:
- Blue Score: ${blueScore}
- Red Score: ${redScore}

Task: Synthesize the final PLAN.md. 
1. If the scores are close, merge the performance of Blue with the safeguards of Red.
2. If one score significantly dominates, favor that approach but address the Red Team's critical findings.
3. Output the final plan as valid Markdown with XML task tags.
4. Finish with [ADS_VERDICT]: [BLUE|RED|MERGED] with final score.
`
  };
}

module.exports = {
  calculateSoulScore,
  parseMetrics,
  synthesizeADSPlan
};
