'use strict';
/**
 * MindForge — Difficulty Scorer (UC-06). Pure heuristic 1-10.
 * Used by model-router in SHADOW MODE to log intended routing
 * without altering actual model selection.
 */

const HIGH_KW = /auth|jwt|oauth|crypto|security|payment|pii|gdpr|hipaa|encrypt|secret|credential/i;
const MED_KW = /refactor|migrate|architect|design|performance|concurrency|async/i;

/**
 * Score a task for difficulty on a 1-10 scale.
 * @param {object} task
 * @param {string} [task.description] — free-text task description
 * @param {string[]} [task.files] — files involved
 * @param {number} [task.tier] — security tier (1-3)
 * @returns {number} integer difficulty score in [1, 10]
 */
function score(task = {}) {
  const desc = task.description || '';
  const files = task.files || [];
  const tier = task.tier || 0;

  let s = 3; // baseline

  // Keyword analysis (description + file paths)
  if (HIGH_KW.test(desc) || files.some(f => HIGH_KW.test(f))) {
    s += 4;
  } else if (MED_KW.test(desc)) {
    s += 2;
  }

  // File count complexity
  if (files.length > 10) {
    s += 2;
  } else if (files.length > 5) {
    s += 1;
  }

  // Long description signals complexity
  if (desc.length > 500) {
    s += 1;
  }

  // Tier-3 floor: security/privacy tasks never score below 7
  if (tier >= 3) {
    s = Math.max(s, 7);
  }

  // Clamp to [1, 10]
  return Math.min(Math.max(s, 1), 10);
}

module.exports = { score };
