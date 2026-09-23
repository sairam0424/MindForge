'use strict';
/**
 * Resolve MINDFORGE's own version, from any context it might be running in.
 *
 * THE DEFECT THIS REPLACES. Three modules read `require('../../package.json').version`:
 *
 *     bin/updater/self-update.js:13         const CURRENT_VERSION = ...
 *     bin/updater/version-comparator.js:47  User-Agent: `mindforge-cc/${...}`
 *     bin/wizard/setup-wizard.js:9          const VERSION = ...
 *
 * In the repo that path IS MindForge's manifest, so it looks correct. In an INSTALL it is not: the
 * installer copies bin/updater/ into the consumer's project, where `../../package.json` is the
 * CONSUMER's manifest. Measured on a clean `--claude --local` into an app at 1.0.0:
 *
 *     ../../package.json from bin/updater/ -> <project>/package.json
 *     its version: 1.0.0          (the consumer app)
 *     MindForge actual: 11.9.2
 *
 * That is not cosmetic. self-update.js:89 classifies the upgrade with
 * `upgradeType(CURRENT_VERSION, latestVersion)`, so 1.0.0 -> 11.9.x reads as a MAJOR upgrade, and
 * :133 uses `readHandoffSchemaVersion() || CURRENT_VERSION` as the "from" version driving
 * migrations. A bogus origin version steers migration behaviour.
 *
 * Same family as the auto-runner defect fixed in ed977e9, which passed process.cwd() to a version
 * check that compares MindForge's own manifests: both mistake "the directory I am running in" for
 * "the package I am part of".
 *
 * HOW IT RESOLVES, in order, with the discriminator that makes it work:
 *
 *   1. The nearest ancestor package.json whose `name` is 'mindforge-cc'. The NAME is the whole
 *      trick — it is what distinguishes MindForge's manifest from a consumer's, which a relative
 *      path cannot do. Covers the repo, a global npm install, and node_modules layouts.
 *   2. <cwd>/.mindforge/config.json `.version`. In an install this is written BY the installer and
 *      carries MindForge's version (measured: 11.9.2 in a project whose app is 1.0.0).
 *      tests/version-consistency.test.js asserts it equals package.json in the repo, so the two
 *      sources cannot silently disagree.
 *   3. <cwd>/node_modules/mindforge-cc/package.json, for a consumer that has the package but no
 *      .mindforge/ yet.
 *
 * It THROWS rather than guessing. A wrong version is worse than an absent one here: it produces a
 * confident, incorrect upgrade classification instead of an error somebody can act on.
 */

const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'mindforge-cc';

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/** Walk up from `dir` looking for a package.json that belongs to MindForge itself. */
function findOwnManifest(dir) {
  let current = path.resolve(dir);
  // Bounded by the filesystem root; path.dirname('/') === '/' terminates the loop.
  for (let depth = 0; depth < 40; depth++) {
    const candidate = path.join(current, 'package.json');
    const pkg = readJson(candidate);
    if (pkg && pkg.name === PACKAGE_NAME && pkg.version) {
      return { version: pkg.version, source: candidate };
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

/**
 * @param {{fromDir?: string, cwd?: string}} [opts]
 *   fromDir - where to start walking for MindForge's own manifest (defaults to this file).
 *   cwd     - the project root to consult for installed-context sources.
 * @returns {{version: string, source: string}}
 * @throws {Error} when no source can establish MindForge's version.
 */
function resolveMindforgeVersion(opts = {}) {
  const fromDir = opts.fromDir || __dirname;
  const cwd = opts.cwd || process.cwd();

  const own = findOwnManifest(fromDir);
  if (own) return own;

  const cfgPath = path.join(cwd, '.mindforge', 'config.json');
  const cfg = readJson(cfgPath);
  if (cfg && cfg.version) return { version: cfg.version, source: cfgPath };

  const depPath = path.join(cwd, 'node_modules', PACKAGE_NAME, 'package.json');
  const dep = readJson(depPath);
  if (dep && dep.version) return { version: dep.version, source: depPath };

  throw new Error(
    'Cannot determine the MindForge version. Looked for a package.json named ' +
    `"${PACKAGE_NAME}" above ${fromDir}, then ${path.join(cwd, '.mindforge/config.json')}, then ` +
    `${depPath}. Refusing to guess: a wrong version produces a confident but incorrect upgrade ` +
    'classification.');
}

module.exports = { resolveMindforgeVersion, findOwnManifest, PACKAGE_NAME };
