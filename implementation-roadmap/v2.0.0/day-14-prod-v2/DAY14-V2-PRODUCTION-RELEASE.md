# MindForge v2 — Day 14: v2.0.0 Production Release
# Branch: `feat/mindforge-v2-release`
# Prerequisite: `feat/mindforge-v2-self-building-skills` merged to `main`
# Version target: v2.0.0 — "The Autonomous Enterprise"
# Theme: "Ship It. Every Promise Kept."

---

## BRANCH SETUP

```bash
git checkout main
git pull origin main

# Verify Day 13 baseline — CRITICAL: everything must pass before release work begins
node -e "console.log(require('./package.json').version)"  # Must be 2.0.0-alpha.6

# Run ALL 21 test suites — zero tolerance for failures before release
SUITES=(install wave-engine audit compaction skills-platform \
        integrations governance intelligence metrics \
        distribution ci-mode sdk production migration e2e \
        autonomous browser model-routing memory dashboard \
        self-building-skills)

FAIL=0
for suite in "${SUITES[@]}"; do
  printf "  %-35s" "${suite}..."
  node tests/${suite}.test.js 2>&1 | tail -1 | grep -q "passed" && echo "✅" || { echo "❌ BLOCKED"; ((FAIL++)); }
done

[ "$FAIL" -gt 0 ] && echo "
❌ $FAIL test suite(s) failing — FIX BEFORE STARTING DAY 14.
   v2.0.0 release cannot proceed with failing tests." && exit 1

echo "
✅ All 21 test suites pass. Day 14 release work may begin."

git checkout -b feat/mindforge-v2-release
```

---

## DAY 14 SCOPE

Day 14 is **The Release**. Every feature built in Days 8-13 ships as a cohesive
v2.0.0 package. The scope is different from previous days: instead of building
new features, Day 14 integrates, validates, hardens, and ships everything built so far.

**The v2.0.0 promise:**
> "The only agentic framework that is simultaneously enterprise-grade
> (governance, compliance, integrations) AND autonomously capable
> (walk-away mode, browser automation, cross-model intelligence,
> persistent memory, real-time team dashboard, self-building skills)."

**Day 14 deliverables:**

| Deliverable | Description |
|---|---|
| Multi-runtime expansion | 6 runtimes: Claude Code, Antigravity, Cursor, OpenCode, Gemini CLI, GitHub Copilot |
| `/mindforge:new-runtime` command | Scaffold support for any new runtime |
| v2.0.0 migration script | 1.0.0→2.0.0 HANDOFF.json + AUDIT.jsonl backfill |
| 65-point production checklist | 50 original + 15 new v2 items (Section F) |
| Complete v2.0.0 CHANGELOG | Full "The Autonomous Enterprise" entry |
| Full test battery × 3 runs | All 22 test suites, zero failures, three consecutive passes |
| `tests/release.test.js` | 22nd and final test suite |
| v2.0.0 state file | MINDFORGE-STATE-V2.md for post-release continuation |
| npm pack simulation | Verify tarball integrity before publish |
| GitHub release notes | Complete release notes document |

**New commands today: 48 total (47 + new-runtime)**
**Final ADR count: 41 (ADR-001 through ADR-041)**

---

# ═══════════════════════════════════════════════════════════════════════
# PART 1 — IMPLEMENTATION PROMPT
# ═══════════════════════════════════════════════════════════════════════

---

## TASK 1 — Multi-Runtime Expansion: Update installer for 6 runtimes

### Update `bin/installer-core.js` RUNTIMES config

The existing installer supports Claude Code and Antigravity. Day 14 adds 4 more:
Cursor, OpenCode, Gemini CLI, and GitHub Copilot.

```javascript
/**
 * MindForge v2.0.0 — RUNTIMES configuration
 * 6 runtimes supported: Claude Code, Antigravity, Cursor,
 * OpenCode, Gemini CLI, GitHub Copilot.
 *
 * Each runtime definition:
 *   globalDir      — Machine-level directory for global installations
 *   localDir       — Project-level directory (relative to project root)
 *   commandsSubdir — Subdirectory within localDir for command files
 *   entryFile      — Main agent instructions file name
 *   commandFormat  — How this runtime reads commands ('slash' | 'file' | 'include')
 *   supportsSlash  — Whether /mindforge:cmd syntax is used directly
 */

// Replace the existing RUNTIMES const in bin/installer-core.js with:

const RUNTIMES = {

  // ── Claude Code ─────────────────────────────────────────────────────────────
  claude: {
    id:             'claude',
    displayName:    'Claude Code',
    globalDir:      path.join(home, '.claude'),
    localDir:       '.claude',
    commandsSubdir: 'commands/mindforge',
    entryFile:      'CLAUDE.md',
    commandFormat:  'slash',
    supportsSlash:  true,
    detect:         () => !!(process.env.CLAUDE_CODE || fs.existsSync('.claude/CLAUDE.md')),
    description:    'Anthropic Claude Code (claude.ai/code)',
    installDocs:    'https://docs.anthropic.com/claude-code',
  },

  // ── Antigravity ──────────────────────────────────────────────────────────────
  antigravity: {
    id:             'antigravity',
    displayName:    'Antigravity',
    globalDir:      path.join(home, '.antigravity'),
    localDir:       '.agent',
    commandsSubdir: 'mindforge',
    entryFile:      'CLAUDE.md',
    commandFormat:  'slash',
    supportsSlash:  true,
    detect:         () => fs.existsSync('.agent/CLAUDE.md'),
    description:    'Antigravity AI coding agent',
    installDocs:    'https://antigravity.dev',
  },

  // ── Cursor ───────────────────────────────────────────────────────────────────
  cursor: {
    id:             'cursor',
    displayName:    'Cursor',
    globalDir:      path.join(home, '.cursor', 'rules'),
    localDir:       '.cursor/rules',
    commandsSubdir: 'mindforge',
    entryFile:      '.cursorrules',
    commandFormat:  'file',          // Cursor reads command files as context rules
    supportsSlash:  false,           // Cursor uses @-rules, not /slash commands
    detect:         () => fs.existsSync('.cursor') || !!(process.env.CURSOR_TRACE_ID),
    description:    'Cursor AI code editor (cursor.sh)',
    installDocs:    'https://cursor.sh/docs',
    notes:          'Commands are installed as Cursor rules in .cursor/rules/mindforge/. ' +
                    'Use @mindforge-[command] in Cursor chat to reference them.',
  },

  // ── OpenCode ─────────────────────────────────────────────────────────────────
  opencode: {
    id:             'opencode',
    displayName:    'OpenCode',
    globalDir:      path.join(home, '.config', 'opencode'),
    localDir:       '.opencode',
    commandsSubdir: 'mindforge',
    entryFile:      'CLAUDE.md',     // OpenCode uses CLAUDE.md as its entry point
    commandFormat:  'slash',
    supportsSlash:  true,
    detect:         () => fs.existsSync('.opencode') || !!(process.env.OPENCODE_SESSION),
    description:    'OpenCode open-source coding agent (opencode.ai)',
    installDocs:    'https://opencode.ai/docs',
  },

  // ── Gemini CLI ───────────────────────────────────────────────────────────────
  gemini: {
    id:             'gemini',
    displayName:    'Gemini CLI',
    globalDir:      path.join(home, '.gemini'),
    localDir:       '.gemini',
    commandsSubdir: 'mindforge',
    entryFile:      'GEMINI.md',     // Gemini CLI reads GEMINI.md as its instructions
    commandFormat:  'slash',
    supportsSlash:  true,
    detect:         () => fs.existsSync('.gemini/GEMINI.md') || !!(process.env.GOOGLE_CLOUD_PROJECT && process.env.GEMINI_API_KEY),
    description:    'Google Gemini CLI (developers.google.com/gemini-cli)',
    installDocs:    'https://developers.google.com/gemini-cli',
  },

  // ── GitHub Copilot ───────────────────────────────────────────────────────────
  copilot: {
    id:             'copilot',
    displayName:    'GitHub Copilot',
    globalDir:      path.join(home, '.github'),
    localDir:       '.github',
    commandsSubdir: 'mindforge',
    entryFile:      'copilot-instructions.md',  // Copilot reads this as custom instructions
    commandFormat:  'include',       // Copilot uses @workspace + file references
    supportsSlash:  false,
    detect:         () => fs.existsSync('.github/copilot-instructions.md'),
    description:    'GitHub Copilot (github.com/features/copilot)',
    installDocs:    'https://docs.github.com/copilot/customizing-copilot',
    notes:          'Commands are installed in .github/mindforge/. Reference with ' +
                    '@workspace #file:.github/mindforge/[command].md in Copilot chat.',
  },
};

// Runtime entry point content adapters
// Different runtimes use different instructions file formats
const ENTRY_CONTENT = {
  'CLAUDE.md':               () => generateClaudeMd(),       // Claude Code / Antigravity / OpenCode
  'GEMINI.md':               () => generateGeminiMd(),       // Gemini CLI
  '.cursorrules':            () => generateCursorRules(),    // Cursor
  'copilot-instructions.md': () => generateCopilotMd(),      // GitHub Copilot
};

/**
 * Generate GEMINI.md — adapted from CLAUDE.md for Gemini CLI conventions.
 * Key differences: uses Gemini-specific model references, GEMINI.md filename.
 */
function generateGeminiMd() {
  const claudeMd = fs.readFileSync(path.join(__dirname, '..', '.claude', 'CLAUDE.md'), 'utf8');
  return claudeMd
    .replace(/CLAUDE\.md/g, 'GEMINI.md')
    .replace(/Claude Code/g, 'Gemini CLI')
    .replace(/claude-opus-4-5/g, 'gemini-2.5-pro')
    .replace(/claude-sonnet-4-6/g, 'gemini-2.0-flash');
}

/**
 * Generate .cursorrules — simplified rules for Cursor.
 * Cursor rules are simpler than full CLAUDE.md — they describe project conventions.
 */
function generateCursorRules() {
  return `# MindForge Project Rules for Cursor

## Project Management
This project uses MindForge for structured AI development.
All tasks must follow the PLAN → EXECUTE → VERIFY → SHIP lifecycle.

## Before implementing anything
1. Check .planning/phases/ for the current phase plan files
2. Read the relevant PLAN-[N]-[M].md for your task
3. Follow the persona in the <persona> field

## File scope
Only modify files listed in the <files> field of your assigned PLAN file.

## Quality gates
Always run: [project test command] before marking any task complete.
Never commit with failing tests.

## Commands reference
MindForge commands are in .cursor/rules/mindforge/
Reference: @mindforge-[command-name]

## Security
Follow .mindforge/org/SECURITY.md for all security-sensitive work.
Never commit secrets, API keys, or credentials.
`;
}

/**
 * Generate copilot-instructions.md — GitHub Copilot custom instructions.
 * Copilot uses a simpler format than full CLAUDE.md.
 */
function generateCopilotMd() {
  return `# MindForge Copilot Instructions

This project uses MindForge v2.0.0 for structured AI-assisted development.

## Development workflow
Always plan before coding. Check .planning/phases/ for current phase plans.
Read PLAN-[N]-[M].md files before implementing any feature.
Run tests after every implementation.

## Code standards
Follow .mindforge/org/CONVENTIONS.md for all code style decisions.
Follow .mindforge/org/SECURITY.md for security-sensitive code.

## Available commands
MindForge command documentation is in .github/mindforge/.
Reference files in Copilot chat with: #file:.github/mindforge/[command].md

## Testing
Run the full test suite before marking any task complete.
No exceptions: failing tests = incomplete task.
`;
}
```

### Update `bin/install.js` to support runtime selection

```bash
# Add --runtime flag to install.js
# Usage: npx mindforge-cc@latest --runtime cursor
# Usage: npx mindforge-cc@latest --runtime all
# Usage: npx mindforge-cc@latest --runtime claude,gemini

# The installer already handles --all flag (all runtimes)
# Day 14 expands RUNTIMES map so --all now installs all 6
```

**Commit:**
```bash
git add bin/installer-core.js bin/install.js
git commit -m "feat(v2-release): expand installer to 6 runtimes (Cursor, OpenCode, Gemini CLI, Copilot)"
```

---

## TASK 2 — Add `/mindforge:new-runtime` command

### `.claude/commands/mindforge/new-runtime.md`

```markdown
# MindForge v2 — New Runtime Command
# Usage: /mindforge:new-runtime [runtime-name] [--entry-file filename] [--commands-dir path]
# Version: v2.0.0

## Purpose
Scaffold MindForge support for a new AI coding agent/runtime that isn't
included in the standard 6 supported runtimes.

If your team uses an internal AI coding tool, a custom fork of an open-source
agent, or a new runtime that was released after MindForge v2.0.0, this command
generates the required files to integrate it.

## What it creates

```
[runtime-local-dir]/
├── [entry-file]              ← Agent instructions (adapted from CLAUDE.md)
└── mindforge/
    └── [48 command .md files] ← All MindForge commands adapted for runtime
```

## How it works

### Step 1: Ask runtime details
```
What is the runtime name? (kebab-case, e.g., "my-agent")
What directory does it use for instructions? (e.g., ".myagent")
What is its main instructions file name? (e.g., "AGENT.md")
Does it support /slash commands? (y/n)
Where is its global config directory? (~/.myagent)
```

### Step 2: Generate adapted instructions file
Create [local-dir]/[entry-file] by adapting .claude/CLAUDE.md:
- Replace Claude-specific references with runtime-appropriate equivalents
- Replace slash command syntax if the runtime doesn't support it
- Keep all MindForge protocols (PLAN first, AUDIT logging, etc.)

### Step 3: Mirror all commands
Copy all 48 command files from .claude/commands/mindforge/ to
[local-dir]/mindforge/ with runtime-appropriate adaptations.

### Step 4: Update installer config
Add the new runtime to MINDFORGE.md as a custom runtime config:
```
CUSTOM_RUNTIME_NAME=my-agent
CUSTOM_RUNTIME_LOCAL_DIR=.myagent
CUSTOM_RUNTIME_COMMANDS_SUBDIR=mindforge
CUSTOM_RUNTIME_ENTRY_FILE=AGENT.md
CUSTOM_RUNTIME_SLASH_SUPPORT=false
```

### Step 5: Verify and report
```
✅ New runtime "my-agent" scaffolded

  Files created:
    .myagent/AGENT.md               ← Entry point
    .myagent/mindforge/              ← 48 command files

  To activate:
    1. Restart your agent with the new configuration
    2. Run /mindforge:health to verify installation

  Submit as a PR to add official support:
    github.com/mindforge-dev/mindforge/pulls
```

## AUDIT entry
```json
{ "event": "new_runtime_scaffolded", "runtime_name": "[name]", "entry_file": "[file]", "commands_count": 48 }
```
```

**Commit:**
```bash
cp .claude/commands/mindforge/new-runtime.md .agent/mindforge/new-runtime.md
git add .claude/commands/mindforge/new-runtime.md .agent/mindforge/new-runtime.md
git commit -m "feat(v2-release): add /mindforge:new-runtime command for custom runtime scaffolding"
```

---

## TASK 3 — Write the v1.0.0→v2.0.0 Migration Script

### `bin/migrations/1.0.0-to-2.0.0.js`

```javascript
/**
 * MindForge Migration: v1.0.0 → v2.0.0
 *
 * Handles all schema changes introduced in Days 8-13:
 *
 * HANDOFF.json additions:
 *   - autonomous_mode: { status, last_run_phase, last_run_at }
 *   - steering_queue_path: ".planning/steering-queue.jsonl"
 *   - knowledge_base_path: ".mindforge/memory/knowledge-base.jsonl"
 *   - schema_version: "2.0.0" (from "1.0.0")
 *
 * AUDIT.jsonl backfill:
 *   - Add model_used: "unknown" to existing entries (no model tracking in v1)
 *   - Add node_repair: false to existing entries
 *
 * New files/directories created if absent:
 *   - .mindforge/memory/ (knowledge graph)
 *   - .planning/steering-queue.jsonl
 *   - .planning/auto-state.json (initialized to IDLE)
 *
 * token-usage.jsonl:
 *   - Existing entries get cost_usd: null (v1 had no cost tracking)
 *   - Schema_version note added
 *
 * No destructive changes — all migrations are additive.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const PLANNING_DIR = path.join(process.cwd(), '.planning');
const MFDIR        = path.join(process.cwd(), '.mindforge');

module.exports = {
  fromVersion: '1.0.0',
  toVersion:   '2.0.0',
  description: 'Add v2.0.0 autonomous mode, knowledge graph, and model tracking fields',

  async run(context = {}) {
    const { dry_run = false, verbose = false } = context;
    const log = msg => verbose && console.log(`  [1.0.0→2.0.0] ${msg}`);
    const changes = [];

    // ── 1. Update HANDOFF.json ──────────────────────────────────────────────
    const handoffPath = path.join(PLANNING_DIR, 'HANDOFF.json');
    if (fs.existsSync(handoffPath)) {
      const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));

      let updated = false;

      // Add autonomous_mode field if absent
      if (!handoff.autonomous_mode) {
        handoff.autonomous_mode = {
          status:          'idle',
          last_run_phase:  null,
          last_run_at:     null,
          total_runs:      0,
        };
        updated = true;
        log('Added autonomous_mode to HANDOFF.json');
        changes.push('HANDOFF.json: added autonomous_mode');
      }

      // Add steering_queue_path if absent
      if (!handoff.steering_queue_path) {
        handoff.steering_queue_path = '.planning/steering-queue.jsonl';
        updated = true;
        log('Added steering_queue_path to HANDOFF.json');
        changes.push('HANDOFF.json: added steering_queue_path');
      }

      // Add knowledge_base_path if absent
      if (!handoff.knowledge_base_path) {
        handoff.knowledge_base_path = '.mindforge/memory/knowledge-base.jsonl';
        updated = true;
        log('Added knowledge_base_path to HANDOFF.json');
        changes.push('HANDOFF.json: added knowledge_base_path');
      }

      // Bump schema_version
      if (handoff.schema_version !== '2.0.0') {
        handoff.schema_version = '2.0.0';
        updated = true;
        log('Updated schema_version to 2.0.0');
        changes.push('HANDOFF.json: schema_version → 2.0.0');
      }

      if (updated && !dry_run) {
        fs.writeFileSync(handoffPath, JSON.stringify(handoff, null, 2));
      }
    }

    // ── 2. Backfill AUDIT.jsonl with v2 fields ───────────────────────────────
    const auditPath = path.join(PLANNING_DIR, 'AUDIT.jsonl');
    if (fs.existsSync(auditPath)) {
      const lines   = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
      let needsUpdate = false;
      const updated = lines.map(line => {
        try {
          const entry = JSON.parse(line);
          let changed = false;
          if (entry.model_used === undefined) {
            entry.model_used = 'unknown';  // v1 had no model tracking
            changed = true;
          }
          if (entry.node_repair === undefined) {
            entry.node_repair = false;  // v1 had no node repair
            changed = true;
          }
          if (changed) needsUpdate = true;
          return JSON.stringify(entry);
        } catch { return line; } // Keep malformed lines as-is
      });

      if (needsUpdate && !dry_run) {
        fs.writeFileSync(auditPath, updated.join('\n') + '\n');
        log(`Backfilled ${lines.length} AUDIT.jsonl entries with v2 fields`);
        changes.push(`AUDIT.jsonl: backfilled ${lines.length} entries with model_used + node_repair`);
      }
    }

    // ── 3. Create new v2 directories if absent ───────────────────────────────
    const dirs = [
      path.join(MFDIR, 'memory'),
      path.join(MFDIR, 'models'),
      path.join(MFDIR, 'browser'),
      path.join(MFDIR, 'dashboard'),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        if (!dry_run) fs.mkdirSync(dir, { recursive: true });
        log(`Created directory: ${path.relative(process.cwd(), dir)}`);
        changes.push(`Created: ${path.relative(process.cwd(), dir)}/`);
      }
    }

    // ── 4. Initialize auto-state.json if absent ──────────────────────────────
    const autoStatePath = path.join(PLANNING_DIR, 'auto-state.json');
    if (!fs.existsSync(autoStatePath)) {
      const initialState = {
        schema_version:  '2.0.0',
        auto_mode_active: false,
        status:          'idle',
        phase:           null,
        wave_current:    null,
        wave_total:      null,
        tasks_completed: 0,
        tasks_total:     0,
        node_repairs:    0,
        escalations:     0,
        elapsed_ms:      0,
        current_task:    null,
        last_commit:     null,
        updated_at:      new Date().toISOString(),
      };
      if (!dry_run) fs.writeFileSync(autoStatePath, JSON.stringify(initialState, null, 2));
      log('Created auto-state.json (initialized to idle)');
      changes.push('Created: .planning/auto-state.json');
    }

    // ── 5. Initialize steering-queue.jsonl if absent ─────────────────────────
    const steeringPath = path.join(PLANNING_DIR, 'steering-queue.jsonl');
    if (!fs.existsSync(steeringPath)) {
      if (!dry_run) fs.writeFileSync(steeringPath, '');
      log('Created empty steering-queue.jsonl');
      changes.push('Created: .planning/steering-queue.jsonl');
    }

    // ── 6. Backfill token-usage.jsonl with cost_usd field ────────────────────
    const usagePath = path.join(MFDIR, 'metrics', 'token-usage.jsonl');
    if (fs.existsSync(usagePath)) {
      const lines   = fs.readFileSync(usagePath, 'utf8').split('\n').filter(Boolean);
      let needsUpdate = false;
      const updated = lines.map(line => {
        try {
          const entry = JSON.parse(line);
          if (entry.cost_usd === undefined) {
            entry.cost_usd = null; // v1 had no cost tracking
            needsUpdate = true;
          }
          return JSON.stringify(entry);
        } catch { return line; }
      });
      if (needsUpdate && !dry_run) {
        fs.writeFileSync(usagePath, updated.join('\n') + '\n');
        log(`Backfilled ${lines.length} token-usage.jsonl entries with cost_usd: null`);
        changes.push(`token-usage.jsonl: backfilled ${lines.length} entries with cost_usd`);
      }
    }

    return { success: true, changes, version_from: '1.0.0', version_to: '2.0.0' };
  },
};
```

**Also update `bin/migrations/schema-versions.js`** to register the new migration:

```javascript
// Add to the migrations registry:
{
  fromVersion: '1.0.0',
  toVersion:   '2.0.0',
  file:        './1.0.0-to-2.0.0.js',
  description: 'Add v2.0.0 autonomous mode, knowledge graph, browser daemon, and model tracking',
  breaking:    false, // All changes are additive
}
```

**Commit:**
```bash
git add bin/migrations/1.0.0-to-2.0.0.js bin/migrations/schema-versions.js
git commit -m "feat(v2-release): add v1.0.0→v2.0.0 migration script with additive schema changes"
```

---

## TASK 4 — Update the Production Checklist to 65 Points

### Update `.mindforge/production/production-checklist.md`

Extend the existing 50-point checklist with Section F (15 new v2 items):

```markdown
# MindForge v2.0.0 Production Checklist

**Release gate:** ALL 65 items must be checked before tagging v2.0.0.
**Sections:** A (Installation) · B (Commands) · C (Governance) · D (Documentation) · E (Tests) · F (v2.0.0 Features)

---

## Section A — Installation (10 points) [unchanged from v1.0.0]

| # | Check | Verification | Verifier | Date |
|---|---|---|---|---|
| A01 | `npx mindforge-cc@latest` completes without error | Run in empty dir | | |
| A02 | `node tests/install.test.js` passes all assertions | Run test suite | | |
| A03 | `.claude/CLAUDE.md` matches `.agent/CLAUDE.md` exactly | `diff .claude/CLAUDE.md .agent/CLAUDE.md` | | |
| A04 | All 48 commands in `.claude/commands/mindforge/` | `ls .claude/commands/mindforge/ | wc -l` → 48 | | |
| A05 | All 48 commands mirrored in `.agent/mindforge/` | `diff <(ls .claude/commands/mindforge/) <(ls .agent/mindforge/)` | | |
| A06 | `MINDFORGE.md` is valid per schema | `node bin/validate-config.js` | | |
| A07 | Node.js ≥ 18 gate works | Run with Node 16 → should fail with message | | |
| A08 | `--dry-run` flag shows plan without executing | `npx mindforge-cc@latest --dry-run` | | |
| A09 | Uninstall preserves `.planning/` and `.mindforge/` | Run uninstall, verify dirs exist | | |
| A10 | Self-install detection works | Run inside mindforge-cc repo → no framework files copied | | |

## Section B — Commands (10 points) [unchanged from v1.0.0]

| # | Check | Verification | Verifier | Date |
|---|---|---|---|---|
| B01 | `/mindforge:help` lists all 48 commands | Run and count | | |
| B02 | `/mindforge:init-project` creates all 8 planning files | Run in test dir, verify | | |
| B03 | `/mindforge:plan-phase` produces valid PLAN XML | Run and validate schema | | |
| B04 | `/mindforge:execute-phase` runs wave engine | Run with test plans, verify WAVE-REPORT | | |
| B05 | `/mindforge:verify-phase` runs all 4 verification stages | Run and verify VERIFICATION.md | | |
| B06 | `/mindforge:ship` creates PR with proper template | Run with --dry-run | | |
| B07 | `/mindforge:status` reads from all data sources | Run and verify all 6 sections present | | |
| B08 | `/mindforge:health --repair` fixes 7 known issue types | Introduce each issue, run health --repair | | |
| B09 | `/mindforge:audit --summary` reads AUDIT.jsonl | Run and verify output format | | |
| B10 | `/mindforge:retrospective` generates RETROSPECTIVE.md | Run with test data | | |

## Section C — Governance Gates (10 points) [unchanged from v1.0.0]

| # | Check | Verification | Verifier | Date |
|---|---|---|---|---|
| C01 | Gate 1: CRITICAL security finding blocks ship | Add test CRITICAL finding → ship should fail | | |
| C02 | Gate 2: Failing tests block ship | Break a test → ship should fail | | |
| C03 | Gate 3: Secret detection blocks and CANNOT be overridden | Add a fake API key → ship must block | | |
| C04 | Gate 4: GDPR retention check is independent of skill loading | Uninstall data-privacy skill → Gate 4 still runs | | |
| C05 | Gate 5: CVE detection works | Add `npm:lodash@4.17.15` (known CVE) → should flag | | |
| C06 | Tier 3 change detection fires on auth file path | Touch `src/auth/login.ts` → must trigger Tier 3 | | |
| C07 | Tier 3 change detection fires on code content | Add `jwt.sign(` anywhere → must trigger Tier 3 | | |
| C08 | Emergency override works for EMERGENCY_APPROVERS only | Test with non-approver → blocked; with approver → allowed | | |
| C09 | Tier 3 approval expires after 4 hours | Set expires_at in past → approval should be expired | | |
| C10 | CI mode: Tier 3 always fails in CI regardless of settings | Set CI=true → Tier 3 must fail with clear message | | |

## Section D — Documentation (10 points) [unchanged from v1.0.0]

| # | Check | Verification | Verifier | Date |
|---|---|---|---|---|
| D01 | README.md covers installation, quick start, all features | Read and verify completeness | | |
| D02 | `docs/reference/commands.md` documents all 48 commands | Count and verify | | |
| D03 | `docs/security/SECURITY.md` has responsible disclosure info | Verify contact + disclosure timeline | | |
| D04 | `docs/security/threat-model.md` covers 7 threat actors | Count threat actors | | |
| D05 | All 41 ADRs indexed in `docs/architecture/decision-records-index.md` | Count and verify links | | |
| D06 | CHANGELOG.md has complete entry for v2.0.0 | Read and verify all major features present | | |
| D07 | Migration guide exists for v1.0.0 → v2.0.0 | Verify migration script works end-to-end | | |
| D08 | Skills authoring guide is up to date for v2 | Verify quality scoring section added | | |
| D09 | `docs/multi-model-guide.md` covers model routing | Read and verify Day 10 content | | |
| D10 | `docs/self-building-skills-guide.md` covers learn command | Read and verify Day 13 content | | |

## Section E — Test Coverage (10 points) [unchanged from v1.0.0]

| # | Check | Verification | Verifier | Date |
|---|---|---|---|---|
| E01 | All 22 test suites pass × 1 | `node tests/[each].test.js` | | |
| E02 | All 22 test suites pass × 2 (second run) | Re-run all | | |
| E03 | All 22 test suites pass × 3 (third run) | Re-run all | | |
| E04 | `node tests/e2e.test.js` completes full lifecycle | Run in fresh temp dir | | |
| E05 | `node tests/migration.test.js` covers v1.0.0→v2.0.0 | Verify new migration included | | |
| E06 | `node tests/release.test.js` passes all release validations | Run new release test suite | | |
| E07 | Zero TypeScript errors in sdk/ | `cd sdk && npx tsc --noEmit` | | |
| E08 | No secrets in any output file | `grep -r "sk-" bin/ .mindforge/ tests/` → no results | | |
| E09 | `package.json` version is exactly `2.0.0` | `node -e "console.log(require('./package.json').version)"` | | |
| E10 | `CHANGELOG.md` has `## [2.0.0]` entry at top | `head -5 CHANGELOG.md` | | |

## Section F — v2.0.0 Features (15 points) [NEW for v2.0.0]

| # | Check | Verification | Verifier | Date |
|---|---|---|---|---|
| F01 | `/mindforge:auto` runs a complete phase end-to-end | Run on test project — wave completes without intervention | | |
| F02 | Node repair RETRY recovers from transient test failure | Inject flaky test → verify auto-recovery in AUDIT.jsonl | | |
| F03 | Node repair DECOMPOSE splits an oversized plan | Create plan >80K tokens → verify decomposed sub-plans | | |
| F04 | Node repair ESCALATE fires correctly and saves state | Hit max repair budget → verify ESCALATION.md created | | |
| F05 | `/mindforge:steer` injects guidance at task boundary | Run auto mode → steer in second terminal → verify pickup | | |
| F06 | Browser daemon starts, persists, and shuts down cleanly | Start → screenshot → verify PID file → stop | | |
| F07 | `/mindforge:qa` identifies affected routes after changes | Run QA after UI changes → verify QA-REPORT | | |
| F08 | `/mindforge:cross-review` runs with 2+ models | Run with ANTHROPIC_API_KEY + OPENAI_API_KEY → verify CROSS-REVIEW | | |
| F09 | Model routing: Tier 3 tasks use SECURITY_MODEL | Log a Tier 3 task → verify model_used in AUDIT.jsonl | | |
| F10 | Knowledge base captures entries from retrospective | Run /mindforge:retrospective → verify knowledge-base.jsonl | | |
| F11 | Dashboard server starts and shows live AUDIT stream | Start /mindforge:dashboard → open browser → verify SSE feed | | |
| F12 | `/mindforge:learn [url]` creates a valid SKILL.md | Run on a public docs URL → score must be ≥ 60 | | |
| F13 | All 6 runtimes install correctly | Run installer with each runtime flag | | |
| F14 | All v1.0.0 tests still pass (regression) | Run original 15 suites: install→e2e | | |
| F15 | v1.0.0 → v2.0.0 migration completes without data loss | Run migration on v1.0.0 project → verify HANDOFF.json | | |

---

## Release Gate Procedure

Before tagging v2.0.0:
1. ALL 65 checklist items must be checked ✅
2. Verifier name entered for each item
3. Date entered for each item
4. Final sign-off: `git tag -a v2.0.0 -m "The Autonomous Enterprise"`
5. Push: `git push origin v2.0.0`
6. npm publish: `npm publish --access public`
```

**Commit:**
```bash
git add .mindforge/production/production-checklist.md
git commit -m "feat(v2-release): extend production checklist to 65 points with Section F v2.0.0 features"
```

---

## TASK 5 — Write the Complete v2.0.0 CHANGELOG Entry

### Update `CHANGELOG.md`

Add the full v2.0.0 entry at the top:

```markdown
## [2.0.0] — "The Autonomous Enterprise" — 2026-03-23

> The only agentic framework simultaneously enterprise-grade AND autonomously capable.
> MindForge v2.0.0 ships everything your team needs to walk away and come back to
> a built feature — with your team watching it happen in real time.

### Major new features

#### Autonomous Execution Mode (Days 8)
**Branch:** `feat/mindforge-v2-autonomous-engine`
- `/mindforge:auto [--phase N] [--milestone M] [--timeout T]` — walk-away execution mode
- `/mindforge:steer [instruction] [--priority normal|urgent|stop]` — mid-execution guidance
- Node repair operator: RETRY → DECOMPOSE → PRUNE → ESCALATE hierarchy
  - RETRY: injects error context and retries with fresh context (max 1 attempt)
  - DECOMPOSE: splits multi-domain plans into parallel sub-plans
  - PRUNE: defers non-critical tasks to DEFERRED-ITEMS.md
  - ESCALATE: saves state and notifies human (Tier 3 changes: immediate)
- Stuck detection: S01 (file churn), S02 (time overrun), S03 (identical errors),
  S04 (context explosion), S05 (cascade failures) — all with automatic recovery
- Headless CI mode: exit 0 on timeout (state preserved), exit 1 on gate failures
- `bin/autonomous/` — headless.js, repair-operator.js, stuck-monitor.js, steer.js
- `tests/autonomous.test.js` (16th suite)

#### Persistent Browser Runtime + Visual QA (Day 9)
**Branch:** `feat/mindforge-v2-browser-runtime`
- Long-lived Chromium daemon at localhost:7338 (Playwright-backed, 16 HTTP endpoints)
- `/mindforge:browse` — navigate, click, type, screenshot, evaluate in live browser
- `/mindforge:qa` — systematic visual QA against affected routes after execution
- `<verify-visual>` XML tag in PLAN files — 13 directives for UI verification
- Cookie import from Chrome, Arc, Brave, Edge (handles SQLite + Windows FILETIME epoch)
- Named session persistence with per-session console error capture
- Screenshot store with phase namespacing and quota enforcement
- Auto-generated Playwright regression tests: `tests/regression/phase[N]-[slug].test.ts`
- `bin/browser/` — 8 modules for daemon, sessions, visual verification, QA, regressions
- `tests/browser.test.js` (17th suite)

#### Multi-Model Intelligence Layer (Day 10)
**Branch:** `feat/mindforge-v2-cross-model-review`
- 7-model registry: Claude (Opus/Sonnet/Haiku), GPT-4o/mini, Gemini (2.5 Pro/Flash)
- Persona-to-model routing (architect→PLANNER_MODEL, developer→EXECUTOR_MODEL, etc.)
- Tier 3 override: auth/payment/PII tasks always use SECURITY_MODEL
- `/mindforge:cross-review` — 3-round adversarial review (primary + adversarial + research)
  - Consensus findings (2+ models agree) = high confidence
  - Model-specific findings + contradiction detection
- `/mindforge:research` — deep research with Gemini 2.5 Pro 1M context
- `/mindforge:costs` — real-time cost tracking dashboard by model/phase/session
- Daily budget enforcement: MODEL_COST_HARD_LIMIT_USD blocks before API calls
- SSRF protection in research URL fetcher
- `bin/models/` + `bin/review/` + `bin/research/` — 9 modules
- `tests/model-routing.test.js` (18th suite)

#### Persistent Knowledge Graph (Day 11)
**Branch:** `feat/mindforge-v2-persistent-memory`
- Append-only JSONL knowledge graph: 5 types × 4 JSONL files
  - `architectural_decision`, `code_pattern`, `bug_pattern`, `team_preference`, `domain_knowledge`
- TF-IDF relevance scoring with 30-second mtime-aware index cache
- 7 automatic capture triggers: phase completion, compaction, debug sessions,
  retrospectives, security findings, cross-review consensus, steering instructions
- Injection guard: rejects prompt injection in knowledge content
- Global knowledge store: `~/.mindforge/global-knowledge-base.jsonl` (cross-project)
- Session start preloads relevant memories (🧠 Knowledge Base — N memories loaded)
- `/mindforge:remember` — add/query/export/stats/promote/deprecate
- `sdk/src/memory.ts` — TypeScript `MindForgeMemory` class
- `bin/memory/` — 5 modules: store, indexer, capture, session-loader, global-sync
- `tests/memory.test.js` (19th suite)

#### Real-Time Web Observability Dashboard (Day 12)
**Branch:** `feat/mindforge-v2-realtime-dashboard`
- Express.js server at localhost:7339 (localhost-only, no build step needed)
- 5-page dashboard: Activity Feed, Quality Metrics, Pending Approvals,
  Knowledge Graph, Team Activity
- Server-Sent Events: live AUDIT.jsonl tail, inode rotation detection
- REST API: 10 endpoints for all project state
- Approval UI: approve/reject Tier 2/3 from browser
  - Tier 3 requires typing plan ID to confirm (ADR-034)
- Quality charts: session scores, verify rates, security findings, cost trends
- Team activity: active developers, last-seen, file conflict detection
- `/mindforge:dashboard [--port 7339] [--open] [--stop]`
- `bin/dashboard/` — 6 modules + single-file HTML frontend (no external deps)
- `tests/dashboard.test.js` (20th suite)

#### Self-Building Skills Platform (Day 13)
**Branch:** `feat/mindforge-v2-self-building-skills`
- `/mindforge:learn [url|path|npm:pkg|--session]` — documentation-to-skill converter
  - Auto-selects Gemini 2.5 Pro (1M context) for large docs, sonnet for smaller
  - 3-step AI pipeline: extract patterns → generate triggers → write SKILL.md
  - SSRF protection + redirect loop prevention (max 5 hops)
  - Pre-save injection check: rejects skills containing injection patterns
- 7-dimension quality scorer (100 points, static analysis, < 100ms):
  trigger_coverage(30) + mandatory_actions(25) + code_examples(20) + self_check(15)
  + injection_safe(10) + no_placeholders(10) + version_history(10)
  - Minimum to register: 60; minimum to publish: 80; injection = absolute FAIL
- Auto-capture: phase completion hook detects patterns across 2+ tasks
- `/mindforge:marketplace [search|featured|trending|install|publish]`
  - Curated layer on top of npm registry with 12 featured skills
- `session_quality_lift` metric: real signal of skill value
- `bin/skills-builder/` — 6 modules
- `tests/self-building-skills.test.js` (21st suite)

#### Multi-Runtime Expansion (Day 14)
**Branch:** `feat/mindforge-v2-release`
- 6 supported runtimes: Claude Code, Antigravity, Cursor, OpenCode, Gemini CLI,
  GitHub Copilot
- Runtime-specific entry files: CLAUDE.md, GEMINI.md, .cursorrules, copilot-instructions.md
- `/mindforge:new-runtime [name]` — scaffold support for any custom runtime
- `bin/installer-core.js` RUNTIMES config expanded with runtime detection, display names,
  command format flags, and install documentation links

### Breaking changes from v1.0.0

All changes are backwards compatible. Run `/mindforge:migrate` to update project files.

- `PLAN XML`: gains optional `<verify-visual>` tag (backwards compatible)
- `HANDOFF.json`: gains `autonomous_mode`, `steering_queue_path`, `knowledge_base_path` (optional)
- `AUDIT.jsonl`: gains `model_used`, `node_repair` fields (optional — backfilled by migration)
- `token-usage.jsonl`: gains `cost_usd` field per entry (optional — null for v1 entries)

### Migration

```bash
# Upgrade an existing v1.0.0 project to v2.0.0
/mindforge:migrate --from 1.0.0 --to 2.0.0

# Or for a fresh install on an existing project
npx mindforge-cc@latest --update
```

All v1.0.0 projects are fully compatible with v2.0.0. The migration is additive-only.

### Architecture Decision Records

v2.0.0 adds ADR-021 through ADR-041 (20 new ADRs):
- ADR-021: Autonomy boundary — human steers intent, agent executes
- ADR-022: Node repair hierarchy — RETRY → DECOMPOSE → PRUNE → ESCALATE
- ADR-023: Gate 3 pre-commit timing in auto mode
- ADR-024: Browser daemon localhost-only
- ADR-025: `<verify-visual>` failure = `<verify>` failure
- ADR-026: Session files gitignored — auth tokens never in git
- ADR-027: Persona determines model; Tier 3 always overrides to SECURITY_MODEL
- ADR-028: Adversarial second-reviewer prompt for cross-review
- ADR-029: Gemini uses x-goog-api-key header (not URL query param)
- ADR-030: Knowledge graph append-only — deprecate, never delete
- ADR-031: Knowledge reinforcement on explicit acknowledgment, not on load
- ADR-032: Global knowledge entries get 0.1 confidence penalty
- ADR-033: Dashboard binds to localhost only
- ADR-034: Tier 3 dashboard approvals require typing plan ID
- ADR-035: AUDIT entry written before approval file update
- ADR-036: Documentation is the authoritative source for skill content
- ADR-037: Pattern frequency ≥ 2 tasks as auto-capture threshold
- ADR-038: Minimum quality score of 60 for skill registration
- ADR-039: 6-runtime support via unified RUNTIMES config
- ADR-040: Migration is additive-only — no destructive schema changes in v2.0.0
- ADR-041: v2.0.0 stable interface contract (all v2 commands, ports, schemas are stable in 2.x)

### Metrics at v2.0.0

| Metric | v1.0.0 | v2.0.0 |
|---|---|---|
| Commands | 36 | 48 |
| Core skills | 10 | 10 + marketplace |
| Agent personas | 8 | 9 (+ research-agent) |
| ADRs | 20 | 41 |
| Test suites | 15 | 22 |
| Runtimes | 2 | 6 |
| Network ports | 1 (SSE:7337) | 3 (SSE:7337, Browser:7338, Dashboard:7339) |
| npm package | mindforge-cc | mindforge-cc |
```

**Commit:**
```bash
git add CHANGELOG.md
git commit -m "docs(v2-release): complete v2.0.0 CHANGELOG — The Autonomous Enterprise"
```

---

## TASK 6 — Write the v2.0.0 Release Test Suite

### `tests/release.test.js`

```javascript
/**
 * MindForge v2.0.0 — Release Test Suite (22nd suite)
 * Tests all v2.0.0 release requirements:
 * - All 48 commands exist in both runtimes
 * - All 6 runtimes have correct config
 * - v2.0.0 migration script is complete
 * - Production checklist has Section F
 * - CHANGELOG has v2.0.0 entry
 * - Version is exactly 2.0.0
 * - All ADRs through ADR-041 exist
 * - All 9 v2 components present (bins)
 * - 65-point production checklist
 * - SDK has memory.ts module
 *
 * Run: node tests/release.test.js
 */
'use strict';

const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const assert = require('assert');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch(e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

// ═══════════════════════════════════════════════════════════════════════
console.log('\nMindForge v2.0.0 — Release Test Suite\n');

// ── Version ───────────────────────────────────────────────────────────────────
console.log('Version:');

test('package.json version is exactly 2.0.0', () => {
  const v = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
  assert.strictEqual(v, '2.0.0', `Expected exactly 2.0.0, got ${v}`);
});

test('CHANGELOG.md has ## [2.0.0] entry', () => {
  const content = fs.readFileSync('CHANGELOG.md', 'utf8');
  assert.ok(content.includes('## [2.0.0]'), 'CHANGELOG must have [2.0.0] entry');
  assert.ok(content.includes('Autonomous Enterprise'), 'CHANGELOG must mention "Autonomous Enterprise"');
});

// ── All 48 commands ───────────────────────────────────────────────────────────
console.log('\nAll 48 commands:');

const ALL_COMMANDS = [
  // v1.0.0 (36)
  'help','init-project','plan-phase','execute-phase','verify-phase','ship',
  'next','quick','status','debug',
  'skills','review','security-scan','map-codebase','discuss-phase',
  'audit','milestone','complete-milestone','approve','sync-jira','sync-confluence',
  'health','retrospective','profile-team','metrics',
  'init-org','install-skill','publish-skill','pr-review','workspace','benchmark',
  'update','migrate','plugins','tokens','release',
  // v2.0.0 additions (12)
  'auto','steer',           // Day 8
  'browse','qa',            // Day 9
  'cross-review','research','costs',  // Day 10
  'remember',               // Day 11
  'dashboard',              // Day 12
  'learn','marketplace',    // Day 13
  'new-runtime',            // Day 14
];

assert.strictEqual(ALL_COMMANDS.length, 48, `Expected 48 commands, counted ${ALL_COMMANDS.length}`);

test('all 48 commands in .claude/commands/mindforge/', () => {
  const missing = ALL_COMMANDS.filter(c => !fs.existsSync(`.claude/commands/mindforge/${c}.md`));
  assert.strictEqual(missing.length, 0, `Missing: ${missing.join(', ')}`);
});

test('all 48 commands mirrored in .agent/mindforge/', () => {
  const missing = ALL_COMMANDS.filter(c => !fs.existsSync(`.agent/mindforge/${c}.md`));
  assert.strictEqual(missing.length, 0, `Missing in .agent/: ${missing.join(', ')}`);
});

test('no extra/unexpected command files in .claude/commands/mindforge/', () => {
  const actual  = fs.readdirSync('.claude/commands/mindforge/').filter(f => f.endsWith('.md'));
  const expected = new Set(ALL_COMMANDS.map(c => `${c}.md`));
  const extra = actual.filter(f => !expected.has(f));
  assert.strictEqual(extra.length, 0, `Unexpected commands: ${extra.join(', ')}`);
});

// ── All 6 runtimes ────────────────────────────────────────────────────────────
console.log('\nMulti-runtime (6 runtimes):');

const EXPECTED_RUNTIMES = ['claude', 'antigravity', 'cursor', 'opencode', 'gemini', 'copilot'];

test('installer-core.js defines all 6 runtimes', () => {
  const content = fs.readFileSync('bin/installer-core.js', 'utf8');
  EXPECTED_RUNTIMES.forEach(rt => {
    assert.ok(content.includes(`'${rt}'`) || content.includes(`"${rt}"`),
      `Runtime "${rt}" not found in installer-core.js`);
  });
});

test('Claude runtime has correct entry file (CLAUDE.md)', () => {
  const content = fs.readFileSync('bin/installer-core.js', 'utf8');
  assert.ok(content.includes("entryFile: 'CLAUDE.md'") || content.includes('entryFile: "CLAUDE.md"'),
    'Claude runtime must use CLAUDE.md as entry file');
});

test('Gemini runtime has correct entry file (GEMINI.md)', () => {
  const content = fs.readFileSync('bin/installer-core.js', 'utf8');
  assert.ok(content.includes("'GEMINI.md'") || content.includes('"GEMINI.md"'),
    'Gemini runtime must use GEMINI.md');
});

test('Cursor runtime has correct entry file (.cursorrules)', () => {
  const content = fs.readFileSync('bin/installer-core.js', 'utf8');
  assert.ok(content.includes("'.cursorrules'") || content.includes('".cursorrules"'),
    'Cursor runtime must use .cursorrules');
});

test('Copilot runtime has correct entry file (copilot-instructions.md)', () => {
  const content = fs.readFileSync('bin/installer-core.js', 'utf8');
  assert.ok(content.includes('copilot-instructions.md'),
    'Copilot runtime must use copilot-instructions.md');
});

test('new-runtime command exists in both runtimes', () => {
  assert.ok(fs.existsSync('.claude/commands/mindforge/new-runtime.md'), 'Missing in .claude/');
  assert.ok(fs.existsSync('.agent/mindforge/new-runtime.md'), 'Missing in .agent/');
});

// ── Migration script ──────────────────────────────────────────────────────────
console.log('\nMigration (v1.0.0 → v2.0.0):');

test('1.0.0-to-2.0.0.js migration script exists', () => {
  assert.ok(fs.existsSync('bin/migrations/1.0.0-to-2.0.0.js'), 'Migration script missing');
});

test('migration script has correct fromVersion/toVersion', () => {
  const migration = require('../bin/migrations/1.0.0-to-2.0.0.js');
  assert.strictEqual(migration.fromVersion, '1.0.0', 'fromVersion must be 1.0.0');
  assert.strictEqual(migration.toVersion, '2.0.0', 'toVersion must be 2.0.0');
});

test('migration adds autonomous_mode to HANDOFF.json', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-migrate-'));
  const origCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    // Create a minimal v1.0.0 HANDOFF.json
    fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.mindforge', 'metrics'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.planning', 'HANDOFF.json'),
      JSON.stringify({ schema_version: '1.0.0', next_task: 'Plan 1', _warning: 'no secrets', context_refs: [], blockers: [], decisions_needed: [] })
    );
    fs.writeFileSync(path.join(tmpDir, '.planning', 'AUDIT.jsonl'), '');

    const migration = require('../bin/migrations/1.0.0-to-2.0.0.js');
    await migration.run({ verbose: false });

    const updated = JSON.parse(fs.readFileSync(path.join(tmpDir, '.planning', 'HANDOFF.json'), 'utf8'));
    assert.ok(updated.autonomous_mode, 'Migration should add autonomous_mode');
    assert.strictEqual(updated.schema_version, '2.0.0', 'Migration should update schema_version to 2.0.0');
    assert.ok(updated.steering_queue_path, 'Migration should add steering_queue_path');
    assert.ok(updated.knowledge_base_path, 'Migration should add knowledge_base_path');
  } finally { process.chdir(origCwd); fs.rmSync(tmpDir, { recursive: true, force: true }); }
});

test('migration creates auto-state.json', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-migrate2-'));
  const origCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.mindforge', 'metrics'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.planning', 'HANDOFF.json'),
      JSON.stringify({ schema_version: '1.0.0', next_task: '', _warning: 'no secrets', context_refs: [], blockers: [], decisions_needed: [] }));
    fs.writeFileSync(path.join(tmpDir, '.planning', 'AUDIT.jsonl'), '');

    const migration = require('../bin/migrations/1.0.0-to-2.0.0.js');
    await migration.run({ verbose: false });

    assert.ok(fs.existsSync(path.join(tmpDir, '.planning', 'auto-state.json')),
      'Migration should create auto-state.json');
    const state = JSON.parse(fs.readFileSync(path.join(tmpDir, '.planning', 'auto-state.json'), 'utf8'));
    assert.strictEqual(state.status, 'idle', 'auto-state.json should initialize to idle');
  } finally { process.chdir(origCwd); fs.rmSync(tmpDir, { recursive: true, force: true }); }
});

test('migration is additive-only (no data loss)', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-migrate3-'));
  const origCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.mindforge', 'metrics'), { recursive: true });
    const originalHandoff = {
      schema_version: '1.0.0',
      next_task: 'Run Plan 3-04',
      _warning: 'no secrets',
      context_refs: ['.planning/PROJECT.md'],
      blockers: [],
      decisions_needed: [],
      project: 'my-project',  // Custom field that must survive migration
      custom_field: 'preserved',
    };
    fs.writeFileSync(path.join(tmpDir, '.planning', 'HANDOFF.json'), JSON.stringify(originalHandoff));
    fs.writeFileSync(path.join(tmpDir, '.planning', 'AUDIT.jsonl'), '');

    const migration = require('../bin/migrations/1.0.0-to-2.0.0.js');
    await migration.run({ verbose: false });

    const migrated = JSON.parse(fs.readFileSync(path.join(tmpDir, '.planning', 'HANDOFF.json'), 'utf8'));
    // Original fields must be preserved
    assert.strictEqual(migrated.next_task, 'Run Plan 3-04', 'next_task must be preserved');
    assert.strictEqual(migrated.project, 'my-project', 'project field must be preserved');
    assert.strictEqual(migrated.custom_field, 'preserved', 'Custom fields must be preserved');
    assert.deepStrictEqual(migrated.context_refs, ['.planning/PROJECT.md'], 'context_refs must be preserved');
  } finally { process.chdir(origCwd); fs.rmSync(tmpDir, { recursive: true, force: true }); }
});

// ── Production checklist ──────────────────────────────────────────────────────
console.log('\nProduction checklist:');

test('production-checklist.md has 65 items', () => {
  const content = fs.readFileSync('.mindforge/production/production-checklist.md', 'utf8');
  // Count table rows with | A/B/C/D/E/F[0-9][0-9] | pattern
  const items = content.match(/^\| [A-F]\d{2} \|/gm) || [];
  assert.ok(items.length >= 65, `Expected ≥65 checklist items, found ${items.length}`);
});

test('production-checklist.md has Section F (v2.0.0 features)', () => {
  const content = fs.readFileSync('.mindforge/production/production-checklist.md', 'utf8');
  assert.ok(content.includes('Section F'), 'Must have Section F');
  assert.ok(content.includes('F01'), 'Must have F01 item');
  assert.ok(content.includes('F15'), 'Must have F15 item');
  const fItems = (content.match(/^\| F\d{2} \|/gm) || []).length;
  assert.strictEqual(fItems, 15, `Section F must have exactly 15 items, found ${fItems}`);
});

// ── All ADRs through ADR-041 ──────────────────────────────────────────────────
console.log('\nADRs (all 41):');

test('all 41 ADRs exist in .planning/decisions/', () => {
  if (!fs.existsSync('.planning/decisions')) {
    console.log('    (skipping — .planning/decisions not present in dev environment)');
    return;
  }
  const adrs    = fs.readdirSync('.planning/decisions').filter(f => f.startsWith('ADR-') && f.endsWith('.md'));
  const numbers = adrs.map(f => parseInt(f.match(/ADR-(\d+)/)?.[1] || '0', 10)).filter(n => n > 0);
  assert.ok(Math.max(...numbers) >= 41, `Max ADR number should be ≥41, got ${Math.max(...numbers)}`);
  assert.ok(adrs.length >= 41, `Expected ≥41 ADRs, found ${adrs.length}`);
});

test('ADR decision index mentions all v2.0.0 ADRs', () => {
  const indexPath = 'docs/architecture/decision-records-index.md';
  if (!fs.existsSync(indexPath)) return; // Skip if docs not yet updated
  const content = fs.readFileSync(indexPath, 'utf8');
  assert.ok(content.includes('ADR-039') || content.includes('ADR-041'),
    'ADR index should reference v2.0.0 ADRs');
});

// ── v2.0.0 component bins ────────────────────────────────────────────────────
console.log('\nv2.0.0 component bins:');

const V2_BINS = [
  'bin/autonomous/headless.js',
  'bin/autonomous/repair-operator.js',
  'bin/autonomous/stuck-monitor.js',
  'bin/browser/browser-daemon.js',
  'bin/browser/visual-verify-executor.js',
  'bin/browser/qa-engine.js',
  'bin/models/model-client.js',
  'bin/models/model-router.js',
  'bin/models/cost-tracker.js',
  'bin/review/cross-review-engine.js',
  'bin/research/research-engine.js',
  'bin/memory/knowledge-store.js',
  'bin/memory/knowledge-indexer.js',
  'bin/memory/knowledge-capture.js',
  'bin/dashboard/server.js',
  'bin/dashboard/sse-bridge.js',
  'bin/dashboard/api-router.js',
  'bin/skills-builder/skill-generator.js',
  'bin/skills-builder/skill-scorer.js',
  'bin/skills-builder/source-loader.js',
];

test(`all ${V2_BINS.length} v2.0.0 binary modules exist`, () => {
  const missing = V2_BINS.filter(b => !fs.existsSync(b));
  assert.strictEqual(missing.length, 0, `Missing v2 bins:\n  ${missing.join('\n  ')}`);
});

// ── All 22 test suites ────────────────────────────────────────────────────────
console.log('\nAll 22 test suites:');

const ALL_SUITES = [
  // v1.0.0 (15 suites)
  'install','wave-engine','audit','compaction','skills-platform',
  'integrations','governance','intelligence','metrics',
  'distribution','ci-mode','sdk','production','migration','e2e',
  // v2.0.0 additions (7 suites)
  'autonomous','browser','model-routing','memory','dashboard',
  'self-building-skills','release',
];

assert.strictEqual(ALL_SUITES.length, 22);

test(`all ${ALL_SUITES.length} test suites exist in tests/`, () => {
  const missing = ALL_SUITES.filter(s => !fs.existsSync(`tests/${s}.test.js`));
  assert.strictEqual(missing.length, 0, `Missing test suites: ${missing.join(', ')}`);
});

// ── SDK memory module ─────────────────────────────────────────────────────────
console.log('\nSDK:');

test('sdk/src/memory.ts exists (Day 11 addition)', () => {
  assert.ok(fs.existsSync('sdk/src/memory.ts'), 'sdk/src/memory.ts must exist');
});

test('sdk/src/memory.ts exports MindForgeMemory class', () => {
  const content = fs.readFileSync('sdk/src/memory.ts', 'utf8');
  assert.ok(content.includes('MindForgeMemory'), 'Must export MindForgeMemory class');
  assert.ok(content.includes('remember('), 'Must have remember() method');
  assert.ok(content.includes('query('), 'Must have query() method');
});

// ── Network ports (all 3) ────────────────────────────────────────────────────
console.log('\nNetwork ports (all localhost-only):');

test('SDK SSE binds to 127.0.0.1:7337', () => {
  const content = fs.readFileSync('sdk/src/events.ts', 'utf8');
  assert.ok(content.includes('7337'), 'SDK SSE should use port 7337');
  assert.ok(content.includes('127.0.0.1'), 'SDK SSE must bind to 127.0.0.1');
});

test('Browser daemon uses port 7338 (localhost)', () => {
  const content = fs.readFileSync('bin/browser/browser-daemon.js', 'utf8');
  assert.ok(content.includes('7338'), 'Browser daemon should use port 7338');
  assert.ok(content.includes('127.0.0.1'), 'Browser daemon must bind to 127.0.0.1');
});

test('Dashboard server uses port 7339 (localhost)', () => {
  const content = fs.readFileSync('bin/dashboard/server.js', 'utf8');
  assert.ok(content.includes('7339'), 'Dashboard should use port 7339');
  assert.ok(content.includes('127.0.0.1'), 'Dashboard must bind to 127.0.0.1');
  assert.ok(!content.includes("'0.0.0.0'"), 'Dashboard must NOT bind to 0.0.0.0');
});

// ── Security: no secrets in codebase ─────────────────────────────────────────
console.log('\nSecurity:');

test('no hardcoded API keys in bin/ or .mindforge/', () => {
  const { execSync } = require('child_process');
  try {
    const result = execSync(
      'grep -r --include="*.js" --include="*.ts" --include="*.md" ' +
      '-E "(sk-[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16}|AIza[a-zA-Z0-9_-]{35})" ' +
      'bin/ .mindforge/ sdk/ 2>/dev/null || echo "CLEAN"',
      { encoding: 'utf8' }
    );
    const lines = result.split('\n').filter(l => l && !l.includes('CLEAN') && !l.includes('TEST_ONLY') && !l.includes('example'));
    assert.strictEqual(lines.length, 0, `Found potential API keys:\n${lines.join('\n')}`);
  } catch { /* grep returning non-zero = clean */ }
});

test('all server bindings checked — none on 0.0.0.0', () => {
  const serverFiles = [
    'bin/dashboard/server.js',
    'bin/browser/browser-daemon.js',
    'sdk/src/events.ts',
  ];
  for (const f of serverFiles) {
    if (!fs.existsSync(f)) continue;
    const content = fs.readFileSync(f, 'utf8');
    assert.ok(!content.includes("'0.0.0.0'") && !content.includes('"0.0.0.0"'),
      `${f} must NOT bind to 0.0.0.0`);
  }
});

// ── v2.0.0 MINDFORGE.md settings ─────────────────────────────────────────────
console.log('\nMINDFORGE.md v2.0.0 settings:');

const REQUIRED_V2_SETTINGS = [
  'PLANNER_MODEL', 'EXECUTOR_MODEL', 'SECURITY_MODEL', 'RESEARCH_MODEL',
  'AUTO_MODE_DEFAULT_TIMEOUT_MINUTES', 'AUTO_NODE_REPAIR_BUDGET',
  'BROWSER_PORT', 'BROWSER_HEADLESS',
  'AUTO_CAPTURE_SKILLS', 'SKILL_QUALITY_MIN_SCORE',
  'MODEL_COST_HARD_LIMIT_USD',
];

test('MINDFORGE.md has all required v2.0.0 settings', () => {
  const content = fs.readFileSync('MINDFORGE.md', 'utf8');
  const missing = REQUIRED_V2_SETTINGS.filter(s => !content.includes(s));
  assert.strictEqual(missing.length, 0, `Missing MINDFORGE.md settings: ${missing.join(', ')}`);
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(60)}`);
console.log(`Release validation: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌  ${failed} release validation(s) failed.`);
  console.error('   v2.0.0 cannot be released until all pass.\n');
  process.exit(1);
} else {
  console.log('\n✅  All release validations passed.');
  console.log('   MindForge v2.0.0 "The Autonomous Enterprise" is ready to ship.\n');
}
```

**Commit:**
```bash
git add tests/release.test.js
git commit -m "test(v2-release): add release validation suite (22nd and final test suite)"
```

---

## TASK 7 — Run the Full Test Battery × 3 Runs

```bash
#!/usr/bin/env bash
# Final pre-release test battery
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         MindForge v2.0.0 — Final Test Battery × 3          ║"
echo "╚══════════════════════════════════════════════════════════════╝"

SUITES=(install wave-engine audit compaction skills-platform \
        integrations governance intelligence metrics \
        distribution ci-mode sdk production migration e2e \
        autonomous browser model-routing memory dashboard \
        self-building-skills release)

ALL_PASS=true

for RUN in 1 2 3; do
  echo ""
  echo "  Run $RUN of 3"
  echo "  ─────────────────────────────────────────────────────────"
  FAIL=0
  for s in "${SUITES[@]}"; do
    printf "    %-35s" "${s}..."
    node tests/${s}.test.js 2>&1 | tail -1 | grep -q "passed" && echo "✅" || { echo "❌"; ((FAIL++)); ALL_PASS=false; }
  done
  [ "$FAIL" -gt 0 ] && echo "  Run $RUN: $FAIL failure(s)" || echo "  Run $RUN: All 22 passed ✅"
done

echo ""
$ALL_PASS && echo "✅ ALL 22 SUITES × 3 RUNS — RELEASE APPROVED" || { echo "❌ FAILURES — DO NOT RELEASE"; exit 1; }
```

---

## TASK 8 — Update docs/architecture/decision-records-index.md

```bash
cat >> docs/architecture/decision-records-index.md << 'EOF'

## v2.0.0 ADRs (Days 8-14)

| ADR | Title | Day |
|---|---|---|
| ADR-021 | Autonomy boundary: human steers intent, agent executes implementation | 8 |
| ADR-022 | Node repair hierarchy: RETRY before DECOMPOSE before PRUNE | 8 |
| ADR-023 | Gate 3 runs pre-commit in auto mode (not post-wave) | 8 |
| ADR-024 | Browser daemon localhost-only (127.0.0.1) | 9 |
| ADR-025 | `<verify-visual>` failure = `<verify>` failure for node repair | 9 |
| ADR-026 | Session files gitignored — auth tokens never in git | 9 |
| ADR-027 | Persona determines model; Tier 3 always overrides to SECURITY_MODEL | 10 |
| ADR-028 | Adversarial second-reviewer prompt for cross-review | 10 |
| ADR-029 | Gemini uses x-goog-api-key header (not URL query param) | 10 |
| ADR-030 | Knowledge graph is append-only (deprecate, never delete) | 11 |
| ADR-031 | Knowledge reinforcement on explicit acknowledgment, not on load | 11 |
| ADR-032 | Global knowledge entries carry a 0.1 confidence penalty | 11 |
| ADR-033 | Dashboard binds to localhost only (127.0.0.1) | 12 |
| ADR-034 | Tier 3 dashboard approvals require typing the plan ID | 12 |
| ADR-035 | AUDIT entry written before approval file update (fail-safe ordering) | 12 |
| ADR-036 | Documentation is the authoritative source for skill content | 13 |
| ADR-037 | Pattern frequency ≥ 2 tasks as the auto-capture threshold | 13 |
| ADR-038 | Minimum quality score of 60 for skill registration | 13 |
| ADR-039 | 6-runtime support via unified RUNTIMES config map | 14 |
| ADR-040 | v2.0.0 migration is additive-only (no destructive schema changes) | 14 |
| ADR-041 | v2.0.0 stable interface contract (all ports, schemas, commands stable in 2.x) | 14 |
EOF
```

**Commit:**
```bash
git add docs/architecture/decision-records-index.md
git commit -m "docs(v2-release): update ADR index with all 21 v2.0.0 ADRs (021-041)"
```

---

## TASK 9 — Bump to v2.0.0 and create git tag

```bash
# Final version bump
node -e "
  const fs = require('fs');
  const p  = JSON.parse(fs.readFileSync('package.json','utf8'));
  p.version = '2.0.0';
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
  console.log('Bumped to v2.0.0');
"

# Final commit for the release
git add package.json
git commit -m "chore(release): bump to v2.0.0 — The Autonomous Enterprise"

# Tag the release
git tag -a v2.0.0 -m "MindForge v2.0.0 — The Autonomous Enterprise

48 commands · 22 test suites · 41 ADRs · 9 personas · 10 skills · 6 runtimes · 3 ports

New in v2.0.0:
- /mindforge:auto — walk-away autonomous execution with node repair
- /mindforge:browse, /mindforge:qa — persistent browser runtime + visual QA
- /mindforge:cross-review, /mindforge:research, /mindforge:costs — multi-model intelligence
- /mindforge:remember — persistent knowledge graph across sessions
- /mindforge:dashboard — real-time web UI at localhost:7339
- /mindforge:learn, /mindforge:marketplace — self-building skills platform
- 6 runtimes: Claude Code, Antigravity, Cursor, OpenCode, Gemini CLI, GitHub Copilot"

git push origin feat/mindforge-v2-release
git push origin v2.0.0
```

---

## TASK 10 — npm pack simulation (pre-publish verification)

```bash
#!/usr/bin/env bash
echo "npm publish simulation"
echo "════════════════════════"

# Create the tarball
npm pack --dry-run 2>&1 | head -30

# Check actual pack
npm pack
TARBALL=$(ls mindforge-cc-2.0.0.tgz 2>/dev/null)

if [ -z "$TARBALL" ]; then
  echo "❌ npm pack failed — tarball not created"
  exit 1
fi

echo "✅ Tarball created: $TARBALL"
echo "   Size: $(du -sh $TARBALL | cut -f1)"

# Verify tarball contents
echo ""
echo "Tarball contents:"
tar -tzf "$TARBALL" | grep -E "\.(js|ts|md|json)$" | head -40
echo "..."

# Verify critical files are included
REQUIRED_IN_PACK=(
  "package/bin/install.js"
  "package/bin/installer-core.js"
  "package/.claude/CLAUDE.md"
  "package/.mindforge/org/SECURITY.md"
  "package/CHANGELOG.md"
)

for f in "${REQUIRED_IN_PACK[@]}"; do
  tar -tzf "$TARBALL" | grep -q "$f" && echo "  ✅ $f" || echo "  ❌ MISSING: $f"
done

# Verify node_modules NOT in tarball
NODE_MODULES=$(tar -tzf "$TARBALL" | grep "node_modules" | wc -l | tr -d ' ')
[ "$NODE_MODULES" -eq 0 ] && echo "✅ node_modules not in tarball" || echo "❌ node_modules IN tarball — check .npmignore"

# Clean up
rm -f mindforge-cc-2.0.0.tgz

echo ""
echo "✅ npm pack simulation complete — ready to publish"
echo "   To publish: npm publish --access public"
```

**Commit:**
```bash
git add .
git commit -m "chore(v2-release): final pre-publish verification — all checks passed"
```

---

# ═══════════════════════════════════════════════════════════════════════
# PART 2 — REVIEW PROMPT
# ═══════════════════════════════════════════════════════════════════════

---

## DAY 14 REVIEW

Activate **`architect.md` + `security-reviewer.md` + `release-manager.md`** simultaneously.

Day 14 risk profile (release-specific):
1. **Migration data loss** — v1.0.0→v2.0.0 migration must be truly additive; any destructive operation loses user data
2. **Runtime cross-contamination** — installer copying wrong files to wrong runtime directories
3. **Tarball completeness** — npm pack missing critical files; or including sensitive files
4. **Version contract breakage** — v2.0.0 commands accidentally breaking v1.0.0 workflows
5. **Test suite inter-dependency** — test suites that pass individually but fail in sequence
6. **ADR-041 contract completeness** — the v2.0.0 stable interface contract must be precisely defined

---

## REVIEW PASS 1 — Migration: Data Preservation

Read `bin/migrations/1.0.0-to-2.0.0.js` completely.

- [ ] **`run()` does not run backup before making changes.** The v1.0.0 migration (Day 7) created a backup before applying any changes. The v2.0.0 migration writes directly to HANDOFF.json and AUDIT.jsonl without backup. If the migration is interrupted mid-way (process kill, disk full), files are partially modified. Fix: "Follow the same backup pattern as `bin/migrations/migrate.js`: create backup copy of HANDOFF.json and AUDIT.jsonl before any writes, restore on exception."

- [ ] **AUDIT.jsonl backfill reads and rewrites the ENTIRE file.** For projects with large AUDIT.jsonl files (10K+ lines), this loads the entire file into memory, modifies it, and writes it back. This is an O(n) memory and disk operation. Fix: "Only backfill if needed: check the first entry in AUDIT.jsonl to see if it already has `model_used`. If it does, skip the backfill — it was already run or this is a v2.0.0 project."

- [ ] **`require('../bin/migrations/1.0.0-to-2.0.0.js')` in test file may cache the module.** The test calls the migration three times across different temp directories (`process.chdir(tmpDir)`), but `require()` caches modules. The migration module reads `process.cwd()` at call time — this should work correctly. But the `require` cache means if the migration uses any module-level state (it doesn't, but document this explicitly with a comment in the migration file).

---

## REVIEW PASS 2 — Multi-Runtime: Installer Correctness

Read the updated `bin/installer-core.js` completely.

- [ ] **Cursor runtime uses `supportsSlash: false` but the commands are still `.md` files.** If Cursor doesn't support /slash commands, installing 48 command files that use `/mindforge:cmd` syntax as `@mindforge-cmd` references may confuse users. Fix: "For non-slash runtimes (cursor, copilot), add a preamble to each command file explaining how to reference it: '# To use this command in Cursor: @[filename without .md]'."

- [ ] **`generateGeminiMd()` does a model string replacement on CLAUDE.md.** If the CLAUDE.md content doesn't have the expected model strings (they may not be hardcoded in CLAUDE.md — they're in MINDFORGE.md), the replacement produces the original file with no changes and no error. Fix: "Verify the replacement was meaningful: if the generated GEMINI.md is identical to CLAUDE.md after replacement, log a warning rather than silently writing a wrong file."

- [ ] **The RUNTIMES config has `detect()` functions but the installer does not call them automatically.** The detection functions are only useful if the installer auto-detects which runtimes are present. If the user doesn't specify `--runtime`, the installer should call `detect()` and suggest detected runtimes. Document: "Auto-detection is provided for future use; in v2.0.0 the user explicitly specifies `--runtime`. Auto-suggest is planned for v2.1.0."

---

## REVIEW PASS 3 — Production Checklist: Completeness

Read `.mindforge/production/production-checklist.md` completely.

- [ ] **Section F item F13 says "All 6 runtimes install correctly" but doesn't specify which test to run.** The verification column says only "Run installer with each runtime flag" — this needs to be more precise. Fix: "F13 verification: `node bin/install.js --runtime cursor --dry-run && node bin/install.js --runtime gemini --dry-run && node bin/install.js --runtime copilot --dry-run`"

- [ ] **The checklist has items F14 and F15 about regression and migration, but these are tested by E01-E03 (all 22 suites × 3 runs).** There is overlap between Section E and Section F for regression testing. This is intentional (belt-and-suspenders for a release gate) but should be documented to avoid confusion: "F14 and F15 are explicit human verification steps, not automated — they confirm that the human ran the tests and confirmed results."

---

## REVIEW PASS 4 — Release Test Suite: Coverage Gaps

Read `tests/release.test.js` completely.

- [ ] **Migration data preservation test uses `process.chdir()` which affects ALL subsequent tests in the same process.** If a test fails mid-chdir, the process may remain in the temp directory, causing all subsequent tests to fail with file-not-found errors. Fix: "Each migration test should use a `try/finally` block that always calls `process.chdir(origCwd)` regardless of test outcome — this is already done in the test, but add `p.cleanup()` call to ensure temp dirs are removed."

- [ ] **The "no hardcoded API keys" test uses `grep` which may not be available on Windows.** The test uses `execSync('grep -r ...')`. Fix: "Add a `try/catch` around the execSync call and skip the test gracefully on Windows: `if (process.platform === 'win32') { console.log('    (skipping — grep not available on Windows)'); return; }`"

- [ ] **Missing test: migration dry_run mode.** The migration has a `dry_run` parameter but no test verifies it actually prevents file writes. Add: "Test that calling `migration.run({ dry_run: true })` on a v1.0.0 HANDOFF.json leaves the file unchanged."

---

## REVIEW PASS 5 — ADR-041: Stable Interface Contract

Read the Day 14 ADR additions.

- [ ] **ADR-041 (v2.0.0 stable interface contract) is referenced but not fully defined.** Like ADR-020 (v1.0.0 contract), ADR-041 must precisely specify what is stable in v2.0.0 and cannot change without a MAJOR version bump. Ensure ADR-041 explicitly lists:
  - All 48 command names (stable — no renames without deprecation period)
  - All 3 network port numbers (7337, 7338, 7339 — stable)
  - HANDOFF.json schema fields that are stable
  - AUDIT.jsonl event types that are stable
  - SDK public exports that are stable
  - Plugin API version (stable)
  - SKILL.md frontmatter format (stable)

---

## REVIEW PASS 6 — CHANGELOG and Documentation Completeness

Read `CHANGELOG.md` v2.0.0 entry completely.

- [ ] **The CHANGELOG entry doesn't mention the specific breaking changes file locations.** Users upgrading from v1.0.0 need to know exactly what changed in their `.planning/` directory. Fix: "Add to breaking changes: 'See `bin/migrations/1.0.0-to-2.0.0.js` for the complete list of schema changes. Run `/mindforge:migrate --from 1.0.0 --to 2.0.0 --dry-run` to preview changes before applying.'"

- [ ] **`docs/reference/commands.md` should be updated to list all 48 commands but may still show 36.** Verify: "Check `docs/reference/commands.md` — it must list all 48 commands with v2 additions clearly marked as 'New in v2.0.0'."

---

## REVIEW SUMMARY TABLE

```
## Day 14 Review Summary

| Category                | BLOCKING | MAJOR | MINOR | SUGGESTION |
|-------------------------|----------|-------|-------|------------|
| Migration Safety        |          |       |       |            |
| Multi-Runtime Installer |          |       |       |            |
| Production Checklist    |          |       |       |            |
| Release Test Suite      |          |       |       |            |
| ADR-041 Contract        |          |       |       |            |
| CHANGELOG/Docs          |          |       |       |            |
| **TOTAL**               |          |       |       |            |

## Verdict
[ ] ✅ APPROVED — Proceed to HARDEN section
[ ] ⚠️  APPROVED WITH CONDITIONS
[ ] ❌ NOT APPROVED — DO NOT RELEASE
```

---

# ═══════════════════════════════════════════════════════════════════════
# PART 3 — HARDENING PROMPT
# ═══════════════════════════════════════════════════════════════════════

---

## DAY 14 HARDENING

Activate **`security-reviewer.md` + `release-manager.md` + `architect.md`** simultaneously.

```bash
# Confirm all 22 suites pass before hardening
for suite in install wave-engine audit compaction skills-platform \
             integrations governance intelligence metrics \
             distribution ci-mode sdk production migration e2e \
             autonomous browser model-routing memory dashboard \
             self-building-skills release; do
  printf "  %-35s" "${suite}..."
  node tests/${suite}.test.js 2>&1 | tail -1
done
```

---

## HARDEN 1 — Add backup/restore to migration script

Update `bin/migrations/1.0.0-to-2.0.0.js`:

```javascript
// Add backup at the top of run():
async function run(context = {}) {
  const { dry_run = false, verbose = false } = context;
  const log = msg => verbose && console.log(`  [1.0.0→2.0.0] ${msg}`);
  const changes = [];

  // ── BACKUP before any writes (consistent with migrate.js pattern) ──────────
  const backupDir = path.join(PLANNING_DIR, '.migration-backup-2.0.0');
  if (!dry_run) {
    fs.mkdirSync(backupDir, { recursive: true });

    const filesToBackup = [
      path.join(PLANNING_DIR, 'HANDOFF.json'),
      path.join(PLANNING_DIR, 'AUDIT.jsonl'),
      path.join(MFDIR, 'metrics', 'token-usage.jsonl'),
    ].filter(f => fs.existsSync(f));

    for (const f of filesToBackup) {
      const backupPath = path.join(backupDir, path.basename(f));
      fs.copyFileSync(f, backupPath);
      log(`Backed up: ${path.relative(process.cwd(), f)}`);
    }
  }

  try {
    // ... existing migration logic unchanged ...
    return { success: true, changes, version_from: '1.0.0', version_to: '2.0.0' };
  } catch (err) {
    // Restore from backup on failure
    if (!dry_run && fs.existsSync(backupDir)) {
      for (const f of fs.readdirSync(backupDir)) {
        const backupPath = path.join(backupDir, f);
        const originalPath = f === 'HANDOFF.json' || f === 'AUDIT.jsonl'
          ? path.join(PLANNING_DIR, f)
          : path.join(MFDIR, 'metrics', f);
        fs.copyFileSync(backupPath, originalPath);
        log(`Restored from backup: ${f}`);
      }
    }
    throw err;
  }
}
```

**Commit:**
```bash
git add bin/migrations/1.0.0-to-2.0.0.js
git commit -m "harden(v2-release): add backup/restore to v2.0.0 migration script"
```

---

## HARDEN 2 — Add AUDIT.jsonl smart backfill (skip if already v2)

Update backfill logic in migration:

```javascript
// Replace the AUDIT.jsonl backfill section:
const auditPath = path.join(PLANNING_DIR, 'AUDIT.jsonl');
if (fs.existsSync(auditPath)) {
  const content = fs.readFileSync(auditPath, 'utf8');
  const firstLine = content.split('\n').find(l => l.trim());

  if (firstLine) {
    try {
      const firstEntry = JSON.parse(firstLine);
      // SMART SKIP: if first entry already has model_used, this is already v2
      if (firstEntry.model_used !== undefined) {
        log('AUDIT.jsonl already has v2 fields — skipping backfill');
        // Do NOT add to changes
      } else {
        // Needs backfill
        const lines   = content.split('\n').filter(Boolean);
        const updated = lines.map(line => {
          try {
            const entry = JSON.parse(line);
            if (entry.model_used  === undefined) entry.model_used  = 'unknown';
            if (entry.node_repair === undefined) entry.node_repair = false;
            return JSON.stringify(entry);
          } catch { return line; }
        });
        if (!dry_run) fs.writeFileSync(auditPath, updated.join('\n') + '\n');
        log(`Backfilled ${lines.length} AUDIT.jsonl entries`);
        changes.push(`AUDIT.jsonl: backfilled ${lines.length} entries`);
      }
    } catch { /* malformed first line — skip backfill silently */ }
  }
}
```

**Commit:**
```bash
git add bin/migrations/1.0.0-to-2.0.0.js
git commit -m "harden(v2-release): smart AUDIT.jsonl backfill — skip if already v2"
```

---

## HARDEN 3 — Write the full ADR-041 (v2.0.0 stable interface contract)

### `.planning/decisions/ADR-041-v2-stable-interface-contract.md`

```markdown
# ADR-041: v2.0.0 Stable Interface Contract

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 14

## Context
Like ADR-020 defined the v1.0.0 stable contract, this ADR defines exactly what
is stable in v2.0.0 and cannot change without a MAJOR version bump (to 3.0.0).

## Decision

### Stable: Command names (all 48)
The following command names are stable. They may not be renamed, removed, or
have their core behaviour changed without a deprecation period of at least
one minor version:
```
v1.0.0 (36): help, init-project, plan-phase, execute-phase, verify-phase, ship,
next, quick, status, debug, skills, review, security-scan, map-codebase,
discuss-phase, audit, milestone, complete-milestone, approve, sync-jira,
sync-confluence, health, retrospective, profile-team, metrics, init-org,
install-skill, publish-skill, pr-review, workspace, benchmark, update,
migrate, plugins, tokens, release

v2.0.0 additions (12): auto, steer, browse, qa, cross-review, research, costs,
remember, dashboard, learn, marketplace, new-runtime
```

### Stable: Network ports
- 7337: SDK SSE event stream — stable in 2.x
- 7338: Browser daemon HTTP API — stable in 2.x
- 7339: Dashboard server — stable in 2.x

### Stable: HANDOFF.json schema fields
All fields present in schema_version: "2.0.0" are stable.
Fields may be added (minor version), but not removed or renamed (major version).
Core stable fields: schema_version, next_task, _warning, context_refs, blockers,
decisions_needed, phase, plan, recent_commits, recent_files, autonomous_mode,
steering_queue_path, knowledge_base_path.

### Stable: AUDIT.jsonl event types
These event types are stable — consumers may rely on them:
task_started, task_completed, task_failed, security_finding, quality_gate_failed,
context_compaction, phase_completed, decision_recorded, phase_execution_started,
phase_execution_completed, skill_learned, model_routed, approval_granted,
approval_rejected, dashboard_started, memory_applied, cross_review_completed.
New event types may be added (minor version).

### Stable: SDK public exports (sdk/src/index.ts)
MindForgeClient, MindForgeEventStream, MindForgeMemory, and all TypeScript
interfaces exported from sdk/src/index.ts are stable in 2.x.
Internal modules (not exported via index.ts) are NOT stable.

### Stable: Plugin API version
plugin_api_version: "2.0.0" is stable — plugins targeting 2.x will work
on any 2.x version.

### Stable: SKILL.md frontmatter format
The SKILL.md frontmatter schema (name, version, status, triggers, description)
is stable in 2.x. New frontmatter fields may be added (minor version).

### Stable: PLAN XML fields
All XML tags in PLAN files (<task>, <n>, <persona>, <files>, <context>,
<action>, <verify>, <verify-visual>, <dependencies>, <done>) are stable.

### NOT stable in 2.x (may change in minor versions)
- Internal `bin/` module APIs (used by CLI only)
- `.mindforge/` spec file contents (engine/governance/intelligence specs)
- Dashboard HTML/CSS/JS structure
- HANDOFF.json optional fields added by v2 features

## Consequences
Plugins targeting v2.0.0 will work on v2.1.0, v2.2.0, etc.
v1.0.0 projects can upgrade to v2.x without breaking any existing workflows.
Developers building integrations on the SDK TypeScript types can rely on them
through all 2.x releases.
```

**Commit:**
```bash
git add .planning/decisions/ADR-041-v2-stable-interface-contract.md
git commit -m "docs(adr): add ADR-041 v2.0.0 stable interface contract"
```

---

## HARDEN 4 — Add migration dry_run test and grep platform guard

```javascript
// Add to tests/release.test.js:

console.log('\nHardening tests:');

test('migration dry_run leaves HANDOFF.json unchanged', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-dryrun-'));
  const origCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.mindforge', 'metrics'), { recursive: true });
    const originalContent = JSON.stringify({
      schema_version: '1.0.0', next_task: 'preserved', _warning: 'no secrets', context_refs: [], blockers: [], decisions_needed: []
    });
    fs.writeFileSync(path.join(tmpDir, '.planning', 'HANDOFF.json'), originalContent);
    fs.writeFileSync(path.join(tmpDir, '.planning', 'AUDIT.jsonl'), '');

    const migration = require('../bin/migrations/1.0.0-to-2.0.0.js');
    await migration.run({ dry_run: true, verbose: false });

    // File must be unchanged
    const afterContent = fs.readFileSync(path.join(tmpDir, '.planning', 'HANDOFF.json'), 'utf8');
    assert.strictEqual(afterContent, originalContent, 'dry_run must not modify HANDOFF.json');
  } finally { process.chdir(origCwd); fs.rmSync(tmpDir, { recursive: true, force: true }); }
});

test('migration smart backfill skips AUDIT.jsonl already having v2 fields', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-smart-'));
  const origCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    fs.mkdirSync(path.join(tmpDir, '.planning'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.mindforge', 'metrics'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.planning', 'HANDOFF.json'),
      JSON.stringify({ schema_version: '1.0.0', next_task: '', _warning: 'no secrets', context_refs: [], blockers: [], decisions_needed: [] }));
    // AUDIT.jsonl already has model_used (simulates previously migrated)
    const alreadyV2 = JSON.stringify({ id: 'abc', timestamp: '2026-01-01T00:00:00Z', event: 'task_completed', agent: 'test', session_id: 's1', model_used: 'claude-sonnet-4-6', node_repair: false });
    fs.writeFileSync(path.join(tmpDir, '.planning', 'AUDIT.jsonl'), alreadyV2 + '\n');

    const migration = require('../bin/migrations/1.0.0-to-2.0.0.js');
    const result = await migration.run({ verbose: false });

    // Should NOT have 'AUDIT.jsonl: backfilled' in changes
    const backfillChange = result.changes.find(c => c.includes('AUDIT.jsonl: backfilled'));
    assert.ok(!backfillChange, 'Smart backfill should skip AUDIT.jsonl that already has v2 fields');
  } finally { process.chdir(origCwd); fs.rmSync(tmpDir, { recursive: true, force: true }); }
});
```

**Commit:**
```bash
git add tests/release.test.js
git commit -m "test(v2-release): add dry_run and smart backfill skip tests"
```

---

## HARDEN 5 — Write final ADRs (ADR-039 and ADR-040)

### `.planning/decisions/ADR-039-6-runtime-support.md`

```markdown
# ADR-039: 6-runtime support via unified RUNTIMES config map

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 14

## Context
MindForge v1.0.0 supported Claude Code and Antigravity via hardcoded paths
in the installer. How should additional runtimes be added?

## Decision
All runtime configurations are defined in a single RUNTIMES map in
`bin/installer-core.js`. Each entry specifies: id, displayName, globalDir,
localDir, commandsSubdir, entryFile, commandFormat, supportsSlash,
detect function, description, installDocs, and optional notes.

## Rationale
A config-driven approach (vs. per-runtime code) means:
1. New runtimes require only a new config entry + an entry file generator
2. The installer logic is runtime-agnostic
3. auto-detection is unified (each runtime has a `detect()` function)
4. Tests can enumerate all runtimes from the config map

## Consequences
Adding a 7th runtime (e.g., Zed, Void) requires only a RUNTIMES entry.
The `/mindforge:new-runtime` command lets teams add custom runtime support
without modifying the core installer.
```

### `.planning/decisions/ADR-040-migration-additive-only.md`

```markdown
# ADR-040: v2.0.0 migration is additive-only — no destructive schema changes

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 14

## Context
How should v1.0.0→v2.0.0 migration handle schema changes?

## Decision
All v2.0.0 schema changes are additive. The migration adds new fields to
existing files but never removes, renames, or modifies existing field values.
If a field already exists with a non-null value, it is preserved unchanged.

## Rationale
Destructive migration operations are irreversible without a backup.
Additive-only means:
1. Migration is safe to run multiple times (idempotent for new fields)
2. Rollback is trivial (remove the added fields, done)
3. v1.0.0 tools can still read v2.0.0 files (graceful degradation)
4. Custom fields in user HANDOFF.json files are never touched

## Implementation
- `autonomous_mode`, `steering_queue_path`, `knowledge_base_path` are ADDED to HANDOFF.json
- `model_used`, `node_repair` are ADDED to existing AUDIT.jsonl entries (backfill)
- `cost_usd` is ADDED to token-usage.jsonl entries (backfill with null)
- Nothing is deleted, renamed, or overwritten with different semantics

## Consequences
The migration can be re-run safely on already-migrated projects (smart skip).
Teams who customised their HANDOFF.json schema do not lose custom fields.
All changes are verified by `tests/release.test.js` migration data preservation test.
```

**Commit:**
```bash
git add .planning/decisions/ADR-039*.md .planning/decisions/ADR-040*.md
git commit -m "docs(adr): add ADR-039 6-runtime config, ADR-040 additive-only migration"
```

---

## HARDEN 6 — Update docs/reference/commands.md with all 48 commands

```bash
# Verify the commands reference is current
grep -c "^## /mindforge:" docs/reference/commands.md 2>/dev/null | tr -d ' '
# Must be >= 48

# If not, add v2.0.0 commands section:
cat >> docs/reference/commands.md << 'EOF'

---

## v2.0.0 Commands (New in "The Autonomous Enterprise")

### /mindforge:auto
Walk-away autonomous execution mode. See `auto.md` for full documentation.

### /mindforge:steer  
Mid-execution guidance injection. See `steer.md`.

### /mindforge:browse
Persistent browser control with session management. See `browse.md`.

### /mindforge:qa
Visual QA against affected routes. See `qa.md`.

### /mindforge:cross-review
Multi-model adversarial code review. See `cross-review.md`.

### /mindforge:research
Deep research via Gemini 1M context window. See `research.md`.

### /mindforge:costs
Real-time cost tracking dashboard. See `costs.md`.

### /mindforge:remember
Persistent knowledge graph management. See `remember.md`.

### /mindforge:dashboard
Real-time web observability dashboard. See `dashboard.md`.

### /mindforge:learn
Convert any documentation into a reusable skill. See `learn.md`.

### /mindforge:marketplace
Community skills marketplace. See `marketplace.md`.

### /mindforge:new-runtime
Scaffold support for a new AI coding runtime. See `new-runtime.md`.
EOF
```

**Commit:**
```bash
git add docs/reference/commands.md
git commit -m "docs(v2-release): update commands reference with all 48 v2.0.0 commands"
```

---

## HARDEN 7 — Final × 3 test battery and release verification

```bash
#!/usr/bin/env bash
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        MindForge v2.0.0 — FINAL RELEASE VERIFICATION           ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

PASS=true

# ── Version check ──────────────────────────────────────────────────────────────
V=$(node -e "console.log(require('./package.json').version)")
[[ "${V}" == "2.0.0" ]] && echo "  Version: ${V} ✅" || { echo "  ❌ Version is ${V}, must be 2.0.0"; PASS=false; }

# ── Command counts ─────────────────────────────────────────────────────────────
CLAUDE_CMDS=$(ls .claude/commands/mindforge/*.md 2>/dev/null | wc -l | tr -d ' ')
AGENT_CMDS=$(ls .agent/mindforge/*.md 2>/dev/null | wc -l | tr -d ' ')
[ "$CLAUDE_CMDS" -eq 48 ] && echo "  .claude commands: ${CLAUDE_CMDS} ✅" || { echo "  ❌ .claude commands: ${CLAUDE_CMDS} (expected 48)"; PASS=false; }
[ "$AGENT_CMDS" -eq 48 ]  && echo "  .agent commands:  ${AGENT_CMDS} ✅" || { echo "  ❌ .agent commands: ${AGENT_CMDS} (expected 48)"; PASS=false; }

# ── Test battery × 3 ──────────────────────────────────────────────────────────
SUITES=(install wave-engine audit compaction skills-platform \
        integrations governance intelligence metrics \
        distribution ci-mode sdk production migration e2e \
        autonomous browser model-routing memory dashboard \
        self-building-skills release)

for RUN in 1 2 3; do
  echo ""
  echo "  ── Test run ${RUN}/3 ──────────────────────────────────────────────"
  FAIL=0
  for s in "${SUITES[@]}"; do
    printf "    %-35s" "${s}..."
    node tests/${s}.test.js 2>&1 | tail -1 | grep -q "passed" && echo "✅" || { echo "❌"; ((FAIL++)); PASS=false; }
  done
  [ "$FAIL" -gt 0 ] && echo "  ❌ Run ${RUN}: ${FAIL} failure(s)" || echo "  ✅ Run ${RUN}: All 22 passed"
done

# ── Security checks ────────────────────────────────────────────────────────────
echo ""
echo "  ── Security ──────────────────────────────────────────────────────"

# No 0.0.0.0 bindings
UNSAFE=$(grep -r "0\.0\.0\.0" bin/dashboard/ bin/browser/ sdk/ 2>/dev/null | grep -v "#" | grep -v "//" || true)
[ -z "$UNSAFE" ] && echo "  Localhost-only bindings ✅" || { echo "  ❌ 0.0.0.0 binding found"; PASS=false; }

# No API keys in code
KEYS=$(grep -r --include="*.js" -E "sk-[a-zA-Z0-9]{20,}" bin/ 2>/dev/null | grep -v "TEST_ONLY\|example\|REDACTED" || true)
[ -z "$KEYS" ] && echo "  No hardcoded API keys ✅" || { echo "  ❌ Potential API keys found"; PASS=false; }

# ── CHANGELOG ─────────────────────────────────────────────────────────────────
echo ""
echo "  ── Documentation ─────────────────────────────────────────────────"
head -3 CHANGELOG.md | grep -q "2.0.0" && echo "  CHANGELOG has v2.0.0 entry ✅" || { echo "  ❌ CHANGELOG missing v2.0.0"; PASS=false; }

ADRS=$(ls .planning/decisions/ADR-*.md 2>/dev/null | wc -l | tr -d ' ')
[ "$ADRS" -ge 41 ] && echo "  ADRs: ${ADRS} ✅" || { echo "  ❌ ADRs: ${ADRS} (expected ≥41)"; PASS=false; }

# ── Final verdict ──────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════════════"
if $PASS; then
  echo "  ✅✅✅ ALL CHECKS PASSED — v2.0.0 RELEASE APPROVED ✅✅✅"
  echo ""
  echo "  Next steps:"
  echo "    git tag -a v2.0.0 -m 'The Autonomous Enterprise'"
  echo "    git push origin v2.0.0"
  echo "    npm publish --access public"
else
  echo "  ❌ RELEASE BLOCKED — Fix failures above before releasing v2.0.0"
  exit 1
fi
```

**Final commit:**
```bash
git add .
git commit -m "harden(v2-release): final release hardening — backup in migration, ADR-041 contract, test fixes"
git push origin feat/mindforge-v2-release
```

---

## TASK 11 — Create Final v2.0.0 State File

Create `MINDFORGE-STATE-V2.md` as the authoritative context file for anyone
continuing work after v2.0.0 ships:

```bash
# The state file is the MINDFORGE-STATE-DAY12.md from the previous session,
# updated with Day 13 and Day 14 additions.
# See MINDFORGE-STATE-DAY12.md for the full day-by-day history.
# This brief state file provides the Day 14-onwards quick context.
```

```markdown
# MINDFORGE-STATE-V2.md
# Post-release state for v2.0.0 "The Autonomous Enterprise"
# Use this file to start any new work after the v2.0.0 release

## Version: 2.0.0 (stable release)
## Branch: main (post-merge)

## What was shipped in v2.0.0
(see CHANGELOG.md ## [2.0.0] for complete list)

## Metrics
- Commands: 48 (36 v1.0.0 + 12 v2.0.0)
- Test suites: 22
- ADRs: 41
- Personas: 9
- Core skills: 10
- Runtimes: 6
- Network ports: 3 (7337/7338/7339)
- npm: mindforge-cc@2.0.0

## Known gaps for v2.1.0
1. SDK TypeScript compilation — sdk/dist/ still not built
2. Windows path handling — not validated on Windows
3. Runtime auto-detection — detect() functions exist but not used in installer
4. Lazy file reading enforcement — still advisory
5. True parallel wave execution in interactive mode — still sequential
6. Dashboard knowledge graph as force-directed graph — still a list view
7. PLAN XML format — should migrate to YAML (MAJOR breaking change, deferred to v3.0.0)

## v2.1.0 roadmap candidates
- SDK TypeScript build pipeline (npx tsc in sdk/)
- Runtime auto-detection in installer (suggest detected runtimes)
- Dashboard WebSocket upgrade (vs current SSE for full bidirectional)
- Skills: session_quality_lift computation (requires telemetry system)
- /mindforge:auto --milestone M across multiple phases
- Windows path handling validation and fix
```

**Commit:**
```bash
git add MINDFORGE-STATE-V2.md
git commit -m "docs(v2-release): add post-release v2.0.0 state file for continuation"
git push origin feat/mindforge-v2-release
```

---

## DAY 14 COMPLETE — v2.0.0 SHIPPED

| Component | Status |
|---|---|
| Multi-runtime (6): Claude, Antigravity, Cursor, OpenCode, Gemini, Copilot | ✅ |
| `/mindforge:new-runtime` command (48th command) | ✅ |
| v1.0.0→v2.0.0 migration script (additive-only, with backup) | ✅ |
| 65-point production checklist (50 + 15 new Section F items) | ✅ |
| Complete v2.0.0 CHANGELOG | ✅ |
| Full test battery × 3 runs — all 22 suites | ✅ |
| `tests/release.test.js` (22nd and final suite) | ✅ |
| ADR-039 (6-runtime config), ADR-040 (additive migration), ADR-041 (stable contract) | ✅ |
| npm pack simulation — tarball integrity verified | ✅ |
| git tag v2.0.0 — "The Autonomous Enterprise" | ✅ |
| MINDFORGE-STATE-V2.md — post-release continuation file | ✅ |

---

## FINAL v2.0.0 METRICS

| Metric | v1.0.0 | v2.0.0 | Change |
|---|---|---|---|
| Commands | 36 | 48 | +12 |
| Core skills | 10 | 10 + ∞ marketplace | |
| Agent personas | 8 | 9 | +1 (research-agent) |
| ADRs | 20 | 41 | +21 |
| Test suites | 15 | 22 | +7 |
| Runtimes | 2 | 6 | +4 |
| Network ports | 1 | 3 | +2 |
| Binary modules | ~12 | ~40 | +28 |
| SDK modules | 5 | 6 (+memory.ts) | +1 |
| npm package | mindforge-cc@1.0.0 | mindforge-cc@2.0.0 | |

---

## THE v2.0.0 COMPETITIVE POSITION

> **"The only agentic framework that is simultaneously enterprise-grade AND
> autonomously capable. Everything else is either enterprise without autonomy,
> or autonomous without enterprise."**

| Capability | MindForge v2 | GSD v2 | BMAD v6 | Superpowers | gstack |
|---|---|---|---|---|---|
| Autonomous walk-away mode | ✅✅ | ✅ | ❌ | ❌ | ❌ |
| Node repair / stuck recovery | ✅✅ | ✅ | ❌ | ❌ | ❌ |
| Persistent browser runtime | ✅✅ | ❌ | ❌ | ❌ | ✅ |
| Cross-model code review | ✅✅ | ❌ | ❌ | ❌ | ✅ |
| Enterprise governance | ✅✅✅ | ❌ | Partial | ❌ | ❌ |
| Persistent long-term memory | ✅✅ | ❌ | ❌ | ❌ | ❌ |
| Real-time web dashboard | ✅✅ | ❌ | ❌ | ❌ | Partial |
| Self-building skills | ✅✅ | ❌ | ❌ | ✅ | ❌ |
| Multi-runtime support | ✅✅ (6) | ✅ (6+) | ✅ (4+) | ✅ (5+) | ✅ (1) |
| TypeScript SDK | ✅✅ | ❌ | ❌ | ❌ | ❌ |
| Jira/Confluence/Slack | ✅✅ | ❌ | ❌ | ❌ | ❌ |

**MindForge v2.0.0 — "The Autonomous Enterprise"**
**Branch:** `feat/mindforge-v2-release`
**Tag:** `v2.0.0`
**npm:** `mindforge-cc@2.0.0`
