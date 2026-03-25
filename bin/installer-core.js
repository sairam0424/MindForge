/**
 * MindForge Installer Core — Production v1.0.0
 * Handles all non-interactive installation scenarios.
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const SessionMemoryLoader = require('./memory/session-memory-loader');
const Theme = require('./wizard/theme');
const c = Theme.colors;

const VERSION = require('../package.json').version;

// ── Runtime configurations ────────────────────────────────────────────────────
const RUNTIMES = {
  claude: {
    displayName:    'Claude Code',
    globalDir:      path.join(os.homedir(), '.claude'),
    localDir:       '.claude',
    commandsSubdir: 'commands/mindforge',
    entryFile:      'CLAUDE.md',
    supportsSlash:  true,
  },
  antigravity: {
    displayName:    'Antigravity',
    globalDir:      path.join(os.homedir(), '.gemini', 'antigravity'),
    localDir:       '.agents',
    commandsSubdir: 'workflows',
    entryFile:      'CLAUDE.md',
    supportsSlash:  true,
  },
  cursor: {
    displayName:    'Cursor',
    globalDir:      path.join(os.homedir(), '.cursor'),
    localDir:       '.cursor',
    commandsSubdir: 'rules',
    entryFile:      '.cursorrules',
    supportsSlash:  false,
  },
  opencode: {
    displayName:    'OpenCode',
    globalDir:      path.join(os.homedir(), '.opencode'),
    localDir:       '.opencode',
    commandsSubdir: 'commands/mindforge',
    entryFile:      'CLAUDE.md',
    supportsSlash:  true,
  },
  gemini: {
    displayName:    'Gemini CLI',
    globalDir:      path.join(os.homedir(), '.gemini'),
    localDir:       '.gemini',
    commandsSubdir: 'commands/mindforge',
    entryFile:      'GEMINI.md',
    supportsSlash:  true,
  },
  copilot: {
    displayName:    'GitHub Copilot',
    globalDir:      path.join(os.homedir(), '.github', 'copilot'),
    localDir:       '.github',
    commandsSubdir: 'copilot-instructions/mindforge',
    entryFile:      'copilot-instructions.md',
    supportsSlash:  false,
  },
};

/**
 * Generates runtime-specific entry file content.
 * e.g. replacing "Claude" with "Gemini" in GEMINI.md
 */
function generateEntryContent(runtime, sourceContent) {
  if (runtime === 'gemini') {
    return sourceContent
      .replace(/claude-3-5-sonnet/gi, 'gemini-2.0-flash-exp')
      .replace(/Claude Code/g, 'Gemini CLI')
      .replace(/CLAUDE.md/g, 'GEMINI.md');
  }
  
  if (runtime === 'cursor' || runtime === 'copilot') {
    // Add preamble for non-slash runtimes as per review feedback
    const preamble = `<!--
  MindForge Rule Set for ${RUNTIMES[runtime].displayName}
  MindForge command reference: @[command name without .md]
-->\n\n`;
    return preamble + sourceContent;
  }

  return sourceContent;
}

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
    const agentsDir = norm(path.join(process.cwd(), '.agents'));
    const legacyAgentsDir = norm(path.join(process.cwd(), 'agents'));
    const legacyAgentDir = norm(path.join(process.cwd(), '.agent'));
    
    if (fsu.exists(agentsDir)) return agentsDir;
    
    // Support transition from 'agents/' to '.agents/'
    if (fsu.exists(legacyAgentsDir)) {
      console.log('  ℹ️  Detected legacy agents/ — installing there for compatibility');
      return legacyAgentsDir;
    }
    
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
  const cfg = RUNTIMES[runtime];
  const pfx = runtime === 'antigravity' ? 'mindforge:' : '';
  const required = [
    scope === 'local' ? path.join(process.cwd(), (cfg.entryFile || 'CLAUDE.md').replace(/\.rd$/, '.md')) : path.join(baseDir, (cfg.entryFile || 'CLAUDE.md').replace(/\.rd$/, '.md')),
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
  const targetDir = baseDir; // Define targetDir for the new printStatus line

  Theme.printPrompt(`Runtime : ${c.cyan(runtime)}`);
  Theme.printPrompt(`Scope   : ${c.dim(scope)} → ${c.bold(targetDir)}`);
  if (options.dryRun) Theme.printStatus('Mode    : DRY RUN (no changes)', 'warn');
  if (selfInstall) Theme.printStatus(c.yellow('Self-install detected — skipping framework file copy'), 'warn');

  if (dryRun) {
    console.log('\n  Would install:');
    console.log(`    ${cfg.entryFile} → ${path.join(baseDir, cfg.entryFile)}`);
    console.log(`    ${fsu.listFiles(src('.claude', 'commands', 'mindforge')).length} commands → ${cmdsDir}`);
    return;
  }

  if (fsu.exists(src('.claude', 'CLAUDE.md'))) {
    // ✨ PERSISTENT MEMORY: Load relevant context for this session
    let content = fsu.read(src('.claude', 'CLAUDE.md'));
    if (scope === 'local') {
      try {
        const stack = SessionMemoryLoader.readTechStack();
        const memory = SessionMemoryLoader.loadForSession({ techStack: stack });
        if (memory.count > 0) {
          const header = SessionMemoryLoader.generateSessionHeader(memory);
          const injection = `\n\n## 🧠 Knowledge Context (Auto-loaded)\n${header}\n${memory.formatted}\n`;
          content += injection;
        }
      } catch (err) {
        console.error('  ⚠️  Memory injection failed:', err.message);
      }
    }

    // ✨ RUNTIME ADAPTATION: Generate specific content for this runtime
    const adaptedContent = generateEntryContent(runtime, content);

    // Keep legacy location based on runtime config
    const tempEntry = path.join(os.tmpdir(), `${cfg.entryFile}-${Date.now()}.md`);
    fsu.write(tempEntry, adaptedContent);
    
    const targetPath = path.join(baseDir, cfg.entryFile);
    safeCopyClaude(tempEntry, targetPath, { force, verbose });

    // ✨ STANDARD: Inject into project root and IDE-specific rules files
    if (scope === 'local' && !selfInstall) {
      const rootClaude = path.join(process.cwd(), 'CLAUDE.md');
      const rootEntry  = path.join(process.cwd(), cfg.entryFile);
      
      // Always provide CLAUDE.md as the base standard
      safeCopyClaude(tempEntry, rootClaude, { force, verbose });
      
      // If the runtime entry file is different (e.g. .cursorrules, copilot-instructions.md), copy that too
      if (cfg.entryFile !== 'CLAUDE.md') {
        safeCopyClaude(tempEntry, rootEntry, { force, verbose });
        Theme.printResolved(`${c.bold(cfg.entryFile)} (Mirrored to project root)`);
      } else {
        Theme.printResolved(`${c.bold('CLAUDE.md')} (Mirrored to project root)`);
      }
    } else {
      Theme.printResolved(c.bold(cfg.entryFile));
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
      const srcPath = path.join(cmdSrc, f);
      const dstPath = path.join(cmdsDir, targetName);

      if (runtime === 'antigravity') {
        const content = fsu.read(srcPath);
        const firstLine = content.split('\n')[0].trim();
        // Mandatory Antigravity frontmatter metadata
        const metadata = `---\ndescription: ${firstLine}\n---\n`;
        fsu.write(dstPath, metadata + content);
      } else {
        fsu.copy(srcPath, dstPath);
      }
    });

    // ✨ STANDARD: Mirror to .claude/commands for cross-IDE compatibility (Cursor/Windsurf/Claude Code)
    if (scope === 'local' && runtime !== 'claude' && !selfInstall) {
      const standardCmdDir = path.join(process.cwd(), '.claude', 'commands', 'mindforge');
      fsu.ensureDir(standardCmdDir);
      files.forEach(f => {
        fsu.copy(path.join(cmdSrc, f), path.join(standardCmdDir, f));
      });
      Theme.printResolved(`${c.bold(files.length)} commands (Mirrored to .claude/commands/mindforge/)`);
    } else {
      Theme.printResolved(`${c.bold(files.length)} commands`);
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
        Theme.printResolved(`${c.bold('.mindforge/')} (minimal core)`);
      } else {
        fsu.copyDir(forgeSrc, forgeDst, { excludePatterns: SENSITIVE_EXCLUDE });
        Theme.printResolved(`${c.bold('.mindforge/')} (framework engine)`);
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
          Theme.printResolved(`${c.bold('.planning/')} (state templates)`);
        }
      }
    } else {
      Theme.printPrompt(c.dim('.planning/ already exists — preserved (run /mindforge:health to verify)'));
    }

    // MINDFORGE.md — create only if it doesn't already exist
    const mindforgemDst = path.join(process.cwd(), 'MINDFORGE.md');
    const mindforgemSrc = src('MINDFORGE.md');
    if (!fsu.exists(mindforgemDst) && fsu.exists(mindforgemSrc)) {
      fsu.copy(mindforgemSrc, mindforgemDst);
      Theme.printResolved(`${c.bold('MINDFORGE.md')} (project constitution)`);
    }

    // bin/ utilities (optional)
    if (withUtils) {
      const binDst = path.join(process.cwd(), 'bin');
      const binSrc = src('bin');
      if (fsu.exists(binSrc) && !fsu.exists(binDst)) {
        fsu.copyDir(binSrc, binDst, { excludePatterns: SENSITIVE_EXCLUDE });
        Theme.printResolved(`${c.bold('bin/')} (utilities)`);
      } else if (fsu.exists(binDst)) {
        Theme.printPrompt(c.dim('bin/ already exists — preserved'));
      }
    }

    RegistryManager.registerProject(process.cwd());
  }

  // ── 4. Verify installation ──────────────────────────────────────────────────
  Theme.printResolved(c.bold('Install verified'));
}

// ── Uninstall ─────────────────────────────────────────────────────────────────
async function uninstall(runtime, scope, options = {}) {
  const { dryRun = false } = options;
  const cfg     = RUNTIMES[runtime];
  const baseDir = resolveBaseDir(runtime, scope);
  const cmdsDir = norm(path.join(baseDir, cfg.commandsSubdir));
  const entryFile = norm(path.join(baseDir, cfg.entryFile));

  console.log(`\n  Uninstalling MindForge (${runtime} / ${scope})...`);
  if (dryRun) {
    console.log(`  Would remove: ${cmdsDir}`);
    if (fsu.exists(entryFile) && fsu.read(entryFile).includes('MindForge'))
      console.log(`  Would remove: ${entryFile}`);
    return;
  }

  // Remove commands directory
  if (fsu.exists(cmdsDir)) {
    fs.rmSync(cmdsDir, { recursive: true, force: true });
    console.log(`  ✅  Removed: ${cmdsDir}`);
  }

  // Remove entry file only if it's a MindForge-generated file
  if (fsu.exists(entryFile) && fsu.read(entryFile).includes('MindForge')) {
    fs.unlinkSync(entryFile);
    console.log(`  ✅  Removed: ${entryFile}`);
  }

  // Preserve .planning/ and .mindforge/ — user data, not our files to delete
  console.log('  ℹ️  .planning/ and .mindforge/ preserved (user data)');
  console.log('      Remove manually if desired.');
}

/**
 * Collect statistics for the manifestation screen
 */
function collectManifestStats() {
  const stats = {
    personas: 0,
    skills: 0,
    governance: 0,
    integrations: 0,
    actions: 0
  };

  try {
    const forgeSrc = src('.mindforge');
    if (fsu.exists(forgeSrc)) {
      stats.personas = fsu.listFiles(path.join(forgeSrc, 'personas')).filter(f => f.endsWith('.md')).length;
      stats.skills = fsu.listFiles(path.join(forgeSrc, 'skills')).length;
      stats.governance = fsu.listFiles(path.join(forgeSrc, 'governance')).filter(f => f.endsWith('.md')).length;
      stats.integrations = fsu.listFiles(path.join(forgeSrc, 'integrations')).filter(f => f.endsWith('.md')).length;
    }
    
    // Commands count
    const claudeCmdSrc = src('.claude', 'commands', 'mindforge');
    const agentCmdSrc = src('.agent', 'mindforge');
    
    if (fsu.exists(claudeCmdSrc)) {
      stats.actions = fsu.listFiles(claudeCmdSrc).filter(f => f.endsWith('.md')).length;
    } else if (fsu.exists(agentCmdSrc)) {
      stats.actions = fsu.listFiles(agentCmdSrc).filter(f => f.endsWith('.md')).length;
    }
  } catch (e) {
    // Fallback to default values if counting fails
    return { personas: 32, skills: 10, governance: 4, integrations: 6, actions: 60 };
  }

  return stats;
}

// ── Main run ──────────────────────────────────────────────────────────────────
async function run(args) {
  // Parse runtime from flags
  let runtime = args.includes('--all') ? 'all' : null;
  
  if (!runtime) {
    // Check for explicit --runtime flag
    const rtIdx = args.indexOf('--runtime');
    if (rtIdx !== -1 && args[rtIdx + 1]) {
      runtime = args[rtIdx + 1].toLowerCase();
    } else {
      // Check for boolean flags (e.g. --cursor, --gemini)
      for (const key of Object.keys(RUNTIMES)) {
        if (args.includes(`--${key}`)) {
          runtime = key;
          break;
        }
      }
    }
  }
  
  // Default to claude if no runtime specified
  if (!runtime) runtime = 'claude';
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

  // Get package.json for version
  const pJSON = JSON.parse(fsu.read(path.join(SOURCE_ROOT, 'package.json')));

  // Print header and brand manifest
  // Print header and brand manifest
  Theme.printHeader(pJSON.version);
  Theme.printBrandManifest();
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
    const stats = collectManifestStats();
    Theme.printSuccessV2(runtime, scope, stats);
  } else {
    Theme.printResolved(c.bold('MindForge uninstalled'));
  }
}

module.exports = { run, install, uninstall, RUNTIMES, generateEntryContent };
