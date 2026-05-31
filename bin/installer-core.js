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
    skillsSubdir:   'skills',
    hooksSubdir:    'hooks',
    personasSubdir: 'personas',
    docsSubdir:     'docs',
    memorySubdir:   'memory',
    pluginsSubdir:  'plugins',
  },
  antigravity: {
    displayName:    'Antigravity',
    globalDir:      path.join(os.homedir(), '.gemini', 'antigravity'),
    localDir:       '.agents',
    commandsSubdir: 'workflows',
    entryFile:      'CLAUDE.md',
    supportsSlash:  true,
    skillsSubdir:   'skills',
    hooksSubdir:    'hooks',
    personasSubdir: 'personas',
    docsSubdir:     'docs',
    memorySubdir:   'memory',
    pluginsSubdir:  'plugins',
  },
  cursor: {
    displayName:    'Cursor',
    globalDir:      path.join(os.homedir(), '.cursor'),
    localDir:       '.cursor',
    commandsSubdir: 'rules',
    entryFile:      '.cursorrules',
    supportsSlash:  false,
    skillsSubdir:   'skills',
    hooksSubdir:    'hooks',
    personasSubdir: 'personas',
    docsSubdir:     'docs',
    memorySubdir:   'memory',
    pluginsSubdir:  'plugins',
  },
  opencode: {
    displayName:    'OpenCode',
    globalDir:      path.join(os.homedir(), '.opencode'),
    localDir:       '.opencode',
    commandsSubdir: 'commands/mindforge',
    entryFile:      'CLAUDE.md',
    supportsSlash:  true,
    skillsSubdir:   'skills',
    hooksSubdir:    'hooks',
    personasSubdir: 'personas',
    docsSubdir:     'docs',
    memorySubdir:   'memory',
    pluginsSubdir:  'plugins',
  },
  gemini: {
    displayName:    'Gemini CLI',
    globalDir:      path.join(os.homedir(), '.gemini'),
    localDir:       '.gemini',
    commandsSubdir: 'commands/mindforge',
    entryFile:      'GEMINI.md',
    supportsSlash:  true,
    skillsSubdir:   'skills',
    hooksSubdir:    'hooks',
    personasSubdir: 'personas',
    docsSubdir:     'docs',
    memorySubdir:   'memory',
    pluginsSubdir:  'plugins',
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
 * Reads the target project's experimental.pqc_demo flag — the SINGLE gate that
 * the engine (bin/governance/quantum-crypto.js) uses to enable the simulated
 * PQAS minter. Defaults to false (engine default) when the config is absent or
 * unreadable, so the installer never over-claims that PQAS is enabled.
 * @param {string} cwd - Target project root being installed into.
 * @returns {boolean} - true only when experimental.pqc_demo === true.
 */
function isPqcDemoEnabled(cwd) {
  try {
    const cfgPath = path.join(cwd, '.mindforge', 'config.json');
    if (!fs.existsSync(cfgPath)) return false;
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    return cfg && cfg.experimental && cfg.experimental.pqc_demo === true;
  } catch {
    return false;
  }
}

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

/**
 * Extract an enterprise-grade description from command markdown.
 * Prioritizes YAML frontmatter 'description' field, then falls back to first non-empty text.
 */
function getCommandDescription(content) {
  // Check for YAML frontmatter
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const descMatch = frontmatter.match(/^description:\s*(.*)$/m);
    if (descMatch) return descMatch[1].trim();
  }

  // Fallback to first non-empty, non-header line
  const lines = content.split('\n');
  for (let line of lines) {
    line = line.trim();
    if (line && !line.startsWith('#') && !line.startsWith('---')) {
      return line.length > 100 ? line.substring(0, 97) + '...' : line;
    }
  }

  return 'No description available';
}

// ── File system utilities ─────────────────────────────────────────────────────
const fsu = {
  exists:     p  => fs.existsSync(p),
  read:       p  => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '',
  write:      (p, t) => { fsu.ensureDir(path.dirname(p)); fs.writeFileSync(p, t, 'utf8'); },
  ensureDir:  p  => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); },
  copy:       (src, dst) => { fsu.ensureDir(path.dirname(dst)); fs.copyFileSync(src, dst); },
  listFiles:  p  => fs.existsSync(p) ? fs.readdirSync(p) : [],
  listFilesRecursive: (p, ext = '.md') => {
    if (!fs.existsSync(p)) return [];
    let results = [];
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) results = results.concat(fsu.listFilesRecursive(full, ext));
      else if (entry.name.endsWith(ext)) results.push(full);
    }
    return results;
  },

  copyDir(src, dst, options = {}) {
    const { excludePatterns = [], noOverwrite = false } = options;
    fsu.ensureDir(dst);
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const skip = excludePatterns.some(pat =>
        typeof pat === 'string' ? entry.name === pat : pat.test(entry.name)
      );
      if (skip) continue;

      const s = path.join(src, entry.name);
      const d = path.join(dst, entry.name);
      if (entry.isDirectory()) {
        fsu.copyDir(s, d, options);
      } else {
        if (noOverwrite && fsu.exists(d)) continue;
        fsu.copy(s, d);
      }
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
  /\.key$/i,     // anything ending in .key
  /\.pem$/i,     // anything ending in .pem
  'secrets',     // exact directory name
  '.secrets',    // exact directory name
  /^secrets$/i,  // exact match at directory level
  'node_modules',
  '.git',
  '.DS_Store',
  'browser-daemon.log',
  /audit\.jsonl/i,
  /handoff\.json/i,
  /jira-sync\.json/i,
  /slack-threads\.json/i,
  // Specific legacy or project-private folders
  '01-migrate-legacy-to-mindforge',
  'day1',
  'day2',
  'day3',
  'research',
  'screenshots',
];

// Special-case folders in .mindforge that are development-only
const MINDFORGE_DEV_EXCLUDE = [
  'distribution',
  'monorepo',
  'production',
  'pr-review',
  'skills-builder',
  'ci',
  'browser',
  'audit'
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
    // Sovereign Engine logic
    path.join(process.cwd(), 'bin/governance/policy-engine.js'),
    path.join(process.cwd(), 'bin/governance/quantum-crypto.js'),
    path.join(process.cwd(), 'bin/autonomous/intent-harvester.js'),
    path.join(process.cwd(), 'bin/memory/cli.js'),
    path.join(process.cwd(), 'bin/models/cost-tracker.js'),
    path.join(process.cwd(), 'bin/research/research-engine.js'),
    path.join(process.cwd(), 'docs/registry/COMMANDS.md'),
    path.join(process.cwd(), 'docs/registry/PERSONAS.md'),
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
  const targetDir = baseDir;

  Theme.printPrompt(`Runtime : ${c.cyan(runtime)}`);
  Theme.printPrompt(`Scope   : ${c.dim(scope)} → ${c.bold(targetDir)}`);
  if (options.dryRun) Theme.printStatus('Mode    : DRY RUN (no changes)', 'warn');
  if (selfInstall) Theme.printStatus(c.yellow('Self-install detected — skipping framework file copy'), 'warn');

  if (dryRun) {
    console.log('\n  Would install:');
    console.log(`    ${cfg.entryFile.padEnd(12)} → ${path.join(baseDir, cfg.entryFile)}`);
    
    const cmdCountStr = `${fsu.listFiles(src('.agent', 'mindforge')).length} commands`.padEnd(12);
    console.log(`    ${cmdCountStr} → ${cmdsDir}`);

    const assetMappings = [
      { key: 'skillsSubdir',   src: src('.agent', 'skills'),      label: 'skills' },
      { key: 'hooksSubdir',    src: src('.agent', 'hooks'),       label: 'hooks' },
      { key: 'personasSubdir', src: src('.mindforge', 'personas'), label: 'personas' },
      { key: 'docsSubdir',     src: src('docs', 'references'),    label: 'references' },
      { key: 'docsSubdir',     src: src('docs', 'templates'),     label: 'templates' }
    ];

    assetMappings.forEach(asset => {
      const subDir = cfg[asset.key];
      if (subDir && fsu.exists(asset.src)) {
        if (asset.label === 'references' || asset.label === 'templates') {
          console.log(`    ${asset.label.padEnd(12)} → ${path.join(baseDir, subDir, asset.label)}`);
        } else {
          const count = fsu.listFiles(asset.src).length;
          const countStr = `${count} ${asset.label}`.padEnd(12);
          console.log(`    ${countStr} → ${path.join(baseDir, subDir)}`);
        }
      }
    });
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
  const cmdSources = [
    { src: src('.agent', 'mindforge'), namespace: 'mindforge' },
    { src: src('.agent', 'forge'),     namespace: 'forge' }
  ];

  if (runtime === 'claude') {
    // Claude Code specifically looks in .claude/commands/mindforge
    cmdSources.length = 0;
    cmdSources.push({ src: src('.claude', 'commands', 'mindforge'), namespace: 'mindforge' });
  }

  let totalCount = 0;
  cmdSources.forEach(source => {
    if (!fsu.exists(source.src)) return;

    const files = fsu.listFiles(source.src).filter(f => f.endsWith('.md'));
    totalCount += files.length;
    fsu.ensureDir(cmdsDir);

    files.forEach(f => {
      // Logic for naming: antigravity uses namespace:prefix, others use just the file name
      const targetName = runtime === 'antigravity' ? `${source.namespace}:${f}` : f;
      const srcPath = path.join(source.src, f);
      const dstPath = path.join(cmdsDir, targetName);

      if (runtime === 'antigravity') {
        const content = fsu.read(srcPath);
        const description = getCommandDescription(content);
        const metadata = `---\ndescription: ${description}\n---\n`;
        
        // Strip existing frontmatter from source when injecting into Antigravity
        const cleanContent = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
        fsu.write(dstPath, metadata + cleanContent);
      } else {
        fsu.copy(srcPath, dstPath);
      }
    });

    // Mirror to .claude/commands for cross-IDE compatibility (Cursor/Windsurf/Claude Code)
    if (scope === 'local' && runtime !== 'claude' && !selfInstall) {
      const standardCmdDir = path.join(process.cwd(), '.claude', 'commands', source.namespace);
      fsu.ensureDir(standardCmdDir);
      files.forEach(f => {
        fsu.copy(path.join(source.src, f), path.join(standardCmdDir, f));
      });
    }
  });

  if (totalCount > 0) {
    if (scope === 'local' && runtime !== 'claude' && !selfInstall) {
      Theme.printResolved(`${c.bold(totalCount)} commands (Mirrored to .claude/commands/)`);
    } else {
      Theme.printResolved(`${c.bold(totalCount)} commands`);
    }
  }

  // ── 2.1 Install Enterprise Assets (Skills, Hooks, Personas) ─────────────────
  if (scope === 'local' && !selfInstall) {
    const assetTypes = [
      { key: 'skillsSubdir',   src: src('.agent', 'skills'),      label: 'skills' },
      { key: 'hooksSubdir',    src: src('.agent', 'hooks'),       label: 'hooks' },
      { key: 'personasSubdir', src: src('.mindforge', 'personas'), label: 'personas' },
      { key: 'docsSubdir',     src: src('docs', 'references'),    label: 'references' },
      { key: 'docsSubdir',     src: src('docs', 'templates'),     label: 'templates' },
      { key: 'memorySubdir',   src: src('.mindforge', 'memory'),   label: 'memory' },
      { key: 'pluginsSubdir',  src: src('.mindforge', 'plugins'),  label: 'plugins' }
    ];

    assetTypes.forEach(asset => {
      const subDir = cfg[asset.key];
      if (subDir && fsu.exists(asset.src)) {
        let dstDir = path.join(baseDir, subDir);
        // Documentation and templates go into subdirectories of their own
        if (asset.label === 'references' || asset.label === 'templates') {
          dstDir = path.join(dstDir, asset.label);
        }
        fsu.ensureDir(dstDir);
        // Use copyDir for the whole directory
        fsu.copyDir(asset.src, dstDir, { excludePatterns: SENSITIVE_EXCLUDE, noOverwrite: !force });
        Theme.printResolved(`${c.bold(asset.label.padEnd(12))} (Enterprise sync)`);
      }
    });
  }

  // ── 3. Framework files (local scope only, non-self-install) ─────────────────
  if (scope === 'local' && !selfInstall) {
    // .mindforge/ — framework engine files
    const forgeSrc = src('.mindforge');
    const forgeDst = path.join(process.cwd(), '.mindforge');
    if (fsu.exists(forgeSrc)) {
      // Define all required enterprise framework folders
      const standardFrameworkFolders = [
        'engine', 'org', 'governance', 'integrations', 'personas', 'skills', 
        'team', 'intelligence', 'memory', 'metrics', 'models', 'plugins', 
        'dashboard', 'browser', 'monorepo', 'production', 'distribution',
        'docs/registry'
      ];

      if (minimal) {
        const minimalEntries = new Set([
          'MINDFORGE-SCHEMA.json',
          'engine', 'org', 'governance', 'integrations', 'personas', 'skills', 'team'
        ]);
        fsu.ensureDir(forgeDst);
        for (const entry of fs.readdirSync(forgeSrc, { withFileTypes: true })) {
          if (!minimalEntries.has(entry.name)) continue;
          const s = path.join(forgeSrc, entry.name);
          const d = path.join(forgeDst, entry.name);
          if (entry.isDirectory()) {
            fsu.copyDir(s, d, { excludePatterns: SENSITIVE_EXCLUDE, noOverwrite: true });
          } else {
            if (!fsu.exists(d) || force) fsu.copy(s, d);
          }
        }
        Theme.printResolved(`${c.bold('.mindforge/')} (minimal sync)`);
      } else {
        // Standard merge: Ensure missing folders are added, but don't overwrite existing user configs
        fsu.copyDir(forgeSrc, forgeDst, { 
          excludePatterns: [...SENSITIVE_EXCLUDE, ...MINDFORGE_DEV_EXCLUDE],
          noOverwrite: !force 
        });
        Theme.printResolved(`${c.bold('.mindforge/')} (synchronized framework)`);
      }
    }

    // .planning/ — merge templates but preserve existing state
    const planningDst = path.join(process.cwd(), '.planning');
    const planningSrc = src('.planning');
    if (fsu.exists(planningSrc)) {
      fsu.ensureDir(planningDst);
      
      // Define standard planning templates that must exist
      const standardPlanningFiles = [
        'STATE.md', 'HANDOFF.json', 'PROJECT.md', 
        'ROADMAP.md', 'ARCHITECTURE.md', 'REQUIREMENTS.md', 
        'RELEASE-CHECKLIST.md'
      ];

      // Always ensure top-level standard templates are copied if missing
      standardPlanningFiles.forEach((name) => {
        const s = path.join(planningSrc, name);
        const d = path.join(planningDst, name);
        if (fsu.exists(s) && (!fsu.exists(d) || force)) fsu.copy(s, d);
      });

      if (!minimal) {
        // Merge subdirectories (empty ones persist via .gitkeep)
        fsu.copyDir(planningSrc, planningDst, { 
          excludePatterns: SENSITIVE_EXCLUDE,
          noOverwrite: true 
        });
        Theme.printResolved(`${c.bold('.planning/')} (merged templates)`);
      } else {
        Theme.printResolved(`${c.bold('.planning/')} (minimal sync)`);
      }
    }

    // MINDFORGE.md — create only if it doesn't already exist
    const mindforgemDst = path.join(process.cwd(), 'MINDFORGE.md');
    const mindforgemSrc = src('MINDFORGE.md');
    if (!fsu.exists(mindforgemDst) && fsu.exists(mindforgemSrc)) {
      fsu.copy(mindforgemSrc, mindforgemDst);
      Theme.printResolved(`${c.bold('MINDFORGE.md')} (project constitution)`);
    }

    // AGENTS_LEARNING.md — create only if it doesn't already exist
    const learningDst = path.join(process.cwd(), 'AGENTS_LEARNING.md');
    const learningSrc = src('docs', 'templates', 'Project', 'AGENTS_LEARNING.md');
    if (!fsu.exists(learningDst) && fsu.exists(learningSrc)) {
      fsu.copy(learningSrc, learningDst);
      Theme.printResolved(`${c.bold('AGENTS_LEARNING.md')} (agentic memory)`);
    }

    // WALKTHROUGH.md — update if exists
    const walkDst = path.join(process.cwd(), 'WALKTHROUGH.md');
    const walkSrc = src('docs', 'templates', 'Project', 'WALKTHROUGH.md');
    if (fsu.exists(walkSrc)) {
      fsu.copy(walkSrc, walkDst);
      Theme.printResolved(`${c.bold('WALKTHROUGH.md')} (updated)`);
    }

    // Sovereign Intelligence v8.2.0: Copy core engines by default
    const coreEngines = [
      'bin/engine/nexus-tracer.js',
      'bin/engine/learning-manager.js',
      'bin/sre/sentinel.js',
      'bin/sre/shadow-mirror.js',
      'bin/sre/adversarial-sre.js',
      'bin/sre/sli-verifier.js'
    ];
    const sovereignEngines = [
      'governance', 'autonomous', 'memory', 'models', 'research', 
      'wizard', 'updater', 'dashboard', 'browser', 'skills-builder', 'engine'
    ];
    sovereignEngines.forEach(engine => {
      const srcDir = src('bin', engine);
      const dstDir = path.join(process.cwd(), 'bin', engine);
      if (fsu.exists(srcDir)) {
        fsu.ensureDir(dstDir);
        fsu.copyDir(srcDir, dstDir, { excludePatterns: SENSITIVE_EXCLUDE, noOverwrite: !force });
      }
    });

    // ✨ SOVEREIGN INITIALIZATION: report actual security posture honestly.
    // The PQAS minter is gated SOLELY behind experimental.pqc_demo (see
    // bin/governance/quantum-crypto.js: getProvider/_assertPqcDemoEnabled). When
    // that flag is off (the default) PQAS is inert/simulated — claiming it is
    // "enabled" would contradict the engine and mislead operators (UC-22).
    Theme.printStatus(c.magenta('Sovereign Intelligence v8.2.0 activated'), 'done');
    if (isPqcDemoEnabled(process.cwd())) {
      Theme.printStatus(c.dim('  - Post-Quantum Agentic Security (PQAS): SIMULATED demo ENABLED '
        + '(experimental.pqc_demo=true — simulated lattice crypto, NOT production trust)'), 'info');
    } else {
      Theme.printStatus(c.dim('  - Post-Quantum Agentic Security (PQAS): available in simulated/experimental '
        + 'mode (inactive by default — set experimental.pqc_demo=true to enable the simulated demo)'), 'info');
    }
    Theme.printStatus(c.dim('  - Proactive Semantic Intent Harvesting active'), 'info');

    // bin/ utilities (remaining non-engine scripts)
    if (withUtils) {
      const binDst = path.join(process.cwd(), 'bin');
      const binSrc = src('bin');
      if (fsu.exists(binSrc)) {
        fsu.copyDir(binSrc, binDst, { 
          excludePatterns: [...SENSITIVE_EXCLUDE, ...sovereignEngines],
          noOverwrite: true 
        });
        Theme.printResolved(`${c.bold('bin/')} (auxiliary utilities)`);
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
    actions: 0,
    docs: 0,
    templates: 0
  };

  try {
    const forgeSrc = src('.mindforge');
    if (fsu.exists(forgeSrc)) {
      stats.personas = fsu.listFiles(path.join(forgeSrc, 'personas')).filter(f => f.endsWith('.md')).length;
      stats.skills = fsu.listFiles(path.join(SOURCE_ROOT, '.agent', 'skills')).length;
      stats.governance = fsu.listFiles(path.join(forgeSrc, 'governance')).filter(f => f.endsWith('.md')).length;
      stats.integrations = fsu.listFiles(path.join(forgeSrc, 'integrations')).filter(f => f.endsWith('.md')).length;
    }

    // Docs & Templates count
    const refSrc = src('docs', 'references');
    const tmpSrc = src('docs', 'templates');
    if (fsu.exists(refSrc)) stats.docs = fsu.listFiles(refSrc).filter(f => f.endsWith('.md')).length;
    if (fsu.exists(tmpSrc)) stats.templates = fsu.listFilesRecursive(tmpSrc).length;
    
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
    return { personas: 117, skills: 20, governance: 4, integrations: 6, actions: 71, docs: 12, templates: 21 };
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
