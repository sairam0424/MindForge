'use strict';

/**
 * MindForge v10.7.0 — Runtime Version-Drift Checker
 *
 * Verifies that every version-bearing source agrees with the canonical
 * version declared in the root package.json. Used during `auto` so that a
 * mid-flight version bump in one file but not another is caught immediately,
 * instead of only being surfaced by the (slower) CI consistency test.
 *
 * Canonical source : package.json                  (authoritative; fail-closed)
 * Compared sources : sdk/package.json              (semver `version`)
 *                    .mindforge/config.json        (semver `version`)
 *                    MINDFORGE.md                   (`[VERSION] = X` line)
 *                    sdk/src/index.ts               (`VERSION = '...'` const)
 *
 * Design notes:
 *  - FAIL-CLOSED on a missing or corrupt canonical package.json. We cannot
 *    reason about drift without a reference, so we throw rather than pass.
 *  - Optional sources that are absent (e.g. a checkout without the `sdk/`
 *    directory) are SKIPPED, not treated as drift. A source that is present
 *    but disagrees IS drift.
 *  - Versions are compared on their core semver (the label suffix such as
 *    `-SOVEREIGN` in MINDFORGE.md is stripped before comparison) so a
 *    descriptive codename never registers as a false positive.
 */

const fs = require('fs');
const path = require('path');

const { PROJECT_ROOT } = require('./paths');
const { readJSONSync } = require('./file-io');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip a trailing descriptive label so `10.7.0-SOVEREIGN` compares equal to
 * `10.7.0`. Returns the trimmed core version, or null for falsy input.
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
function normalizeVersion(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Core semver = leading numeric dotted segment; drop any `-label`/`+build`.
  const match = trimmed.match(/^\d+\.\d+\.\d+/);
  return match ? match[0] : trimmed;
}

/**
 * Read the canonical version from the root package.json.
 * FAIL-CLOSED: throws if the file is missing, unreadable, or lacks `version`.
 * @param {string} root
 * @returns {string} canonical version string
 */
function readCanonicalVersion(root) {
  const pkgPath = path.join(root, 'package.json');
  const pkg = readJSONSync(pkgPath); // null on ENOENT, throws on malformed JSON
  if (!pkg || typeof pkg.version !== 'string' || !normalizeVersion(pkg.version)) {
    throw new Error(
      `[version-check] Canonical version is unavailable or corrupt: ${pkgPath}`
    );
  }
  return pkg.version;
}

/**
 * Read a semver `version` field from a JSON file. Missing file → null (skip).
 * @param {string} filePath
 * @returns {string|null}
 */
function readJsonVersion(filePath) {
  const data = readJSONSync(filePath);
  if (!data) return null; // ENOENT — optional source absent
  return typeof data.version === 'string' ? data.version : null;
}

/**
 * Read `[VERSION] = X` from MINDFORGE.md. Missing file → null (skip).
 * @param {string} filePath
 * @returns {string|null}
 */
function readMindforgeMdVersion(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null; // optional source absent
    throw err;
  }
  const match = content.match(/^\[VERSION\]\s*=\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Read `export const VERSION = '...'` from sdk/src/index.ts.
 * Missing file → null (skip).
 * @param {string} filePath
 * @returns {string|null}
 */
function readSdkSourceVersion(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null; // optional source absent
    throw err;
  }
  const match = content.match(/VERSION\s*=\s*['"]([^'"]+)['"]/);
  return match ? match[1].trim() : null;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Build the map of version sources relative to a project root.
 * @param {string} root
 * @returns {Array<{name: string, raw: string|null}>}
 */
function collectVersionSources(root) {
  return [
    { name: 'sdk/package.json', raw: readJsonVersion(path.join(root, 'sdk', 'package.json')) },
    { name: '.mindforge/config.json', raw: readJsonVersion(path.join(root, '.mindforge', 'config.json')) },
    { name: 'MINDFORGE.md', raw: readMindforgeMdVersion(path.join(root, 'MINDFORGE.md')) },
    { name: 'sdk/src/index.ts', raw: readSdkSourceVersion(path.join(root, 'sdk', 'src', 'index.ts')) },
  ];
}

/**
 * Check that every present version source agrees with canonical package.json.
 * Does NOT throw on drift; returns a structured report. (Throws only on a
 * corrupt canonical — fail-closed.)
 *
 * @param {string} [root=PROJECT_ROOT]
 * @returns {{
 *   consistent: boolean,
 *   canonical: string,
 *   sources: Array<{name: string, version: string|null, status: 'match'|'drift'|'skipped'}>,
 *   drift: Array<{name: string, version: string, expected: string}>
 * }}
 */
function checkVersionConsistency(root = PROJECT_ROOT) {
  const canonical = readCanonicalVersion(root); // fail-closed
  const canonicalCore = normalizeVersion(canonical);

  const sources = collectVersionSources(root).map(({ name, raw }) => {
    if (raw === null) {
      return { name, version: null, status: 'skipped' };
    }
    const status = normalizeVersion(raw) === canonicalCore ? 'match' : 'drift';
    return { name, version: raw, status };
  });

  const drift = sources
    .filter((s) => s.status === 'drift')
    .map((s) => ({ name: s.name, version: s.version, expected: canonical }));

  return { consistent: drift.length === 0, canonical, sources, drift };
}

/**
 * Assert version consistency, throwing a descriptive error on drift.
 * Suitable for use during `auto` to halt on a version mismatch.
 *
 * @param {string} [root=PROJECT_ROOT]
 * @returns {ReturnType<typeof checkVersionConsistency>}
 */
function assertVersionConsistency(root = PROJECT_ROOT) {
  const report = checkVersionConsistency(root); // may throw (fail-closed canonical)
  if (!report.consistent) {
    const detail = report.drift
      .map((d) => `  - ${d.name}: ${d.version} (expected ${d.expected})`)
      .join('\n');
    throw new Error(
      `[version-check] Version drift detected against canonical ${report.canonical}:\n${detail}`
    );
  }
  return report;
}

module.exports = {
  checkVersionConsistency,
  assertVersionConsistency,
  collectVersionSources,
  normalizeVersion,
};
