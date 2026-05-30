'use strict';
/**
 * MindForge — Council Runtime (UC-10). Thin multi-voice decision harness (ADS).
 *
 * Activates the Adversarial Decision Loop (ADS) mandated by CLAUDE.md: instead of
 * a multi-round debate simulator, this is a THIN runtime — parallel position
 * collection (one per voice) + consensus scoring + dissent capture.
 *
 * The model is INJECTABLE (no hard LLM dependency) so callers/tests can supply a
 * mock. The Semaphore from wave-executor is reused to bound concurrent voice calls.
 *
 * Design decision — NO challenge round (kept thin per adversarial review + YAGNI):
 * A second model call per dissenter that folds a revised confidence back into the
 * consensus adds ordering/weighting complexity and extra failure modes without
 * changing the activation goal. Position-collection + consensus fully satisfies the
 * ADS loop and the verdict contract. Add a challenge round only if a concrete need
 * arises (an explicit `opts.challengeRound` flag would be the clean extension point).
 *
 * Filenames use opts.decisionId (NOT Date.now(), which is unavailable in some
 * MindForge execution contexts); falls back to "council-latest.json".
 */
const fs = require('fs');
const path = require('path');
const { Semaphore } = require('../autonomous/wave-executor');

const DEFAULT_VOICES = ['architect', 'skeptic', 'pragmatist', 'critic'];

/**
 * Runs a thin adversarial council over a question.
 * @param {string} question — The decision/question put to the council.
 * @param {object} [opts]
 * @param {string[]} [opts.voices] — Voice personas to consult (default: 4 ADS voices).
 * @param {number} [opts.consensusThreshold=0.75] — Threshold for PROCEED/REVISE.
 * @param {function} opts.model — REQUIRED. async ({voice, question}) =>
 *   { recommendation: 'PROCEED'|'REVISE', confidence: number(0..1), rationale: string }
 * @param {number} [opts.maxConcurrency] — Bound on parallel voice calls (default: #voices).
 * @param {boolean} [opts.writeDecision=true] — Persist a decision record to disk.
 * @param {string} [opts.outputPath] — Directory for the record (default: .planning/decisions).
 * @param {string} [opts.decisionId] — Stable id used in the filename (no Date.now()).
 * @returns {Promise<{question,positions,consensus,verdict,dissent}>}
 */
async function runCouncil(question, opts = {}) {
  const voices = Array.isArray(opts.voices) && opts.voices.length > 0
    ? opts.voices
    : DEFAULT_VOICES;
  const consensusThreshold = opts.consensusThreshold ?? 0.75;
  const model = opts.model;
  if (typeof model !== 'function') {
    throw new Error('runCouncil requires an injectable model function (opts.model)');
  }
  const maxConcurrency = opts.maxConcurrency || voices.length;

  // Parallel position collection — bounded by the reused Semaphore.
  const sem = new Semaphore(maxConcurrency);
  const positions = await Promise.all(voices.map(async (voice) => {
    await sem.acquire();
    try {
      const position = await model({ voice, question });
      return { voice, ...position };
    } finally {
      sem.release();
    }
  }));

  // Consensus = mean approval signal across voices.
  // A PROCEED contributes its confidence; a REVISE contributes its inverse
  // (so a high-confidence REVISE pulls consensus down hard).
  const consensus = positions.reduce((sum, p) => {
    const approval = p.recommendation === 'PROCEED' ? p.confidence : (1 - p.confidence);
    return sum + approval;
  }, 0) / positions.length;

  const verdict = consensus >= consensusThreshold ? 'PROCEED'
    : consensus <= (1 - consensusThreshold) ? 'REVISE'
    : 'NO_CONSENSUS';

  // Dissent = voices opposing the verdict direction.
  const dissent = positions.filter((p) =>
    (verdict === 'PROCEED' && p.recommendation !== 'PROCEED') ||
    (verdict === 'REVISE' && p.recommendation === 'PROCEED'))
    .map((d) => ({ voice: d.voice, rationale: d.rationale }));

  const result = { question, positions, consensus, verdict, dissent };

  if (opts.writeDecision !== false) {
    const dir = opts.outputPath || path.join(process.cwd(), '.planning', 'decisions');
    fs.mkdirSync(dir, { recursive: true });
    const name = opts.decisionId ? `council-${opts.decisionId}.json` : 'council-latest.json';
    fs.writeFileSync(path.join(dir, name), JSON.stringify(result, null, 2));
  }

  return result;
}

module.exports = { runCouncil };
