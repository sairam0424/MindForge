'use strict';
/**
 * MindForge version single-source-of-truth + drift detector.
 * package.json is canonical; everything else must agree.
 */
const fs   = require('fs');
const path = require('path');

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

/**
 * @param {string} projectRoot
 * @returns {{ canonical: string|null, sources: Record<string,string|null>, drift: string[] }}
 */
function checkVersionConsistency(projectRoot) {
  const pkg = readJsonSafe(path.join(projectRoot, 'package.json'));
  const canonical = pkg ? pkg.version : null;

  const configJson = readJsonSafe(path.join(projectRoot, '.mindforge', 'config.json'));
  const sources = {
    'package.json': canonical,
    '.mindforge/config.json': configJson ? configJson.version : null,
  };

  const drift = [];
  for (const [file, version] of Object.entries(sources)) {
    if (version && canonical && version !== canonical) {
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
