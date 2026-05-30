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
const VALID_RECOMMENDATIONS = ['PROCEED', 'REVISE'];

/**
 * Validates a single voice's position payload. Throws a clear, voice-named error
 * on a malformed payload rather than letting it degrade into NaN consensus.
 * @param {string} voice — The voice that produced the position (for the error message).
 * @param {object} position — The raw position returned by the model.
 */
function validatePosition(voice, position) {
  if (!position || typeof position !== 'object') {
    throw new Error(`Council voice "${voice}" returned an invalid position: expected an object, got ${position === null ? 'null' : typeof position}`);
  }
  if (!VALID_RECOMMENDATIONS.includes(position.recommendation)) {
    throw new Error(`Council voice "${voice}" returned an invalid position: recommendation must be one of ${VALID_RECOMMENDATIONS.join('/')}, got ${JSON.stringify(position.recommendation)}`);
  }
  if (typeof position.confidence !== 'number' || !Number.isFinite(position.confidence) || position.confidence < 0 || position.confidence > 1) {
    throw new Error(`Council voice "${voice}" returned an invalid position: confidence must be a number in [0,1], got ${position.confidence}`);
  }
}

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
      // Validate the payload immediately — never silently swallow a malformed
      // position into NaN consensus (which would collapse to NO_CONSENSUS and
      // write NaN to the decision record).
      validatePosition(voice, position);
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

  // Dissent capture:
  // - For a decisive verdict (PROCEED/REVISE): the voices opposing that direction.
  // - For NO_CONSENSUS (the deadlock ADS most needs documented): the FULL split —
  //   every voice's {voice, recommendation, rationale} — so the decision record
  //   preserves both camps rather than recording an empty dissent list.
  const dissent = verdict === 'NO_CONSENSUS'
    ? positions.map((p) => ({ voice: p.voice, recommendation: p.recommendation, rationale: p.rationale }))
    : positions.filter((p) =>
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
