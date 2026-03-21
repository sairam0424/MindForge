/**
 * MindForge — Self-Update Engine
 * Full update workflow: check → changelog → scope detection → apply → migrate → verify.
 */
'use strict';

const path = require('path');
const fs   = require('fs');
const { execSync }         = require('child_process');
const { compareSemver, upgradeType, fetchLatestVersion } = require('./version-comparator');
const { fetchChangelog }   = require('./changelog-fetcher');

const CURRENT_VERSION = require('../../package.json').version;

/**
 * Detect where MindForge was originally installed.
 * Checks local before global (local installs take precedence).
 * Returns { scope: 'local'|'global', runtime: 'claude'|'antigravity' }
 */
function detectInstallScope() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const cwd  = process.cwd();

  // Per ADR-019: local installs take precedence over global
  const locations = [
    { scope: 'local',  runtime: 'claude',      file: path.join(cwd,  '.claude', 'CLAUDE.md') },
    { scope: 'local',  runtime: 'antigravity', file: path.join(cwd,  '.agent',  'CLAUDE.md') },
    { scope: 'global', runtime: 'claude',      file: path.join(home, '.claude', 'CLAUDE.md') },
    { scope: 'global', runtime: 'antigravity', file: path.join(home, '.gemini', 'antigravity', 'CLAUDE.md') },
  ];

  for (const loc of locations) {
    if (fs.existsSync(loc.file) && fs.readFileSync(loc.file, 'utf8').includes('MindForge')) {
      return { scope: loc.scope, runtime: loc.runtime };
    }
  }

  // Default: global claude (most common installation)
  return { scope: 'global', runtime: 'claude' };
}

/**
 * Read the schema_version from HANDOFF.json.
 * This is the authoritative "what version are the .planning files" source.
 * Must be read BEFORE the update runs (after update, installer version = new).
 */
function readHandoffSchemaVersion() {
  const handoffPath = path.join(process.cwd(), '.planning', 'HANDOFF.json');
  if (!fs.existsSync(handoffPath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
    return data.schema_version || null;
  } catch {
    return null;
  }
}

/**
 * Main update entry point.
 * Called by /mindforge:update command.
 *
 * options:
 *   apply          {boolean}  — actually apply the update (default: false = check only)
 *   force          {boolean}  — skip major-version safety warning
 *   skipChangelog  {boolean}  — skip changelog fetch
 */
async function checkAndUpdate(options = {}) {
  const { apply = false, force = false, skipChangelog = false } = options;
  const isCI = process.env.CI === 'true' || process.env.MINDFORGE_CI === 'true';

  const TTY = process.stdout.isTTY;
  const bold = s => TTY ? `\x1b[1m${s}\x1b[0m` : s;
  const warn = s => TTY ? `\x1b[33m${s}\x1b[0m` : s;
  const ok   = s => TTY ? `\x1b[32m${s}\x1b[0m` : s;
  const err  = s => TTY ? `\x1b[31m${s}\x1b[0m` : s;

  console.log(`\n${bold('⚡  MindForge Update Check')}\n`);
  console.log(`  Current : v${CURRENT_VERSION}`);
  process.stdout.write(`  Latest  : checking npm registry... `);

  const latestVersion = await fetchLatestVersion();
  if (!latestVersion) {
    console.log(`${warn('unavailable')}`);
    console.log(`\n  ${warn('⚠️')}  Cannot reach npm registry. Check your internet connection.`);
    console.log(`  Manual check: npm info mindforge-cc version\n`);
    return { status: 'check-failed' };
  }

  const type = upgradeType(CURRENT_VERSION, latestVersion);
  if (type === 'none') {
    console.log(`${ok('up to date')}`);
    console.log(`\n  ${ok('✅')}  v${CURRENT_VERSION} is the latest version.\n`);
    return { status: 'up-to-date', current: CURRENT_VERSION };
  }

  console.log(`${ok(`v${latestVersion} available`)}`);
  console.log(`  Update  : ${CURRENT_VERSION} → ${latestVersion} ${warn(`(${type})`)}`);

  // Major version safety gate
  if (type === 'major' && !force) {
    console.log(`\n  ${warn('⚠️  MAJOR UPDATE')} — may contain breaking changes.`);
    console.log(`  Review the changelog before applying.`);
    console.log(`  To apply anyway: /mindforge:update --apply --force\n`);
  }

  // Fetch and display changelog
  if (!skipChangelog) {
    process.stdout.write(`\n  Fetching changelog... `);
    const changelog = await fetchChangelog(CURRENT_VERSION, latestVersion);
    if (changelog) {
      console.log(`done\n`);
      console.log('─'.repeat(62));
      console.log(changelog.slice(0, 3000));  // Max 3000 chars to avoid flooding terminal
      if (changelog.length > 3000) console.log(`\n  [changelog truncated — see CHANGELOG.md for full details]`);
      console.log('─'.repeat(62));
    } else {
      console.log(`unavailable\n`);
    }
  }

  if (!apply) {
    if (isCI) {
      console.log(`\n  CI mode: check-only (no apply without --apply)`);
    }
    console.log(`\n  To apply: /mindforge:update --apply`);
    console.log(`  Or directly: npx mindforge-cc@${latestVersion} --update\n`);
    return { status: 'update-available', current: CURRENT_VERSION, latest: latestVersion, type };
  }

  // ── Apply the update ────────────────────────────────────────────────────────

  // Capture schema version BEFORE updating (critical for correct migration path)
  const fromSchemaVersion = readHandoffSchemaVersion() || CURRENT_VERSION;
  console.log(`\n  Schema version: v${fromSchemaVersion}`);

  // Detect original install scope to preserve it
  const { scope, runtime } = detectInstallScope();
  console.log(`  Install scope : ${runtime} / ${scope}`);
  console.log(`\n  Applying update...`);

  try {
    execSync(
      `npx mindforge-cc@${latestVersion} --${runtime} --${scope}`,
      { stdio: 'inherit', timeout: 120_000 }
    );
  } catch (updateErr) {
    console.error(`\n  ${err('❌')}  Update failed: ${updateErr.message}`);
    console.error(`  Fallback: npx mindforge-cc@${latestVersion} --${runtime} --${scope}`);
    return { status: 'update-failed', error: updateErr.message };
  }

  // Run schema migration with the pre-update schema version
  try {
    const { runMigrations } = require('../migrations/migrate');
    const migResult = await runMigrations(fromSchemaVersion, latestVersion);
    if (migResult.status === 'migrated') {
      console.log(`  ✅  Schema migrated: v${fromSchemaVersion} → v${latestVersion}`);
    }
  } catch (migErr) {
    console.warn(`  ${warn('⚠️')}  Schema migration had an issue: ${migErr.message}`);
    console.warn(`      Run /mindforge:migrate manually if state files look wrong.`);
  }

  console.log(`\n  ${ok('✅')}  MindForge updated to v${latestVersion}\n`);
  console.log(`  Run /mindforge:health to verify the update.\n`);
  return { status: 'updated', from: CURRENT_VERSION, to: latestVersion };
}

module.exports = { checkAndUpdate, detectInstallScope, readHandoffSchemaVersion };
