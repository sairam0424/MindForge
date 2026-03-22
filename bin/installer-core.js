/**
 * MindForge Installer Core — Production v1.0.0
 * Handles all non-interactive installation scenarios.
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const VERSION = require('../package.json').version;

// ── Runtime configurations ────────────────────────────────────────────────────
const RUNTIMES = {
  claude: {
    globalDir:      path.join(os.homedir(), '.claude'),
    localDir:       '.claude',
    commandsSubdir: 'commands/mindforge',
    entryFile:      'CLAUDE.md',
  },
  antigravity: {
    globalDir:      path.join(os.homedir(), '.gemini', 'antigravity'),
    localDir:       'agents',
    commandsSubdir: 'workflows',
    entryFile:      'CLAUDE.md',
  },
};

// ── File system utilities ─────────────────────────────────────────────────────
const fsu = {
  exists:     p  => fs.existsSync(p),
  read:       p  => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '',
  write:      (p, t) => { fsu.ensureDir(path.dirname(p)); fs.writeFileSync(p, t, 'utf8'); },
  ensureDir:  p  => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); },
  copy:       (src, dst) => { fsu.ensureDir(path.dirname(dst)); fs.copyFileSync(src, dst); },
  listFiles:  p  => fs.existsSync(p) ? fs.readdirSync(p) : [],

  copyDir(src, dst, options = {}) {
    const { excludePatterns = [] } = options;
    fsu.ensureDir(dst);
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const skip = excludePatterns.some(pat =>
        typeof pat === 'string' ? entry.name === pat : pat.test(entry.name)
      );
      if (skip) continue;

      const s = path.join(src, entry.name);
      const d = path.join(dst, entry.name);
      entry.isDirectory() ? fsu.copyDir(s, d, options) : fsu.copy(s, d);
    }
  },
};

// ── Registry Management ────────────────────────────────────────────────────────
const RegistryManager = {
  getRegistryPath: () => path.join(os.homedir(), '.mindforge', 'registry.json'),

  registerProject(projectPath) {
    const regPath = this.getRegistryPath();
    fsu.ensureDir(path.dirname(regPath));

    let registry = { projects: [] };
    if (fsu.exists(regPath)) {
      try {
        registry = JSON.parse(fsu.read(regPath));
      } catch (e) {
        console.error('  ⚠️  Registry file corrupted, recreating...');
      }
    }

    if (!registry.projects.includes(projectPath)) {
      registry.projects.push(projectPath);
      fsu.write(regPath, JSON.stringify(registry, null, 2));
      console.log(`  ✅  Registered project in ${regPath}`);
    }
  }
};

// ── Self-install detection ────────────────────────────────────────────────────
function isSelfInstall() {
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (!fsu.exists(pkgPath)) return false;
  try {
    return JSON.parse(fsu.read(pkgPath)).name === 'mindforge-cc';
  } catch {
    return false;
  }
}

// ── Source root ───────────────────────────────────────────────────────────────
const SOURCE_ROOT = path.resolve(__dirname, '..');
const src         = (...parts) => path.join(SOURCE_ROOT, ...parts);

// ── Sensitive file exclusions (never copy these) ──────────────────────────────
const SENSITIVE_EXCLUDE = [
  '.env',        // exact filename match
  /^\.env\..*/,  // .env.local, .env.production, etc.
  /\.key$/,      // anything ending in .key (previous glob was incorrect)
  /\.pem$/,      // anything ending in .pem (previous glob was incorrect)
  'secrets',     // exact directory name
  '.secrets',    // exact directory name
  /^secrets$/,   // exact match at directory level
];

const norm = p => path.normalize(p);

function resolveBaseDir(runtime, scope) {
  const cfg = RUNTIMES[runtime];
  if (scope === 'global') return norm(cfg.globalDir);

  if (runtime === 'antigravity') {
    const agentsDir = norm(path.join(process.cwd(), 'agents'));
    const legacyAgentDir = norm(path.join(process.cwd(), '.agent'));
    if (fsu.exists(agentsDir)) return agentsDir;
    if (fsu.exists(legacyAgentDir)) {
      console.log('  ℹ️  Detected legacy .agent/ — installing there for compatibility');
      return legacyAgentDir;
    }
    return agentsDir;
  }

  return norm(path.join(process.cwd(), cfg.localDir));
}

// ── CLAUDE.md safe copy ───────────────────────────────────────────────────────
function safeCopyClaude(src, dst, options = {}) {
  const { force = false, verbose = false } = options;

  if (fsu.exists(dst)) {
    const existing = fsu.read(dst);

    if (!force) {
      // Back up non-MindForge CLAUDE.md files
      if (!existing.includes('MindForge')) {
        const backup = `${dst}.backup-${Date.now()}`;
        fsu.copy(dst, backup);
        const sizeKb = (existing.length / 1024).toFixed(1);
        console.log(`  ⚠️  Backed up existing CLAUDE.md (${sizeKb}KB) → ${path.basename(backup)}`);
        if (existing.length > 5000) {
          console.log('      Large file detected — review the backup for custom instructions');
          console.log('      to merge into the new CLAUDE.md.');
        }
      }
    }
  }

  fsu.copy(src, dst);
  if (verbose) console.log(`  → ${dst}`);
}

// ── Install verification ──────────────────────────────────────────────────────
function verifyInstall(baseDir, cmdsDir, runtime, scope) {
  const pfx = runtime === 'antigravity' ? 'mindforge:' : '';
  const required = [
    scope === 'local' ? path.join(process.cwd(), 'CLAUDE.md') : path.join(baseDir, 'CLAUDE.md'),
    path.join(cmdsDir, `${pfx}help.md`),
    path.join(cmdsDir, `${pfx}init-project.md`),
    path.join(cmdsDir, `${pfx}health.md`),
    path.join(cmdsDir, `${pfx}execute-phase.md`),
    path.join(cmdsDir, `${pfx}security-scan.md`),
  ];

  const missing = required.filter(f => !fsu.exists(f));

  if (missing.length > 0) {
    console.error(`\n  ❌  Install verification failed — ${missing.length} required file(s) missing:`);
    missing.forEach(f => console.error(`      ${f}`));
    console.error(`\n  Retry: npx mindforge-cc@latest --${runtime} --${scope} --force`);
    process.exit(1);
  }
}

// ── Install single runtime ────────────────────────────────────────────────────
async function install(runtime, scope, options = {}) {
  const {
    dryRun = false,
    force = false,
    verbose = false,
    withUtils = false,
    minimal = false,
  } = options;
  const cfg     = RUNTIMES[runtime];
  const baseDir = resolveBaseDir(runtime, scope);
  const cmdsDir = norm(path.join(baseDir, cfg.commandsSubdir));
  const selfInstall = isSelfInstall();

  console.log(`\n  Runtime : ${runtime}`);
  console.log(`  Scope   : ${scope} → ${baseDir}`);
  if (dryRun) console.log('  Mode    : DRY RUN (no changes)');
  if (selfInstall) console.log('  ⚠️  Self-install detected — skipping framework file copy');

  if (dryRun) {
    console.log('\n  Would install:');
    console.log(`    CLAUDE.md → ${path.join(baseDir, 'CLAUDE.md')}`);
    console.log(`    ${fsu.listFiles(src('.claude', 'commands', 'mindforge')).length} commands → ${cmdsDir}`);
    return;
  }

  // ── 1. Install CLAUDE.md (Root standardization for IDEs) ────────────────────
  const claudeSrc = runtime === 'claude'
    ? src('.claude', 'CLAUDE.md')
    : src('.agent', 'CLAUDE.md');

  if (fsu.exists(claudeSrc)) {
    // Keep legacy location based on runtime config
    safeCopyClaude(claudeSrc, path.join(baseDir, 'CLAUDE.md'), { force, verbose });

    // ✨ STANDARD: Inject into project root and IDE-specific rules files
    if (scope === 'local' && !selfInstall) {
      const rootClaude = path.join(process.cwd(), 'CLAUDE.md');
      const rootCursor = path.join(process.cwd(), '.cursorrules');
      const rootWindsurf = path.join(process.cwd(), '.windsurfrules');
      
      safeCopyClaude(claudeSrc, rootClaude, { force, verbose });
      safeCopyClaude(claudeSrc, rootCursor, { force, verbose });
      safeCopyClaude(claudeSrc, rootWindsurf, { force, verbose });
      console.log('  ✅  CLAUDE.md (Mirrored to project root & .cursorrules)');
    } else {
      console.log('  ✅  CLAUDE.md');
    }
  }

  // ── 2. Install commands ─────────────────────────────────────────────────────
  const cmdSrc = runtime === 'claude'
    ? src('.claude', 'commands', 'mindforge')
    : src('.agent', 'mindforge');

  if (fsu.exists(cmdSrc)) {
    fsu.ensureDir(cmdsDir);
    const files = fsu.listFiles(cmdSrc).filter(f => f.endsWith('.md'));
    
    // Install for specific runtime
    files.forEach(f => {
      const targetName = runtime === 'antigravity' ? `mindforge:${f}` : f;
      fsu.copy(path.join(cmdSrc, f), path.join(cmdsDir, targetName));
    });

    // ✨ STANDARD: Mirror to .claude/commands for cross-IDE compatibility (Cursor/Windsurf/Claude Code)
    if (scope === 'local' && runtime !== 'claude' && !selfInstall) {
      const standardCmdDir = path.join(process.cwd(), '.claude', 'commands', 'mindforge');
      fsu.ensureDir(standardCmdDir);
      files.forEach(f => {
        fsu.copy(path.join(cmdSrc, f), path.join(standardCmdDir, f));
      });
      console.log(`  ✅  ${files.length} commands (Mirrored to .claude/commands/mindforge/)`);
    } else {
      console.log(`  ✅  ${files.length} commands`);
    }
  }

  // ── 3. Framework files (local scope only, non-self-install) ─────────────────
  if (scope === 'local' && !selfInstall) {
    // .mindforge/ — framework engine files
    const forgeSrc = src('.mindforge');
    const forgeDst = path.join(process.cwd(), '.mindforge');
    if (fsu.exists(forgeSrc)) {
      if (minimal) {
        const minimalEntries = new Set([
          'MINDFORGE-SCHEMA.json',
          'engine',
          'org',
          'governance',
          'integrations',
          'personas',
          'skills',
          'team',
        ]);
        fsu.ensureDir(forgeDst);
        for (const entry of fs.readdirSync(forgeSrc, { withFileTypes: true })) {
          if (!minimalEntries.has(entry.name)) continue;
          const s = path.join(forgeSrc, entry.name);
          const d = path.join(forgeDst, entry.name);
          entry.isDirectory() ? fsu.copyDir(s, d, { excludePatterns: SENSITIVE_EXCLUDE }) : fsu.copy(s, d);
        }
        console.log('  ✅  .mindforge/ (minimal core)');
      } else {
        fsu.copyDir(forgeSrc, forgeDst, { excludePatterns: SENSITIVE_EXCLUDE });
        console.log('  ✅  .mindforge/ (framework engine)');
      }
    }

    // .planning/ — create only if it doesn't already exist (preserve project state)
    const planningDst = path.join(process.cwd(), '.planning');
    if (!fsu.exists(planningDst)) {
      const planningSrc = src('.planning');
      if (fsu.exists(planningSrc)) {
        if (minimal) {
          fsu.ensureDir(planningDst);
          ['STATE.md', 'HANDOFF.json', 'PROJECT.md'].forEach((name) => {
            const s = path.join(planningSrc, name);
            const d = path.join(planningDst, name);
            if (fsu.exists(s)) fsu.copy(s, d);
          });
          console.log('  ✅  .planning/ (minimal state)');
        } else {
          fsu.copyDir(planningSrc, planningDst, { excludePatterns: SENSITIVE_EXCLUDE });
          console.log('  ✅  .planning/ (state templates)');
        }
      }
    } else {
      console.log('  ⏭️  .planning/ already exists — preserved (run /mindforge:health to verify)');
    }

    // MINDFORGE.md — create only if it doesn't already exist
    const mindforgemDst = path.join(process.cwd(), 'MINDFORGE.md');
    const mindforgemSrc = src('MINDFORGE.md');
    if (!fsu.exists(mindforgemDst) && fsu.exists(mindforgemSrc)) {
      fsu.copy(mindforgemSrc, mindforgemDst);
      console.log('  ✅  MINDFORGE.md (project constitution)');
    }

    // bin/ utilities (optional)
    if (withUtils) {
      const binDst = path.join(process.cwd(), 'bin');
      const binSrc = src('bin');
      if (fsu.exists(binSrc) && !fsu.exists(binDst)) {
        fsu.copyDir(binSrc, binDst, { excludePatterns: SENSITIVE_EXCLUDE });
        console.log('  ✅  bin/ (utilities)');
      } else if (fsu.exists(binDst)) {
        console.log('  ⏭️  bin/ already exists — preserved');
      }
    }

    RegistryManager.registerProject(process.cwd());
  }

  // ── 4. Verify installation ──────────────────────────────────────────────────
  verifyInstall(baseDir, cmdsDir, runtime, scope);
  console.log('  ✅  Install verified');
}

// ── Uninstall ─────────────────────────────────────────────────────────────────
async function uninstall(runtime, scope, options = {}) {
  const { dryRun = false } = options;
  const cfg     = RUNTIMES[runtime];
  const baseDir = resolveBaseDir(runtime, scope);
  const cmdsDir = norm(path.join(baseDir, cfg.commandsSubdir));
  const claudeMd = norm(path.join(baseDir, 'CLAUDE.md'));

  console.log(`\n  Uninstalling MindForge (${runtime} / ${scope})...`);
  if (dryRun) {
    console.log(`  Would remove: ${cmdsDir}`);
    if (fsu.exists(claudeMd) && fsu.read(claudeMd).includes('MindForge'))
      console.log(`  Would remove: ${claudeMd}`);
    return;
  }

  // Remove commands directory
  if (fsu.exists(cmdsDir)) {
    fs.rmSync(cmdsDir, { recursive: true, force: true });
    console.log(`  ✅  Removed: ${cmdsDir}`);
  }

  // Remove CLAUDE.md only if it's a MindForge-generated file
  if (fsu.exists(claudeMd) && fsu.read(claudeMd).includes('MindForge')) {
    fs.unlinkSync(claudeMd);
    console.log(`  ✅  Removed: ${claudeMd}`);
  }

  // Preserve .planning/ and .mindforge/ — user data, not our files to delete
  console.log('  ℹ️  .planning/ and .mindforge/ preserved (user data)');
  console.log('      Remove manually if desired.');
}

// ── Main run ──────────────────────────────────────────────────────────────────
async function run(args) {
  const runtime    = args.includes('--antigravity') ? 'antigravity'
                   : args.includes('--all')         ? 'all'
                   : 'claude';
  const scope      = args.includes('--global') || args.includes('-g') ? 'global' : 'local';
  const dryRun     = args.includes('--dry-run');
  const force      = args.includes('--force');
  const verbose    = args.includes('--verbose');
  const withUtils  = args.includes('--with-utils');
  const minimal    = args.includes('--minimal');
  const isUninstall = args.includes('--uninstall');
  const isUpdate    = args.includes('--update');
  const isCheck     = args.includes('--check');
  const options     = { dryRun, force, verbose, withUtils, minimal };

  console.log(`\n⚡  MindForge v${VERSION} — Enterprise Agentic Framework\n`);

  // Check for updates only
  if (isCheck) {
    const { checkAndUpdate } = require('./updater/self-update');
    await checkAndUpdate({ apply: false });
    return;
  }

  const runtimes = runtime === 'all' ? Object.keys(RUNTIMES) : [runtime];

  for (const rt of runtimes) {
    if (isUninstall)  await uninstall(rt, scope, options);
    else if (isUpdate) await install(rt, scope, { ...options, isUpdate: true });
    else               await install(rt, scope, options);
  }

  if (!isUninstall) {
    console.log(`\n  ✅  MindForge v${VERSION} installed (${runtime} / ${scope})\n`);
    console.log('  Next steps:');
    console.log('    1. Open Claude Code or Antigravity in your project directory');
    console.log('    2. Run: /mindforge:health  (verify installation)');
    console.log('    3. Run: /mindforge:init-project  (new project)');
    console.log('         OR /mindforge:map-codebase  (existing project)\n');
  } else {
    console.log('\n  ✅  MindForge uninstalled\n');
  }
}

module.exports = { run, install, uninstall };
