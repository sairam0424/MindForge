/**
 * MindForge — Migration Runner
 * Safely upgrades .planning/ file schemas between MindForge versions.
 * Philosophy: never lose data, always back up, always verify after.
 */
'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');

// Re-export for use by self-update.js
const { compareSemver } = require('../updater/version-comparator');
module.exports.compareSemver = compareSemver;

const PLANNING_DIR = path.join(process.cwd(), '.planning');

const PATHS = {
  handoff:    path.join(PLANNING_DIR, 'HANDOFF.json'),
  state:      path.join(PLANNING_DIR, 'STATE.md'),
  audit:      path.join(PLANNING_DIR, 'AUDIT.jsonl'),
  mindforgemd: path.join(process.cwd(), 'MINDFORGE.md'),
  // v9-unified-memory reads these three JSONL files (via knowledge-store.js's own getPaths(), not
  // this list -- it never receives PATHS as an argument). They're backed up here anyway because
  // "always back up" otherwise only covered files that migration never touches, leaving the actual
  // migrated data with no restore-on-failure safety net.
  memoryKb:       path.join(process.cwd(), '.mindforge', 'memory', 'knowledge-base.jsonl'),
  memoryGlobalKb: path.join(os.homedir(), '.mindforge', 'global-knowledge-base.jsonl'),
  memoryGraph:    path.join(process.cwd(), '.mindforge', 'memory', 'graph-edges.jsonl'),
};

/**
 * Run all needed migrations from fromVersion to toVersion.
 * Creates a backup first. Restores on failure.
 * Returns { status, from, to, backupDir }
 */
async function runMigrations(fromVersion, toVersion) {
  console.log(`\n  Migration: v${fromVersion} → v${toVersion}`);

  if (!fs.existsSync(PLANNING_DIR)) {
    console.log('  ℹ️  No .planning/ directory found — skipping migration');
    return { status: 'no-planning-dir' };
  }

  if (compareSemver(fromVersion, toVersion) >= 0) {
    console.log('  ✅  No migration needed');
    return { status: 'no-migration-needed' };
  }

  const migrationsToRun = getMigrationsToRun(fromVersion, toVersion);

  if (migrationsToRun.length === 0) {
    console.log('  ✅  No applicable migrations');
    return { status: 'no-migrations' };
  }

  console.log(`  Migrations to run (${migrationsToRun.length}):`);
  migrationsToRun.forEach(m => console.log(`    • v${m.fromVersion} → v${m.toVersion}: ${m.description}`));

  // ── Create backup (abort if backup fails — never migrate without a backup) ──
  const backupDir = path.join(PLANNING_DIR, `migration-backup-${Date.now()}`);
  let backupCreated = false;
  try {
    fs.mkdirSync(backupDir, { recursive: true });
    const filesToBackup = Object.values(PATHS).filter(p => fs.existsSync(p));

    if (filesToBackup.length === 0) {
      console.log('  ℹ️  No files to migrate');
      fs.rmdirSync(backupDir);
      return { status: 'no-files' };
    }

    for (const f of filesToBackup) {
      fs.copyFileSync(f, path.join(backupDir, path.basename(f)));
    }

    // Verify backup: check every backed-up file exists and has content
    const backed = fs.readdirSync(backupDir);
    const allBacked = filesToBackup.every(f =>
      backed.includes(path.basename(f)) &&
      fs.statSync(path.join(backupDir, path.basename(f))).size > 0
    );

    if (!allBacked) throw new Error('Backup verification failed — some files missing or empty');

    backupCreated = true;
    console.log(`  📦 Backup: .planning/${path.basename(backupDir)} (${filesToBackup.length} files)`);

  } catch (backupErr) {
    // Abort cleanly — no migration is safer than a migration without backup
    if (fs.existsSync(backupDir)) {
      try {
        fs.rmSync(backupDir, { recursive: true, force: true });
      } catch (err) {
        // Ignore backup cleanup failures if backup creation already failed
      }
    }
    throw new Error(
      `Migration aborted: cannot create backup (${backupErr.message}). ` +
      'Free disk space and retry.'
    );
  }

  // ── Execute migrations in order ───────────────────────────────────────────
  for (const migration of migrationsToRun) {
    console.log(`\n  Running: v${migration.fromVersion} → v${migration.toVersion}...`);
    try {
      await migration.run(PATHS);
      console.log('  ✅  Complete');
    } catch (migErr) {
      console.error(`  ❌  Failed: ${migErr.message}`);
      console.log('  Restoring from backup...');

      // Restore all files from backup
      for (const f of fs.readdirSync(backupDir)) {
        const dst = Object.values(PATHS).find(p => path.basename(p) === f) ||
                    path.join(PLANNING_DIR, f);
        fs.copyFileSync(path.join(backupDir, f), dst);
      }
      console.log('  ✅  Restored from backup. No changes applied.');
      throw new Error(`Migration failed at v${migration.toVersion}: ${migErr.message}`);
    }
  }

  // ── Update schema_version in HANDOFF.json ────────────────────────────────
  if (fs.existsSync(PATHS.handoff)) {
    const handoff = JSON.parse(fs.readFileSync(PATHS.handoff, 'utf8'));
    handoff.schema_version = toVersion;
    handoff._migration_completed = new Date().toISOString();
    fs.writeFileSync(PATHS.handoff, JSON.stringify(handoff, null, 2) + '\n');
  }

  console.log(`\n  ✅  All migrations complete: v${fromVersion} → v${toVersion}`);

  // ── Post-migration: clean up in CI, retain in interactive ─────────────────
  if (process.env.CI === 'true') {
    try {
      fs.rmSync(backupDir, { recursive: true, force: true });
      console.log('  🗑️  CI mode: backup auto-deleted (disk space)');
    } catch (err) {
      // Silent failure on cleanup — migration succeeded, cleanup is optional
    }
  } else {
    console.log(`  Backup retained: .planning/${path.basename(backupDir)}`);
    console.log(`  Remove when satisfied: rm -rf .planning/${path.basename(backupDir)}\n`);
  }

  return { status: 'migrated', from: fromVersion, to: toVersion, backupDir };
}

/**
 * All registered migrations, in no particular order -- selection is by version range, not position.
 * Exported so a --dry-run caller can show the same plan runMigrations() would actually execute,
 * without duplicating the version-range filter logic.
 */
function allMigrations() {
  return [
    require('./0.1.0-to-0.5.0'),
    require('./0.5.0-to-0.6.0'),
    require('./0.6.0-to-1.0.0'),
    require('./v9-unified-memory'),
  ];
}

/**
 * A migration should run if its DESTINATION VERSION falls within the range:
 * (fromVersion, toVersion] — i.e., greater than fromVersion AND at most toVersion.
 */
function getMigrationsToRun(fromVersion, toVersion) {
  return allMigrations().filter(m =>
    compareSemver(m.toVersion, fromVersion) > 0 &&
    compareSemver(m.toVersion, toVersion)   <= 0
  );
}

module.exports.runMigrations = runMigrations;
module.exports.getMigrationsToRun = getMigrationsToRun;

// -- CLI entrypoint --------------------------------------------------------------
//
// THE DEFECT this replaces: this file exported runMigrations() but had no entrypoint of its own, so
// `node bin/migrations/migrate.js` -- exactly what .claude/commands/mindforge/migrate.md tells
// /mindforge:migrate to run, and exactly what self-update.js's own catch block tells an operator to
// run manually when auto-migration fails -- defined functions and exited 0 doing nothing. The ONLY
// real caller of runMigrations() anywhere in this codebase was self-update.js's own internal
// version-bump flow; there was no way to trigger a migration from outside that flow, including from
// this framework's own dev checkout.
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const flag = (name) => {
      const idx = args.indexOf(`--${name}`);
      return idx !== -1 ? args[idx + 1] : null;
    };
    const dryRun = args.includes('--dry-run');

    const { resolveMindforgeVersion } = require('../utils/mindforge-version');
    const frameworkVersion = resolveMindforgeVersion({ fromDir: __dirname }).version;

    let schemaVersion = null;
    if (fs.existsSync(PATHS.handoff)) {
      try { schemaVersion = JSON.parse(fs.readFileSync(PATHS.handoff, 'utf8')).schema_version || null; }
      catch { /* malformed HANDOFF.json -- fall through to frameworkVersion below */ }
    }

    const fromVersion = flag('from') || schemaVersion || frameworkVersion;
    const toVersion = flag('to') || frameworkVersion;

    if (dryRun) {
      const plan = getMigrationsToRun(fromVersion, toVersion);
      console.log(`  Dry run: v${fromVersion} -> v${toVersion}. No changes will be made.`);
      if (plan.length === 0) {
        console.log('  No applicable migrations.');
      } else {
        console.log(`  Migrations that would run (${plan.length}):`);
        plan.forEach(m => console.log(`    - v${m.fromVersion} -> v${m.toVersion}: ${m.description}`));
      }
      process.exit(0);
    }

    try {
      const result = await runMigrations(fromVersion, toVersion);
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  })();
}
