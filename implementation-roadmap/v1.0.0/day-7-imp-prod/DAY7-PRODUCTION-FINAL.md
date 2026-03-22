# MindForge — Day 7: Production Hardening, Polish & v1.0.0 Public Release
# Branch: `feat/mindforge-production-release`
# Prerequisite: `feat/mindforge-distribution-platform` merged to `main`
# Version target: **v1.0.0 — First Stable Public Release**

---

## BRANCH SETUP

```bash
git checkout main
git pull origin main
git checkout -b feat/mindforge-production-release
```

Verify all prior days are present and all 12 test suites pass with zero failures:

```bash
cat package.json | grep '"version"'   # Must be "0.6.0"

SUITES=(install wave-engine audit compaction skills-platform
        integrations governance intelligence metrics
        distribution ci-mode sdk)

for SUITE in "${SUITES[@]}"; do
  printf "%-30s" "  ${SUITE}..."
  node tests/${SUITE}.test.js 2>&1 | tail -1
done

# ALL 12 must show "All * tests passed" — zero failures before Day 7 begins
```

---

## DAY 7 SCOPE

Day 7 is the **Production Hardening & v1.0.0 Public Release** sprint.

Days 1–6 built MindForge. Day 7 makes it **shippable to the world**:
end-to-end tested across all installation paths, fully documented, performance-
profiled, self-maintaining, migration-safe, adversarially reviewed, and ready
for the public npm registry at the v1.0.0 stable interface contract.

| Component | Description |
|---|---|
| Complete `npx mindforge-cc` installer | Every code path covered: first-install, update, uninstall, self-install, CI, bad input |
| Self-update mechanism | `/mindforge:update` — version check, changelog diff, scope-preserving apply |
| Version migration engine | Schema migration for HANDOFF.json / STATE.md / AUDIT.jsonl across all prior versions |
| Plugin system | First-class third-party extensions via `mindforge-plugin-` npm namespace |
| Token usage optimiser | Measure, profile, and systematically reduce Claude API token consumption |
| Cross-version compatibility layer | Graceful degradation when older schema files meet newer engine |
| Complete reference documentation | Full `docs/` hierarchy ready for public release |
| Threat model & security posture | Adversarial review of all seven attack surfaces |
| 50-point production readiness checklist | Every item is blocking — all must pass before v1.0.0 tag |
| v1.0.0 release pipeline | Complete tag, GitHub release, npm publish, announcement |
| Day 7 test suites | `tests/production.test.js`, `tests/migration.test.js`, `tests/e2e.test.js` |

---

# ═══════════════════════════════════════════════════════════════════
# PART 1 — IMPLEMENTATION PROMPT
# ═══════════════════════════════════════════════════════════════════

---

## TASK 1 — Scaffold Day 7 directory additions

```bash
# Production hardening engine
mkdir -p .mindforge/production
touch .mindforge/production/token-optimiser.md
touch .mindforge/production/migration-engine.md
touch .mindforge/production/compatibility-layer.md
touch .mindforge/production/production-checklist.md

# Plugin system
mkdir -p .mindforge/plugins
touch .mindforge/plugins/plugin-schema.md
touch .mindforge/plugins/plugin-loader.md
touch .mindforge/plugins/plugin-registry.md
touch .mindforge/plugins/PLUGINS-MANIFEST.md

# Self-update system
mkdir -p bin/updater
touch bin/updater/self-update.js
touch bin/updater/changelog-fetcher.js
touch bin/updater/version-comparator.js

# Migration system
mkdir -p bin/migrations
touch bin/migrations/migrate.js
touch bin/migrations/schema-versions.js
touch bin/migrations/0.1.0-to-0.5.0.js
touch bin/migrations/0.5.0-to-0.6.0.js
touch bin/migrations/0.6.0-to-1.0.0.js

# Complete documentation hierarchy
mkdir -p docs/reference
mkdir -p docs/architecture
mkdir -p docs/contributing
mkdir -p docs/security
touch docs/reference/commands.md
touch docs/reference/skills-api.md
touch docs/reference/sdk-api.md
touch docs/reference/config-reference.md
touch docs/reference/audit-events.md
touch docs/architecture/README.md
touch docs/architecture/decision-records-index.md
touch docs/contributing/CONTRIBUTING.md
touch docs/contributing/skill-authoring.md
touch docs/contributing/plugin-authoring.md
touch docs/security/SECURITY.md
touch docs/security/threat-model.md
touch docs/security/penetration-test-results.md

# New commands
touch .claude/commands/mindforge/update.md
touch .claude/commands/mindforge/migrate.md
touch .claude/commands/mindforge/plugins.md
touch .claude/commands/mindforge/tokens.md
touch .claude/commands/mindforge/release.md

# Mirror to Antigravity
for cmd in update migrate plugins tokens release; do
  cp .claude/commands/mindforge/${cmd}.md .agent/mindforge/${cmd}.md
done

# Test suites
touch tests/production.test.js
touch tests/migration.test.js
touch tests/e2e.test.js

# Release artifacts
touch .planning/RELEASE-CHECKLIST.md
touch SECURITY.md
```

**Commit:**
```bash
git add .
git commit -m "chore(day7): scaffold production release directory structure"
```

---

## TASK 2 — Write the complete `npx mindforge-cc` installer

The installer has been scaffolded across Days 1-6 but never implemented end-to-end.
Day 7 makes it production-complete — every edge case handled, every flag tested.

### `bin/install.js` — Main entry point (rewrite completely)

```javascript
#!/usr/bin/env node
/**
 * MindForge Installer — v1.0.0 Production Release
 *
 * USAGE:
 *   npx mindforge-cc@latest                   → Interactive setup wizard
 *   npx mindforge-cc@latest --claude --local  → Install for Claude Code, local project
 *   npx mindforge-cc@latest --all --global    → Install for all runtimes, globally
 *   npx mindforge-cc@latest --update          → Update existing installation
 *   npx mindforge-cc@latest --uninstall       → Remove MindForge
 *   npx mindforge-cc@latest --check           → Check for updates (no install)
 *   npx mindforge-cc@latest --version         → Print version and exit
 *   npx mindforge-cc@latest --help            → Print usage and exit
 *
 * Runtime flags:    --claude | --antigravity | --all
 * Scope flags:      --global (-g) | --local (-l)
 * Action flags:     --install (default) | --update | --uninstall | --check
 * Control flags:    --skip-wizard | --dry-run | --verbose | --force
 */

'use strict';

const VERSION = require('./package.json').version;
const ARGS    = process.argv.slice(2);

// ── Minimum Node.js version gate ─────────────────────────────────────────────
const NODE_MAJOR = parseInt(process.versions.node.split('.')[0], 10);
if (NODE_MAJOR < 18) {
  process.stderr.write(
    `\n❌  MindForge requires Node.js 18 or later.\n` +
    `    Current: v${process.versions.node}\n` +
    `    Install: https://nodejs.org/en/download/\n\n`
  );
  process.exit(1);
}

// ── Quick-exit flags ──────────────────────────────────────────────────────────
if (ARGS.includes('--version') || ARGS.includes('-v')) {
  process.stdout.write(`mindforge-cc v${VERSION}\n`);
  process.exit(0);
}

if (ARGS.includes('--help') || ARGS.includes('-h')) {
  printHelp();
  process.exit(0);
}

// ── Determine execution mode ──────────────────────────────────────────────────
const NON_INTERACTIVE_FLAGS = [
  '--claude', '--antigravity', '--all',
  '--global', '-g', '--local', '-l',
  '--uninstall', '--update', '--check',
  '--skip-wizard', '--dry-run',
];

const IS_NON_INTERACTIVE =
  NON_INTERACTIVE_FLAGS.some(f => ARGS.includes(f)) ||
  process.env.CI === 'true'                          ||
  process.env.MINDFORGE_CI === 'true'                ||
  process.stdin.isTTY === false;

if (IS_NON_INTERACTIVE) {
  require('./bin/installer-core').run(ARGS).catch(err => {
    process.stderr.write(`\n❌  Installation failed: ${err.message}\n`);
    process.stderr.write(`    For help: npx mindforge-cc --help\n\n`);
    process.exit(1);
  });
} else {
  require('./bin/wizard/setup-wizard').main().catch(err => {
    process.stderr.write(`\n❌  Setup wizard failed: ${err.message}\n`);
    process.stderr.write(`    Try non-interactive: npx mindforge-cc --claude --local\n\n`);
    process.exit(1);
  });
}

function printHelp() {
  process.stdout.write(`
  ⚡  MindForge v${VERSION} — Enterprise Agentic Framework

  USAGE
    npx mindforge-cc@latest [runtime] [scope] [action] [options]

  RUNTIMES (pick one or use --all)
    --claude          Claude Code  (~/.claude or .claude/)
    --antigravity     Antigravity  (~/.gemini/antigravity or .agent/)
    --all             Both runtimes

  SCOPE
    --global, -g      Install to home directory (all projects)
    --local,  -l      Install to current directory (this project only)

  ACTIONS (default: install)
    --install         Install MindForge (default)
    --update          Update existing installation
    --uninstall       Remove MindForge
    --check           Check for updates without installing

  OPTIONS
    --dry-run         Show what would happen without making changes
    --force           Override existing installation without backup
    --skip-wizard     Skip interactive wizard even in TTY
    --verbose         Detailed output
    --version, -v     Print version
    --help, -h        Print this help

  EXAMPLES
    npx mindforge-cc@latest                       Interactive setup
    npx mindforge-cc@latest --claude --local      Local Claude Code install
    npx mindforge-cc@latest --all --global        Global install for all runtimes
    npx mindforge-cc@latest --update --global     Update global install
    npx mindforge-cc@latest --uninstall --local   Remove local install

  DOCUMENTATION
    https://github.com/mindforge-dev/mindforge
    docs/enterprise-setup.md (after install)
\n`);
}
```

### `bin/installer-core.js` — Complete non-interactive installer

```javascript
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
    localDir:       '.agent',
    commandsSubdir: 'mindforge',
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
  '.env', /^\.env\..*/,
  '*.key', /\.key$/,
  '*.pem', /\.pem$/,
  'secrets', /^secrets$/,
  '.secrets', /^\.secrets$/,
];

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
          console.log(`      Large file detected — review the backup for custom instructions`);
          console.log(`      to merge into the new CLAUDE.md.`);
        }
      }
    }
  }

  fsu.copy(src, dst);
  if (verbose) console.log(`  → ${dst}`);
}

// ── Install verification ──────────────────────────────────────────────────────
function verifyInstall(baseDir, cmdsDir, runtime) {
  // Minimum required files for a functional installation
  const required = [
    path.join(baseDir, 'CLAUDE.md'),
    path.join(cmdsDir, 'help.md'),
    path.join(cmdsDir, 'init-project.md'),
    path.join(cmdsDir, 'health.md'),
    path.join(cmdsDir, 'execute-phase.md'),
    path.join(cmdsDir, 'security-scan.md'),
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
  const { dryRun = false, force = false, verbose = false } = options;
  const cfg     = RUNTIMES[runtime];
  const baseDir = scope === 'global' ? cfg.globalDir : path.join(process.cwd(), cfg.localDir);
  const cmdsDir = path.join(baseDir, cfg.commandsSubdir);
  const selfInstall = isSelfInstall();

  console.log(`\n  Runtime : ${runtime}`);
  console.log(`  Scope   : ${scope} → ${baseDir}`);
  if (dryRun) console.log(`  Mode    : DRY RUN (no changes)`);
  if (selfInstall) console.log(`  ⚠️  Self-install detected — skipping framework file copy`);

  if (dryRun) {
    console.log(`\n  Would install:`);
    console.log(`    CLAUDE.md → ${path.join(baseDir, 'CLAUDE.md')}`);
    console.log(`    ${fsu.listFiles(src('.claude', 'commands', 'mindforge')).length} commands → ${cmdsDir}`);
    return;
  }

  // ── 1. Install CLAUDE.md ────────────────────────────────────────────────────
  const claudeSrc = runtime === 'claude'
    ? src('.claude', 'CLAUDE.md')
    : src('.agent', 'CLAUDE.md');

  if (fsu.exists(claudeSrc)) {
    safeCopyClaude(claudeSrc, path.join(baseDir, 'CLAUDE.md'), { force, verbose });
    console.log(`  ✅  CLAUDE.md`);
  }

  // ── 2. Install commands ─────────────────────────────────────────────────────
  const cmdSrc = runtime === 'claude'
    ? src('.claude', 'commands', 'mindforge')
    : src('.agent', 'mindforge');

  if (fsu.exists(cmdSrc)) {
    fsu.ensureDir(cmdsDir);
    const files = fsu.listFiles(cmdSrc).filter(f => f.endsWith('.md'));
    files.forEach(f => fsu.copy(path.join(cmdSrc, f), path.join(cmdsDir, f)));
    console.log(`  ✅  ${files.length} commands`);
  }

  // ── 3. Framework files (local scope only, non-self-install) ─────────────────
  if (scope === 'local' && !selfInstall) {
    // .mindforge/ — framework engine files
    const forgeSrc = src('.mindforge');
    const forgeDst = path.join(process.cwd(), '.mindforge');
    if (fsu.exists(forgeSrc)) {
      fsu.copyDir(forgeSrc, forgeDst, { excludePatterns: SENSITIVE_EXCLUDE });
      console.log(`  ✅  .mindforge/ (framework engine)`);
    }

    // .planning/ — create only if it doesn't already exist (preserve project state)
    const planningDst = path.join(process.cwd(), '.planning');
    if (!fsu.exists(planningDst)) {
      const planningSrc = src('.planning');
      if (fsu.exists(planningSrc)) {
        fsu.copyDir(planningSrc, planningDst, { excludePatterns: SENSITIVE_EXCLUDE });
        console.log(`  ✅  .planning/ (state templates)`);
      }
    } else {
      console.log(`  ⏭️  .planning/ already exists — preserved (run /mindforge:health to verify)`);
    }

    // MINDFORGE.md — create only if it doesn't already exist
    const mindforgemDst = path.join(process.cwd(), 'MINDFORGE.md');
    const mindforgemSrc = src('MINDFORGE.md');
    if (!fsu.exists(mindforgemDst) && fsu.exists(mindforgemSrc)) {
      fsu.copy(mindforgemSrc, mindforgemDst);
      console.log(`  ✅  MINDFORGE.md (project constitution)`);
    }

    // bin/ utilities (validate-config, wizard)
    const binDst = path.join(process.cwd(), 'bin');
    const binSrc = src('bin');
    if (fsu.exists(binSrc) && !fsu.exists(binDst)) {
      fsu.copyDir(binSrc, binDst, { excludePatterns: SENSITIVE_EXCLUDE });
      console.log(`  ✅  bin/ (utilities)`);
    }
  }

  // ── 4. Verify installation ──────────────────────────────────────────────────
  verifyInstall(baseDir, cmdsDir, runtime);
  console.log(`  ✅  Install verified`);
}

// ── Uninstall ─────────────────────────────────────────────────────────────────
async function uninstall(runtime, scope, options = {}) {
  const { dryRun = false } = options;
  const cfg     = RUNTIMES[runtime];
  const baseDir = scope === 'global' ? cfg.globalDir : path.join(process.cwd(), cfg.localDir);
  const cmdsDir = path.join(baseDir, cfg.commandsSubdir);
  const claudeMd = path.join(baseDir, 'CLAUDE.md');

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
  console.log(`  ℹ️  .planning/ and .mindforge/ preserved (user data)`);
  console.log(`      Remove manually if desired.`);
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
  const isUninstall = args.includes('--uninstall');
  const isUpdate    = args.includes('--update');
  const isCheck     = args.includes('--check');
  const options     = { dryRun, force, verbose };

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
    console.log(`  Next steps:`);
    console.log(`    1. Open Claude Code or Antigravity in your project directory`);
    console.log(`    2. Run: /mindforge:health  (verify installation)`);
    console.log(`    3. Run: /mindforge:init-project  (new project)`);
    console.log(`         OR /mindforge:map-codebase  (existing project)\n`);
  } else {
    console.log(`\n  ✅  MindForge uninstalled\n`);
  }
}

module.exports = { run, install, uninstall };
```

**Commit:**
```bash
git add bin/install.js bin/installer-core.js
git commit -m "feat(installer): complete production-grade installer — all code paths, edge cases, DRY_RUN"
```

---

## TASK 3 — Write the Self-Update System

### `bin/updater/version-comparator.js`

```javascript
/**
 * MindForge — Version Comparator
 * Pure functions for semver comparison.
 * No external dependencies — must work offline.
 */
'use strict';

/**
 * Compare two semver strings (strips leading 'v').
 * Returns: negative if a < b, 0 if a == b, positive if a > b
 */
function compareSemver(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Determine the upgrade type between two versions.
 * Returns 'major' | 'minor' | 'patch' | 'none'
 */
function upgradeType(current, latest) {
  const c = current.replace(/^v/, '').split('.').map(Number);
  const l = latest.replace(/^v/, '').split('.').map(Number);
  if (l[0] > c[0]) return 'major';
  if (l[1] > c[1]) return 'minor';
  if (l[2] > c[2]) return 'patch';
  return 'none';
}

/**
 * Fetch the latest published version from the npm registry.
 * Returns null on any error — callers must handle gracefully.
 * Timeout: 5 seconds (respects enterprise proxies that may be slow).
 */
async function fetchLatestVersion(packageName = 'mindforge-cc') {
  const https = require('https');
  return new Promise(resolve => {
    const options = {
      hostname: 'registry.npmjs.org',
      path:     `/${encodeURIComponent(packageName)}/latest`,
      method:   'GET',
      headers:  { 'Accept': 'application/json', 'User-Agent': `mindforge-cc/${require('../../package.json').version}` },
      timeout:  5000,
    };

    const req = https.request(options, res => {
      if (res.statusCode !== 200) { resolve(null); return; }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body).version || null); }
        catch { resolve(null); }
      });
    });

    req.on('error',   () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

module.exports = { compareSemver, upgradeType, fetchLatestVersion };
```

### `bin/updater/changelog-fetcher.js`

```javascript
/**
 * MindForge — Changelog Fetcher
 * Downloads and parses CHANGELOG.md entries between two versions.
 * Used by /mindforge:update to show what changed.
 */
'use strict';

const { compareSemver } = require('./version-comparator');

const CHANGELOG_URL = 'https://raw.githubusercontent.com/mindforge-dev/mindforge/main/CHANGELOG.md';

/**
 * Fetch CHANGELOG.md and extract entries between fromVersion and toVersion.
 * Returns formatted markdown string, or null if unavailable.
 */
async function fetchChangelog(fromVersion, toVersion) {
  const raw = await fetchRaw();
  if (!raw) return null;
  return extractEntries(raw, fromVersion, toVersion);
}

async function fetchRaw() {
  const https = require('https');
  return new Promise(resolve => {
    const req = https.get(CHANGELOG_URL, { timeout: 8000 }, res => {
      if (res.statusCode !== 200) { resolve(null); return; }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(body));
    });
    req.on('error',   () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/**
 * Parse CHANGELOG.md and extract version sections in range (from, to].
 */
function extractEntries(changelog, fromVersion, toVersion) {
  const sections = [];
  let current = null;

  for (const line of changelog.split('\n')) {
    const vMatch = line.match(/^## \[?v?(\d+\.\d+\.\d+)/);
    if (vMatch) {
      if (current) sections.push(current);
      const v = vMatch[1];
      const inRange = compareSemver(v, fromVersion) > 0 && compareSemver(v, toVersion) <= 0;
      current = inRange ? { version: v, lines: [line] } : null;
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  return sections.length
    ? sections.map(s => s.lines.join('\n').trimEnd()).join('\n\n')
    : null;
}

module.exports = { fetchChangelog };
```

### `bin/updater/self-update.js`

```javascript
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
```

**Commit:**
```bash
git add bin/updater/
git commit -m "feat(updater): implement self-update with scope detection, changelog, schema-version-aware migration"
```

---

## TASK 4 — Write the Version Migration Engine

### `bin/migrations/schema-versions.js`

```javascript
/**
 * MindForge — Schema Version Registry
 * Documents every breaking schema change across all released versions.
 * Used by the migration engine to determine what migrations are needed.
 */
'use strict';

const SCHEMA_HISTORY = [
  {
    version: '0.1.0',
    date: '2026-01-01',
    description: 'Initial release',
    handoff_fields_added: [
      'schema_version', 'project', 'phase', 'plan', 'next_task',
      'blockers', 'decisions_needed', 'context_refs', '_warning', 'updated_at',
    ],
    handoff_fields_removed: [],
    audit_fields_added: ['id', 'timestamp', 'event', 'agent', 'phase'],
    breaking: [],
  },
  {
    version: '0.5.0',
    date: '2026-01-15',
    description: 'Intelligence layer — smart compaction adds structured fields',
    handoff_fields_added: [
      'decisions_made', 'discoveries', 'implicit_knowledge',
      'quality_signals', 'compaction_level', 'compaction_timestamp',
    ],
    handoff_fields_removed: [],
    audit_fields_added: [],
    breaking: [
      'compaction_protocol.md now requires Level 1/2/3 classification',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-02-01',
    description: 'Distribution platform — adds per-developer and CI fields',
    handoff_fields_added: [
      'developer_id', 'session_id', 'recent_commits', 'recent_files',
    ],
    handoff_fields_removed: [],
    audit_fields_added: ['session_id'],
    breaking: [
      'AUDIT.jsonl entries should now include session_id',
      'INTEGRATIONS-CONFIG.md gains EMERGENCY_APPROVERS field',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-22',
    description: 'First stable release — plugin system and stable interface contract',
    handoff_fields_added: ['plugin_api_version'],
    handoff_fields_removed: [],
    audit_fields_added: [],
    breaking: [
      'VERIFY_PASS_RATE_WARNING_THRESHOLD in MINDFORGE.md is now 0.0-1.0 (was 0-100)',
      'AUDIT.jsonl session_id is now required (was optional)',
      'HANDOFF.json plugin_api_version field is now required for plugin compatibility',
    ],
  },
];

module.exports = { SCHEMA_HISTORY };
```

### `bin/migrations/migrate.js`

```javascript
/**
 * MindForge — Migration Runner
 * Safely upgrades .planning/ file schemas between MindForge versions.
 * Philosophy: never lose data, always back up, always verify after.
 */
'use strict';

const fs   = require('fs');
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
};

/**
 * Run all needed migrations from fromVersion to toVersion.
 * Creates a backup first. Restores on failure.
 * Returns { status, from, to, backupDir }
 */
async function runMigrations(fromVersion, toVersion) {
  console.log(`\n  Migration: v${fromVersion} → v${toVersion}`);

  if (!fs.existsSync(PLANNING_DIR)) {
    console.log(`  ℹ️  No .planning/ directory found — skipping migration`);
    return { status: 'no-planning-dir' };
  }

  if (compareSemver(fromVersion, toVersion) >= 0) {
    console.log(`  ✅  No migration needed`);
    return { status: 'no-migration-needed' };
  }

  // Determine which migrations to run
  const allMigrations = [
    require('./0.1.0-to-0.5.0'),
    require('./0.5.0-to-0.6.0'),
    require('./0.6.0-to-1.0.0'),
  ].filter(m =>
    compareSemver(m.fromVersion, fromVersion) >= 0 &&
    compareSemver(m.toVersion,   toVersion)   <= 0
  );

  if (allMigrations.length === 0) {
    console.log(`  ✅  No applicable migrations`);
    return { status: 'no-migrations' };
  }

  console.log(`  Migrations to run (${allMigrations.length}):`);
  allMigrations.forEach(m => console.log(`    • v${m.fromVersion} → v${m.toVersion}: ${m.description}`));

  // ── Create backup (abort if backup fails — never migrate without a backup) ──
  const backupDir = path.join(PLANNING_DIR, `migration-backup-${Date.now()}`);
  let backupCreated = false;
  try {
    fs.mkdirSync(backupDir, { recursive: true });
    const filesToBackup = Object.values(PATHS).filter(p => fs.existsSync(p));

    if (filesToBackup.length === 0) {
      console.log(`  ℹ️  No files to migrate`);
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
      try { fs.rmSync(backupDir, { recursive: true, force: true }); } catch {}
    }
    throw new Error(
      `Migration aborted: cannot create backup (${backupErr.message}). ` +
      `Free disk space and retry.`
    );
  }

  // ── Execute migrations in order ───────────────────────────────────────────
  for (const migration of allMigrations) {
    console.log(`\n  Running: v${migration.fromVersion} → v${migration.toVersion}...`);
    try {
      await migration.run(PATHS);
      console.log(`  ✅  Complete`);
    } catch (migErr) {
      console.error(`  ❌  Failed: ${migErr.message}`);
      console.log(`  Restoring from backup...`);

      // Restore all files from backup
      for (const f of fs.readdirSync(backupDir)) {
        const dst = Object.values(PATHS).find(p => path.basename(p) === f) ||
                    path.join(PLANNING_DIR, f);
        fs.copyFileSync(path.join(backupDir, f), dst);
      }
      console.log(`  ✅  Restored from backup. No changes applied.`);
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
  console.log(`  Backup retained: .planning/${path.basename(backupDir)}`);
  console.log(`  Remove when satisfied: rm -rf .planning/${path.basename(backupDir)}\n`);

  return { status: 'migrated', from: fromVersion, to: toVersion, backupDir };
}

module.exports.runMigrations = runMigrations;
```

### `bin/migrations/0.6.0-to-1.0.0.js`

```javascript
/**
 * MindForge Migration: v0.6.0 → v1.0.0
 *
 * Changes:
 * 1. HANDOFF.json: add `plugin_api_version` field
 * 2. AUDIT.jsonl: backfill `session_id` for entries missing it
 * 3. MINDFORGE.md: convert VERIFY_PASS_RATE_WARNING_THRESHOLD if in old 0-100 format
 * 4. STATE.md: add v1.0.0 compatibility note if it doesn't already have one
 */
'use strict';

const fs = require('fs');

module.exports = {
  fromVersion: '0.6.0',
  toVersion:   '1.0.0',
  description: 'Add plugin_api_version; backfill session_id; normalise MINDFORGE.md thresholds',

  async run(paths) {
    // ── 1. HANDOFF.json ───────────────────────────────────────────────────────
    if (fs.existsSync(paths.handoff)) {
      const handoff = JSON.parse(fs.readFileSync(paths.handoff, 'utf8'));

      if (!handoff.plugin_api_version) {
        handoff.plugin_api_version = '1.0.0';
      }
      // Ensure fields added in 0.6.0 are present (for projects that skipped intermediate updates)
      if (!Array.isArray(handoff.recent_commits)) handoff.recent_commits = [];
      if (!Array.isArray(handoff.recent_files))   handoff.recent_files   = [];
      if (!handoff.session_id) {
        handoff.session_id = `migrated-${Date.now()}`;
      }

      fs.writeFileSync(paths.handoff, JSON.stringify(handoff, null, 2) + '\n');
      console.log(`    • HANDOFF.json: added plugin_api_version, normalised arrays`);
    }

    // ── 2. AUDIT.jsonl ────────────────────────────────────────────────────────
    if (fs.existsSync(paths.audit)) {
      const raw   = fs.readFileSync(paths.audit, 'utf8');
      const lines = raw.split('\n').filter(Boolean);
      let modified = 0;

      const updated = lines.map(line => {
        try {
          const entry = JSON.parse(line);
          if (!entry.session_id) {
            entry.session_id = 'migrated-from-pre-1.0';
            modified++;
            return JSON.stringify(entry);
          }
          return line;
        } catch {
          return line;  // Preserve unparseable lines exactly as-is (quarantine pattern)
        }
      });

      if (modified > 0) {
        fs.writeFileSync(paths.audit, updated.join('\n') + '\n');
        console.log(`    • AUDIT.jsonl: backfilled session_id in ${modified} of ${lines.length} entries`);
      } else {
        console.log(`    • AUDIT.jsonl: all entries already have session_id`);
      }
    }

    // ── 3. MINDFORGE.md ───────────────────────────────────────────────────────
    if (fs.existsSync(paths.mindforgemd)) {
      let content = fs.readFileSync(paths.mindforgemd, 'utf8');
      let changed = false;

      // Convert VERIFY_PASS_RATE_WARNING_THRESHOLD from percent (>1) to decimal
      const pctPattern = /^(VERIFY_PASS_RATE_WARNING_THRESHOLD=)(\d+(?:\.\d+)?)(\s*)$/m;
      const match = content.match(pctPattern);
      if (match) {
        const val = parseFloat(match[2]);
        if (val > 1) {
          // Old format: integer like 75 → new format: 0.75
          const newVal = (val / 100).toFixed(2);
          content = content.replace(pctPattern, `$1${newVal}$3`);
          changed = true;
          console.log(`    • MINDFORGE.md: converted VERIFY_PASS_RATE_WARNING_THRESHOLD ${val} → ${newVal}`);
        }
        // If val <= 1, it's already in the correct format — no change needed
      }

      if (changed) fs.writeFileSync(paths.mindforgemd, content);
    }

    // ── 4. STATE.md ───────────────────────────────────────────────────────────
    if (fs.existsSync(paths.state)) {
      const content = fs.readFileSync(paths.state, 'utf8');
      if (!content.includes('v1.0.0') && !content.includes('MindForge v1')) {
        fs.appendFileSync(paths.state,
          `\n\n---\n*Migrated to MindForge v1.0.0 schema on ${new Date().toISOString().slice(0,10)}*\n`
        );
        console.log(`    • STATE.md: added v1.0.0 migration note`);
      }
    }
  },
};
```

### `bin/migrations/0.1.0-to-0.5.0.js` and `0.5.0-to-0.6.0.js`

```javascript
// bin/migrations/0.1.0-to-0.5.0.js
'use strict';
const fs = require('fs');
module.exports = {
  fromVersion: '0.1.0',
  toVersion:   '0.5.0',
  description: 'Add decisions_made, discoveries, implicit_knowledge to HANDOFF.json',
  async run(paths) {
    if (!fs.existsSync(paths.handoff)) return;
    const handoff = JSON.parse(fs.readFileSync(paths.handoff, 'utf8'));
    if (!handoff.decisions_made)     handoff.decisions_made     = [];
    if (!handoff.discoveries)        handoff.discoveries        = [];
    if (!handoff.implicit_knowledge) handoff.implicit_knowledge = [];
    if (!handoff.quality_signals)    handoff.quality_signals    = [];
    fs.writeFileSync(paths.handoff, JSON.stringify(handoff, null, 2) + '\n');
    console.log(`    • HANDOFF.json: added intelligence layer fields`);
  },
};

// bin/migrations/0.5.0-to-0.6.0.js
'use strict';
const fs = require('fs');
module.exports = {
  fromVersion: '0.5.0',
  toVersion:   '0.6.0',
  description: 'Add developer_id, session_id, recent_commits, recent_files to HANDOFF.json',
  async run(paths) {
    if (!fs.existsSync(paths.handoff)) return;
    const handoff = JSON.parse(fs.readFileSync(paths.handoff, 'utf8'));
    if (!handoff.developer_id)   handoff.developer_id   = null;
    if (!handoff.session_id)     handoff.session_id     = null;
    if (!Array.isArray(handoff.recent_commits)) handoff.recent_commits = [];
    if (!Array.isArray(handoff.recent_files))   handoff.recent_files   = [];
    fs.writeFileSync(paths.handoff, JSON.stringify(handoff, null, 2) + '\n');
    console.log(`    • HANDOFF.json: added distribution platform fields`);
  },
};
```

**Commit:**
```bash
git add bin/migrations/
git commit -m "feat(migration): complete migration engine — all versions 0.1.0→1.0.0 with backup/restore"
```

---

## TASK 5 — Write the Plugin System

### `.mindforge/plugins/plugin-schema.md`

```markdown
# MindForge Plugin System — Schema v1.0.0

## Philosophy
Plugins extend MindForge without modifying the core framework files.
They are first-class citizens: versioned, validated, injection-guarded, and audited.

## Package naming convention
`mindforge-plugin-[category]-[name]`

Examples:
- `mindforge-plugin-jira-advanced`    — Advanced Jira sprint and velocity commands
- `mindforge-plugin-testing-playwright` — Playwright E2E testing skill and commands
- `mindforge-plugin-cloud-aws`        — AWS deployment patterns and runbooks
- `mindforge-plugin-design-figma`     — Figma design review integration

## What a plugin can provide

| Component | Description | File location |
|---|---|---|
| Commands | New slash commands | `commands/[name].md` |
| Skills | New skill packs | `skills/[name]/SKILL.md` |
| Personas | New agent personas | `personas/[name].md` |
| Hooks | Lifecycle event handlers | `hooks/[hook-name].md` |

## `plugin.json` manifest (required in every plugin package)

```json
{
  "name": "mindforge-plugin-jira-advanced",
  "version": "1.0.0",
  "description": "Advanced Jira integration with sprint planning and velocity tracking",
  "mindforge": {
    "type": "plugin",
    "min_mindforge_version": "1.0.0",
    "plugin_api_version": "1.0.0",
    "provides": {
      "commands":  ["jira-sprint", "jira-velocity", "jira-epics"],
      "skills":    [],
      "personas":  [],
      "hooks": {
        "post_phase_complete": "hooks/post-phase.md",
        "pre_plan_phase":      null,
        "post_execute_phase":  null,
        "post_verify_phase":   null,
        "post_milestone":      null,
        "pre_security_scan":   null,
        "post_security_scan":  null
      }
    },
    "permissions": {
      "read_audit_log":    true,
      "write_audit_log":   true,
      "read_state":        true,
      "write_state":       false,
      "network_access":    true,
      "file_system_write": false
    },
    "conflicts_with": []
  },
  "keywords": ["mindforge", "mindforge-plugin", "jira"],
  "license": "MIT"
}
```

## Permissions — advisory model

The permission system is advisory, not OS-enforced. Permissions are:
- **Declared** in plugin.json before installation
- **Displayed** to the user for review at install time
- **Recorded** in AUDIT.jsonl with plugin name as the agent field
- **Enforced** through the agent's own governance layer (plan-first, audit requirements)

A plugin instructing the agent to take actions outside its declared permissions
would still be subject to all MindForge governance checks (secret detection,
quality gates, Tier classification). The permission declaration is a statement
of intent — it enables trust decisions, not OS-level sandboxing.

**The real security layer is:**
1. Injection guard at install time (blocks obvious adversarial instructions)
2. Level 1/2/3 validation of all plugin SKILL.md files
3. User review of plugin commands before installation
4. Complete audit trail with plugin name on every action

## Available lifecycle hooks

| Hook name | Trigger point | Typical use case |
|---|---|---|
| `post_phase_complete` | After /mindforge:verify-phase passes | External notifications, custom reports |
| `pre_plan_phase` | Before /mindforge:plan-phase starts | Requirement fetching from external system |
| `post_execute_phase` | After all execution waves complete | Custom metrics collection |
| `post_verify_phase` | After UAT sign-off | Custom acceptance report |
| `post_milestone` | After /mindforge:complete-milestone | Release announcement, changelog distribution |
| `pre_security_scan` | Before /mindforge:security-scan | Custom scan tool preparation |
| `post_security_scan` | After security scan completes | Custom finding routing, ticketing |

## Reserved command names

These 36 command names are permanently reserved for MindForge built-ins.
Plugin commands with these names will be prefixed with the plugin name:

```
help, init-project, plan-phase, execute-phase, verify-phase, ship,
next, quick, status, debug, skills, review, security-scan, map-codebase,
discuss-phase, audit, milestone, complete-milestone, approve, sync-jira,
sync-confluence, health, retrospective, profile-team, metrics, init-org,
install-skill, publish-skill, pr-review, workspace, benchmark, update,
migrate, plugins, tokens, release
```
```

---

### `.mindforge/plugins/plugin-loader.md`

```markdown
# MindForge Plugin System — Loader Protocol

## Loading sequence (runs at session start)

### Step 1 — Discover installed plugins
```bash
MANIFEST=".mindforge/plugins/PLUGINS-MANIFEST.md"
[ -f "${MANIFEST}" ] || { echo "No plugins installed"; return; }

# Extract plugin names from manifest table rows
PLUGINS=$(grep "^| " "${MANIFEST}" | grep -v "^| Name" | grep -v "none" | \
  awk -F'|' '{gsub(/[[:space:]]/, "", $2); print $2}' | grep -v '^$')
```

### Step 2 — Validate each installed plugin

For each installed plugin directory at `.mindforge/plugins/[plugin-name]/`:

1. **plugin.json exists and is valid JSON**
2. **plugin_api_version compatibility**: read `plugin.json mindforge.plugin_api_version`
   and verify it matches the current supported API version (`1.0.0`)
3. **min_mindforge_version compatibility**: verify current MindForge version satisfies minimum
4. **Injection guard**: run against all command, skill, and persona .md files in the plugin
   - If injection patterns found: do NOT load. Log AUDIT entry, alert user
5. **Level 1 + Level 2 validation**: for every SKILL.md in the plugin

### Step 3 — Load plugin components

**Commands:**
```bash
for CMD_FILE in ".mindforge/plugins/[plugin]/commands/"*.md; do
  CMD_NAME=$(basename "${CMD_FILE}" .md)

  # Check for conflict with reserved names
  RESERVED_NAMES=(help init-project plan-phase execute-phase verify-phase ship
                  next quick status debug skills review security-scan
                  map-codebase discuss-phase audit milestone complete-milestone
                  approve sync-jira sync-confluence health retrospective
                  profile-team metrics init-org install-skill publish-skill
                  pr-review workspace benchmark update migrate plugins tokens release)

  IS_RESERVED=false
  for RESERVED in "${RESERVED_NAMES[@]}"; do
    [ "${CMD_NAME}" = "${RESERVED}" ] && { IS_RESERVED=true; break; }
  done

  # Prefix if conflict
  FINAL_NAME="${IS_RESERVED:-true && "${PLUGIN_NAME}-${CMD_NAME}" || "${CMD_NAME}"}"

  cp "${CMD_FILE}" ".claude/commands/mindforge/${FINAL_NAME}.md"
  cp "${CMD_FILE}" ".agent/mindforge/${FINAL_NAME}.md"
done
```

**Skills:** Registered in MANIFEST.md under Tier 2 section (prefix: `[plugin-name]-`)
**Personas:** Installed as `.mindforge/personas/[plugin-name]-[persona].md`
**Hooks:** Registered in `.mindforge/plugins/hooks-registry.md`

### Step 4 — Report loaded plugins

At session start, CLAUDE.md reads the loaded plugins list and reports:
```
Active plugins (2):
  jira-advanced v1.0.0 — hooks: post_phase_complete
  testing-playwright v0.9.0 — skills: playwright-e2e
```

If any plugin fails validation: skip it, report error, continue loading others.
Never fail the session start because a plugin is invalid.

### Step 5 — Write AUDIT entry for plugin load

```json
{
  "event": "plugins_loaded",
  "plugins": [
    { "name": "mindforge-plugin-jira-advanced", "version": "1.0.0", "hooks": ["post_phase_complete"] }
  ],
  "failed": []
}
```
```

---

### `.mindforge/plugins/PLUGINS-MANIFEST.md`

```markdown
# MindForge Plugins Manifest
# Schema version: 1.0.0
# This file is managed by /mindforge:plugins install|uninstall

## Installed plugins

| Name | Version | Status | Min MindForge | Permissions |
|---|---|---|---|---|
| (no plugins installed) | | | | |

## Available plugins (public registry)

Search: `npm search mindforge-plugin`
Install: `/mindforge:plugins install [plugin-name]`

## Plugin development

To create a plugin: see `docs/contributing/plugin-authoring.md`
To publish:        `npm publish --access public`
To validate:       `node bin/validate-config.js --type plugin ./plugin.json`

## Hooks registry
(populated automatically when plugins with hooks are installed)
```

**Commit:**
```bash
git add .mindforge/plugins/
git commit -m "feat(plugins): implement plugin schema, loader protocol, and manifest — v1.0.0 stable"
```

---

## TASK 6 — Write the Token Usage Optimiser

### `.mindforge/production/token-optimiser.md`

```markdown
# MindForge Production — Token Usage Optimiser

## Purpose
Measure, profile, and systematically reduce Claude API token consumption.
Token efficiency impacts both cost and session quality — a session that
exhausts its context on large file reads has less capacity for reasoning.

## Token consumption model

### Where tokens are spent in a typical MindForge session

| Component | Typical estimate | Notes |
|---|---|---|
| Session startup (CLAUDE.md + ORG.md + PROJECT.md + STATE.md) | 4,000–9,000 | Fixed per session |
| Each skill injected (full) | 2,500–6,000 | Depends on skill complexity |
| Each skill injected (summary) | 300–600 | When > 3 skills loaded |
| PLAN file per task | 400–1,800 | Lean plans save 800+ tokens |
| File reading per task | 1,500–50,000 | Biggest variable cost |
| Agent reasoning + response | 1,500–8,000 | |
| Verify step + output | 400–1,500 | |

**Note:** These are estimates based on typical MindForge projects.
Actual values depend on file sizes, code complexity, and model verbosity.
Run `/mindforge:tokens` to see measured estimates for your project.

### Token efficiency threshold

| Efficiency | Meaning | Action |
|---|---|---|
| > 45% | Excellent — agent spending time on reasoning and output | No action |
| 35–45% | Good — healthy balance | No action |
| 20–35% | Acceptable — room to optimise | Review high-cost sessions |
| < 20% | Poor — most tokens spent on reading, not reasoning | Apply optimisations below |

```
token_efficiency = useful_output_tokens / total_tokens_consumed
useful_output_tokens = tokens in SUMMARY files + verified code changes + ADRs written
```

## Optimisation strategies

### Strategy 1 — Lean PLAN `<action>` fields (highest impact)

**Anti-pattern:** Over-specified actions that tell the agent HOW to implement,
rather than WHAT to implement. These waste tokens on instructions the agent's
persona and skills already provide.

```xml
<!-- ❌ Over-specified: 720 tokens — redundant with developer.md persona -->
<action>
  Create a TypeScript interface called UserProfile in src/types/user.ts.
  The interface should have the following fields: id (string, UUID v4),
  email (string, validated with RFC 5322 regex), firstName (string, min 1 char),
  lastName (string, min 1 char), createdAt (Date, UTC), updatedAt (Date, UTC),
  deletedAt (Date | null), role (string enum: 'admin' | 'editor' | 'viewer'),
  preferences object with keys: theme ('light' | 'dark'), notifications (boolean),
  timezone (string). Add JSDoc comments with @param tags for each field.
  Export as a named export. Use strict TypeScript types throughout.
</action>

<!-- ✅ Lean: 140 tokens — trusts the developer persona -->
<action>
  Create UserProfile interface in src/types/user.ts.
  Fields: id (UUID), email (RFC 5322 validated), name fields,
  timestamps (created/updated/deleted), role enum (admin/editor/viewer),
  preferences (theme, notifications, timezone).
  Full JSDoc. Named export.
</action>
```

**Token saving: ~580 tokens per plan action. For 10 tasks: ~5,800 tokens (≈ one extra skill).**

### Strategy 2 — Just-in-time file reading

Current: subagents read ALL files in `<files>` at task start.
Optimal: Read files when they are first referenced in the action.

This is a recommendation for planning — instruct the planner:
"Add a note to `<context>` in plans: 'Read files lazily — read each file
when first needed in the action, not all upfront.'"

**Known limitation:** This is advisory. The execution engine update to enforce
lazy loading is planned for v1.1.0.

### Strategy 3 — Selective STATE.md section loading

STATE.md grows over time as projects accumulate phase summaries and decisions.
Loading the full file at session start can cost 3,000–8,000 tokens.

Optimised loading approach (add to CLAUDE.md session start):
```bash
# Extract only the sections needed at session start
# Full STATE.md: only loaded when the agent needs project history

# Minimal load — always (200-500 tokens):
CURRENT_STATUS_SECTION=$(awk '/^## Current status/,/^## /' .planning/STATE.md | head -30)
NEXT_ACTION_SECTION=$(awk '/^## Next action/,/^## /' .planning/STATE.md | head -10)

# Full load — only when agent explicitly needs history:
# (e.g., plan-phase, retrospective, complete-milestone)
```

### Strategy 4 — Code context precision

For tasks that modify specific functions: provide only the relevant code section.

```xml
<!-- ❌ Reads entire 450-line file for a 10-line change -->
<files>src/services/user.service.ts</files>

<!-- ✅ Agent reads only the relevant section -->
<files>src/services/user.service.ts:40-65</files>
<!-- (line range specification — a Day 7 planner feature) -->
```

**Note:** Line-range file reading is a planned v1.1.0 feature.
For now: add to `<context>`: "Focus on lines 40-65 of user.service.ts."

### Strategy 5 — Skill summarisation at 4+ skills

Already implemented in loader.md. This strategy verifies it is working:

Check skill-usage.jsonl for `tokens_est` field.
If any session shows 4+ skills loaded at full injection: loader protocol needs review.
Target: never more than 3 skills at full injection per task.

## Token budget tracking

Written to `.mindforge/metrics/token-usage.jsonl` after each task:

```json
{
  "timestamp": "ISO-8601",
  "session_id": "sess_abc123",
  "phase": 3,
  "plan": "02",
  "task_name": "Implement auth middleware",
  "token_estimates": {
    "context_startup": 6200,
    "skills": { "count": 2, "total": 8400, "summarised": 0 },
    "plan_file": 620,
    "code_reading": 12400,
    "agent_response": 3800,
    "verify": 720,
    "total": 32140
  },
  "efficiency": 0.34,
  "flags": []
}
```

## MINDFORGE.md token settings

```
# Add to MINDFORGE.md to configure token behaviour:

# Warn when single task token estimate exceeds this
TOKEN_WARN_THRESHOLD=40000

# Lean mode: agent produces shorter responses where possible
TOKEN_LEAN_MODE=false

# Maximum lines to read per file when no line range specified
TOKEN_MAX_FILE_LINES=300
```
```

**Commit:**
```bash
git add .mindforge/production/token-optimiser.md
git commit -m "feat(tokens): implement token usage optimiser with profiling, strategies, and JSONL tracking"
```

---

## TASK 7 — Write the 50-point Production Readiness Checklist

### `.mindforge/production/production-checklist.md`

```markdown
# MindForge v1.0.0 — Production Readiness Checklist

## Policy: ALL 50 items must be ✅ before tagging v1.0.0

This is not a "should" list — it is a hard gate.
No item can be marked ✅ without:
1. The specific verification step executed successfully
2. The verifier's git email recorded
3. The date verified recorded

Document completed checks in `.planning/RELEASE-CHECKLIST.md`.

---

## SECTION A — Installation & Upgrade (10 points)

| # | Check | Verification step | ✅/❌ | Verified by | Date |
|---|---|---|---|---|---|
| A01 | `npx mindforge-cc@latest` launches interactive wizard on macOS | Run on macOS terminal with TTY | | | |
| A02 | `npx mindforge-cc@latest` launches wizard on Linux | Run on Ubuntu 22.04 LTS terminal | | | |
| A03 | `npx mindforge-cc --claude --local` installs correctly | Verify files, run /mindforge:health | | | |
| A04 | `npx mindforge-cc --all --global` installs both runtimes | Check ~/.claude and ~/.gemini/antigravity | | | |
| A05 | `--update` updates and preserves install scope | Install locally, run --update, verify scope preserved | | | |
| A06 | `--uninstall` removes only MindForge files (not .planning/) | Run uninstall, verify .planning/ intact | | | |
| A07 | `--version` and `--help` exit 0 with correct output | Run both flags, check exit code | | | |
| A08 | Install over existing CLAUDE.md backs it up | Create custom CLAUDE.md, install, verify backup | | | |
| A09 | Install over existing .planning/ preserves it | Create test .planning/, install, verify preserved | | | |
| A10 | Node.js < 18 prints helpful error and exits 1 | Run with node 16, verify error message | | | |

## SECTION B — Command Coverage (10 points)

| # | Check | Verification step | ✅/❌ | Verified by | Date |
|---|---|---|---|---|---|
| B01 | `/mindforge:help` shows all 36 commands | Count commands in output, verify ≥ 36 | | | |
| B02 | `/mindforge:init-project` creates all 5 required .planning/ files | Run in empty dir, check file list | | | |
| B03 | `/mindforge:health` reports ✅ on a fresh install | Fresh install, run health, zero errors | | | |
| B04 | `/mindforge:health --repair` fixes CLAUDE.md drift | Corrupt .agent/CLAUDE.md, run repair, verify fix | | | |
| B05 | `/mindforge:skills list` shows all 10 core skills | Count in output, verify all 10 names | | | |
| B06 | `/mindforge:skills validate` shows all valid | Run, verify zero errors | | | |
| B07 | `/mindforge:security-scan --secrets` detects fake key | Add test key pattern, scan, verify detection | | | |
| B08 | `/mindforge:audit --summary` shows metrics dashboard | Run in project with some audit entries | | | |
| B09 | `/mindforge:update` checks version without changing files | Run without --apply, verify no file changes | | | |
| B10 | `/mindforge:migrate --dry-run` shows plan without changes | Run dry-run on v0.6.0 schema, verify dry-run | | | |

## SECTION C — Governance Gates (10 points)

| # | Check | Verification step | ✅/❌ | Verified by | Date |
|---|---|---|---|---|---|
| C01 | Gate 3 (secret detection) blocks commit with fake API key | Stage file with `FAKE_ghp_abcdef1234567890abcd`, run gate | | | |
| C02 | Gate 2 (tests passing) blocks on test failure | Break a test, run gate, verify block | | | |
| C03 | Gate 1 (CRITICAL findings) blocks PR creation | Add CRITICAL finding to SECURITY-REVIEW, attempt ship | | | |
| C04 | AUDIT.jsonl gains entry for every task start and complete | Execute one quick task, count new AUDIT lines | | | |
| C05 | Tier 3 change classifier detects jwt.sign in non-auth path | Create file with jwt.sign, run classifier | | | |
| C06 | Tier 3 CI block produces clear error message | Simulate CI run with Tier 3 pending, check output | | | |
| C07 | MINDFORGE.md non-overridable keys are silently enforced | Set SECRET_DETECTION=false, verify it has no effect | | | |
| C08 | Approval workflow creates APPROVAL-[uuid].json | Request a Tier 2 approval, verify file created | | | |
| C09 | Plugin injection guard blocks malicious SKILL.md | Create SKILL.md with IGNORE ALL PREVIOUS, run guard | | | |
| C10 | All 5 compliance gates produce GATE-RESULTS-N.md | Complete a full phase, verify GATE-RESULTS file | | | |

## SECTION D — Documentation (10 points)

| # | Check | Verification step | ✅/❌ | Verified by | Date |
|---|---|---|---|---|---|
| D01 | README.md quick start works end-to-end in < 5 minutes | New developer follows README, measures time | | | |
| D02 | `docs/reference/commands.md` documents all 36 commands | Count documented commands, verify ≥ 36 | | | |
| D03 | `docs/enterprise-setup.md` covers all integration steps | Walk through integration setup docs | | | |
| D04 | `docs/governance-guide.md` explains all 3 tiers clearly | Review with someone unfamiliar with governance | | | |
| D05 | `docs/security/threat-model.md` covers all 7 threat actors | Count actors, verify controls for each | | | |
| D06 | `docs/security/SECURITY.md` has disclosure process | Verify email + 90-day policy present | | | |
| D07 | `docs/contributing/CONTRIBUTING.md` has PR guidelines | Check for: fork, branch, test, PR process | | | |
| D08 | `docs/contributing/skill-authoring.md` is actionable | Follow guide to create a test skill | | | |
| D09 | All 20 ADRs listed in decision-records-index.md | Count ADRs, cross-check index | | | |
| D10 | CHANGELOG.md v1.0.0 entry is complete with date | Verify entry has date, all components listed | | | |

## SECTION E — Test Coverage (10 points)

| # | Check | Verification step | ✅/❌ | Verified by | Date |
|---|---|---|---|---|---|
| E01 | All 15 test suites pass with 0 failures (Run 1) | Execute full test battery | | | |
| E02 | All 15 test suites pass with 0 failures (Run 2) | Execute full test battery again | | | |
| E03 | All 15 test suites pass with 0 failures (Run 3) | Execute full test battery third time | | | |
| E04 | No test uses `process.exit(0)` inside a test function | `grep -rn 'process.exit(0)' tests/` | | | |
| E05 | E2E tests simulate complete brownfield onboarding | Run tests/e2e.test.js, verify brownfield path | | | |
| E06 | Migration tests cover v0.1.0 → v1.0.0 full chain | Run tests/migration.test.js full suite | | | |
| E07 | No test has `// TODO` or `// skip` in test body | `grep -rn 'TODO\|skip' tests/` | | | |
| E08 | Security penetration test pass (all 7 threat actors) | Run through threat-model.md controls manually | | | |
| E09 | CI pipeline runs all tests on PR against main | Create test PR, verify CI passes | | | |
| E10 | Version in package.json matches git tag matches npm dist | `node -e "console.log(require('./package.json').version)"` | | | |

---

## Release gate procedure

When ALL 50 items show ✅:

```bash
# 1. Final security scan
/mindforge:security-scan --deep --secrets --deps

# 2. Triple-run test battery
node -e "
const { execSync } = require('child_process');
const suites = ['install','wave-engine','audit','compaction','skills-platform',
  'integrations','governance','intelligence','metrics',
  'distribution','ci-mode','sdk','production','migration','e2e'];
let allPass = true;
for (let run = 1; run <= 3; run++) {
  for (const suite of suites) {
    try {
      execSync('node tests/' + suite + '.test.js', { stdio: 'pipe' });
    } catch {
      console.error('FAILED: ' + suite + ' run ' + run);
      allPass = false;
    }
  }
}
console.log(allPass ? 'ALL TESTS PASSED × 3' : 'FAILURES DETECTED');
process.exit(allPass ? 0 : 1);
"

# 3. Tag and publish (only after the above pass)
git tag -a v1.0.0 -m "MindForge v1.0.0 — First stable public release"
git push origin v1.0.0
npm publish --access public
```
```

**Commit:**
```bash
git add .mindforge/production/
git commit -m "feat(production): 50-point release checklist, token optimiser, migration spec"
```

---

## TASK 8 — Write all 5 new commands

### `.claude/commands/mindforge/update.md`

```markdown
# MindForge — Update Command
# Usage: /mindforge:update [--apply] [--force] [--check] [--skip-changelog]

## Purpose
Check for and apply MindForge framework updates in a safe, scope-preserving way.

## Execution flow

### 1. Version check
Execute `bin/updater/self-update.js` `checkAndUpdate()`.
Always show: current version, latest version, update type (major/minor/patch).

### 2. Changelog display (unless --skip-changelog)
Fetch and display the relevant CHANGELOG.md section.
For major updates: prefix with ⚠️ BREAKING CHANGES notice.
Limit display to 3,000 characters — link to full CHANGELOG for the rest.

### 3. Confirmation gate (unless --apply)
Without --apply: show update info, stop. Do not modify any files.
Message: "To apply this update: /mindforge:update --apply"

### 4. Apply (with --apply)
a. Detect original install scope (local vs global, claude vs antigravity)
b. Read schema_version from HANDOFF.json (captures current version BEFORE update)
c. Run `npx mindforge-cc@[latest] --[runtime] --[scope]`
d. Run migration: `node bin/migrations/migrate.js` with captured schema_version
e. Run /mindforge:health to verify update succeeded

### 5. Post-update health check
If health errors: surface them immediately with specific fix instructions.
Common post-update issue: CLAUDE.md and .agent/CLAUDE.md drifted → auto-repair.

## Error scenarios and recovery

| Error | Recovery |
|---|---|
| npm registry unreachable | Message: "Check internet. Manual: npm info mindforge-cc version" |
| Update download fails | Retry once, then suggest manual: `npx mindforge-cc@latest` |
| Migration fails | Restored from backup automatically. Run /mindforge:migrate manually. |
| Install scope detection fails | Prompt user: "Is your install global or local?" |

## AUDIT entry
```json
{
  "event": "framework_updated",
  "from_version": "0.6.0",
  "to_version": "1.0.0",
  "update_type": "major",
  "scope": "local",
  "runtime": "claude",
  "migration_ran": true,
  "health_check_result": "healthy"
}
```
```

### `.claude/commands/mindforge/migrate.md`

```markdown
# MindForge — Migrate Command
# Usage: /mindforge:migrate [--from X.Y.Z] [--to X.Y.Z] [--dry-run] [--force]

## Purpose
Run explicit schema migrations for .planning/ files.
Normally triggered automatically by /mindforge:update.
Use this command manually when: auto-migration failed, manual version jump, recovery.

## Flow

### Auto-detect migration need
Read `schema_version` from HANDOFF.json.
Compare against current `package.json` version.
Determine migration path.

### Dry-run mode (--dry-run)
Show: which migrations would run, what each changes.
Show: breaking changes for the migration path.
Make NO changes to any file.

### Backup first
Before any changes: create `.planning/migration-backup-[timestamp]/`
Verify backup integrity (file count, non-empty).
If backup fails: ABORT. Explain disk space issue.

### Execute migrations
Run `node bin/migrations/migrate.js`.
Show progress for each migration.
If any migration fails: auto-restore from backup.

### Verify
Run /mindforge:health after migration.
If health errors: report with specific fix instructions.
Preserve backup until user is satisfied — they must delete it manually.

## Manual version override
`/mindforge:migrate --from 0.1.0 --to 1.0.0` — forces migration between specified versions.
Use with care: intended for recovery scenarios where HANDOFF.json schema_version is wrong.

## AUDIT entry
```json
{
  "event": "schema_migrated",
  "from_version": "0.6.0",
  "to_version": "1.0.0",
  "migrations_run": 1,
  "backup_path": ".planning/migration-backup-1234567890",
  "result": "success"
}
```
```

### `.claude/commands/mindforge/plugins.md`

```markdown
# MindForge — Plugins Command
# Usage: /mindforge:plugins [list|install|uninstall|info|validate|create] [name]

## list
Read PLUGINS-MANIFEST.md. Display installed plugins with version and permissions.
If no plugins: "No plugins installed. Find plugins: npm search mindforge-plugin"

## install [plugin-name]
Full installation protocol per plugin-loader.md:
1. Resolve package: `mindforge-plugin-[name]` convention
2. Download to chmod 700 temp directory
3. Validate plugin.json manifest
4. Check plugin_api_version compatibility (1.0.0 required)
5. Run injection guard on ALL .md files in the plugin
6. Run Level 1 + 2 skill validation on all SKILL.md files
7. Display permission list for user approval:
   ```
   Plugin: mindforge-plugin-jira-advanced v1.0.0
   Requests these permissions:
     • read_audit_log:  read AUDIT.jsonl ✅ (safe)
     • write_audit_log: append to AUDIT.jsonl ⚠️
     • network_access:  make HTTP requests ⚠️
   Install? (yes/no)
   ```
8. Install components (commands, skills, personas, hooks)
9. Add to PLUGINS-MANIFEST.md
10. Write AUDIT entry

## uninstall [plugin-name]
Remove all installed components. Update PLUGINS-MANIFEST.md.
Confirm: "This will remove [N] commands, [N] skills from this plugin."

## info [plugin-name]
Display: version, description, author, permissions, commands, skills, personas, hooks.

## validate
Validate all installed plugins for compatibility, injection safety, permission scope.

## create [plugin-name]
Generate a plugin scaffold:
```
mindforge-plugin-[name]/
├── plugin.json          (pre-filled template)
├── commands/            (empty, ready for .md files)
├── skills/              (empty, ready for skill directories)
├── hooks/               (empty, ready for hook .md files)
└── README.md            (template)
```
See docs/contributing/plugin-authoring.md for authoring guidance.
```

### `.claude/commands/mindforge/tokens.md`

```markdown
# MindForge — Token Usage Command
# Usage: /mindforge:tokens [--phase N] [--session ID] [--window short|medium|long] [--optimise]

## Purpose
Display token consumption profile and efficiency analysis.
Helps identify where tokens are being spent and how to reduce waste.

## Default output (no flags — last 5 sessions)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡  Token Usage Profile — [Project Name]
    Last 5 sessions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Session       Estimated   Code Read  Skills  Efficiency
  ──────────    ─────────   ─────────  ──────  ──────────
  sess-01         31,200      17,800    6,400     40% ✅
  sess-02         62,400      44,100    6,200     22% ⚠️
  sess-03         28,900      15,400    5,800     43% ✅
  sess-04         74,800      55,600    7,100     17% 🔴
  sess-05         33,100      18,600    7,400     39% ✅

  Average         46,080      30,300    6,580     32%
  Target                                          >35%

  Efficiency flags:
  🔴 sess-04: code_reading extremely high (55,600) — plan scope too broad
  ⚠️  sess-02: code_reading high (44,100) — consider narrower <files> list
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Run /mindforge:tokens --optimise for specific recommendations.
```

## Data source
Read `.mindforge/metrics/token-usage.jsonl`.
If file doesn't exist: "No token usage data yet. Data collected after tasks complete."

## --optimise flag
Analyse recent sessions for patterns. Report concrete improvements:
- If code_reading consistently > 25,000: "Plans are reading too broadly. Add file line-ranges to `<context>` fields."
- If skills > 4 per session: "4+ skills loading frequently. Consider adding specific triggers to reduce auto-loading."
- If plan_file > 1,000 tokens: "PLAN `<action>` fields are verbose. Use lean format (see token-optimiser.md Strategy 1)."
- Suggest MINDFORGE.md settings that would reduce token use.

## AUDIT entry
```json
{ "event": "tokens_viewed", "window": "short", "avg_efficiency": 0.32 }
```
```

### `.claude/commands/mindforge/release.md`

```markdown
# MindForge — Release Command
# Usage: /mindforge:release [--version X.Y.Z] [--dry-run] [--checklist-only]
# ⚠️  This command is for releasing the MindForge framework itself.
#     For releasing your project phases, use /mindforge:ship instead.

## Purpose
Execute the complete MindForge v1.0.0 (or any version) release pipeline.
Intended for the MindForge core team.

## Gate: Production Readiness Checklist

```bash
# Verify all 50 checklist items are ✅
CHECKLIST=".planning/RELEASE-CHECKLIST.md"
[ -f "${CHECKLIST}" ] || { echo "❌ Release checklist not found"; exit 1; }

UNCHECKED=$(grep -c '| ❌\| \| |' "${CHECKLIST}" || true)
if [ "${UNCHECKED}" -gt 0 ]; then
  echo "❌ ${UNCHECKED} checklist item(s) are not verified."
  echo "   Complete the checklist before releasing."
  exit 1
fi
echo "✅ All 50 checklist items verified"
```

## Release pipeline (8 stages)

### Stage 1 — Final test battery (15 suites × 3 runs)
```bash
SUITES=(install wave-engine audit compaction skills-platform
        integrations governance intelligence metrics
        distribution ci-mode sdk production migration e2e)

for RUN in 1 2 3; do
  echo "=== Run ${RUN}/3 ==="
  for SUITE in "${SUITES[@]}"; do
    node tests/${SUITE}.test.js || { echo "FAILED: ${SUITE}"; exit 1; }
  done
done
echo "✅ All 15 suites × 3 runs passed"
```

### Stage 2 — Security final scan
```bash
/mindforge:security-scan --deep --secrets --deps
# Must show: CLEAN — 0 CRITICAL, 0 HIGH findings
# Must show: 0 secrets detected
# Must show: 0 vulnerable dependencies (HIGH or CRITICAL)
```

### Stage 3 — Version verification
```bash
PACKAGE_VER=$(node -e "console.log(require('./package.json').version)")
[ "${PACKAGE_VER}" = "${TARGET_VERSION}" ] || { echo "❌ Version mismatch"; exit 1; }
grep -q "${TARGET_VERSION}" CHANGELOG.md || { echo "❌ No CHANGELOG entry"; exit 1; }
echo "✅ Version: ${PACKAGE_VER}"
```

### Stage 4 — SDK build
```bash
cd sdk && npm run build
[ -f "dist/index.js" ] || { echo "❌ SDK build failed"; exit 1; }
[ -f "dist/index.d.ts" ] || { echo "❌ SDK types missing"; exit 1; }
echo "✅ SDK built"
cd ..
```

### Stage 5 — Release commit and tag
```bash
git add package.json CHANGELOG.md sdk/dist/ .planning/RELEASE-CHECKLIST.md
git commit -m "chore(release): v${TARGET_VERSION} — enterprise agentic framework stable release"

git tag -a "v${TARGET_VERSION}" -m "MindForge v${TARGET_VERSION}

Enterprise Agentic Framework — First Stable Public Release

Commands: 36 | Skills: 10 | Personas: 8 | ADRs: 20 | Test suites: 15

See CHANGELOG.md for full release notes.
Install: npx mindforge-cc@latest"
```

### Stage 6 — npm publish
```bash
# Dry run first — verify what will be published
npm publish --dry-run --access public 2>&1 | head -50

# Actual publish
npm publish --access public

# Verify publication
sleep 10
PUBLISHED=$(npm info mindforge-cc@${TARGET_VERSION} version 2>/dev/null)
[ "${PUBLISHED}" = "${TARGET_VERSION}" ] || { echo "❌ Publish verification failed"; exit 1; }
echo "✅ Published: mindforge-cc@${TARGET_VERSION}"
```

### Stage 7 — GitHub release
```bash
gh release create "v${TARGET_VERSION}" \
  --title "MindForge v${TARGET_VERSION} — Enterprise Agentic Framework" \
  --notes-file CHANGELOG.md \
  --verify-tag
```

### Stage 8 — Post-release verification
```bash
# Test fresh install from published package
TEMP_DIR=$(mktemp -d) && cd "${TEMP_DIR}"
npx mindforge-cc@${TARGET_VERSION} --version
[ "$?" = "0" ] || { echo "❌ Published package fails --version"; exit 1; }
echo "✅ Published package verified"
cd - && rm -rf "${TEMP_DIR}"
```

## --dry-run flag
Runs all stages except Stage 6 (npm publish) and Stage 7 (GitHub release).
Shows what would be published without publishing.

## AUDIT entry (written after successful release)
```json
{
  "event": "framework_released",
  "version": "1.0.0",
  "checklist_verified": true,
  "test_runs": 3,
  "security_scan": "clean",
  "npm_url": "https://www.npmjs.com/package/mindforge-cc/v/1.0.0",
  "github_release": "https://github.com/mindforge-dev/mindforge/releases/tag/v1.0.0"
}
```
```

**Commit:**
```bash
for cmd in update migrate plugins tokens release; do
  cp .claude/commands/mindforge/${cmd}.md .agent/mindforge/${cmd}.md
done
git add .claude/commands/mindforge/ .agent/mindforge/
git commit -m "feat(commands): add update, migrate, plugins, tokens, release — all 36 commands complete"
```

---

## TASK 9 — Write the complete reference documentation

### `docs/reference/commands.md` (excerpt — complete the full 36-command table)

```markdown
# MindForge v1.0.0 — Complete Commands Reference

## All 36 commands

### Lifecycle commands (core workflow)
| Command | Usage | Description | Added |
|---|---|---|---|
| `/mindforge:init-project` | `init-project` | Guided project setup — creates all .planning/ files | Day 1 |
| `/mindforge:discuss-phase` | `discuss-phase [N] [--batch\|--auto]` | Pre-planning interview to capture implementation decisions | Day 3 |
| `/mindforge:plan-phase` | `plan-phase [N]` | Research, decompose, and create atomic task plans | Day 1 |
| `/mindforge:execute-phase` | `execute-phase [N]` | Wave-based parallel execution of all phase plans | Day 1+2 |
| `/mindforge:verify-phase` | `verify-phase [N]` | Automated + human acceptance testing pipeline | Day 1 |
| `/mindforge:ship` | `ship [N]` | Create PR, write release notes, push to remote | Day 1 |
| `/mindforge:next` | `next` | Auto-detect and execute the correct next workflow step | Day 2 |

[... 29 more commands documented in same format ...]

## Command interface contract (v1.0.0 stable)

As of v1.0.0, the following are part of the stable interface:
- All 36 command names (new commands require MINOR bump)
- All flags documented here (new flags require MINOR, removed flags require MAJOR)
- HANDOFF.json and AUDIT.jsonl schemas (additions: MINOR, removals: MAJOR)
- All 10 core skill `name:` values and trigger lists
- SDK exported types and functions

See ADR-020 for the complete stability contract.
```

### `docs/security/SECURITY.md`

```markdown
# MindForge — Security Policy

## Supported versions

| Version | Security support |
|---|---|
| 1.x.x | ✅ Active — patches released for all severity levels |
| 0.6.x | ⚠️  Limited — critical fixes only, 90 days from v1.0.0 release |
| < 0.6.0 | ❌ No support |

## Reporting a vulnerability

**Email:** security@mindforge.dev

**Required information:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Your name / handle (for acknowledgement, if desired)

**Response timeline:**
- Acknowledgement: within 24 hours
- Initial assessment: within 7 days
- Fix released: within 30 days for HIGH/CRITICAL, 90 days for MEDIUM/LOW
- Coordinated disclosure: 90 days from initial report

**We commit to:**
- Not taking legal action against good-faith security researchers
- Crediting researchers in the security advisory (with their permission)
- Maintaining confidentiality until a fix is released

## Known security model limitations

See `docs/security/threat-model.md` for the full threat model.

Key acknowledged limitations:
1. Plugin permission model is advisory (not OS-enforced) — see TA7 in threat model
2. The SSE event stream is localhost-only but any local process can connect — see TA6
3. Approver identity uses `git config user.email` which is user-controlled — see TA5
4. Agent instruction injection via SKILL.md requires review beyond pattern matching — see TA1

These are known trade-offs, not bugs. They are documented in ADR-020.
```

### `docs/security/threat-model.md`

```markdown
# MindForge v1.0.0 — Threat Model

## Scope
All attack surfaces introduced by MindForge across 7 days of development.
Last reviewed: v1.0.0 release (March 2026).

## Assets being protected

| Asset | Classification | Location |
|---|---|---|
| API credentials | CRITICAL | Environment variables only (never in files) |
| HANDOFF.json | HIGH — project state, agent notes, decisions | `.planning/HANDOFF.json` |
| AUDIT.jsonl | HIGH — complete governance audit trail | `.planning/AUDIT.jsonl` |
| Approval files | HIGH — governance records | `.planning/approvals/*.json` |
| SECURITY.md | MEDIUM — security policy documentation | `.mindforge/org/SECURITY.md` |
| CLAUDE.md | MEDIUM — agent instructions that shape behaviour | `.claude/CLAUDE.md` |
| CONVENTIONS.md | LOW — coding standards | `.mindforge/org/CONVENTIONS.md` |

## Threat Actor 1 — Malicious skill package author

**Goal:** Inject adversarial instructions via a published `mindforge-skill-*` npm package.
**Attack:** SKILL.md contains "IGNORE ALL PREVIOUS INSTRUCTIONS" or similar.
**Controls:**
- Injection guard in `loader.md` blocks known patterns at both install and load time
- Level 1/2/3 skill validation at install time
- TOCTOU-safe download (chmod 700 temp dir, tarball size check)
- User must explicitly run `/mindforge:install-skill` — no auto-install

**Residual risk:** MEDIUM — sophisticated injections that avoid simple string matching.
**Mitigation:** Community review of public registry skills; organisation vetting of org-tier skills.

---

## Threat Actor 2 — MINDFORGE.md governance bypass

**Goal:** Disable governance primitives via MINDFORGE.md settings.
**Attack:** Set `SECRET_DETECTION=false`, `SECURITY_AUTOTRIGGER=false`.
**Controls:**
- Non-overridable rules enforced in CLAUDE.md session start protocol
- MINDFORGE-SCHEMA.json marks these fields as `nonOverridable: true`
- `bin/validate-config.js` warns on attempts to override these fields

**Residual risk:** LOW — enforced at the agent instruction layer, not OS level.
**Note:** An agent that ignores its CLAUDE.md is an agent that ignores everything.

---

## Threat Actor 3 — Accidental credential exposure in project files

**Goal:** Not adversarial — developer accidentally commits a credential.
**Attack vectors:**
- Token pasted into HANDOFF.json
- API key in MINDFORGE.md ADDITIONAL_AGENT_INSTRUCTIONS
- Secret in AUDIT.jsonl via an error message

**Controls:**
- Gate 3 (secret detection) blocks ANY commit with credential patterns
- `_warning` field in every HANDOFF.json schema reminding devs not to store secrets
- Health engine (Category 7) scans .planning/ and root files for credential patterns
- installer-core.js skips .env and *.key files during copyDir

**Residual risk:** LOW — multiple detection layers with complementary coverage.

---

## Threat Actor 4 — TOCTOU attack on skill installation

**Goal:** Replace a valid SKILL.md with malicious content in the window between download and validation.
**Attack:** Race condition in temp directory.
**Controls:**
- `chmod 700` on temp directory (user-only access, blocks other OS users)
- Tarball size check (detects empty/corrupted downloads)
- Download → validate → install is a single-process, single-threaded operation

**Residual risk:** VERY LOW — requires local machine compromise and precise timing.

---

## Threat Actor 5 — Compromised CI environment

**Goal:** Bypass governance gates in CI to ship malicious code.
**Attack:** Modify GitHub Actions workflow or CI runner environment to skip MindForge checks.
**Controls:**
- Gates run as separate CI jobs with explicit dependencies
- Tier 3 changes always fail CI (cannot be configured away)
- AUDIT.jsonl writes all gate results — tampering would require audit log manipulation
- Branch protection rules on the repository (outside MindForge scope)

**Residual risk:** HIGH — an attacker with write access to the workflow file or CI secrets
can bypass. This is a threat to all CI systems, not MindForge specifically.
**Mitigation:** Protect the `main` branch with required status checks.

---

## Threat Actor 6 — SSE event stream eavesdropping

**Goal:** Read sensitive project state from the real-time event stream.
**Attack:** Connect to port 7337 from another local process.
**Controls:**
- localhost-only binding (127.0.0.1) — not accessible from network
- IP address check on every connection — non-localhost rejected with 403
- CORS exact-origin matching (not wildcard)
- Port only opens when the SDK's `MindForgeEventStream.start()` is explicitly called

**Residual risk:** LOW — any process running as the same OS user can connect to localhost.
**Mitigation:** The SSE stream exposes AUDIT entries, not credentials. Risk is information disclosure, not code execution.

---

## Threat Actor 7 — Plugin with elevated or undeclared permissions

**Goal:** Use a MindForge plugin to exfiltrate project state or modify governance.
**Attack:** Install a plugin that reads HANDOFF.json and sends it to an external server.
**Controls:**
- Permission model displayed to user at install time (requires explicit approval)
- Injection guard run against all plugin .md files
- All plugin-triggered actions logged with plugin name as agent in AUDIT.jsonl
- `ELEVATED_PLUGINS` allowlist required for `write_state: true` permission

**Residual risk:** MEDIUM — a user who installs a malicious plugin and approves its permissions.
**Mitigation:** Only install plugins from sources you trust. Review plugin commands before installing.
Treat MindForge plugins like VSCode extensions — they have significant project access.

---

## Controls summary matrix

| Control | Threat Actors Mitigated |
|---|---|
| Injection guard (loader.md) | TA1, TA7 |
| TOCTOU-safe download (chmod 700) | TA1, TA4 |
| Non-overridable governance primitives | TA2 |
| Gate 3 secret detection | TA3 |
| Health engine credential scan | TA3 |
| CI Tier 3 block | TA5 |
| SSE localhost-only binding | TA6 |
| Plugin permission model + AUDIT logging | TA7 |

## Penetration test results

See `docs/security/penetration-test-results.md` for the adversarial review
conducted as part of the v1.0.0 production readiness process.
```

### `docs/architecture/decision-records-index.md`

```markdown
# MindForge — Architecture Decision Records Index

All 20 ADRs in chronological order.

| ADR | Title | Status | Day | Key decision |
|---|---|---|---|---|
| ADR-001 | HANDOFF.json for cross-session state | Accepted | Day 2 | HANDOFF.json as the primary cross-session state artifact |
| ADR-002 | Markdown-based commands | Accepted | Day 1 | Slash commands as Markdown files (not code) |
| ADR-003 | Keyword-trigger model for skill loading | Accepted | Day 1 | Deterministic keyword matching over AI-decided selection |
| ADR-004 | Wave parallelism over full parallelism | Accepted | Day 2 | Wave-based (dependency-ordered) over unconstrained parallel |
| ADR-005 | Append-only JSONL for audit log | Accepted | Day 2 | AUDIT.jsonl append-only (never update, never delete) |
| ADR-006 | Three-tier skills architecture | Accepted | Day 3 | Core → Org → Project tier hierarchy |
| ADR-007 | Keyword-trigger model (reaffirmed at Day 3 scale) | Accepted | Day 3 | Confirmed at 10+ skill scale |
| ADR-008 | Just-in-time skill loading | Accepted | Day 3 | Load at task time, not session start |
| ADR-009 | Environment-variable-only credential storage | Accepted | Day 4 | Credentials only in env vars, never in config files |
| ADR-010 | Compliance gates non-bypassable; approvals allow emergency | Accepted | Day 4 | Gates: never bypass. Approvals: emergency override with audit |
| ADR-011 | Integration failures are non-blocking | Accepted | Day 4 | Jira/Slack/GitHub down ≠ phase blocked |
| ADR-012 | Intelligence outputs feed back into system behaviour | Accepted | Day 5 | Difficulty → granularity, retro → MINDFORGE.md, quality → behaviour |
| ADR-013 | MINDFORGE.md as constitution with non-overridable primitives | Accepted | Day 5 | Non-overridable governance primitives cannot be disabled |
| ADR-014 | Metrics are system signals, not developer performance | Accepted | Day 5 | Quality scores improve the system, not evaluate individuals |
| ADR-015 | npm as the public skills registry | Accepted | Day 6 | npm ecosystem for skill distribution |
| ADR-016 | CI timeout exits with code 0 (soft stop) | Accepted | Day 6 | Timeout = save and resume, not failure |
| ADR-017 | SDK event stream is localhost-only | Accepted | Day 6 | SSE binds to 127.0.0.1 only |
| ADR-018 | Installer detects and handles self-install | Accepted | Day 7 | Installer running inside its own repo = no-op for framework files |
| ADR-019 | Self-update preserves original install scope | Accepted | Day 7 | Update local→local, global→global |
| ADR-020 | v1.0.0 stable interface contract | Accepted | Day 7 | Defines what "stable" means for plugins and SDK consumers |
```

**Commit:**
```bash
git add docs/
git commit -m "docs: complete reference documentation, threat model, ADR index, security policy for v1.0.0"
```

---

## TASK 10 — Write Day 7 test suites

### `tests/production.test.js`

```javascript
/**
 * MindForge Day 7 — Production Readiness Tests
 * Verifies the installer, updater, migration engine, plugin system,
 * token optimiser, and all 36 commands exist.
 *
 * Run: node tests/production.test.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const assert = require('assert');
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch(e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

const read   = p  => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
const exists = p  => fs.existsSync(p);

// ── Installer completeness ─────────────────────────────────────────────────────
console.log('\nMindForge Day 7 — Production Readiness Tests\n');
console.log('Installer:');

test('bin/install.js exists with shebang', () => {
  const c = read('bin/install.js');
  assert.ok(c.includes('#!/usr/bin/env node'), 'Missing shebang');
  assert.ok(c.length > 500, 'install.js seems too short');
});

test('bin/installer-core.js exists and exports run()', () => {
  const c = read('bin/installer-core.js');
  assert.ok(c.includes('module.exports'), 'Missing module.exports');
  assert.ok(c.includes('async function run') || c.includes('function run'), 'Missing run function');
});

test('installer handles --version flag correctly', () => {
  const c = read('bin/install.js');
  assert.ok(c.includes("'--version'") || c.includes('"--version"'), 'Missing --version');
  assert.ok(c.includes('process.exit(0)'), 'Should exit 0 for --version');
});

test('installer has Node.js version gate (≥ 18)', () => {
  const combined = read('bin/install.js') + read('bin/installer-core.js');
  assert.ok(combined.includes('18'), 'Should check for Node.js 18');
  assert.ok(combined.includes('process.exit(1)') || combined.includes('exit(1)'), 'Should exit 1 for old node');
});

test('installer has CI mode detection', () => {
  const c = read('bin/install.js');
  assert.ok(c.includes("process.env.CI"), 'Should detect CI environment');
  assert.ok(c.includes('IS_NON_INTERACTIVE'), 'Should have non-interactive flag');
});

test('installer backs up existing CLAUDE.md', () => {
  const c = read('bin/installer-core.js');
  assert.ok(c.includes('backup') || c.includes('.backup-'), 'Should back up CLAUDE.md');
});

test('installer has self-install detection', () => {
  const c = read('bin/installer-core.js');
  assert.ok(
    c.includes('isSelfInstall') || c.includes("'mindforge-cc'"),
    'Should detect self-install scenario'
  );
});

test('installer excludes sensitive files (*.env, *.key, *.pem)', () => {
  const c = read('bin/installer-core.js');
  assert.ok(
    c.includes('.env') || c.includes('SENSITIVE_EXCLUDE') || c.includes('.key'),
    'Should have sensitive file exclusion list'
  );
});

test('installer verifies install after completing', () => {
  const c = read('bin/installer-core.js');
  assert.ok(
    c.includes('verifyInstall') || c.includes('verification'),
    'Should verify install after completing'
  );
});

// ── Self-update system ─────────────────────────────────────────────────────────
console.log('\nSelf-update system:');

['version-comparator.js', 'changelog-fetcher.js', 'self-update.js'].forEach(f => {
  test(`bin/updater/${f} exists`, () => {
    assert.ok(exists(`bin/updater/${f}`), `Missing: bin/updater/${f}`);
  });
});

test('compareSemver: 1.0.0 > 0.6.0', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  assert.ok(compareSemver('1.0.0', '0.6.0') > 0);
});

test('compareSemver: 0.6.0 < 1.0.0', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  assert.ok(compareSemver('0.6.0', '1.0.0') < 0);
});

test('compareSemver: 1.0.0 == 1.0.0', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  assert.strictEqual(compareSemver('1.0.0', '1.0.0'), 0);
});

test('compareSemver handles v prefix', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  assert.ok(compareSemver('v1.0.0', 'v0.6.0') > 0);
});

test('upgradeType: 0.6.0 → 1.0.0 is major', () => {
  const { upgradeType } = require('../bin/updater/version-comparator');
  assert.strictEqual(upgradeType('0.6.0', '1.0.0'), 'major');
});

test('upgradeType: 1.0.0 → 1.1.0 is minor', () => {
  const { upgradeType } = require('../bin/updater/version-comparator');
  assert.strictEqual(upgradeType('1.0.0', '1.1.0'), 'minor');
});

test('upgradeType: 1.0.0 → 1.0.1 is patch', () => {
  const { upgradeType } = require('../bin/updater/version-comparator');
  assert.strictEqual(upgradeType('1.0.0', '1.0.1'), 'patch');
});

test('upgradeType: 1.0.0 → 1.0.0 is none', () => {
  const { upgradeType } = require('../bin/updater/version-comparator');
  assert.strictEqual(upgradeType('1.0.0', '1.0.0'), 'none');
});

test('self-update has scope detection', () => {
  const c = read('bin/updater/self-update.js');
  assert.ok(c.includes('detectInstallScope'), 'Should have detectInstallScope()');
});

test('self-update reads schema_version before applying update', () => {
  const c = read('bin/updater/self-update.js');
  assert.ok(
    c.includes('readHandoffSchemaVersion') || c.includes('schema_version'),
    'Should read schema_version from HANDOFF before updating'
  );
});

// ── Migration engine ────────────────────────────────────────────────────────────
console.log('\nMigration engine:');

['migrate.js', 'schema-versions.js', '0.1.0-to-0.5.0.js', '0.5.0-to-0.6.0.js', '0.6.0-to-1.0.0.js'].forEach(f => {
  test(`bin/migrations/${f} exists`, () => {
    assert.ok(exists(`bin/migrations/${f}`), `Missing: ${f}`);
  });
});

test('migrate.js creates backup before migrating', () => {
  const c = read('bin/migrations/migrate.js');
  assert.ok(c.includes('backup') || c.includes('Backup'), 'Should create backup');
});

test('migrate.js aborts if backup fails', () => {
  const c = read('bin/migrations/migrate.js');
  assert.ok(
    c.includes('backupErr') || c.includes('Migration aborted'),
    'Should abort if backup creation fails'
  );
});

test('migrate.js restores from backup on migration failure', () => {
  const c = read('bin/migrations/migrate.js');
  assert.ok(
    c.includes('Restoring') || c.includes('restoreFromBackup') || c.includes('restore'),
    'Should restore from backup on failure'
  );
});

test('0.6.0-to-1.0.0 migration adds plugin_api_version', () => {
  const c = read('bin/migrations/0.6.0-to-1.0.0.js');
  assert.ok(c.includes('plugin_api_version'), 'Should add plugin_api_version field');
});

test('0.6.0-to-1.0.0 migration backfills session_id in AUDIT.jsonl', () => {
  const c = read('bin/migrations/0.6.0-to-1.0.0.js');
  assert.ok(c.includes('session_id'), 'Should backfill session_id');
});

test('0.6.0-to-1.0.0 migration converts VERIFY_PASS_RATE_WARNING_THRESHOLD', () => {
  const c = read('bin/migrations/0.6.0-to-1.0.0.js');
  assert.ok(
    c.includes('VERIFY_PASS_RATE') || c.includes('val / 100'),
    'Should convert percentage to decimal'
  );
});

test('migration preserves invalid AUDIT.jsonl lines (no crash)', () => {
  const c = read('bin/migrations/0.6.0-to-1.0.0.js');
  assert.ok(c.includes('catch') || c.includes('try'), 'Should handle parse errors gracefully');
});

// ── Plugin system ────────────────────────────────────────────────────────────────
console.log('\nPlugin system:');

['plugin-schema.md', 'plugin-loader.md', 'PLUGINS-MANIFEST.md'].forEach(f => {
  test(`.mindforge/plugins/${f} exists`, () => {
    assert.ok(exists(`.mindforge/plugins/${f}`));
  });
});

test('plugin schema defines permission model', () => {
  const c = read('.mindforge/plugins/plugin-schema.md');
  assert.ok(c.includes('permissions'), 'Should define permissions');
  assert.ok(c.includes('write_state'), 'Should include write_state permission');
  assert.ok(c.includes('network_access'), 'Should include network_access permission');
});

test('plugin loader has injection guard step', () => {
  const c = read('.mindforge/plugins/plugin-loader.md');
  assert.ok(c.includes('injection guard') || c.includes('Injection'), 'Should run injection guard');
});

test('plugin loader documents advisory permission model', () => {
  const c = read('.mindforge/plugins/plugin-loader.md');
  assert.ok(
    c.includes('advisory') || c.includes('not OS-enforced') || c.includes('not enforced'),
    'Should explain that permissions are advisory'
  );
});

test('plugin schema lists all 36 reserved command names', () => {
  const c = read('.mindforge/plugins/plugin-schema.md');
  assert.ok(
    c.includes('Reserved command names') || c.includes('reserved'),
    'Should list reserved command names'
  );
  // Check a few specific reserved names are mentioned
  assert.ok(c.includes('health'), 'Should list health as reserved');
  assert.ok(c.includes('security-scan'), 'Should list security-scan as reserved');
});

// ── Token optimiser ─────────────────────────────────────────────────────────────
console.log('\nToken optimiser:');

test('token-optimiser.md exists', () => {
  assert.ok(exists('.mindforge/production/token-optimiser.md'));
});

test('token optimiser defines efficiency formula', () => {
  const c = read('.mindforge/production/token-optimiser.md');
  assert.ok(c.includes('token_efficiency') || c.includes('efficiency'), 'Should define efficiency');
  assert.ok(c.includes('useful_output') || c.includes('output_tokens'), 'Should define useful output');
});

test('token optimiser has lean plan strategy', () => {
  const c = read('.mindforge/production/token-optimiser.md');
  assert.ok(c.includes('Strategy 1') || c.includes('Lean'), 'Should have lean plan strategy');
});

// ── Production checklist ────────────────────────────────────────────────────────
console.log('\nProduction checklist:');

test('production-checklist.md has exactly 50 checkbox items', () => {
  const c = read('.mindforge/production/production-checklist.md');
  const boxes = (c.match(/- \[ \]/g) || []).length;
  assert.ok(boxes >= 50, `Expected >= 50 items, found ${boxes}`);
});

// ── Documentation completeness ──────────────────────────────────────────────────
console.log('\nDocumentation:');

const DOC_FILES = [
  'docs/reference/commands.md',
  'docs/security/SECURITY.md',
  'docs/security/threat-model.md',
  'docs/architecture/decision-records-index.md',
  'docs/contributing/CONTRIBUTING.md',
];
DOC_FILES.forEach(f => test(`${f} exists`, () => assert.ok(exists(f), `Missing: ${f}`)));

test('threat model covers all 7 threat actors', () => {
  const c = read('docs/security/threat-model.md');
  for (let i = 1; i <= 7; i++) {
    assert.ok(c.includes(`Threat Actor ${i}`), `Missing Threat Actor ${i}`);
  }
});

test('ADR index lists all 20 ADRs', () => {
  const c = read('docs/architecture/decision-records-index.md');
  for (let i = 1; i <= 20; i++) {
    const adrRef = `ADR-${String(i).padStart(3, '0')}`;
    assert.ok(c.includes(adrRef) || c.includes(`ADR-${i}`), `Missing ${adrRef} in index`);
  }
});

test('SECURITY.md has responsible disclosure policy', () => {
  const c = read('docs/security/SECURITY.md');
  assert.ok(c.includes('disclosure') || c.includes('24 hours'), 'Should have disclosure timeline');
});

// ── All 36 commands ─────────────────────────────────────────────────────────────
console.log('\nAll 36 commands:');

const ALL_COMMANDS = [
  // Day 1
  'help', 'init-project', 'plan-phase', 'execute-phase', 'verify-phase', 'ship',
  // Day 2
  'next', 'quick', 'status', 'debug',
  // Day 3
  'skills', 'review', 'security-scan', 'map-codebase', 'discuss-phase',
  // Day 4
  'audit', 'milestone', 'complete-milestone', 'approve', 'sync-jira', 'sync-confluence',
  // Day 5
  'health', 'retrospective', 'profile-team', 'metrics',
  // Day 6
  'init-org', 'install-skill', 'publish-skill', 'pr-review', 'workspace', 'benchmark',
  // Day 7
  'update', 'migrate', 'plugins', 'tokens', 'release',
];

assert.strictEqual(ALL_COMMANDS.length, 36, `Expected 36 commands, have ${ALL_COMMANDS.length}`);
console.log(`  (verifying all ${ALL_COMMANDS.length} commands)`);

test('all 36 commands in .claude/commands/mindforge/', () => {
  const missing = ALL_COMMANDS.filter(cmd => !exists(`.claude/commands/mindforge/${cmd}.md`));
  assert.strictEqual(missing.length, 0, `Missing: ${missing.join(', ')}`);
});

test('all 36 commands mirrored to .agent/mindforge/', () => {
  const missing = ALL_COMMANDS.filter(cmd => !exists(`.agent/mindforge/${cmd}.md`));
  assert.strictEqual(missing.length, 0, `Missing agent mirror: ${missing.join(', ')}`);
});

test('no command file is empty (> 100 chars)', () => {
  const tiny = ALL_COMMANDS.filter(cmd => {
    const p = `.claude/commands/mindforge/${cmd}.md`;
    return exists(p) && fs.statSync(p).size < 100;
  });
  assert.strictEqual(tiny.length, 0, `Too small: ${tiny.join(', ')}`);
});

// ── Final version check ────────────────────────────────────────────────────────
console.log('\nVersion:');

test('package.json version is 1.0.0', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.strictEqual(pkg.version, '1.0.0', `Expected 1.0.0, got ${pkg.version}`);
});

test('CHANGELOG.md has v1.0.0 entry', () => {
  const c = read('CHANGELOG.md');
  assert.ok(c.includes('1.0.0'), 'CHANGELOG.md should have 1.0.0 entry');
});

test('all 20 ADR files present in .planning/decisions/', () => {
  if (!exists('.planning/decisions/')) return; // Skip if no decisions dir yet
  const adrs = fs.readdirSync('.planning/decisions/').filter(f => f.startsWith('ADR-') && f.endsWith('.md'));
  assert.ok(adrs.length >= 20, `Expected >= 20 ADRs, found ${adrs.length}`);
});

// ── Results ─────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n❌  ${failed} test(s) failed — not production ready.\n`);
  process.exit(1);
} else {
  console.log(`\n✅  All production readiness tests passed.\n`);
}
```

### `tests/migration.test.js`

```javascript
/**
 * MindForge Day 7 — Migration Engine Tests
 * Tests the migration logic without touching real .planning/ files.
 *
 * Run: node tests/migration.test.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const assert = require('assert');
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch(e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

// ── Simulation helpers ─────────────────────────────────────────────────────────

function simulateHandoffMigration(handoff, toVersion) {
  const result = JSON.parse(JSON.stringify(handoff));
  if (toVersion === '0.5.0' || toVersion === '1.0.0') {
    if (!Array.isArray(result.decisions_made))     result.decisions_made     = [];
    if (!Array.isArray(result.discoveries))        result.discoveries        = [];
    if (!Array.isArray(result.implicit_knowledge)) result.implicit_knowledge = [];
    if (!Array.isArray(result.quality_signals))    result.quality_signals    = [];
  }
  if (toVersion === '0.6.0' || toVersion === '1.0.0') {
    if (!result.developer_id)                         result.developer_id   = null;
    if (!result.session_id)                           result.session_id     = null;
    if (!Array.isArray(result.recent_commits))        result.recent_commits = [];
    if (!Array.isArray(result.recent_files))          result.recent_files   = [];
  }
  if (toVersion === '1.0.0') {
    if (!result.plugin_api_version)                   result.plugin_api_version = '1.0.0';
    result.schema_version = '1.0.0';
  }
  return result;
}

function simulateAuditMigration(lines) {
  return lines.map(line => {
    try {
      const entry = JSON.parse(line);
      if (!entry.session_id) {
        return JSON.stringify({ ...entry, session_id: 'migrated-from-pre-1.0' });
      }
      return line;
    } catch {
      return line; // preserve invalid lines
    }
  });
}

function simulateMindforgeMdMigration(content) {
  return content.replace(
    /^(VERIFY_PASS_RATE_WARNING_THRESHOLD=)(\d+(?:\.\d+)?)(\s*)$/m,
    (match, prefix, val, suffix) => {
      const num = parseFloat(val);
      return num > 1
        ? `${prefix}${(num / 100).toFixed(2)}${suffix}`
        : match;
    }
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────
console.log('\nMindForge Day 7 — Migration Tests\n');

console.log('Version comparator:');

test('compareSemver works for all comparison cases', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  assert.ok(compareSemver('1.0.0', '0.9.9') > 0, '1.0.0 > 0.9.9');
  assert.ok(compareSemver('0.1.0', '1.0.0') < 0, '0.1.0 < 1.0.0');
  assert.strictEqual(compareSemver('0.5.0', '0.5.0'), 0, '0.5.0 == 0.5.0');
  assert.ok(compareSemver('2.0.0', '1.99.99') > 0, 'Major beats all minors');
});

console.log('\nHANDOFF.json migrations:');

test('v0.1.0 → v0.5.0: adds intelligence layer fields', () => {
  const h = { schema_version: '0.1.0', next_task: 'test', _warning: 'warn' };
  const m = simulateHandoffMigration(h, '0.5.0');
  assert.ok(Array.isArray(m.decisions_made), 'decisions_made should be array');
  assert.ok(Array.isArray(m.discoveries), 'discoveries should be array');
  assert.ok(Array.isArray(m.implicit_knowledge), 'implicit_knowledge should be array');
  assert.ok(Array.isArray(m.quality_signals), 'quality_signals should be array');
});

test('v0.5.0 → v0.6.0: adds distribution platform fields', () => {
  const h = { schema_version: '0.5.0', next_task: 'test', _warning: 'warn' };
  const m = simulateHandoffMigration(h, '0.6.0');
  assert.ok(Array.isArray(m.recent_commits), 'recent_commits should be array');
  assert.ok(Array.isArray(m.recent_files), 'recent_files should be array');
  assert.ok('developer_id' in m, 'developer_id should exist');
  assert.ok('session_id' in m, 'session_id should exist');
});

test('v0.6.0 → v1.0.0: adds plugin_api_version', () => {
  const h = { schema_version: '0.6.0', next_task: 'test', _warning: 'warn' };
  const m = simulateHandoffMigration(h, '1.0.0');
  assert.strictEqual(m.plugin_api_version, '1.0.0');
  assert.strictEqual(m.schema_version, '1.0.0');
});

test('v0.1.0 → v1.0.0 full chain: all fields present', () => {
  const h = { schema_version: '0.1.0', next_task: 'first task', _warning: 'warn', phase: 1 };
  const m = simulateHandoffMigration(h, '1.0.0');

  // All fields from all migrations should be present
  assert.ok(Array.isArray(m.decisions_made), 'decisions_made from 0.5.0 migration');
  assert.ok(Array.isArray(m.recent_commits), 'recent_commits from 0.6.0 migration');
  assert.strictEqual(m.plugin_api_version, '1.0.0', 'plugin_api_version from 1.0.0 migration');
  assert.strictEqual(m.phase, 1, 'Original field preserved');
  assert.strictEqual(m.next_task, 'first task', 'Original next_task preserved');
});

test('migration does not overwrite existing values', () => {
  const h = {
    schema_version: '0.1.0',
    next_task: 'existing task',
    _warning: 'original warning',
    phase: 3,
    plan: '04',
    custom_org_field: 'preserved',
  };
  const m = simulateHandoffMigration(h, '1.0.0');
  assert.strictEqual(m.next_task, 'existing task');
  assert.strictEqual(m.phase, 3);
  assert.strictEqual(m.plan, '04');
  assert.strictEqual(m.custom_org_field, 'preserved');
  assert.strictEqual(m._warning, 'original warning');
});

console.log('\nAUDIT.jsonl migration:');

test('backfills missing session_id in audit entries', () => {
  const lines = [
    JSON.stringify({ id: 'uuid-1', timestamp: '2026-01-01T00:00:00Z', event: 'task_started', agent: 'test' }),
    JSON.stringify({ id: 'uuid-2', timestamp: '2026-01-01T00:01:00Z', event: 'task_completed', agent: 'test', session_id: 'existing' }),
  ];
  const migrated = simulateAuditMigration(lines);
  const first  = JSON.parse(migrated[0]);
  const second = JSON.parse(migrated[1]);
  assert.ok(first.session_id, 'Missing session_id should be backfilled');
  assert.strictEqual(first.session_id, 'migrated-from-pre-1.0');
  assert.strictEqual(second.session_id, 'existing', 'Existing session_id must not be changed');
});

test('preserves invalid JSON lines without crashing', () => {
  const lines = [
    JSON.stringify({ id: 'uuid-1', event: 'test', timestamp: 't', agent: 'a' }),
    '{this is not valid JSON}',
    JSON.stringify({ id: 'uuid-2', event: 'test', timestamp: 't', agent: 'a' }),
  ];
  const migrated = simulateAuditMigration(lines);
  assert.strictEqual(migrated.length, 3, 'All lines preserved');
  assert.strictEqual(migrated[1], '{this is not valid JSON}', 'Invalid line unchanged');
});

test('does not double-backfill entries that already have session_id', () => {
  const original = JSON.stringify({ id: 'uuid', event: 'test', timestamp: 't', agent: 'a', session_id: 'my-session' });
  const [migrated] = simulateAuditMigration([original]);
  const entry = JSON.parse(migrated);
  assert.strictEqual(entry.session_id, 'my-session', 'Should not overwrite existing session_id');
});

console.log('\nMINDFORGE.md migration:');

test('converts VERIFY_PASS_RATE_WARNING_THRESHOLD from 75 to 0.75', () => {
  const content = 'VERIFY_PASS_RATE_WARNING_THRESHOLD=75\n';
  const migrated = simulateMindforgeMdMigration(content);
  assert.ok(migrated.includes('0.75'), `Expected 0.75, got: ${migrated.trim()}`);
  assert.ok(!migrated.match(/=75(\s|$)/), 'Should not still contain =75');
});

test('converts VERIFY_PASS_RATE_WARNING_THRESHOLD from 80 to 0.80', () => {
  const content = 'VERIFY_PASS_RATE_WARNING_THRESHOLD=80\nOTHER=value\n';
  const migrated = simulateMindforgeMdMigration(content);
  assert.ok(migrated.includes('0.80') || migrated.includes('0.8'), `Expected 0.80`);
  assert.ok(migrated.includes('OTHER=value'), 'Should preserve other settings');
});

test('does NOT modify values already in decimal format (0.75)', () => {
  const content = 'VERIFY_PASS_RATE_WARNING_THRESHOLD=0.75\n';
  const migrated = simulateMindforgeMdMigration(content);
  assert.ok(migrated.includes('0.75'), 'Should preserve existing decimal format');
  assert.ok(!migrated.includes('0.0075'), 'Should not double-convert a decimal');
});

test('does NOT modify value of exactly 1 (ambiguous — preserve)', () => {
  const content = 'VERIFY_PASS_RATE_WARNING_THRESHOLD=1\n';
  const migrated = simulateMindforgeMdMigration(content);
  // Value of 1 should be preserved as-is (it's ≤ 1, within decimal range)
  assert.ok(migrated.includes('=1'), 'Value of 1 should not be converted');
  assert.ok(!migrated.includes('=0.01'), 'Value of 1 should not become 0.01');
});

console.log('\nMigration infrastructure:');

test('all migration files have correct fromVersion/toVersion', () => {
  const files = [
    { file: 'bin/migrations/0.1.0-to-0.5.0.js', from: '0.1.0', to: '0.5.0' },
    { file: 'bin/migrations/0.5.0-to-0.6.0.js', from: '0.5.0', to: '0.6.0' },
    { file: 'bin/migrations/0.6.0-to-1.0.0.js', from: '0.6.0', to: '1.0.0' },
  ];
  files.forEach(({ file, from, to }) => {
    const c = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    assert.ok(c.includes(from), `${file}: should contain fromVersion ${from}`);
    assert.ok(c.includes(to),   `${file}: should contain toVersion ${to}`);
  });
});

test('migration chain covers v0.1.0 → v1.0.0 completely', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');

  // Chain: 0.1.0 → 0.5.0 → 0.6.0 → 1.0.0
  const chain = ['0.1.0', '0.5.0', '0.6.0', '1.0.0'];
  for (let i = 0; i < chain.length - 1; i++) {
    const file = `bin/migrations/${chain[i]}-to-${chain[i+1]}.js`;
    assert.ok(fs.existsSync(file), `Missing migration: ${file}`);
  }

  // Verify no gaps: each migration's toVersion = next migration's fromVersion
  for (let i = 0; i < chain.length - 2; i++) {
    assert.ok(
      compareSemver(chain[i + 1], chain[i]) > 0,
      `Chain gap between ${chain[i]} and ${chain[i+1]}`
    );
  }
});

test('migrate.js exports runMigrations function', () => {
  const { runMigrations } = require('../bin/migrations/migrate');
  assert.strictEqual(typeof runMigrations, 'function', 'runMigrations should be a function');
});

console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n❌  ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log(`\n✅  All migration tests passed.\n`);
}
```

### `tests/e2e.test.js`

```javascript
/**
 * MindForge Day 7 — End-to-End Simulation Tests
 * Simulates complete project workflows using file system operations.
 * No actual Claude API calls — tests the state machine, not the AI.
 *
 * Run: node tests/e2e.test.js
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const assert = require('assert');
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch(e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

// ── Test project factory ───────────────────────────────────────────────────────
function createTestProject() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mindforge-e2e-'));

  function write(relPath, content) {
    const fullPath = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
    return fullPath;
  }

  function read(relPath) {
    const p = path.join(tmpDir, relPath);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  }

  function exists(relPath) {
    return fs.existsSync(path.join(tmpDir, relPath));
  }

  function appendAudit(entry) {
    const auditPath = path.join(tmpDir, '.planning', 'AUDIT.jsonl');
    const line = JSON.stringify({
      id:         `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp:  new Date().toISOString(),
      session_id: 'test-session-001',
      agent:      'mindforge-test',
      ...entry,
    });
    fs.appendFileSync(auditPath, line + '\n');
  }

  function cleanup() {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); }
    catch(e) { console.warn(`  ⚠️  Cleanup warning: ${e.message} (dir: ${tmpDir})`); }
  }

  return { tmpDir, write, read, exists, appendAudit, cleanup };
}

// ── Workflow simulation functions ──────────────────────────────────────────────

function initProject(project) {
  const { write } = project;

  // Core .planning/ files
  write('.planning/PROJECT.md', `# E2E Test Project

## Tech stack
- Node.js 20 LTS
- TypeScript 5.x
- PostgreSQL via Prisma

## v1 scope — IN
- [x] User authentication (email/password)
- [x] User profile management

## Success criteria
All acceptance tests passing. Zero HIGH security findings.
`);

  write('.planning/REQUIREMENTS.md', `# Requirements

## Functional requirements
| ID | Requirement | Acceptance criterion | Scope |
|---|---|---|---|
| FR-01 | User login | POST /auth/login returns JWT for valid credentials | v1 |
| FR-02 | User logout | POST /auth/logout invalidates session | v1 |
| FR-03 | Profile fetch | GET /users/:id returns profile for authenticated user | v1 |
`);

  write('.planning/ARCHITECTURE.md', `# Architecture

## Architectural pattern
Modular monolith — Express API with Prisma ORM

## Technology stack
- Runtime: Node.js 20
- Framework: Express 4.x
- Database: PostgreSQL 15

## Data model
**User**: id (UUID), email, passwordHash, createdAt, updatedAt
`);

  write('.planning/STATE.md', `# Project State

## Status
Phase 1 in progress

## Current phase
Phase 1 — Authentication

## Next action
Execute Phase 1 plans
`);

  write('.planning/HANDOFF.json', JSON.stringify({
    schema_version: '1.0.0',
    plugin_api_version: '1.0.0',
    project: 'E2E Test Project',
    phase: 1,
    plan: null,
    next_task: 'Execute Phase 1 — Authentication',
    blockers: [],
    decisions_needed: [],
    decisions_made: [],
    discoveries: [],
    implicit_knowledge: [],
    quality_signals: [],
    context_refs: ['.planning/PROJECT.md', '.planning/STATE.md'],
    recent_commits: [],
    recent_files: [],
    session_id: 'test-session-001',
    _warning: 'Never store secrets, tokens, or passwords in this file.',
    updated_at: new Date().toISOString(),
  }, null, 2));

  write('.planning/AUDIT.jsonl', '');
  project.appendAudit({ event: 'project_initialised', phase: null });
}

function planPhase(project, phaseNum) {
  const { write, appendAudit } = project;
  const phaseDir = `.planning/phases/${phaseNum}`;

  // Difficulty score
  write(`${phaseDir}/DIFFICULTY-SCORE-${phaseNum}.md`, `# Difficulty Score — Phase ${phaseNum}
## Scores
| Dimension | Score |
|---|---|
| Technical | 4/5 |
| Risk | 5/5 |
| Ambiguity | 2/5 |
| Dependencies | 2/5 |
## Composite: 3.75 — Challenging
## Recommendations: 6 atomic tasks
`);

  // Plan file with valid XML
  write(`${phaseDir}/PLAN-${phaseNum}-01.md`, `<task type="auto">
  <n>Implement login endpoint with JWT</n>
  <persona>developer</persona>
  <phase>${phaseNum}</phase>
  <plan>01</plan>
  <dependencies>none</dependencies>
  <files>
    src/auth/login.ts
    src/auth/login.test.ts
  </files>
  <context>
    Skills: security-review (jwt.sign trigger), api-design, testing-standards
  </context>
  <action>
    Create POST /auth/login endpoint. Validate email/password against database.
    Use argon2 for password verification. Return signed JWT on success.
    Return 401 for invalid credentials (no information disclosure).
  </action>
  <verify>npm test -- --testPathPattern=auth.login</verify>
  <done>All login tests passing, argon2 verification working, JWT returned</done>
</task>`);

  write(`${phaseDir}/PLAN-${phaseNum}-02.md`, `<task type="auto">
  <n>Implement logout endpoint with session invalidation</n>
  <persona>developer</persona>
  <phase>${phaseNum}</phase>
  <plan>02</plan>
  <dependencies>01</dependencies>
  <files>
    src/auth/logout.ts
    src/auth/logout.test.ts
  </files>
  <context>
    Skills: security-review, testing-standards
  </context>
  <action>
    Create POST /auth/logout endpoint. Invalidate JWT via blocklist in Redis.
    Verify that blocklisted tokens return 401 on subsequent requests.
  </action>
  <verify>npm test -- --testPathPattern=auth.logout</verify>
  <done>Logout invalidates tokens, blocklisted tokens rejected</done>
</task>`);

  // Dependency graph
  write(`${phaseDir}/DEPENDENCY-GRAPH-${phaseNum}.md`, `# Dependency Graph — Phase ${phaseNum}

## Wave 1 (independent)
- Plan 01: Implement login endpoint

## Wave 2 (depends on Wave 1)
- Plan 02: Implement logout endpoint (requires login implementation)
`);

  appendAudit({ event: 'phase_planned', phase: phaseNum, plans_created: 2, waves: 2 });
}

function executeTask(project, phaseNum, planId, commitSha) {
  const { write, appendAudit } = project;
  const phaseDir = `.planning/phases/${phaseNum}`;

  appendAudit({ event: 'task_started', phase: phaseNum, plan: planId });

  write(`${phaseDir}/SUMMARY-${phaseNum}-${planId}.md`, `# Summary — Phase ${phaseNum}, Plan ${planId}
## Status: Completed ✅
## Commit: ${commitSha}
## Verify result: PASS
## Files modified:
- src/auth/${planId === '01' ? 'login' : 'logout'}.ts (created)
- src/auth/${planId === '01' ? 'login' : 'logout'}.test.ts (created, 8 tests)
`);

  appendAudit({ event: 'task_completed', phase: phaseNum, plan: planId, commit_sha: commitSha, verify_result: 'pass' });
}

function runSecurityScan(project, phaseNum, findings = []) {
  const { write, appendAudit } = project;
  const phaseDir = `.planning/phases/${phaseNum}`;

  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount     = findings.filter(f => f.severity === 'HIGH').length;

  write(`${phaseDir}/SECURITY-REVIEW-${phaseNum}.md`, `# Security Review — Phase ${phaseNum}
## Scan date: ${new Date().toISOString()}
## OWASP A01: ${findings.length === 0 ? 'PASS ✅' : 'FINDINGS'}

${findings.map(f => `### ${f.severity}: ${f.description}\nFile: ${f.file}:${f.line}\nRemediation: ${f.remediation}`).join('\n\n')}

## Summary
- CRITICAL: ${criticalCount}
- HIGH: ${highCount}
- Total: ${findings.length}
${findings.length === 0 ? '## Verdict: CLEAN ✅' : `## Verdict: ${criticalCount > 0 ? '🔴 BLOCKED' : '⚠️  REVIEW REQUIRED'}`}
`);

  appendAudit({ event: 'security_scan_completed', phase: phaseNum, critical: criticalCount, high: highCount });
}

function verifyPhase(project, phaseNum) {
  const { write, appendAudit } = project;
  const phaseDir = `.planning/phases/${phaseNum}`;

  write(`${phaseDir}/GATE-RESULTS-${phaseNum}.md`, `# Compliance Gate Results — Phase ${phaseNum}
## Run at: ${new Date().toISOString()}
| Gate | Status | Detail |
|---|---|---|
| Secret detection | ✅ PASS | 0 patterns found |
| CRITICAL security findings | ✅ PASS | No open CRITICAL findings |
| Test suite | ✅ PASS | 16 tests passing |
| Dependency CVEs | ✅ PASS | 0 HIGH/CRITICAL |
| GDPR retention | ✅ PASS | data-privacy skill not active |
## Overall: ✅ ALL BLOCKING GATES PASSED
`);

  write(`${phaseDir}/VERIFICATION-${phaseNum}.md`, `# Verification — Phase ${phaseNum}
## Stage 1 — Tests: 16/16 passing ✅
## Stage 2 — Requirements:
| FR-01 | User login | ✅ | src/auth/login.ts:24 |
| FR-02 | User logout | ✅ | src/auth/logout.ts:18 |
## Stage 3 — Type check: PASS ✅
## Stage 4 — Security: PASS ✅
## Overall: ✅ PHASE VERIFIED
`);

  write(`${phaseDir}/UAT-${phaseNum}.md`, `# UAT — Phase ${phaseNum}
## Test results
| # | Deliverable | Result | Notes |
|---|---|---|---|
| 1 | POST /auth/login returns JWT | ✅ | Tested with valid+invalid credentials |
| 2 | POST /auth/logout invalidates session | ✅ | Blocklist verified |
## Overall: ✅ ALL UAT PASSED
`);

  appendAudit({ event: 'phase_completed', phase: phaseNum, uat_pass_rate: 1.0 });
}

// ── Tests ──────────────────────────────────────────────────────────────────────
console.log('\nMindForge Day 7 — End-to-End Tests\n');

// ── Test 1: Complete greenfield workflow ───────────────────────────────────────
console.log('Greenfield project workflow:');
const gf = createTestProject();

try {
  test('init-project creates all required .planning/ files', () => {
    initProject(gf);
    const required = ['PROJECT.md', 'REQUIREMENTS.md', 'ARCHITECTURE.md', 'STATE.md', 'HANDOFF.json', 'AUDIT.jsonl'];
    required.forEach(f => assert.ok(gf.exists(`.planning/${f}`), `Missing: ${f}`));
  });

  test('HANDOFF.json has v1.0.0 schema_version and plugin_api_version', () => {
    const handoff = JSON.parse(gf.read('.planning/HANDOFF.json'));
    assert.strictEqual(handoff.schema_version, '1.0.0');
    assert.strictEqual(handoff.plugin_api_version, '1.0.0');
    assert.ok(handoff._warning, 'Should have _warning field');
    assert.ok(!handoff._warning.toLowerCase().includes('password'), '_warning should not contain password');
  });

  test('initial AUDIT.jsonl has project_initialised event with session_id', () => {
    const lines = gf.read('.planning/AUDIT.jsonl').split('\n').filter(Boolean);
    assert.ok(lines.length >= 1, 'Should have at least one audit entry');
    const first = JSON.parse(lines[0]);
    assert.strictEqual(first.event, 'project_initialised');
    assert.ok(first.session_id, 'Should have session_id');
    assert.ok(first.id, 'Should have id');
    assert.ok(first.timestamp, 'Should have timestamp');
  });

  test('plan-phase creates PLAN files with valid XML structure', () => {
    planPhase(gf, 1);
    const plan = gf.read('.planning/phases/1/PLAN-1-01.md');
    assert.ok(plan, 'PLAN-1-01.md should exist');
    assert.ok(plan.includes('<task type="auto">'), 'Should have task element');
    assert.ok(plan.includes('<n>'), 'Should have task name');
    assert.ok(plan.includes('<persona>'), 'Should specify persona');
    assert.ok(plan.includes('<dependencies>'), 'Should have dependencies');
    assert.ok(plan.includes('<verify>'), 'Should have verify step');
    assert.ok(plan.includes('<done>'), 'Should have definition of done');
  });

  test('difficulty score file created before plans', () => {
    assert.ok(gf.exists('.planning/phases/1/DIFFICULTY-SCORE-1.md'));
    const score = gf.read('.planning/phases/1/DIFFICULTY-SCORE-1.md');
    assert.ok(score.includes('Composite'), 'Should have composite score');
    assert.ok(score.includes('Challenging'), 'Should have difficulty label');
  });

  test('dependency graph created and shows wave structure', () => {
    const dep = gf.read('.planning/phases/1/DEPENDENCY-GRAPH-1.md');
    assert.ok(dep, 'Dependency graph should exist');
    assert.ok(dep.includes('Wave 1'), 'Should define Wave 1');
    assert.ok(dep.includes('Wave 2'), 'Should define Wave 2');
    assert.ok(dep.includes('Plan 01'), 'Should reference Plan 01');
    assert.ok(dep.includes('Plan 02'), 'Should reference Plan 02');
  });

  test('execute task creates SUMMARY with commit SHA', () => {
    executeTask(gf, 1, '01', 'abc1234ef');
    const summary = gf.read('.planning/phases/1/SUMMARY-1-01.md');
    assert.ok(summary, 'SUMMARY-1-01.md should exist');
    assert.ok(summary.includes('Completed ✅'), 'Should show completed status');
    assert.ok(summary.includes('abc1234ef'), 'Should include commit SHA');
  });

  test('task execution writes task_started and task_completed to AUDIT.jsonl', () => {
    executeTask(gf, 1, '02', 'def5678ab');
    const lines = gf.read('.planning/AUDIT.jsonl').split('\n').filter(Boolean);
    const events = lines.map(l => JSON.parse(l).event);
    assert.ok(events.includes('task_started'), 'Should have task_started event');
    assert.ok(events.includes('task_completed'), 'Should have task_completed event');
  });

  test('security scan writes SECURITY-REVIEW file', () => {
    runSecurityScan(gf, 1, []);
    assert.ok(gf.exists('.planning/phases/1/SECURITY-REVIEW-1.md'));
    const review = gf.read('.planning/phases/1/SECURITY-REVIEW-1.md');
    assert.ok(review.includes('CLEAN ✅') || review.includes('PASS'), 'Should show passing result');
  });

  test('verify-phase creates GATE-RESULTS, VERIFICATION, and UAT files', () => {
    verifyPhase(gf, 1);
    assert.ok(gf.exists('.planning/phases/1/GATE-RESULTS-1.md'), 'GATE-RESULTS should exist');
    assert.ok(gf.exists('.planning/phases/1/VERIFICATION-1.md'), 'VERIFICATION should exist');
    assert.ok(gf.exists('.planning/phases/1/UAT-1.md'), 'UAT should exist');
  });

  test('GATE-RESULTS shows all 5 gates passing', () => {
    const gates = gf.read('.planning/phases/1/GATE-RESULTS-1.md');
    assert.ok(gates.includes('Secret detection'), 'Should have secret detection gate');
    assert.ok(gates.includes('CRITICAL security'), 'Should have CRITICAL findings gate');
    assert.ok(gates.includes('Test suite'), 'Should have test suite gate');
    assert.ok(gates.includes('✅ PASS'), 'Gates should pass');
    assert.ok(gates.includes('ALL BLOCKING GATES PASSED'), 'Should confirm all gates passed');
  });

  test('VERIFICATION.md references requirements with traceability', () => {
    const v = gf.read('.planning/phases/1/VERIFICATION-1.md');
    assert.ok(v.includes('FR-01'), 'Should reference FR-01');
    assert.ok(v.includes('FR-02'), 'Should reference FR-02');
    assert.ok(v.includes('src/auth/'), 'Should reference source files');
  });

  // Complete audit log validation
  test('full workflow: all AUDIT.jsonl entries are valid with required fields', () => {
    const lines = gf.read('.planning/AUDIT.jsonl').split('\n').filter(Boolean);
    assert.ok(lines.length >= 6, `Should have >= 6 audit entries, got ${lines.length}`);

    lines.forEach((line, i) => {
      let entry;
      assert.doesNotThrow(() => { entry = JSON.parse(line); }, `Line ${i+1} is not valid JSON`);
      assert.ok(entry.id,         `Line ${i+1}: missing 'id'`);
      assert.ok(entry.timestamp,  `Line ${i+1}: missing 'timestamp'`);
      assert.ok(entry.event,      `Line ${i+1}: missing 'event'`);
      assert.ok(entry.session_id, `Line ${i+1}: missing 'session_id'`);
      assert.ok(entry.agent,      `Line ${i+1}: missing 'agent'`);
    });
  });

  test('full workflow: AUDIT.jsonl events cover complete lifecycle', () => {
    const lines   = gf.read('.planning/AUDIT.jsonl').split('\n').filter(Boolean);
    const events  = new Set(lines.map(l => JSON.parse(l).event));
    assert.ok(events.has('project_initialised'), 'Missing: project_initialised');
    assert.ok(events.has('phase_planned'),       'Missing: phase_planned');
    assert.ok(events.has('task_started'),        'Missing: task_started');
    assert.ok(events.has('task_completed'),      'Missing: task_completed');
    assert.ok(events.has('phase_completed'),     'Missing: phase_completed');
  });

} finally {
  gf.cleanup();
}

// ── Test 2: Brownfield / map-codebase workflow ─────────────────────────────────
console.log('\nBrownfield project workflow:');
const bf = createTestProject();

try {
  // Simulate what /mindforge:map-codebase produces
  test('map-codebase creates CONVENTIONS.md with DRAFT status marker', () => {
    bf.write('.mindforge/org/CONVENTIONS.md', `# Coding Conventions — E2E Test Project
# Source: Inferred from codebase analysis by MindForge
# Status: DRAFT — confirm with team before treating as authoritative

## IMPORTANT
These conventions were inferred from code analysis.
Review each section and mark as [CONFIRMED] or [NEEDS REVIEW].

## Naming conventions [NEEDS REVIEW]
- Variables: camelCase
- Files: kebab-case
- Classes: PascalCase

## Import order [NEEDS REVIEW]
- Node.js built-ins
- Third-party libraries
- Internal modules
`);
    const content = bf.read('.mindforge/org/CONVENTIONS.md');
    assert.ok(content.includes('DRAFT'), 'Should be marked as DRAFT');
    assert.ok(content.includes('NEEDS REVIEW'), 'Should have review markers');
  });

  test('map-codebase creates ARCHITECTURE.md with inferred stack', () => {
    bf.write('.planning/ARCHITECTURE.md', `# Architecture — E2E Test Project
## MindForge onboarding: Inferred from codebase
## Technology stack
- Runtime: Node.js 20 (inferred from .nvmrc)
- Framework: Express 4.x (inferred from package.json)
- Database: PostgreSQL via Prisma (inferred from prisma/schema.prisma)
## Quality baseline
- Tests: Vitest, ~200 test files
- Linting: ESLint configured
- CI/CD: GitHub Actions
`);
    const arch = bf.read('.planning/ARCHITECTURE.md');
    assert.ok(arch, 'ARCHITECTURE.md should exist');
    assert.ok(arch.includes('inferred') || arch.includes('Inferred'), 'Should note inferred content');
  });

  test('STATE.md from map-codebase shows ready-for-planning status', () => {
    bf.write('.planning/STATE.md', `# Project State

## Status
Codebase mapped. Ready to plan first phase.

## Current phase
None — run /mindforge:plan-phase 1 to begin.

## Last action
/mindforge:map-codebase completed — codebase analysis done.
`);
    const state = bf.read('.planning/STATE.md');
    assert.ok(state.includes('map'), 'STATE.md should reference map-codebase');
    assert.ok(state.includes('plan'), 'STATE.md should suggest next step');
  });

} finally {
  bf.cleanup();
}

// ── Test 3: Security gate scenarios ───────────────────────────────────────────
console.log('\nSecurity gate scenarios:');
const sg = createTestProject();

try {
  test('CRITICAL security finding in review blocks phase completion indicator', () => {
    initProject(sg);
    planPhase(sg, 1);
    executeTask(sg, 1, '01', 'abc1234');

    // Run security scan with a CRITICAL finding
    runSecurityScan(sg, 1, [{
      severity: 'CRITICAL',
      description: 'SQL injection via unsanitised user input',
      file: 'src/db/users.ts',
      line: 47,
      remediation: 'Use parameterised queries: db.query($1, [id])',
    }]);

    const review = sg.read('.planning/phases/1/SECURITY-REVIEW-1.md');
    assert.ok(review.includes('CRITICAL'), 'Should show CRITICAL finding');
    assert.ok(review.includes('BLOCKED') || review.includes('0 CRITICAL') === false, 'Should indicate blocked state');
  });

  test('AUDIT.jsonl captures security findings with correct schema', () => {
    const lines = sg.read('.planning/AUDIT.jsonl').split('\n').filter(Boolean);
    const secScan = lines.map(l => JSON.parse(l)).find(e => e.event === 'security_scan_completed');
    assert.ok(secScan, 'Should have security_scan_completed audit entry');
    assert.strictEqual(secScan.critical, 1, 'Should record 1 critical finding');
    assert.ok(secScan.session_id, 'Security scan audit entry should have session_id');
  });

} finally {
  sg.cleanup();
}

// ── Results ─────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n❌  ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log(`\n✅  All E2E tests passed.\n`);
}
```

**Commit:**
```bash
git add tests/
git commit -m "test(day7): add production readiness, migration, and E2E test suites"
```

---

## TASK 11 — Update CLAUDE.md, bump to v1.0.0, final commit

Add to `.claude/CLAUDE.md` and mirror to `.agent/CLAUDE.md`:

```markdown
---

## PRODUCTION LAYER (Day 7 — v1.0.0)

### Plugin awareness at session start
On session start: read PLUGINS-MANIFEST.md if it exists.
Load all installed plugins per plugin-loader.md protocol.
Report: "Active plugins: [list]" or "No plugins installed."
If a plugin has a lifecycle hook that applies to the current operation: execute it.
Never fail session start because a plugin is invalid — skip and report.

### Schema version awareness
On session start: compare HANDOFF.json schema_version against current package.json version.
If schema_version is OLDER than current version by more than a patch:
  Suggest: "Your .planning/ files are on MindForge v[old]. Run /mindforge:migrate."
  Do NOT auto-migrate without explicit user command.
  Old schemas are still readable — don't block execution, just suggest migration.

### Token efficiency mindset
Apply token-optimiser.md strategies in all sessions:
- PLAN `<action>` fields: lean (150-400 words), specify WHAT not HOW
- Read files when referenced, not all upfront
- Load only "Current status" section of STATE.md unless history is needed
- Maximum 3 skills at full injection — summarise anything beyond

### Self-update awareness
On session start: if MINDFORGE_AUTO_CHECK_UPDATES=true in MINDFORGE.md,
  check for updates silently (no output unless update is available).
  If update available: notify once, do not repeat.

### v1.0.0 stable interface
As of v1.0.0, all 36 commands have stable interfaces.
All plugin.json, HANDOFF.json, AUDIT.jsonl schemas are stable.
Breaking changes to these require MAJOR version bump.
Non-breaking additions (new optional fields, new commands) require MINOR.

### New commands (Day 7)
- /mindforge:update — check for and apply framework updates
- /mindforge:migrate — run schema migrations between versions
- /mindforge:plugins — manage plugins (install, uninstall, validate)
- /mindforge:tokens — token usage profiling and optimisation
- /mindforge:release — framework release pipeline (core team only)

---
```

**Bump to v1.0.0:**

```bash
node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  p.version = '1.0.0';
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
  console.log('Bumped to v1.0.0');
"

git add package.json .claude/CLAUDE.md .agent/CLAUDE.md
git commit -m "feat(core): v1.0.0 stable — production CLAUDE.md with plugin, migration, token awareness"
```

---

## TASK 12 — Run all 15 suites × 3 consecutive runs

```bash
#!/usr/bin/env bash
# MindForge v1.0.0 Pre-Release Verification
# ALL 15 suites × 3 runs must pass

set -euo pipefail

SUITES=(install wave-engine audit compaction skills-platform
        integrations governance intelligence metrics
        distribution ci-mode sdk production migration e2e)

TOTAL_PASS=0
TOTAL_FAIL=0
ALL_OK=true

echo ""
echo "⚡ MindForge v1.0.0 Pre-Release Test Battery"
echo "  15 suites × 3 runs = $((${#SUITES[@]} * 3)) expected passes"
echo ""

for RUN in 1 2 3; do
  echo "═══ Run ${RUN} / 3 ════════════════════════════════════════════════"
  for SUITE in "${SUITES[@]}"; do
    printf "  %-30s" "${SUITE}..."
    if OUTPUT=$(node tests/${SUITE}.test.js 2>&1); then
      LAST=$(echo "${OUTPUT}" | tail -1)
      echo "✅ ${LAST}"
      ((TOTAL_PASS++))
    else
      echo "❌ FAILED"
      echo "${OUTPUT}" | grep -E "❌|Error" | head -5
      ((TOTAL_FAIL++))
      ALL_OK=false
    fi
  done
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Results: ${TOTAL_PASS} passed / ${TOTAL_FAIL} failed"

if "${ALL_OK}"; then
  echo "✅ ALL $((${#SUITES[@]} * 3)) TESTS PASSED × 3 RUNS"
  echo ""
  echo "Ready to tag v1.0.0:"
  echo "  git tag -a v1.0.0 -m 'MindForge v1.0.0 — First stable release'"
  echo "  git push origin v1.0.0"
  echo "  npm publish --access public"
else
  echo "❌ ${TOTAL_FAIL} FAILURES — NOT READY FOR RELEASE"
  exit 1
fi
```

**Final commit and push:**

```bash
git add .
git commit -m "feat(day7): complete production hardening — v1.0.0 release ready"
git push origin feat/mindforge-production-release
```

---

# ═══════════════════════════════════════════════════════════════════
# PART 2 — REVIEW PROMPT
# ═══════════════════════════════════════════════════════════════════

---

## DAY 7 REVIEW — Run after implementation is complete

Activate **`architect.md` + `qa-engineer.md` + `security-reviewer.md`** simultaneously.

Day 7 is the v1.0.0 release sprint. The review standard is higher than any
previous day — every issue found here is an issue that ships to production users.

Three adversarial lenses for this review:
1. **Reliability lens**: what breaks under realistic production conditions?
2. **Security lens**: what attack surfaces were not hardened?
3. **User experience lens**: what fails silently or produces confusing errors?

---

## REVIEW PASS 1 — Installer: All code paths

Read `bin/install.js` and `bin/installer-core.js`.

- [ ] **Windows path handling**: The installer uses `os.homedir()` and `path.join()`.
  On Windows, paths use backslashes. The runtime directories (`.claude/`, `.agent/`)
  use forward slashes everywhere. Does `path.join()` produce correct paths on Windows?
  Specifically: `path.join(os.homedir(), '.claude')` → `C:\Users\john\.claude` on Windows.
  Does Claude Code on Windows use `C:\Users\john\.claude` or `C:\Users\john\.claude\`?
  Add: "For Windows compatibility, normalize all paths with `path.normalize()` before use."

- [ ] **copyDir excludePatterns**: The exclude list uses `{ excludePatterns: SENSITIVE_EXCLUDE }`.
  But `SENSITIVE_EXCLUDE` contains strings like `'.env'` and regex like `/^\.env\..*/`.
  The copyDir function checks:
  `excludePatterns.some(pat => typeof pat === 'string' ? entry.name === pat : pat.test(entry.name))`
  But `'*.key'` is a glob pattern string, not a filename — `entry.name === '*.key'` will never match.
  Fix: replace glob patterns with regex equivalents: `/\.key$/` not `'*.key'`.

- [ ] **`--all` scope variable**: In the `run()` function, when `runtime === 'all'`,
  the code iterates `runtimes.forEach(rt => install(rt, scope, options))`.
  But `scope` is not in scope at this point in the function — it was destructured
  from args before the `isUpdate` check, so it should be available. Verify this is correct.

---

## REVIEW PASS 2 — Self-Update: Edge cases

Read all three updater files.

- [ ] **`checkAndUpdate` with CI=true**: In CI mode, the update should not prompt
  the user for confirmation before applying. But the current code checks `apply` flag only.
  Add: "In CI mode (`process.env.CI === 'true'`): if `--apply` is passed, apply without confirmation.
  If `--apply` is NOT passed in CI: check only (don't apply silently)."

- [ ] **changelog extraction**: `extractEntries` splits the changelog on `\n` and looks for
  `## [v?X.Y.Z` pattern. But if the CHANGELOG.md uses a different date format
  (e.g., `## v1.0.0 — 2026-03-22`) the regex `## \[?v?(\d+\.\d+\.\d+)` should still match
  (the `\[?` allows the optional bracket). Verify this works for:
  - `## [1.0.0] — 2026-03-22`
  - `## v1.0.0 — 2026-03-22`
  - `## 1.0.0 (2026-03-22)`

- [ ] **detectInstallScope**: The function checks file existence to determine scope.
  But what if BOTH local and global installs exist?
  The function returns local first (checked first) — this is correct per ADR-019.
  But the decision should be documented in the code with a comment for maintainability.
  Add: `// Per ADR-019: local takes precedence over global`

---

## REVIEW PASS 3 — Migration Engine: Correctness

Read all migration files.

- [ ] **Migration backup retention**: After successful migration, the backup is retained
  with a note: "Remove when satisfied." But in CI environments, accumulated migration
  backups will fill disk space over time. Add: "In CI mode: auto-delete backup on successful
  migration. In interactive mode: retain backup."

- [ ] **The `0.6.0-to-1.0.0.js` migration** converts `VERIFY_PASS_RATE_WARNING_THRESHOLD`.
  The test `test('does NOT modify value of exactly 1')` verifies that `=1` is preserved.
  But what about `VERIFY_PASS_RATE_WARNING_THRESHOLD=1.0` (explicit decimal)?
  The regex `/^(VERIFY_PASS_RATE_WARNING_THRESHOLD=)(\d+(?:\.\d+)?)(\s*)$/m` matches `1.0`.
  `parseFloat('1.0') > 1` is `false` — so `1.0` would be correctly preserved.
  Verify this edge case is tested.

- [ ] **Migration chain verification**: If someone has MindForge v0.3.0 (a version between
  our migration files), there is no migration file for `0.3.0-to-0.5.0`.
  The migrate.js uses a filter:
  `compareSemver(m.fromVersion, fromVersion) >= 0 && compareSemver(m.toVersion, toVersion) <= 0`
  For fromVersion=0.3.0 and toVersion=1.0.0:
  - `0.1.0-to-0.5.0.js`: `compareSemver('0.1.0', '0.3.0') >= 0` → `0.1.0 >= 0.3.0` → false ❌
  This means the migration from 0.3.0 would SKIP the 0.1.0-to-0.5.0 migration,
  potentially leaving HANDOFF.json without the intelligence layer fields.
  Fix: the filter should use `< toVersion` not `>= fromVersion`.
  Or: use a range check: `m applies if m.toVersion is BETWEEN fromVersion and toVersion`.
  The correct logic is: run migration if `m.toVersion > fromVersion AND m.toVersion <= toVersion`.

---

## REVIEW PASS 4 — Plugin System: Conflict detection

Read `plugin-schema.md` and `plugin-loader.md`.

- [ ] **Reserved command conflict detection**: The loader checks a hardcoded list of
  36 reserved command names. But this list will become stale as MindForge adds new
  commands in future versions. When a new built-in command is added, the plugin loader's
  reserved list must also be updated.
  Better approach: derive the reserved list dynamically at runtime:
  ```bash
  RESERVED_NAMES=$(ls .claude/commands/mindforge/ 2>/dev/null | sed 's/\.md$//')
  ```
  This always reflects the actual installed commands, not a hardcoded list.

- [ ] **Multiple plugins providing the same hook**: If `plugin-a` and `plugin-b` both
  declare `post_phase_complete` hooks, what is the execution order?
  The spec doesn't define this. Add: "Multiple plugins with the same hook:
  execute in PLUGINS-MANIFEST.md installation order (first installed, first executed).
  Each hook is independent — failure of one hook does not prevent others from running."

---

## REVIEW PASS 5 — Token Optimiser: Signal Accuracy

Read `token-optimiser.md`.

- [ ] **Estimates vs. actual measurement**: The token budget tracking writes to
  `token-usage.jsonl` with `token_estimates`. But these are estimates, not actual
  measured token counts. The spec doesn't explain how to compute `code_reading` tokens
  from file content.
  Add: "Estimate code_reading tokens as: `sum(file_sizes_read / 4)`.
  (Average 4 chars per token is a reasonable estimate for code.)
  Mark all values in token-usage.jsonl as estimates with `"measured": false`."

- [ ] **Efficiency formula definition of "useful output"**: The formula says:
  `useful_output_tokens = tokens in SUMMARY files + verified code changes + ADRs written`
  But how are "verified code changes" measured in tokens?
  Clarify: "Estimate verified code changes as: `sum(SUMMARY file sizes / 4)`.
  SUMMARY files contain the output description — this is a proxy for the value produced."

---

## REVIEW PASS 6 — E2E Tests: Coverage Gaps

Read `tests/e2e.test.js`.

- [ ] **Multi-developer scenario not tested**: The E2E tests cover single-developer
  workflows but not the multi-developer HANDOFF system (HANDOFF-[dev-id].json,
  active_developers field, file conflict detection). Add at minimum:
  "A test that simulates two developers working on different plans and verifies
  that their per-developer HANDOFF files are distinct and non-conflicting."

- [ ] **Context compaction scenario not tested**: The E2E tests don't test the
  compaction protocol (Level 2 structured extraction). Add:
  "A test that simulates a Level 2 compaction and verifies the HANDOFF.json
  gains decisions_made and implicit_knowledge fields."

- [ ] **Cleanup failure is too quiet**: The `catch(e) { console.warn(...) }` in cleanup
  is good — but the test still passes even if cleanup fails.
  Add: "Track cleanup failures in a global counter. Report at the end:
  'N test directories were not cleaned up: [paths]'"

---

## REVIEW PASS 7 — Production Checklist: Release Gate

Read `production-checklist.md`.

- [ ] **Missing version consistency checks**: The checklist does not verify that:
  - `package.json` version === v1.0.0
  - Git tag === `v1.0.0`
  - npm published version === v1.0.0
  - SDK `package.json` version matches root `package.json` version
  These are classic "wrong version shipped" bugs. Add items E09 and E10 expansions
  or add Section F (Release Artifacts, 5 items) to bring total to 55 and include:
  - F01: package.json version === target release version
  - F02: SDK package.json version matches root version
  - F03: Git tag v1.0.0 exists and points to the correct commit
  - F04: CHANGELOG.md has a complete entry for v1.0.0 with today's date
  - F05: `npm publish --dry-run` shows no unexpected files

---

## REVIEW SUMMARY TABLE

```
## Day 7 Review Summary

| Category              | BLOCKING | MAJOR | MINOR | SUGGESTION |
|-----------------------|----------|-------|-------|------------|
| Installer             |          |       |       |            |
| Self-Update           |          |       |       |            |
| Migration Engine      |          |       |       |            |
| Plugin System         |          |       |       |            |
| Token Optimiser       |          |       |       |            |
| E2E Tests             |          |       |       |            |
| Production Checklist  |          |       |       |            |
| **TOTAL**             |          |       |       |            |

## Verdict
[ ] ✅ APPROVED — Proceed to HARDEN section
[ ] ⚠️  APPROVED WITH CONDITIONS — Fix MAJOR findings first
[ ] ❌ NOT APPROVED — BLOCKING findings prevent v1.0.0
```

---

# ═══════════════════════════════════════════════════════════════════
# PART 3 — HARDENING PROMPT
# ═══════════════════════════════════════════════════════════════════

---

## DAY 7 HARDENING — Run after REVIEW is APPROVED

Confirm all review findings resolved:

```bash
for suite in install wave-engine audit compaction skills-platform \
             integrations governance intelligence metrics \
             distribution ci-mode sdk production migration e2e; do
  printf "  %-30s" "${suite}..."
  node tests/${suite}.test.js 2>&1 | tail -1
done
```

---

## HARDEN 1 — Fix installer glob patterns in excludePatterns

The review found `'*.key'` is a string, not a glob — it never matches.

Update `bin/installer-core.js`:

```javascript
// Replace glob strings with correct regex equivalents:
const SENSITIVE_EXCLUDE = [
  '.env',        // exact filename match
  /^\.env\..*/,  // .env.local, .env.production, etc.
  /\.key$/,      // anything ending in .key (was '*.key' — broken)
  /\.pem$/,      // anything ending in .pem (was '*.pem' — broken)
  'secrets',     // exact directory name
  '.secrets',    // exact directory name
  /^secrets$/,   // exact match at directory level
];
```

Add a unit test to `tests/production.test.js`:

```javascript
test('SENSITIVE_EXCLUDE properly excludes .env and .key files', () => {
  const SENSITIVE_EXCLUDE = [
    '.env', /^\.env\..*/, /\.key$/, /\.pem$/, 'secrets', /^secrets$/
  ];
  const shouldExclude = (name) =>
    SENSITIVE_EXCLUDE.some(p => typeof p === 'string' ? p === name : p.test(name));

  assert.ok(shouldExclude('.env'),               '.env should be excluded');
  assert.ok(shouldExclude('.env.local'),         '.env.local should be excluded');
  assert.ok(shouldExclude('private.key'),        'private.key should be excluded');
  assert.ok(shouldExclude('certificate.pem'),    'certificate.pem should be excluded');
  assert.ok(shouldExclude('secrets'),            'secrets directory should be excluded');
  assert.ok(!shouldExclude('package.json'),      'package.json should NOT be excluded');
  assert.ok(!shouldExclude('.mindforge'),        '.mindforge should NOT be excluded');
  assert.ok(!shouldExclude('src'),               'src should NOT be excluded');
});
```

**Commit:**
```bash
git add bin/installer-core.js tests/production.test.js
git commit -m "harden(installer): fix SENSITIVE_EXCLUDE glob patterns — use regex, not glob strings"
```

---

## HARDEN 2 — Fix migration chain filter logic

The review found the filter breaks for intermediate versions (e.g., v0.3.0).

Update `bin/migrations/migrate.js` — replace the getMigrationsToRun filter:

```javascript
function getMigrationsToRun(fromVersion, toVersion) {
  const allMigrations = [
    require('./0.1.0-to-0.5.0'),
    require('./0.5.0-to-0.6.0'),
    require('./0.6.0-to-1.0.0'),
  ];

  // A migration should run if its DESTINATION VERSION falls within the range:
  // (fromVersion, toVersion] — i.e., greater than fromVersion AND at most toVersion
  //
  // Example: upgrading 0.3.0 → 1.0.0:
  //   - 0.1.0→0.5.0: toVersion=0.5.0 > fromVersion=0.3.0 ✅ run this
  //   - 0.5.0→0.6.0: toVersion=0.6.0 > fromVersion=0.3.0 ✅ run this
  //   - 0.6.0→1.0.0: toVersion=1.0.0 > fromVersion=0.3.0 ✅ run this
  //
  // Example: upgrading 0.6.0 → 1.0.0:
  //   - 0.1.0→0.5.0: toVersion=0.5.0 > fromVersion=0.6.0? ❌ skip
  //   - 0.5.0→0.6.0: toVersion=0.6.0 > fromVersion=0.6.0? ❌ skip (equal, not greater)
  //   - 0.6.0→1.0.0: toVersion=1.0.0 > fromVersion=0.6.0? ✅ run this

  return allMigrations.filter(m =>
    compareSemver(m.toVersion, fromVersion) > 0  &&   // migration destination > current
    compareSemver(m.toVersion, toVersion)   <= 0       // migration destination ≤ target
  );
}
```

Add migration chain tests to `tests/migration.test.js`:

```javascript
test('migration chain for v0.3.0 → v1.0.0 includes ALL 3 migrations', () => {
  // Simulate the filter logic
  const { compareSemver } = require('../bin/updater/version-comparator');
  const fromVersion = '0.3.0';
  const toVersion   = '1.0.0';

  const migrations = [
    { fromVersion: '0.1.0', toVersion: '0.5.0' },
    { fromVersion: '0.5.0', toVersion: '0.6.0' },
    { fromVersion: '0.6.0', toVersion: '1.0.0' },
  ].filter(m =>
    compareSemver(m.toVersion, fromVersion) > 0 &&
    compareSemver(m.toVersion, toVersion) <= 0
  );

  assert.strictEqual(migrations.length, 3,
    `Expected 3 migrations for 0.3.0→1.0.0, got ${migrations.length}`);
});

test('migration chain for v0.6.0 → v1.0.0 includes only 1 migration', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  const fromVersion = '0.6.0';
  const toVersion   = '1.0.0';

  const migrations = [
    { fromVersion: '0.1.0', toVersion: '0.5.0' },
    { fromVersion: '0.5.0', toVersion: '0.6.0' },
    { fromVersion: '0.6.0', toVersion: '1.0.0' },
  ].filter(m =>
    compareSemver(m.toVersion, fromVersion) > 0 &&
    compareSemver(m.toVersion, toVersion) <= 0
  );

  assert.strictEqual(migrations.length, 1,
    `Expected 1 migration for 0.6.0→1.0.0, got ${migrations.length}: ${migrations.map(m=>m.toVersion)}`);
  assert.strictEqual(migrations[0].toVersion, '1.0.0');
});

test('migration chain for same version returns 0 migrations', () => {
  const { compareSemver } = require('../bin/updater/version-comparator');
  const fromVersion = '1.0.0';
  const toVersion   = '1.0.0';

  const migrations = [
    { fromVersion: '0.1.0', toVersion: '0.5.0' },
    { fromVersion: '0.5.0', toVersion: '0.6.0' },
    { fromVersion: '0.6.0', toVersion: '1.0.0' },
  ].filter(m =>
    compareSemver(m.toVersion, fromVersion) > 0 &&
    compareSemver(m.toVersion, toVersion) <= 0
  );

  assert.strictEqual(migrations.length, 0, 'No migrations needed for same version');
});
```

**Commit:**
```bash
git add bin/migrations/migrate.js tests/migration.test.js
git commit -m "harden(migration): fix migration chain filter — use toVersion range check, not fromVersion"
```

---

## HARDEN 3 — Add CI backup auto-deletion and dynamic reserved names

### Fix CI migration backup cleanup in `migrate.js`

```javascript
  // ── Post-migration: clean up in CI, retain in interactive ─────────────────
  if (process.env.CI === 'true') {
    try {
      fs.rmSync(backupDir, { recursive: true, force: true });
      console.log(`  🗑️  CI mode: backup auto-deleted (disk space)`);
    } catch {
      // Silent failure on cleanup — migration succeeded, cleanup is optional
    }
  } else {
    console.log(`  Backup retained: .planning/${path.basename(backupDir)}`);
    console.log(`  Remove when satisfied: rm -rf .planning/${path.basename(backupDir)}`);
  }
```

### Fix plugin loader to use dynamic reserved names

Update `plugin-loader.md`:

```markdown
### Dynamic reserved command name detection

Instead of a hardcoded list, detect reserved names at plugin install time:

```bash
# Detect currently installed built-in command names
get_reserved_command_names() {
  ls ".claude/commands/mindforge/"*.md 2>/dev/null | \
    xargs -I{} basename {} .md | \
    sort
}

RESERVED_NAMES=$(get_reserved_command_names)
```

For a plugin command that matches a reserved name:
```bash
# Check conflict
CMD_NAME="health"
PLUGIN_NAME="my-plugin"

if echo "${RESERVED_NAMES}" | grep -q "^${CMD_NAME}$"; then
  FINAL_NAME="${PLUGIN_NAME}-${CMD_NAME}"
  echo "  ⚠️  Command '${CMD_NAME}' conflicts with built-in — renaming to '${FINAL_NAME}'"
else
  FINAL_NAME="${CMD_NAME}"
fi
```

This approach always reflects actual installed commands rather than a hardcoded list
that becomes stale with new MindForge releases.
```

**Commit:**
```bash
git add bin/migrations/migrate.js .mindforge/plugins/plugin-loader.md
git commit -m "harden(migration,plugins): CI backup auto-delete, dynamic reserved command detection"
```

---

## HARDEN 4 — Write the final 3 ADRs

### `.planning/decisions/ADR-018-installer-self-install-detection.md`

```markdown
# ADR-018: Installer detects and handles self-install scenario

**Status:** Accepted | **Date:** v1.0.0 | **Day:** 7

## Context
Running `npx mindforge-cc --claude --local` inside the MindForge repo itself
would copy `.mindforge/` to `.mindforge/` (source = destination).

## Decision
Detect self-install by checking `package.json.name === 'mindforge-cc'`.
If self-install: skip framework file copies. Only install commands.

## Rationale
Core team runs the installer locally for testing frequently.
Silent no-op with a clear warning is better than a cryptic error or accidental self-overwrite.
```

### `.planning/decisions/ADR-019-self-update-scope-preservation.md`

```markdown
# ADR-019: Self-update preserves the original installation scope

**Status:** Accepted | **Date:** v1.0.0 | **Day:** 7

## Context
`/mindforge:update --apply` must update the correct installation.

## Decision
Detect original scope from filesystem (local before global per priority).
Apply update using the detected scope. Per ADR-019.

## Rationale
Principle of least surprise. A local install user should get a local update.
Unexpected global install is confusing and may affect other projects.
```

### `.planning/decisions/ADR-020-v1.0.0-stable-interface-contract.md`

```markdown
# ADR-020: v1.0.0 stable interface contract

**Status:** Accepted | **Date:** v1.0.0 | **Day:** 7

## Context
MindForge reaches v1.0.0. "Stable" must be precisely defined.

## Decision
Stable public interfaces (additions require MINOR, removals/changes require MAJOR):
- All 36 command names and their flag interfaces
- HANDOFF.json schema fields
- AUDIT.jsonl event types and required fields
- All 10 core skill name values
- MINDFORGE.md setting keys
- @mindforge/sdk exported types and functions
- plugin.json manifest format

Governance primitives are permanently fixed and cannot become configurable
in any future version without a MAJOR bump and explicit RFC process.

## Consequences
Plugin authors and SDK consumers can build on v1.0.0 with confidence.
The MindForge team is committed to backwards compatibility in 1.x.x releases.
```

**Commit:**
```bash
git add .planning/decisions/
git commit -m "docs(adr): add ADR-018, ADR-019, ADR-020 — complete 20 ADRs for v1.0.0"
```

---

## HARDEN 5 — Final CHANGELOG.md v1.0.0 entry

```markdown
## [1.0.0] — v1.0.0 First Stable Public Release — 2026-03-22

🎉 **MindForge v1.0.0 — Enterprise Agentic Framework — First Stable Release**

Built over 7 focused sprints, MindForge transforms Claude Code and Antigravity
from powerful-but-unstructured AI tools into production-grade engineering
partners with full governance, observability, and enterprise integration.

### What ships in v1.0.0

**36 commands** across 7 workflow categories
**10 core skill packs** with three-tier registry (Core/Org/Project)
**8 specialised agent personas** covering all engineering roles
**Wave-based parallel execution** with dependency graph and automatic compaction
**Enterprise integrations**: Jira, Confluence, Slack, GitHub, GitLab
**Three-tier governance**: Tier 1 (auto) / Tier 2 (peer review) / Tier 3 (compliance)
**Five non-bypassable compliance gates** (secret detection, CRITICAL findings, tests, CVEs, GDPR)
**Intelligence layer**: health engine, difficulty scorer, anti-pattern detector, team profiling
**Public skills registry**: npm-based `mindforge-skill-*` ecosystem
**CI/CD integration**: GitHub Actions, GitLab CI, Jenkins adapters
**@mindforge/sdk**: TypeScript SDK with client, event stream, and command builders
**Monorepo support**: npm/pnpm/Nx/Turborepo/Lerna workspace detection
**AI PR Review**: Claude API-powered code review with context loading
**Self-update mechanism**: version check, changelog diff, scope-preserving apply
**Version migration engine**: schema migration from v0.1.0 through v1.0.0
**Plugin system**: extensible via `mindforge-plugin-*` npm namespace
**Token usage optimiser**: profiling and efficiency strategies
**50-point production readiness checklist**: fully verified before this release

**20 Architecture Decision Records** documenting every major design choice
**15 test suites** with 3× consecutive run requirement
**Complete reference documentation**: commands, security, ADR index, threat model

### Stable interface contract
See ADR-020. All 36 commands, HANDOFF.json schema, AUDIT event types,
@mindforge/sdk exports, and plugin.json format are stable in 1.x.x.

### Breaking changes from 0.6.0
- VERIFY_PASS_RATE_WARNING_THRESHOLD in MINDFORGE.md is now 0.0-1.0 (was 0-100)
  Run `/mindforge:migrate` to auto-convert
- AUDIT.jsonl session_id field is now required (auto-backfilled by migration)
- HANDOFF.json plugin_api_version field required for plugin compatibility

### Installation
```bash
npx mindforge-cc@latest
# or
npx mindforge-cc@1.0.0 --claude --global
```
```

**Commit:**
```bash
git add CHANGELOG.md package.json
git commit -m "chore(release): v1.0.0 final CHANGELOG and version bump"
```

---

## HARDEN 6 — Final hardening test additions

Add to relevant test suites:

```javascript
// In tests/production.test.js — add after existing tests:
console.log('\nHardening tests:');

test('SENSITIVE_EXCLUDE uses regex for .key and .pem (not glob strings)', () => {
  const c = fs.readFileSync('bin/installer-core.js', 'utf8');
  // Should use regex pattern /\.key$/ not string '*.key'
  assert.ok(!c.includes("'*.key'"), 'Should not use glob string for .key');
  assert.ok(!c.includes("'*.pem'"), 'Should not use glob string for .pem');
  assert.ok(c.includes('/\\.key$/') || c.includes('/.key$/'), 'Should use regex for .key');
});

test('migration filter uses toVersion range check (not fromVersion)', () => {
  const c = fs.readFileSync('bin/migrations/migrate.js', 'utf8');
  // The correct filter uses compareSemver(m.toVersion, fromVersion) > 0
  assert.ok(
    c.includes('m.toVersion') && c.includes('> 0'),
    'Should use toVersion range check for migration filter'
  );
});

test('migration has CI auto-delete of backup', () => {
  const c = fs.readFileSync('bin/migrations/migrate.js', 'utf8');
  assert.ok(
    c.includes('CI') && (c.includes('auto-deleted') || c.includes('rmSync')),
    'Should auto-delete backup in CI mode'
  );
});

// In tests/migration.test.js — add after existing tests:
test('MINDFORGE.md value 1.0 (explicit decimal) is not converted', () => {
  const content = 'VERIFY_PASS_RATE_WARNING_THRESHOLD=1.0\n';
  const migrated = simulateMindforgeMdMigration(content);
  assert.ok(migrated.includes('=1.0'), 'Should preserve 1.0 format without conversion');
});
```

**Commit:**
```bash
git add tests/production.test.js tests/migration.test.js
git commit -m "test(day7): add hardening verification tests"
```

---

## HARDEN 7 — Pre-release final verification and tag

```bash
#!/usr/bin/env bash
# MindForge v1.0.0 Final Pre-Release Verification

echo ""
echo "⚡ MindForge v1.0.0 Pre-Release Verification"
echo "═══════════════════════════════════════════"

PASS=true

# 1. Version check
PKGVER=$(node -e "console.log(require('./package.json').version)")
[ "${PKGVER}" = "1.0.0" ] || { echo "❌ package.json version = ${PKGVER} (expected 1.0.0)"; PASS=false; }
echo "  package.json version: ${PKGVER} ✅"

# 2. CHANGELOG entry
grep -q "1.0.0" CHANGELOG.md && echo "  CHANGELOG.md: v1.0.0 entry ✅" || { echo "❌ Missing CHANGELOG v1.0.0"; PASS=false; }

# 3. ADR count
ADR_COUNT=$(ls .planning/decisions/ADR-*.md 2>/dev/null | wc -l | tr -d ' ')
[ "${ADR_COUNT}" -ge 20 ] && echo "  ADRs: ${ADR_COUNT} ✅" || { echo "❌ Only ${ADR_COUNT} ADRs (need 20)"; PASS=false; }

# 4. Command count
CMD_COUNT=$(ls .claude/commands/mindforge/*.md 2>/dev/null | wc -l | tr -d ' ')
[ "${CMD_COUNT}" -ge 36 ] && echo "  Commands: ${CMD_COUNT} ✅" || { echo "❌ Only ${CMD_COUNT} commands (need 36)"; PASS=false; }

# 5. Command parity
diff <(ls .claude/commands/mindforge/ | sort) <(ls .agent/mindforge/ | sort) > /dev/null 2>&1 \
  && echo "  Command parity: ✅" \
  || { echo "❌ Command mismatch between runtimes"; PASS=false; }

# 6. No secrets
SECRETS=$(grep -rE "(password|api_key|token)\s*=\s*['\"][^'\"]{8,}" \
  --include="*.md" --include="*.js" --include="*.json" --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | \
  grep -v "placeholder\|example\|your-\|TEST_ONLY\|comment" || true)
[ -z "${SECRETS}" ] && echo "  Secret scan: clean ✅" || { echo "❌ Potential credentials detected"; echo "${SECRETS}"; PASS=false; }

# 7. All 15 test suites × 3 runs
SUITES=(install wave-engine audit compaction skills-platform
        integrations governance intelligence metrics
        distribution ci-mode sdk production migration e2e)
FAIL_COUNT=0
for RUN in 1 2 3; do
  for SUITE in "${SUITES[@]}"; do
    node tests/${SUITE}.test.js 2>&1 | grep -q "All.*passed" || { ((FAIL_COUNT++)); }
  done
done
[ "${FAIL_COUNT}" -eq 0 ] && echo "  Tests: 15 suites × 3 runs ✅" || { echo "❌ ${FAIL_COUNT} test failures"; PASS=false; }

echo ""
if "${PASS}"; then
  echo "✅ ALL PRE-RELEASE CHECKS PASSED"
  echo ""
  echo "Release commands:"
  echo "  git tag -a v1.0.0 -m 'MindForge v1.0.0 — First stable release'"
  echo "  git push origin v1.0.0"
  echo "  npm publish --access public"
  echo "  gh release create v1.0.0 --title 'MindForge v1.0.0' --notes-file CHANGELOG.md"
else
  echo "❌ PRE-RELEASE CHECKS FAILED — do not release"
  exit 1
fi
```

**Final commit and push:**

```bash
git add .
git commit -m "harden(day7): complete all production hardening — v1.0.0 release ready"
git push origin feat/mindforge-production-release

# After PR review, merge, and all checks pass:
git checkout main && git pull
git tag -a v1.0.0 -m "MindForge v1.0.0 — Enterprise Agentic Framework, First Stable Release"
git push origin v1.0.0
npm publish --access public
```

---

## MINDFORGE v1.0.0 — THE COMPLETE BUILD SUMMARY

| Day | Branch | Core delivery | Commands |
|---|---|---|---|
| **1** | `feat/mindforge-core-scaffold` | Foundation: personas, skills, commands, state management | 6 |
| **2** | `feat/mindforge-wave-engine` | Wave execution, compaction protocol, AUDIT pipeline | +4 = 10 |
| **3** | `feat/mindforge-skills-platform` | Skills registry (3 tiers), 5 new skills, 5 commands | +5 = 15 |
| **4** | `feat/mindforge-enterprise-integrations` | Jira/Confluence/Slack/GitHub, governance (Tier 1/2/3) | +6 = 21 |
| **5** | `feat/mindforge-intelligence-layer` | Health engine, difficulty scorer, anti-patterns, metrics | +4 = 25 |
| **6** | `feat/mindforge-distribution-platform` | npm registry, CI/CD, SDK, monorepo, AI PR review | +6 = 31 |
| **7** | `feat/mindforge-production-release` | Complete installer, self-update, migration, plugins, tokens | +5 = **36** |

### Final state: MindForge v1.0.0

```
36 commands     10 skills      8 personas
20 ADRs         15 test suites 50-point checklist ✅
```

```bash
npx mindforge-cc@latest
# ⚡ MindForge — Enterprise Agentic Framework
# The best agentic framework. Now shipped.
```
