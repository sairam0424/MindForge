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

// A `const VERSION = require('../package.json').version` used to sit here. It was DEAD — declared,
// never read, never exported — and it was the only reason this module could fail to load at all.
// `require` of a missing path throws MODULE_NOT_FOUND, and in an install this file lands at
// <project>/bin/installer-core.js, so '../package.json' is the CONSUMER's manifest: present and
// wrong (their app's version), or absent and fatal. A dead read that can only ever crash is pure
// liability, so it is gone rather than rewired. Anything here that needs MindForge's version must
// call resolveMindforgeVersion() from ./utils/mindforge-version, which resolves by package NAME.

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
    agentsSubdir:   'agents',
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

/**
 * Where a command file from a given namespace must be written, and under what name.
 *
 * THE DEFECT THIS FIXES. Both command sources — `.agent/mindforge` and `.agent/forge` — were written
 * into the SAME directory under their bare filenames. `.agent/forge` holds exactly three files and
 * ALL THREE collide with mindforge commands, and forge was pushed second, so forge won. Measured on
 * a real `--claude --local` install, the installed file against its two candidate sources:
 *
 *     help.md          33 lines -> 11    (-22)
 *     init-project.md 170 lines -> 36   (-134)
 *     plan-phase.md   131 lines -> 34    (-97)
 *
 * 253 lines of the three flagship commands destroyed on every install, with no warning. The same bug
 * inflated the reported count: `totalCount` summed both sources, so the installer announced 224
 * commands while 221 landed — the overcount was exactly the three overwritten files.
 *
 * They are not duplicates, which is what makes the loss silent rather than harmless. They are a
 * SEPARATE command family: forge's own body says "Show all available FORGE commands" and
 * "List every .md file in `.claude/commands/forge/`" — a directory the installer never created. So
 * `/mindforge:help` was answering with forge's text, which then pointed the model at a path that
 * does not exist.
 *
 * THE FIX follows a pattern this file already contains. The cross-IDE mirror below has always
 * written `path.join(cwd, '.claude', 'commands', source.namespace)` — per-namespace directories. The
 * primary install simply never did the same.
 *
 * @param {string} cmdsDir   the runtime's configured commands directory
 * @param {string} runtime   RUNTIMES key
 * @param {string} namespace 'mindforge' | 'forge'
 * @param {string} file      basename, e.g. 'help.md'
 * @returns {{dir: string, name: string}}
 */
function resolveCommandTarget(cmdsDir, runtime, namespace, file) {
  // Antigravity flattens everything into one `workflows/` directory and has always disambiguated by
  // prefixing the namespace. Left exactly as it was — it never had the collision.
  if (runtime === 'antigravity') return { dir: cmdsDir, name: `${namespace}:${file}` };

  // Runtimes whose commands directory is already per-family (leaf 'mindforge': claude, opencode,
  // gemini, copilot) get a SIBLING directory per namespace. For claude that is
  // .claude/commands/forge/ — exactly where forge's own help text says forge commands live, so the
  // fix makes that text true rather than merely stopping the overwrite.
  if (path.basename(cmdsDir) === 'mindforge') {
    return namespace === 'mindforge'
      ? { dir: cmdsDir, name: file }
      : { dir: path.join(path.dirname(cmdsDir), namespace), name: file };
  }

  // Flat runtimes (cursor writes into `rules/`). Keep mindforge's filenames unchanged — renaming
  // them would alter cursor's rule set for reasons unrelated to this defect — and prefix the rest.
  return namespace === 'mindforge'
    ? { dir: cmdsDir, name: file }
    : { dir: cmdsDir, name: `${namespace}:${file}` };
}

// ── File system utilities ─────────────────────────────────────────────────────
/**
 * Refuse to write through a symlink.
 *
 * THE DEFECT, reproduced with a canary before this guard existed. `fs.writeFileSync` and
 * `fs.copyFileSync` open the destination O_WRONLY|O_CREAT|O_TRUNC and FOLLOW symlinks, and every
 * installer write funnels through the two primitives below. So a repository that commits its entry
 * file as a symlink turned the documented install command into an arbitrary-file overwrite:
 *
 *     $ ln -s <victim> <project>/CLAUDE.md      # the repo carries this; git preserves symlinks
 *     $ npx mindforge-cc@latest --claude --local
 *     victim before: 24 bytes   sha 2cfdbb20c25ced11
 *     victim after:  5646 bytes sha 05b78d05307b2350        <- overwritten
 *     <project>/CLAUDE.md.backup-<epoch> CONTAINS THE VICTIM CONTENT   <- and disclosed
 *
 * Two separate harms in one step: the target is destroyed, and because safeCopyClaude reads the
 * destination THROUGH the link before replacing it, the victim's previous contents are copied into
 * the project's working tree as a backup file. Point the link at anything the installing user can
 * write and both happen with their privileges.
 *
 * Refusing rather than unlinking is deliberate. Unlinking would silently change what the user's
 * project looks like; refusing leaves their file untouched and tells them why. Writing through a
 * symlink is not something an installer ever legitimately needs to do.
 *
 * SCOPE, stated rather than implied: this guards the destination FILE. A symlinked DIRECTORY in the
 * destination path is a separate escape — mkdirSync/copyFileSync resolve it too — and is not covered
 * here. Closing that needs a containment check against the install root, which behaves differently
 * for --local (cwd-relative) and global installs, so it belongs in its own change.
 */
function assertNotSymlink(p) {
  let st;
  try { st = fs.lstatSync(p); } catch { return; }   // absent is a normal, safe state
  if (!st.isSymbolicLink()) return;
  let target = '';
  try { target = ` -> ${fs.readlinkSync(p)}`; } catch { target = ' -> <dangling>'; }
  throw new Error(
    `[installer] REFUSING to write through a symlink: ${p}${target}\n`
    + '  fs.writeFileSync/copyFileSync follow symlinks, so this would overwrite the target outside\n'
    + '  the project and could copy its contents into the working tree as a backup.\n'
    + '  Remove or replace the link, then re-run the installer.');
}

const fsu = {
  exists:     p  => fs.existsSync(p),
  read:       p  => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '',
  write:      (p, t) => { assertNotSymlink(p); fsu.ensureDir(path.dirname(p)); fs.writeFileSync(p, t, 'utf8'); },
  ensureDir:  p  => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); },
  copy:       (src, dst) => { assertNotSymlink(dst); fsu.ensureDir(path.dirname(dst)); fs.copyFileSync(src, dst); },
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

/**
 * Flatten-copy the imported Claude-Code subagents into a runtime's native agents
 * directory. The 154 source files live under subagents/categories/NN-name/*.md;
 * Claude Code auto-discovers agents from the top level of .claude/agents/, so we
 * flatten (basenames are already collision-free after the -cc renames) and skip
 * the per-category README.md index files. Returns the count installed.
 * @param {string} agentsDir - Destination agents directory (absolute).
 * @param {object} options - { noOverwrite }.
 * @returns {number} number of agent files copied.
 */
function installSubagents(agentsDir, options = {}) {
  const { noOverwrite = false } = options;
  const sourceDir = src('subagents', 'categories');
  if (!fsu.exists(sourceDir)) return 0;

  fsu.ensureDir(agentsDir);
  let count = 0;
  for (const file of fsu.listFilesRecursive(sourceDir, '.md')) {
    if (path.basename(file) === 'README.md') continue;
    const dst = path.join(agentsDir, path.basename(file));
    if (noOverwrite && fsu.exists(dst)) continue;
    fsu.copy(file, dst);
    count++;
  }
  return count;
}

/**
 * The set of imported-subagent basenames (e.g. 'api-designer-cc.md'). Used by
 * uninstall to remove ONLY our agents from a runtime's agents/ dir, never the
 * user's own hand-authored agents that may live alongside them.
 * @returns {Set<string>}
 */
function importedSubagentBasenames() {
  const sourceDir = src('subagents', 'categories');
  const names = new Set();
  if (!fsu.exists(sourceDir)) return names;
  for (const file of fsu.listFilesRecursive(sourceDir, '.md')) {
    const base = path.basename(file);
    if (base !== 'README.md') names.add(base);
  }
  return names;
}

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

  // BEFORE reading. fsu.read() resolves the link, so checking here rather than relying on the guard
  // inside fsu.copy() is what stops the DISCLOSURE half: with a symlinked destination the old order
  // read the victim's contents and wrote them to `${dst}.backup-<epoch>` inside the project, and that
  // backup path is a fresh regular file, so the primitive's guard would never have fired on it.
  assertNotSymlink(dst);

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
/**
 * Check that an install produced the files it promised.
 *
 * THIS WAS DEAD CODE. Declared here and called from nowhere, while install() printed
 * "Install verified" unconditionally under a section header reading "4. Verify installation".
 * Two tests kept it alive without ever running it — tests/production.test.js:86 and
 * tests/install.test.js:179 both assert only that the SOURCE CONTAINS the string
 * "verifyInstall". They would pass against an empty function body, and they are why the dead
 * function survived: the suite guaranteed the appearance of verification.
 *
 * Its contract was also UNSATISFIABLE. It required docs/registry/COMMANDS.md and
 * docs/registry/PERSONAS.md under the project root, but docs/registry/ ships ZERO files in the
 * npm tarball, so those two could never exist in a consumer install. Measured against a clean
 * `--claude --local`: 12 of the 14 required files present, those two absent. Wiring it as
 * written would therefore have exited 1 on every successful install — which is presumably why
 * nobody wired it. They are removed rather than "fixed" by copying the files, because requiring
 * an artefact the package does not publish is a category error, not a copy gap.
 *
 * Returns a result instead of calling process.exit, so it is testable without spawning an
 * installer. The caller owns the exit decision.
 *
 * @returns {{ok: boolean, missing: string[], checked: number}}
 */
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
  ];

  const missing = required.filter(f => !fsu.exists(f));
  return { ok: missing.length === 0, missing, checked: required.length };
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
  // REG-01 result, printed in the final summary. Declared here so the summary cannot reference an
  // undefined binding when the registration block is skipped (global scope, self-install, etc.).
  let hookRegistration = { status: 'not-attempted', reason: 'registration block not reached', registered: false };

  Theme.printPrompt(`Runtime : ${c.cyan(runtime)}`);
  Theme.printPrompt(`Scope   : ${c.dim(scope)} → ${c.bold(targetDir)}`);
  if (options.dryRun) Theme.printStatus('Mode    : DRY RUN (no changes)', 'warn');
  // Names what is skipped, because the previous wording was FALSE. It read "skipping framework file
  // copy" while the code still overwrote the entry file and 149 tracked command files. A message
  // describing work the code does not do is worse than no message — it is why nobody noticed.
  if (selfInstall) {
    Theme.printStatus(c.yellow('Self-install detected — leaving this repository\'s own tracked files alone'), 'warn');
    Theme.printStatus(c.dim(`    not written: ${cfg.entryFile}, commands, skills, hooks, personas, docs, subagents, memory`), 'info');
  }

  if (dryRun) {
    console.log('\n  Would install:');
    console.log(`    ${cfg.entryFile.padEnd(12)} → ${path.join(baseDir, cfg.entryFile)}`);
    
    const cmdCountStr = `${fsu.listFiles(src('.agent', 'mindforge')).length} commands`.padEnd(12);
    console.log(`    ${cmdCountStr} → ${cmdsDir}`);

    const assetMappings = [
      { key: 'skillsSubdir',   src: src('.agent', 'skills'),      label: 'skills' },
      { key: 'hooksSubdir',    src: src('.agent', 'hooks'),       label: 'hooks' },
      { key: 'personasSubdir', src: src('.mindforge', 'personas'), label: 'personas' },
      // NB: on-disk dirs are capitalized (docs/References, docs/Templates). macOS is
      // case-insensitive so lowercase used to "work" locally, but npm/Linux is
      // case-sensitive — the lookup silently missed in production (UC: REFERENCES 0).
      { key: 'docsSubdir',     src: src('docs', 'References'),    label: 'references' },
      { key: 'docsSubdir',     src: src('docs', 'Templates'),     label: 'templates' }
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

    if (cfg.agentsSubdir && fsu.exists(src('subagents', 'categories'))) {
      const agentCount = fsu.listFilesRecursive(src('subagents', 'categories'), '.md')
        .filter(f => path.basename(f) !== 'README.md').length;
      const countStr = `${agentCount} subagents`.padEnd(12);
      console.log(`    ${countStr} → ${path.join(baseDir, cfg.agentsSubdir)}`);
    }
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
    // GATED ON !selfInstall, which it was not. The guard existed and stopped one line short: the root
    // mirror below has always been gated, this write never was. In MindForge's own repository
    // `.claude/CLAUDE.md` is TRACKED and not gitignored (226 files under .claude/ are tracked), so a
    // self-install overwrote a committed file. No backup was taken either, and for a reason worth
    // naming: safeCopyClaude only backs up when the existing content does NOT contain "MindForge" —
    // and the repo's own entry file does, so it took the silent-replace path every time.
    if (!selfInstall) {
      safeCopyClaude(tempEntry, targetPath, { force, verbose });
    }

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
    } else if (!selfInstall) {
      // `!selfInstall` added alongside the write gate above. This branch printed the entry file name
      // as a resolved artifact whenever the root mirror was skipped — including on a self-install,
      // where the write no longer happens. Gating the write and leaving the print would have replaced
      // one false claim with another, which is the failure this whole change is about.
      Theme.printResolved(c.bold(cfg.entryFile));
    }
  }

  // ── 2. Install commands ─────────────────────────────────────────────────────
  const cmdSources = [
    { src: src('.agent', 'mindforge'), namespace: 'mindforge' },
    { src: src('.agent', 'forge'),     namespace: 'forge' }
  ];

  // A `if (runtime === 'claude') { cmdSources.length = 0; ...push the identical two entries... }`
  // block used to sit here. It was a NO-OP — it cleared the array and pushed back exactly what the
  // initializer above already contains. Its comment described a historical change (reading from
  // .agent/mindforge rather than the gitignored .claude/commands/mindforge) that the initializer
  // already reflects. Removed, because a special case that does nothing implies claude is handled
  // differently here when it is not.

  // GATED ON !selfInstall for the same reason as the entry file above. Measured on a self-install into
  // a clone of this repository: 149 TRACKED files under .claude/commands/ overwritten, zero backups,
  // while the installer printed "Self-install detected — skipping framework file copy". It was not
  // skipping; it said so and then copied.
  //
  // Skipping is correct rather than merely safe. In this repository `.agent/mindforge` and
  // `.claude/commands/mindforge` are BOTH committed and legitimately differ (an audit measured 146
  // entries differing between the two tracked copies, mostly frontmatter quoting). Copying does not
  // "sync" them, it silently picks one side and destroys the other's committed state — inside a git
  // working tree, with no prompt, under a message saying it did nothing.
  //
  // verifyInstall still passes afterwards: every file it requires under cmdsDir (help.md,
  // init-project.md, health.md, execute-phase.md, security-scan.md) is tracked, so the files it checks
  // are present from git rather than from this copy. Verified, not assumed.
  let totalCount = 0;
  (selfInstall ? [] : cmdSources).forEach(source => {
    if (!fsu.exists(source.src)) return;

    const files = fsu.listFiles(source.src).filter(f => f.endsWith('.md'));
    totalCount += files.length;

    files.forEach(f => {
      const { dir: destDir, name: targetName } = resolveCommandTarget(cmdsDir, runtime, source.namespace, f);
      fsu.ensureDir(destDir);
      const srcPath = path.join(source.src, f);
      const dstPath = path.join(destDir, targetName);

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
      { key: 'docsSubdir',     src: src('docs', 'References'),    label: 'references' },
      { key: 'docsSubdir',     src: src('docs', 'Templates'),     label: 'templates' },
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

    // ── 2.1b REG-01: register the hooks we just copied ────────────────────────
    // Measured before this landed: 0 of 6 harnesses wrote any settings.json, and this file plus
    // bin/install.js contained ZERO references to settings.json, PreToolUse or a hook dispatcher.
    // 11 hook scripts landed and none of them could ever fire. register() is deliberately narrow —
    // claude + local + non-Windows only — and returns a machine-readable status for every other
    // case rather than writing a config it cannot verify. It EXECUTES all 8 emitted commands before
    // keeping the file, and rolls back if any deny-class hook fails to deny.
    hookRegistration = require('./installer/hook-registration')
      .register({ projectRoot: process.cwd(), repoRoot: SOURCE_ROOT, runtime, scope, selfInstall, dryRun });
  }

  // ── 2.2 Install Subagents (native Claude-Code agents, both scopes) ──────────
  // The 154 imported subagents are Claude-Code-native .md files; Claude Code
  // auto-discovers them from <runtime>/agents/. Installed for BOTH scopes so a
  // global install also exposes them. Mirrored to .claude/agents/ for non-claude
  // local runtimes (same cross-IDE rationale as the command mirror above).
  if (cfg.agentsSubdir && !selfInstall) {
    const agentsDir = path.join(baseDir, cfg.agentsSubdir);
    const count = installSubagents(agentsDir, { noOverwrite: !force });
    if (count > 0) Theme.printResolved(`${c.bold(`${count} subagents`)} (native agents)`);
  }
  if (scope === 'local' && runtime !== 'claude' && !selfInstall) {
    const mirrorDir = path.join(process.cwd(), '.claude', 'agents');
    installSubagents(mirrorDir, { noOverwrite: !force });
  }

  // ── 3. Framework files (local scope only, non-self-install) ─────────────────
  if (scope === 'local' && !selfInstall) {
    // .mindforge/ — framework engine files
    const forgeSrc = src('.mindforge');
    const forgeDst = path.join(process.cwd(), '.mindforge');
    if (fsu.exists(forgeSrc)) {
      // An 18-entry `standardFrameworkFolders` list was declared here and never referenced. The
      // non-minimal branch below copies the whole of .mindforge/ with copyDir, so the list
      // described a selection that no code performed — deleting it changes nothing. It was the
      // second dead copy-list in this file; the other was `coreEngines`, which named four
      // bin/sre/ paths nothing installed. tests/install-module-load.test.js now fails on any
      // array declared and never used here, because a copy list nothing reads is
      // indistinguishable from files that are not installed.
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

    // .planning/ — merge templates but preserve existing state.
    // Source from examples/starter-project/.planning (clean, generic, always shipped)
    // — NEVER from the framework repo's own .planning/, which holds live dev state
    // (AUDIT.jsonl, slack-threads.json, jira-sync.json) that must not reach users.
    const planningDst = path.join(process.cwd(), '.planning');
    const planningSrc = src('examples', 'starter-project', '.planning');
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
    const learningSrc = src('docs', 'Templates', 'Project', 'AGENTS_LEARNING.md');
    if (!fsu.exists(learningDst) && fsu.exists(learningSrc)) {
      fsu.copy(learningSrc, learningDst);
      Theme.printResolved(`${c.bold('AGENTS_LEARNING.md')} (agentic memory)`);
    }

    // WALKTHROUGH.md — update if exists
    const walkDst = path.join(process.cwd(), 'WALKTHROUGH.md');
    const walkSrc = src('docs', 'Templates', 'Project', 'WALKTHROUGH.md');
    if (fsu.exists(walkSrc)) {
      fsu.copy(walkSrc, walkDst);
      Theme.printResolved(`${c.bold('WALKTHROUGH.md')} (updated)`);
    }

    // Engine subtrees copied into the consumer project.
    //
    // The first eleven entries are the feature engines. The last four are their DEPENDENCIES,
    // and their absence was breaking the install: measured on a clean `--claude --local`, 16 of
    // 119 installed modules failed to load with MODULE_NOT_FOUND, across seven subtrees —
    //   bin/autonomous/audit-writer.js   -> ../utils/file-lock       (the audit-chain writer)
    //   bin/autonomous/auto-runner.js    -> ../utils/file-lock
    //   bin/autonomous/state-manager.js  -> ../utils/file-io
    //   bin/governance/policy-engine.js  -> ../utils/file-io
    //   bin/memory/knowledge-graph.js    -> ../utils/file-lock
    //   bin/models/model-router.js       -> ../utils/mindforge-params
    //   bin/engine/nexus-tracer.js       -> ../utils/index
    //   ... and nine more
    // bin/utils/ alone accounts for all sixteen. revops/, review/ and migrations/ are each
    // required by an installed engine module too (engine/remediation-engine.js ->
    // ../revops/remediation-queue, and so on).
    //
    // tests/install-module-load.test.js performs a real install and requires every installed
    // module, so this list cannot silently drift again: adding an engine whose dependency is
    // absent fails there rather than at a consumer's first run.
    const sovereignEngines = [
      'governance', 'autonomous', 'memory', 'models', 'research',
      'wizard', 'updater', 'dashboard', 'browser', 'skills-builder', 'engine',
      // dependencies of the above — not features
      'utils', 'revops', 'review', 'migrations',
      // Required by bin/mindforge-cli.js:171 for the `workflow` verb. Added in the same change that
      // started shipping the CLI: the router's require is lazy, so the CLI still LOADED without it,
      // but `mindforge workflow list` exited 1 with MODULE_NOT_FOUND. Caught by
      // tests/install-module-load.test.js's require-resolution scan the moment the CLI began landing
      // — the entry point and its dispatch targets are one unit. One file, 4 KB, and its own requires
      // are `fs` and `path` only.
      'workflows'
    ];
    sovereignEngines.forEach(engine => {
      const srcDir = src('bin', engine);
      const dstDir = path.join(process.cwd(), 'bin', engine);
      if (fsu.exists(srcDir)) {
        fsu.ensureDir(dstDir);
        fsu.copyDir(srcDir, dstDir, { excludePatterns: SENSITIVE_EXCLUDE, noOverwrite: !force });
      }
    });

    // Individual top-level bin/ files an installed module requires. hindsight-injector is
    // required by both bin/dashboard/temporal-api.js and bin/engine/temporal-cli.js, which do
    // install, so without it those two fail to load.
    //
    // This replaces a `coreEngines` array that was declared here and NEVER REFERENCED — six
    // paths, four of them under bin/sre/, copied by nothing. bin/sre/ stays uninstalled
    // deliberately: no installed module requires it, so wiring the dead array would have shipped
    // files nothing loads rather than fixing anything.
    // bin/mindforge-cli.js is here, not behind --with-utils, because it is the ENTRY POINT the
    // documentation tells users to run. Measured on a default `--claude --local --skip-wizard`
    // install before this change: 152 bin/**/*.js landed across 15 subdirectories, but only ONE
    // top-level file, and `find . -name mindforge-cli.js` returned nothing. So
    // docs/getting-started.md's promise that "the `mindforge` CLI command is available for runtime
    // operations" was false on the documented path, and every fix to that CLI was invisible to
    // anyone who followed the docs.
    //
    // Shipping the single file is sufficient, verified rather than assumed: its only load-time
    // requires are `child_process` and `path`, both Node builtins, and the subdirectories it
    // dispatches into (bin/utils 11 files, bin/engine 23, bin/wizard 4) already land via
    // sovereignEngines above.
    //
    // The rest of bin/ stays behind --with-utils. This is the entry point, not a bulk copy.
    const coreFiles = ['bin/hindsight-injector.js', 'bin/mindforge-cli.js'];
    coreFiles.forEach(rel => {
      const srcFile = src(...rel.split('/'));
      const dstFile = path.join(process.cwd(), rel);
      if (fsu.exists(srcFile)) {
        fsu.ensureDir(path.dirname(dstFile));
        fsu.copy(srcFile, dstFile);
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
  // This line used to print "Install verified" unconditionally, directly under this header,
  // while verifyInstall() sat unreferenced 400 lines above. The claim is now earned: the check
  // runs, names what is missing, and exits non-zero rather than reporting success.
  //
  // Not reachable on a dry run — that path returns earlier, so nothing is verified against a
  // tree nothing was written to.
  const verification = verifyInstall(baseDir, cmdsDir, runtime, scope);
  if (!verification.ok) {
    console.error(`\n  ❌  Install verification failed — ${verification.missing.length} of ` +
      `${verification.checked} required file(s) missing:`);
    verification.missing.forEach(f => console.error(`      ${f}`));
    console.error(`\n  Retry: npx mindforge-cc@latest --${runtime} --${scope} --force`);
    process.exit(1);
  }
  Theme.printResolved(c.bold(`Install verified (${verification.checked} required files present)`));

  // ── 4b. REG-01 hook-registration status ─────────────────────────────────────
  // Printed ALWAYS, in one machine-readable line, including when nothing was registered. A silent
  // skip is how "0 of 6 harnesses register a hook" went unnoticed for the product's whole life: the
  // installer exited 0 with a success banner and never mentioned that the gates it had just copied
  // were inert. Whatever the outcome, the operator is told which it was and why.
  if (hookRegistration.registered) {
    Theme.printResolved(c.bold(`Hooks registered: ${hookRegistration.reason}`));
    Theme.printStatus(c.yellow('Restart your harness — Claude Code snapshots hooks at session start, '
      + 'so the gates are not live in an already-open session.'), 'warn');
    if (hookRegistration.backup) {
      Theme.printStatus(c.dim(`Previous settings backed up to ${hookRegistration.backup}`), 'info');
    }
  } else {
    Theme.printStatus(c.yellow(`Hooks NOT registered (${hookRegistration.status}): ${hookRegistration.reason}`), 'warn');
    Theme.printStatus(c.dim('The hook scripts are installed but nothing invokes them, so no tool call '
      + 'is gated. This is stated rather than implied — see docs/troubleshooting.md.'), 'info');
  }
}

// ── Uninstall ─────────────────────────────────────────────────────────────────
async function uninstall(runtime, scope, options = {}) {
  const { dryRun = false } = options;
  const cfg     = RUNTIMES[runtime];
  const baseDir = resolveBaseDir(runtime, scope);
  const cmdsDir = norm(path.join(baseDir, cfg.commandsSubdir));
  const entryFile = norm(path.join(baseDir, cfg.entryFile));

  const agentsDir = cfg.agentsSubdir ? norm(path.join(baseDir, cfg.agentsSubdir)) : null;
  const importedAgents = importedSubagentBasenames();

  console.log(`\n  Uninstalling MindForge (${runtime} / ${scope})...`);
  if (dryRun) {
    console.log(`  Would remove: ${cmdsDir}`);
    if (agentsDir && fsu.exists(agentsDir)) {
      const present = fsu.listFiles(agentsDir).filter(f => importedAgents.has(f)).length;
      if (present > 0) console.log(`  Would remove: ${present} imported subagents from ${agentsDir}`);
    }
    if (fsu.exists(entryFile) && fsu.read(entryFile).includes('MindForge'))
      console.log(`  Would remove: ${entryFile}`);
    return;
  }

  // Remove commands directory
  if (fsu.exists(cmdsDir)) {
    fs.rmSync(cmdsDir, { recursive: true, force: true });
    console.log(`  ✅  Removed: ${cmdsDir}`);
  }

  // Remove ONLY our imported subagents — leave the user's own agents/ files intact.
  if (agentsDir && fsu.exists(agentsDir)) {
    let removed = 0;
    for (const f of fsu.listFiles(agentsDir)) {
      if (importedAgents.has(f)) {
        fs.unlinkSync(path.join(agentsDir, f));
        removed++;
      }
    }
    if (removed > 0) console.log(`  ✅  Removed: ${removed} imported subagents from ${agentsDir}`);
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
    subagents: 0,
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

    // Imported subagents (subagents/categories/**, excluding category READMEs)
    const subagentsSrc = src('subagents', 'categories');
    if (fsu.exists(subagentsSrc)) {
      stats.subagents = fsu.listFilesRecursive(subagentsSrc, '.md')
        .filter(f => path.basename(f) !== 'README.md').length;
    }

    // Docs & Templates count (on-disk dirs are capitalized — see assetMappings note)
    const refSrc = src('docs', 'References');
    const tmpSrc = src('docs', 'Templates');
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
    return { personas: 117, skills: 20, subagents: 154, governance: 4, integrations: 6, actions: 71, docs: 12, templates: 21 };
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
    // collectManifestStats() counts the SOURCE tree, not what was written. For a normal install those
    // coincide, so the panel is accidentally accurate. For a self-install nothing is copied, and the
    // panel announced "ACTIONS 221 — Total autonomous commands deployed" and
    // "Skill Packs (123 verified)" for a run that deployed and verified nothing: a summary of the
    // repository presenting itself as an installation report. Gating it is the honest minimum. Making
    // the panel report MEASURED counts on every path is a larger change and is deliberately not
    // attempted here — it would need the install to return what it wrote.
    if (isSelfInstall()) {
      Theme.printResolved(c.bold('Self-install complete — no framework files were written'));
      Theme.printStatus(c.dim('This repository IS the framework: its committed .claude/ and .agent/ '
        + 'trees are the source, so there was nothing to deploy.'), 'info');
    } else {
      const stats = collectManifestStats();
      Theme.printSuccessV2(runtime, scope, stats);
    }
  } else {
    Theme.printResolved(c.bold('MindForge uninstalled'));
  }
}

module.exports = { run, install, uninstall, verifyInstall, RUNTIMES, generateEntryContent, SENSITIVE_EXCLUDE, MINDFORGE_DEV_EXCLUDE };

if (require.main === module) {
  const args = process.argv.slice(2);
  run(args).catch(err => { console.error(err.message); process.exit(1); });
}
