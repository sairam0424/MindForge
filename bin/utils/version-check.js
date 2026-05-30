'use strict';
/**
 * MindForge version single-source-of-truth + drift detector.
 * package.json is canonical; everything else must agree.
 */
const path = require('path');
// Use the repo's stricter reader: returns null only on ENOENT and RE-THROWS on
// parse errors. Re-throwing on a corrupt JSON source is the fail-closed
// behavior we want — a file we cannot parse means we cannot establish truth.
const { readJSONSync } = require('./file-io');

/**
 * @param {string} projectRoot
 * @returns {{ canonical: string|null, sources: Record<string,string|null>, drift: string[] }}
 */
function checkVersionConsistency(projectRoot) {
  const pkg = readJSONSync(path.join(projectRoot, 'package.json'));
  const canonical = pkg ? pkg.version : null;

  const configJson = readJSONSync(path.join(projectRoot, '.mindforge', 'config.json'));
  // Runtime drift coverage is intentionally limited to package.json (canonical)
  // vs .mindforge/config.json — the live config is the operational drift risk
  // during `auto`. Wider agreement (sdk/package.json, MINDFORGE.md [VERSION]) is
  // enforced by the test suite (tests/version-consistency.test.js), not at
  // runtime — do not assume this checker provides full version coverage.
  const sources = {
    'package.json': canonical,
    '.mindforge/config.json': configJson ? configJson.version : null,
  };

  const drift = [];
  // Fail-closed: if we cannot establish the canonical version (package.json
  // missing or its `version` field absent), treat it as a drift/error condition
  // rather than silently passing. A genuinely corrupt package.json would have
  // already thrown out of readJSONSync above.
  if (!canonical) {
    drift.push('package.json version could not be determined (canonical source missing or unparseable)');
    return { canonical, sources, drift };
  }

  for (const [file, version] of Object.entries(sources)) {
    if (version && version !== canonical) {
      drift.push(`${file} declares ${version} but canonical (package.json) is ${canonical}`);
    }
  }
  return { canonical, sources, drift };
}

/**
 * Fail-closed assertion for pre-flight. Throws on drift.
 */
function assertVersionConsistency(projectRoot) {
  const { drift } = checkVersionConsistency(projectRoot);
  if (drift.length > 0) {
    throw new Error('Version drift detected (fail-closed):\n  - ' + drift.join('\n  - '));
  }
}

module.exports = { checkVersionConsistency, assertVersionConsistency };
