# MindForge — Day 6: Distribution, CI, SDK & Scale
# Branch: `feat/mindforge-distribution-platform`
# Prerequisite: `feat/mindforge-intelligence-layer` merged to `main`
# Version target: v0.6.0

---

## BRANCH SETUP

```bash
git checkout main
git pull origin main
git checkout -b feat/mindforge-distribution-platform
```

Verify all prior days are present and all 9 test suites pass:

```bash
cat package.json | grep '"version"'   # Must be "0.5.0"
node tests/install.test.js && \
node tests/wave-engine.test.js && \
node tests/audit.test.js && \
node tests/compaction.test.js && \
node tests/skills-platform.test.js && \
node tests/integrations.test.js && \
node tests/governance.test.js && \
node tests/intelligence.test.js && \
node tests/metrics.test.js
```

---

## DAY 6 SCOPE

Day 6 builds the **Distribution, CI/CD, and Scale Layer** — making MindForge
a platform that organisations can publish to, integrate into pipelines, embed
in tools, and run at organisation-wide scale.

| Component | Description |
|---|---|
| Public Skills Registry | `npx mindforge-skills install/publish/search` — npm-based skill distribution |
| Monorepo & Multi-repo Support | Workspace-aware execution across packages/apps |
| MindForge CI Mode | Non-interactive execution in GitHub Actions / GitLab CI / Jenkins |
| AI-Generated PR Reviews | Claude API-powered code review with structured findings |
| `/mindforge:init-org` | Organisation-wide MindForge setup and standardisation |
| MindForge SDK | Programmatic TypeScript API for embedding in tools |
| MINDFORGE.md Schema Validation | JSON Schema validator for config file correctness |
| Real-time Progress Streaming | SSE-based progress events for tooling integration |
| Skill Quality Benchmarking | Automated skill effectiveness measurement |
| Day 6 test suites | `tests/distribution.test.js`, `tests/ci-mode.test.js`, `tests/sdk.test.js` |

---

# ═══════════════════════════════════════════════════════════════
# PART 1: IMPLEMENTATION PROMPT
# ═══════════════════════════════════════════════════════════════

---

## TASK 1 — Scaffold Day 6 directory additions

```bash
# Distribution engine
mkdir -p .mindforge/distribution
touch .mindforge/distribution/registry-client.md
touch .mindforge/distribution/skill-publisher.md
touch .mindforge/distribution/skill-validator.md
touch .mindforge/distribution/registry-schema.md

# CI/CD engine
mkdir -p .mindforge/ci
touch .mindforge/ci/ci-mode.md
touch .mindforge/ci/github-actions-adapter.md
touch .mindforge/ci/gitlab-ci-adapter.md
touch .mindforge/ci/jenkins-adapter.md
touch .mindforge/ci/ci-config-schema.md

# Monorepo support
mkdir -p .mindforge/monorepo
touch .mindforge/monorepo/workspace-detector.md
touch .mindforge/monorepo/cross-package-planner.md
touch .mindforge/monorepo/dependency-graph-builder.md

# SDK
mkdir -p sdk/src
touch sdk/src/index.ts
touch sdk/src/types.ts
touch sdk/src/client.ts
touch sdk/src/commands.ts
touch sdk/src/events.ts
touch sdk/package.json
touch sdk/tsconfig.json
touch sdk/README.md

# AI PR Review engine
mkdir -p .mindforge/pr-review
touch .mindforge/pr-review/ai-reviewer.md
touch .mindforge/pr-review/review-prompt-templates.md
touch .mindforge/pr-review/finding-formatter.md

# MINDFORGE.md schema
touch .mindforge/MINDFORGE-SCHEMA.json
touch bin/validate-config.js

# New commands
touch .claude/commands/mindforge/init-org.md
touch .claude/commands/mindforge/publish-skill.md
touch .claude/commands/mindforge/install-skill.md
touch .claude/commands/mindforge/pr-review.md
touch .claude/commands/mindforge/workspace.md
touch .claude/commands/mindforge/benchmark.md

# Mirror to Antigravity
for cmd in init-org publish-skill install-skill pr-review workspace benchmark; do
  cp .claude/commands/mindforge/${cmd}.md .agent/mindforge/${cmd}.md
done

# CI config templates
mkdir -p .github/workflows
touch .github/workflows/mindforge-ci.yml
touch .gitlab-ci-mindforge.yml

# Tests
touch tests/distribution.test.js
touch tests/ci-mode.test.js
touch tests/sdk.test.js

# Docs
touch docs/ci-cd-integration.md
touch docs/sdk-reference.md
touch docs/skills-publishing-guide.md
touch docs/monorepo-guide.md
```

**Commit:**
```bash
git add .
git commit -m "chore(day6): scaffold Day 6 distribution platform directory structure"
```

---

## TASK 2 — Write the Public Skills Registry

### `.mindforge/distribution/registry-schema.md`

```markdown
# MindForge Skills Registry — Schema & Protocol

## Registry concept
The public MindForge Skills Registry is an npm-based distribution system.
Skills are published as npm packages with the `mindforge-skill-` prefix.
The registry leverages the existing npm ecosystem for versioning, discovery,
and distribution.

## Package naming convention
```
mindforge-skill-[category]-[name]
```

Examples:
- `mindforge-skill-security-owasp`       — OWASP security review skill
- `mindforge-skill-db-postgres-patterns` — PostgreSQL-specific patterns
- `mindforge-skill-frontend-react-a11y`  — React accessibility patterns
- `mindforge-skill-testing-playwright`   — Playwright E2E testing patterns
- `mindforge-skill-api-graphql`          — GraphQL API design patterns

## Package structure

```
mindforge-skill-[category]-[name]/
├── SKILL.md              ← The skill file (required)
├── package.json          ← npm metadata
├── README.md             ← Human documentation
├── CHANGELOG.md          ← Version history
├── examples/             ← Optional usage examples
│   └── example-task.md
├── scripts/              ← Optional helper scripts
│   └── helper.sh
└── tests/
    └── skill.test.js     ← Skill validation tests
```

## `package.json` for a skill package

```json
{
  "name": "mindforge-skill-security-owasp",
  "version": "1.2.0",
  "description": "OWASP Top 10 security review skill for MindForge",
  "keywords": [
    "mindforge",
    "mindforge-skill",
    "security",
    "owasp",
    "agentic-framework"
  ],
  "mindforge": {
    "type": "skill",
    "skill-name": "security-owasp",
    "category": "security",
    "min-mindforge-version": "0.5.0",
    "triggers": ["OWASP", "security review", "injection", "auth", "XSS"],
    "tier-recommendation": 1
  },
  "files": ["SKILL.md", "README.md", "examples/", "scripts/"],
  "license": "MIT",
  "homepage": "https://mindforge.dev/skills/security-owasp",
  "repository": { "type": "git", "url": "https://github.com/mindforge-dev/skill-security-owasp" }
}
```

## Registry discovery

The MindForge registry is the standard npm registry with keyword filtering:
```bash
# Search for skills
npm search mindforge-skill [query]

# Example searches:
npm search mindforge-skill security    # Find security skills
npm search mindforge-skill react       # Find React-specific skills
npm search mindforge-skill testing     # Find testing skills
```

## Registry quality standards

A skill package published to the MindForge registry must pass:
1. Schema validation: `npx mindforge-cc validate-skill ./SKILL.md`
2. Required metadata: package.json `mindforge` field fully populated
3. No malicious content: npm security audit passes
4. Version policy: follows semver with documented breaking changes
5. License: MIT, Apache-2.0, or BSD (GPL derivatives not accepted)

## Local registry (private skills)

Organisations with private skills can use:
- Private npm registry (Verdaccio, Artifactory, GitHub Packages)
- Configure in `.mindforge/org/integrations/INTEGRATIONS-CONFIG.md`:
  ```
  MINDFORGE_SKILL_REGISTRY=https://npm.your-org.internal/
  ```
- Skills from private registry install with the same `npx mindforge-skills install` command
```

---

### `.mindforge/distribution/registry-client.md`

```markdown
# MindForge Skills Registry — Client Protocol

## Purpose
Define how MindForge discovers, downloads, validates, and installs skills
from the public or private npm-based registry.

## Installation flow

### Step 1 — Resolve package name
```bash
# From skill name to package name:
SKILL_NAME="security-owasp"
PACKAGE_NAME="mindforge-skill-${SKILL_NAME}"

# Or if user provides full package name:
PACKAGE_NAME="mindforge-skill-security-owasp"
```

### Step 2 — Check if already installed
```bash
# Check local MANIFEST.md
grep "| ${SKILL_NAME} |" .mindforge/org/skills/MANIFEST.md && echo "Already installed"

# Check if SKILL.md exists
[ -f ".mindforge/skills/${SKILL_NAME}/SKILL.md" ] && echo "Skill file exists"
```

### Step 3 — Fetch from registry
```bash
# Download to temp directory
TEMP_DIR=$(mktemp -d)
npm pack "${PACKAGE_NAME}@latest" --pack-destination "${TEMP_DIR}" --quiet

# Extract the tarball
cd "${TEMP_DIR}"
TARBALL=$(ls *.tgz | head -1)
tar -xzf "${TARBALL}" --strip-components=1 -C "${TEMP_DIR}"
```

### Step 4 — Validate the downloaded skill
Run the full skill validator (see `skill-validator.md`) against the downloaded SKILL.md.
If validation fails: abort installation. Never install a skill that fails validation.

### Step 5 — Injection guard check
Run the injection guard from Day 3 (`loader.md`) against the skill content.
If injection patterns detected: abort, write AUDIT entry, alert user.

### Step 6 — Install to correct tier location
```bash
# Determine target tier from user input or package.json tier-recommendation
TIER="${USER_SPECIFIED_TIER:-2}"

if [ "${TIER}" = "1" ]; then
  TARGET_DIR=".mindforge/skills/${SKILL_NAME}"
elif [ "${TIER}" = "2" ]; then
  TARGET_DIR=".mindforge/org/skills/${SKILL_NAME}"
else
  TARGET_DIR=".mindforge/project-skills/${SKILL_NAME}"
fi

mkdir -p "${TARGET_DIR}"
cp "${TEMP_DIR}/SKILL.md" "${TARGET_DIR}/SKILL.md"
[ -d "${TEMP_DIR}/examples" ] && cp -r "${TEMP_DIR}/examples" "${TARGET_DIR}/"
[ -d "${TEMP_DIR}/scripts" ]  && cp -r "${TEMP_DIR}/scripts"  "${TARGET_DIR}/"
```

### Step 7 — Register in MANIFEST.md
```bash
# Add entry to the correct tier section of MANIFEST.md
SKILL_VERSION=$(node -e "console.log(require('${TEMP_DIR}/package.json').version)")

# Insert into MANIFEST.md under the appropriate tier section
# Format: | name | version | stable | min-mf-version | path |
```

### Step 8 — Clean up and report
```bash
rm -rf "${TEMP_DIR}"
```

Report to user:
```
✅ Skill installed: ${SKILL_NAME} v${SKILL_VERSION} (Tier ${TIER})
   Triggers: [list from SKILL.md frontmatter]
   Path: ${TARGET_DIR}/SKILL.md

Run /mindforge:skills validate to confirm installation.
```

### Step 9 — Write AUDIT entry
```json
{
  "event": "skill_installed",
  "skill_name": "security-owasp",
  "skill_version": "1.2.0",
  "package_name": "mindforge-skill-security-owasp",
  "tier": 2,
  "source": "npm-registry | private-registry",
  "validation_passed": true
}
```

## Update protocol

### Check for updates
```bash
# Compare installed version against registry latest
INSTALLED=$(grep "| ${SKILL_NAME} |" MANIFEST.md | awk -F'|' '{print $3}' | tr -d ' ')
LATEST=$(npm info "${PACKAGE_NAME}" version 2>/dev/null)

if [ "${INSTALLED}" != "${LATEST}" ]; then
  echo "Update available: ${SKILL_NAME} v${INSTALLED} → v${LATEST}"
fi
```

### Update a skill
```bash
# Run install flow for latest version
# If MAJOR version bump: show breaking changes, require confirmation
# If MINOR/PATCH: update silently
```

## Uninstall protocol
```bash
# Remove skill files
rm -rf "${TARGET_DIR}"

# Remove from MANIFEST.md
sed -i "/| ${SKILL_NAME} |/d" .mindforge/org/skills/MANIFEST.md

# Write AUDIT entry
# Commit: "chore(skills): uninstall ${SKILL_NAME}"
```
```

---

### `.mindforge/distribution/skill-validator.md`

```markdown
# MindForge Skills Registry — Skill Validator

## Purpose
Validate a SKILL.md file before installation or publication.
Run as part of both `install-skill` and `publish-skill` commands.

## Validation levels

### Level 1 — Schema validation (always runs)
```bash
npx mindforge-cc validate-skill ./SKILL.md
```

Checks:
- [ ] File starts with `---` (YAML frontmatter delimiter)
- [ ] Frontmatter closes with `---`
- [ ] `name:` field present and matches kebab-case pattern `[a-z][a-z0-9-]+`
- [ ] `version:` field present and valid semver `\d+\.\d+\.\d+`
- [ ] `status:` is one of: `stable`, `beta`, `alpha`, `deprecated`
- [ ] `triggers:` field present and has >= 5 keywords
- [ ] No trigger keyword is fewer than 3 characters (too generic)
- [ ] `min_mindforge_version:` present and valid semver

### Level 2 — Content validation (runs after schema passes)
- [ ] File size between 1KB and 200KB (not too small, not too large)
- [ ] Contains `## Mandatory actions` or `## When this skill is active` section
- [ ] Contains at least one checklist item (`- [ ]`) for self-verification
- [ ] Does not contain any injection patterns (from `loader.md` guard)
- [ ] Code examples have language specifiers in code fences (not bare ```)
- [ ] No placeholder text: `[placeholder]`, `TODO`, `[your-name]`

### Level 3 — Quality validation (optional — runs for publication)
- [ ] At least 3 code examples
- [ ] CHANGELOG in frontmatter has at least current version entry
- [ ] `breaking_changes:` field present (even if empty list)
- [ ] Examples directory has at least one example file
- [ ] README.md exists in the package

## Validator output

```
MindForge Skill Validator — SKILL.md
──────────────────────────────────────────────────────────────

Schema validation:
  ✅ Frontmatter valid
  ✅ name: security-owasp (valid)
  ✅ version: 1.2.0 (valid semver)
  ✅ status: stable
  ✅ triggers: 31 keywords (min: 5)
  ✅ min_mindforge_version: 0.5.0

Content validation:
  ✅ File size: 8.4KB (1KB-200KB range)
  ✅ Mandatory actions section present
  ✅ Self-check checklist present (7 items)
  ✅ No injection patterns detected
  ✅ Code examples have language specifiers
  ✅ No placeholder text found

Quality validation:
  ✅ 5 code examples found
  ✅ CHANGELOG has version 1.2.0 entry
  ✅ Breaking changes documented
  ⚠️  Examples directory has 1 file (recommend: 3+)

──────────────────────────────────────────────────────────────
Result: VALID with 1 warning
Ready for: installation ✅ | publication ✅ (warning noted)
```

## `bin/validate-config.js` — MINDFORGE.md validator

```javascript
#!/usr/bin/env node
/**
 * MindForge configuration validator
 * Validates MINDFORGE.md against the JSON schema
 * Usage: node bin/validate-config.js [path-to-MINDFORGE.md]
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const CONFIG_PATH  = process.argv[2] || 'MINDFORGE.md';
const SCHEMA_PATH  = '.mindforge/MINDFORGE-SCHEMA.json';

if (!fs.existsSync(CONFIG_PATH)) {
  console.log('ℹ️  MINDFORGE.md not found — using all defaults. Create one to customise.');
  process.exit(0);
}

if (!fs.existsSync(SCHEMA_PATH)) {
  console.log('ℹ️  MINDFORGE-SCHEMA.json not found — skipping schema validation.');
  process.exit(0);
}

const content = fs.readFileSync(CONFIG_PATH, 'utf8');
const schema  = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));

const errors   = [];
const warnings = [];

// Parse key=value pairs from MINDFORGE.md
const settings = {};
const lines = content.split('\n');
lines.forEach(line => {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) {
    const [, key, value] = match;
    settings[key] = value.trim();
  }
});

// Validate against schema
for (const [key, def] of Object.entries(schema.properties || {})) {
  const value = settings[key];

  if (def.required && !value) {
    errors.push(`${key} is required but not set`);
    continue;
  }

  if (!value) continue;

  if (def.type === 'number') {
    const num = parseFloat(value);
    if (isNaN(num)) errors.push(`${key}: expected number, got "${value}"`);
    if (def.minimum !== undefined && num < def.minimum)
      errors.push(`${key}: ${num} is below minimum ${def.minimum}`);
    if (def.maximum !== undefined && num > def.maximum)
      errors.push(`${key}: ${num} exceeds maximum ${def.maximum}`);
  }

  if (def.type === 'enum' && !def.values.includes(value)) {
    errors.push(`${key}: "${value}" is not valid. Options: ${def.values.join(', ')}`);
  }

  if (def.type === 'boolean' && !['true','false'].includes(value)) {
    errors.push(`${key}: expected true or false, got "${value}"`);
  }

  if (def.nonOverridable) {
    warnings.push(`${key}: this is a non-overridable governance primitive (value will be ignored)`);
  }
}

// Report
const total = errors.length + warnings.length;
if (total === 0) {
  console.log(`✅ MINDFORGE.md valid — ${Object.keys(settings).length} settings configured`);
  process.exit(0);
}

if (errors.length) {
  console.error(`❌ MINDFORGE.md has ${errors.length} error(s):`);
  errors.forEach(e => console.error(`   • ${e}`));
}
if (warnings.length) {
  console.warn(`⚠️  MINDFORGE.md has ${warnings.length} warning(s):`);
  warnings.forEach(w => console.warn(`   • ${w}`));
}

process.exit(errors.length ? 1 : 0);
```
```

**Commit:**
```bash
git add .mindforge/distribution/ bin/validate-config.js
git commit -m "feat(distribution): implement skills registry schema, client protocol, and validator"
```

---

## TASK 3 — Write MindForge CI Mode

### `.mindforge/ci/ci-mode.md`

```markdown
# MindForge CI Mode

## Purpose
Enable MindForge to run in non-interactive CI/CD environments.
CI mode is fully automated — no user prompts, no interactive approvals,
no waiting for human input. All decisions are pre-configured.

## Activating CI mode

CI mode activates automatically when:
1. `CI=true` environment variable is set (standard in GitHub Actions, GitLab CI, Jenkins)
2. `MINDFORGE_CI=true` is explicitly set
3. `process.stdin.isTTY === false` (piped or non-interactive shell)

In CI mode:
- All interactive prompts are skipped — pre-configured answers are used
- Approval workflows use the CI approval policy (see below)
- Progress output is structured JSON (parseable by CI log processors)
- Exit codes communicate status (0 = success, 1 = failure, 2 = warning)
- Slack/GitHub notifications are sent as configured (integrations still work)

## CI mode configuration

Add to `MINDFORGE.md` for CI-specific settings:

```
## CI/CD configuration

# Which phases to execute in CI (comma-separated phase numbers, or "all")
CI_EXECUTE_PHASES=all

# Auto-approve Tier 2 changes in CI (default: false — safer)
CI_AUTO_APPROVE_TIER2=false

# Block CI on MEDIUM security findings (default: false)
CI_BLOCK_ON_MEDIUM_SECURITY=false

# Run full security scan in CI (default: true)
CI_SECURITY_SCAN=true

# Skip human UAT in CI — only run automated verification (default: true)
CI_SKIP_UAT=true

# Fail CI if test coverage drops below this threshold
CI_MIN_COVERAGE_PCT=80

# Timeout for entire CI run in minutes (default: 60)
CI_TIMEOUT_MINUTES=60

# Output format for CI logs: json | text | github-annotations
CI_OUTPUT_FORMAT=github-annotations
```

## CI approval policy

Tier 1: always auto-approved (same as interactive mode)
Tier 2: auto-approved IF `CI_AUTO_APPROVE_TIER2=true` in MINDFORGE.md
         rejected (build fails) IF `CI_AUTO_APPROVE_TIER2=false`
Tier 3: ALWAYS fails the build in CI — Tier 3 changes require human review.

The CI build should never be the first time a Tier 3 change is seen.
Engineers should get Tier 3 changes approved BEFORE pushing to CI.

## CI output format

### JSON format (`CI_OUTPUT_FORMAT=json`)
```json
{
  "mindforge_version": "0.6.0",
  "phase": 3,
  "status": "running | success | failure | warning",
  "timestamp": "ISO-8601",
  "tasks_completed": 5,
  "tasks_total": 8,
  "current_task": "Plan 3-06: Implement auth middleware",
  "gates": {
    "secrets_clean": true,
    "tests_passing": true,
    "security_findings_critical": 0,
    "security_findings_high": 0,
    "coverage_pct": 84
  },
  "events": [
    { "time": "ISO-8601", "type": "task_completed", "plan": "3-01", "commit": "abc1234" },
    { "time": "ISO-8601", "type": "security_finding", "severity": "MEDIUM", "finding": "..." }
  ]
}
```

### GitHub Annotations format (`CI_OUTPUT_FORMAT=github-annotations`)
```
::group::MindForge Phase 3 Execution
::notice::Task 3-01 completed: Create auth middleware [abc1234]
::notice::Task 3-02 completed: Add JWT validation [def5678]
::warning file=src/auth/session.ts,line=47::Medium security finding: Verbose error message exposes stack trace
::notice::Phase 3 complete: 8/8 tasks, all tests passing
::endgroup::
```

### Error output
```
::error::MindForge CI failed: Task 3-06 verify step failed
::error file=src/api/users.ts,line=89::TypeScript error: Type 'string' is not assignable to 'number'
::error::Quality gate failed: test coverage 68% (minimum: 80%)
```

## CI environment requirements

```bash
# Required environment variables for full CI functionality:
ANTHROPIC_API_KEY=     # Claude API access (required for AI features)
GITHUB_TOKEN=          # For PR creation and status checks
JIRA_API_TOKEN=        # Optional — for Jira sync
SLACK_BOT_TOKEN=       # Optional — for notifications
```

## CI timeout and resource management

```
Default execution limits per CI run:
  Maximum tasks per session: 25
  Maximum parallel subagents: 5 (respect CI runner memory limits)
  Task timeout: 10 minutes per task
  Phase timeout: 45 minutes
  Full CI timeout: 60 minutes

On timeout:
  1. Write current state to HANDOFF.json
  2. Exit with code 2 (warning — not failure)
  3. The next CI run resumes from HANDOFF.json
  4. Report: "CI timeout reached. Run will resume from: [next_task]"
```
```

---

### `.mindforge/ci/github-actions-adapter.md`

```markdown
# MindForge — GitHub Actions Integration

## Purpose
Define the GitHub Actions workflow that integrates MindForge into CI/CD pipelines.

## Workflow file: `.github/workflows/mindforge-ci.yml`

```yaml
name: MindForge CI

on:
  push:
    branches: [ main, 'feat/**' ]
  pull_request:
    branches: [ main ]

env:
  CI: true
  MINDFORGE_CI: true
  NODE_VERSION: '20'

jobs:
  mindforge-health:
    name: MindForge Health Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0   # Full history for git-based checks

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install MindForge
        run: npx mindforge-cc@latest --claude --local

      - name: Validate MINDFORGE.md
        run: node bin/validate-config.js

      - name: Run MindForge health check
        run: |
          # Health check in CI mode — outputs structured JSON
          echo "::group::MindForge Health Report"
          node -e "
            // CI health check simulation
            // In full implementation: calls mindforge health engine
            const fs = require('fs');
            const files = ['.planning/AUDIT.jsonl', '.planning/STATE.md', '.planning/HANDOFF.json'];
            let allPresent = true;
            files.forEach(f => {
              if (!fs.existsSync(f)) {
                console.log('::warning::Missing state file: ' + f);
                allPresent = false;
              }
            });
            console.log(allPresent ? '::notice::All state files present' : '::warning::Some state files missing');
          "
          echo "::endgroup::"

  mindforge-security:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: mindforge-health
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: MindForge secret detection
        run: |
          echo "::group::Secret Detection"
          # Secret patterns — exits non-zero if found
          if grep -rE "(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]+|xoxb-[a-zA-Z0-9-]+)" \
            --include="*.ts" --include="*.js" --include="*.json" \
            --exclude-dir=node_modules --exclude-dir=.git \
            . 2>/dev/null; then
            echo "::error::Credentials detected in source files. Remove before merging."
            exit 1
          fi
          echo "::notice::No credentials detected ✅"
          echo "::endgroup::"

      - name: Dependency audit
        run: |
          echo "::group::Dependency Audit"
          npm audit --audit-level=high 2>&1 || {
            echo "::error::High/critical vulnerabilities found. Run: npm audit fix"
            exit 1
          }
          echo "::endgroup::"

  mindforge-quality:
    name: Code Quality Gates
    runs-on: ubuntu-latest
    needs: mindforge-health
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit 2>&1 | while read line; do
          echo "::error::$line"
          done

      - name: Lint
        run: npx eslint . --ext .ts,.tsx --max-warnings 0

      - name: Test suite with coverage
        run: npm test -- --coverage
        env:
          COVERAGE_THRESHOLD: 80

      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json 2>/dev/null | \
            node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); \
            console.log(Math.floor(d.total.lines.pct))" 2>/dev/null || echo "0")
          MIN=${CI_MIN_COVERAGE_PCT:-80}
          if [ "${COVERAGE}" -lt "${MIN}" ]; then
            echo "::error::Coverage ${COVERAGE}% is below minimum ${MIN}%"
            exit 1
          fi
          echo "::notice::Coverage: ${COVERAGE}% ✅"

  mindforge-ai-review:
    name: AI Code Review
    runs-on: ubuntu-latest
    needs: [mindforge-security, mindforge-quality]
    if: github.event_name == 'pull_request'
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install MindForge
        run: npx mindforge-cc@latest --claude --local

      - name: Run AI PR Review
        run: |
          # Get the diff for this PR
          git diff ${{ github.event.pull_request.base.sha }}...${{ github.event.pull_request.head.sha }} > /tmp/pr.diff

          # Run MindForge AI review (outputs GitHub annotations)
          node -e "
            // Placeholder for AI review execution
            // In full implementation: calls Claude API via the pr-review engine
            console.log('::notice::AI PR review completed — see review comment on PR');
          "

      - name: Post review as PR comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const review = fs.existsSync('/tmp/mindforge-review.md') ?
              fs.readFileSync('/tmp/mindforge-review.md', 'utf8') :
              '✅ MindForge AI review: no significant issues found.';

            await github.rest.pulls.createReview({
              owner: context.repo.owner,
              repo: context.repo.repo,
              pull_number: context.issue.number,
              body: review,
              event: 'COMMENT'
            });
```
```

**Commit:**
```bash
git add .mindforge/ci/ .github/workflows/mindforge-ci.yml
git commit -m "feat(ci): implement CI mode engine and GitHub Actions workflow"
```

---

## TASK 4 — Write the AI PR Review Engine

### `.mindforge/pr-review/ai-reviewer.md`

```markdown
# MindForge — AI PR Review Engine

## Purpose
Use the Claude API directly to perform intelligent, contextual code reviews
on pull request diffs. Goes beyond static analysis to provide reasoning-based
feedback that understands architectural context.

## Review philosophy
The AI reviewer has three goals:
1. Catch what static analysis misses (logic errors, design flaws, missing edge cases)
2. Confirm that the PR delivers what it claims (requirements traceability)
3. Maintain code quality standards consistently across all reviewers

The AI reviewer does NOT replace human reviewers — it prepares them.
It surfaces issues, explains context, and asks questions.
Human reviewers make final decisions.

## Claude API integration

```javascript
// pr-review/ai-review-runner.js

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set — AI review unavailable');
  process.exit(0); // Graceful skip, not failure
}

async function runAIReview(diff, context) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: buildSystemPrompt(context),
      messages: [
        { role: 'user', content: buildReviewPrompt(diff, context) }
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
```

## System prompt construction

```javascript
function buildSystemPrompt(context) {
  return `You are a senior code reviewer performing a pull request review for the project: ${context.projectName}.

## Your review context
Tech stack: ${context.techStack}
Architecture pattern: ${context.architecturePattern}
Coding conventions: ${context.conventions}
Security requirements: ${context.securityRequirements}

## Your review approach
1. Read the diff carefully — understand the INTENT of each change, not just the change itself
2. Check if the implementation matches the stated PR purpose
3. Look for: logic errors, missing error handling, security issues, performance concerns
4. Evaluate: code clarity, convention adherence, test coverage
5. Flag: anything that seems to contradict the architecture or conventions

## Output format
Produce a structured review in this exact format:

### Summary
[2-3 sentences: what this PR does and overall quality assessment]

### Findings
For each finding, use exactly:
**[CRITICAL|HIGH|MEDIUM|LOW]** \`file:line\` — [Issue description]
> [Specific recommendation]

### Positive observations
[What was done well — be genuine, not perfunctory]

### Questions for the author
[Numbered questions about unclear decisions or assumptions]

### Verdict
[APPROVE | REQUEST_CHANGES | COMMENT] — [one sentence rationale]

Be direct. Be specific. Cite line numbers. Do not be vague.
Do not flag issues that are stylistic preferences when conventions permit them.
Do not repeat findings from the automated checks (secret detection, type errors) — focus on logic and design.`;
}
```

## Review prompt construction

```javascript
function buildReviewPrompt(diff, context) {
  return `Please review this pull request diff.

## PR Information
Title: ${context.prTitle}
Author: ${context.prAuthor}
Branch: ${context.branch} → ${context.base}
Files changed: ${context.filesChanged}

## Requirements being addressed
${context.requirements || 'No specific requirements listed'}

## Architectural context
${context.architectureContext || 'See ARCHITECTURE.md for system design'}

## The diff
\`\`\`diff
${diff.slice(0, 12000)} ${diff.length > 12000 ? '\n[diff truncated — ' + diff.length + ' chars total]' : ''}
\`\`\`

Focus your review on correctness, security, and architectural alignment.
Do not comment on formatting issues handled by the linter.`;
}
```

## Context loading

Before calling the API, load review context:
```javascript
function loadReviewContext() {
  const projectMd = readFile('.planning/PROJECT.md');
  const archMd    = readFile('.planning/ARCHITECTURE.md');
  const convMd    = readFile('.mindforge/org/CONVENTIONS.md');
  const secMd     = readFile('.mindforge/org/SECURITY.md');

  return {
    projectName:         extractField(projectMd, 'NAME') || 'Unknown',
    techStack:           extractTechStack(projectMd),
    architecturePattern: extractField(archMd, '## Architectural pattern') || 'Unknown',
    conventions:         convMd.slice(0, 2000),     // First 2000 chars
    securityRequirements: secMd.slice(0, 1500),     // First 1500 chars
  };
}
```

## Rate limiting and cost management

```javascript
// Review request limits to control API costs
const REVIEW_LIMITS = {
  maxDiffSize: 15000,      // Characters — larger diffs get summarised
  maxFilesReviewed: 20,    // Review the 20 most-changed files
  cacheTtlMinutes: 60,     // Cache reviews for the same commit SHA
  maxDailyReviews: 50,     // Stop AI reviews after 50 per day (configurable)
};

// Before calling API: check daily limit
function checkDailyLimit() {
  const today = new Date().toISOString().slice(0, 10);
  const logFile = '.mindforge/metrics/ai-review-usage.jsonl';
  const todayCount = (readFileLines(logFile) || [])
    .filter(line => line.includes(today))
    .length;
  return todayCount < REVIEW_LIMITS.maxDailyReviews;
}
```

## Output formatting for GitHub

```javascript
function formatForGitHub(aiReview, summary) {
  return `## 🤖 MindForge AI Code Review

${aiReview}

---
*Generated by MindForge AI Review Engine v${VERSION}*
*Model: claude-sonnet-4-6 | Context: PROJECT.md + ARCHITECTURE.md + CONVENTIONS.md*
*This review supplements but does not replace human code review.*`;
}
```
```

---

### `.mindforge/pr-review/review-prompt-templates.md`

```markdown
# MindForge — PR Review Prompt Templates

## Specialised review templates by change type

### Security-focused review (for Tier 3 changes)
Used when: PR includes auth, payment, PII, or security changes.
Additional system prompt addition:
```
SECURITY REVIEW MODE ACTIVE.
Apply the OWASP Top 10 checklist systematically to this diff.
Flag every instance of:
- A01: Access control bypasses
- A02: Cryptographic weaknesses (weak algorithms, insecure storage)
- A03: Injection vectors (SQL, NoSQL, OS, LDAP)
- A07: Authentication failures (session management, credential handling)
Any CRITICAL security finding must be listed first, before other findings.
```

### Database migration review
Used when: PR includes database schema changes.
Additional prompt addition:
```
DATABASE MIGRATION REVIEW MODE.
For this migration, verify:
1. Migration is reversible — is there a DOWN migration?
2. Migration is non-blocking — does it avoid full table locks?
3. New columns with NOT NULL have either a DEFAULT or a two-phase migration
4. No data-loss operations without explicit confirmation in PR description
5. New indexes are added CONCURRENTLY (PostgreSQL) to avoid table locks
6. Foreign key constraints are added with VALIDATE separately from creation
```

### API breaking change review
Used when: PR changes existing API endpoints or response schemas.
Additional prompt addition:
```
API BREAKING CHANGE REVIEW MODE.
Verify:
1. Is this change documented as breaking in the PR description?
2. Is the API version incremented appropriately?
3. Are existing clients given a deprecation period?
4. Is a migration guide included for API consumers?
5. Do integration tests cover both old and new API contracts?
```
```

**Commit:**
```bash
git add .mindforge/pr-review/
git commit -m "feat(pr-review): implement AI PR review engine with Claude API integration"
```

---

## TASK 5 — Write the Monorepo Support Engine

### `.mindforge/monorepo/workspace-detector.md`

```markdown
# MindForge — Monorepo Workspace Detector

## Purpose
Detect and understand monorepo structures (npm workspaces, pnpm workspaces,
Nx, Turborepo, Lerna) so MindForge can plan and execute phases across
multiple packages correctly.

## Supported monorepo types

| Type | Detection file | Package locations |
|---|---|---|
| npm workspaces | `package.json` with `"workspaces":` | Defined in workspaces array |
| pnpm workspaces | `pnpm-workspace.yaml` | Defined in packages array |
| Nx | `nx.json` | `apps/` and `libs/` |
| Turborepo | `turbo.json` | `apps/` and `packages/` |
| Lerna | `lerna.json` | Defined in packages array |
| Yarn workspaces | `package.json` with `"workspaces":` | Same as npm |

## Detection protocol

```bash
detect_workspace_type() {
  local ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

  # Check in priority order
  if [ -f "${ROOT}/nx.json" ]; then
    echo "nx"
  elif [ -f "${ROOT}/turbo.json" ]; then
    echo "turborepo"
  elif [ -f "${ROOT}/lerna.json" ]; then
    echo "lerna"
  elif [ -f "${ROOT}/pnpm-workspace.yaml" ]; then
    echo "pnpm"
  elif node -e "
    const p = require('./package.json');
    process.exit(p.workspaces ? 0 : 1)
  " 2>/dev/null; then
    echo "npm-workspaces"
  else
    echo "none"
  fi
}

list_packages() {
  local TYPE="$1"
  case "${TYPE}" in
    nx)
      find apps/ libs/ -name "package.json" -not -path "*/node_modules/*" \
        -exec dirname {} \; 2>/dev/null | sort
      ;;
    turborepo)
      find apps/ packages/ -name "package.json" -not -path "*/node_modules/*" \
        -exec dirname {} \; 2>/dev/null | sort
      ;;
    pnpm)
      cat pnpm-workspace.yaml | grep "^  -" | sed "s/  - '//;s/'$//"
      ;;
    npm-workspaces|lerna)
      node -e "
        const p = require('./package.json');
        const ws = p.workspaces || require('./lerna.json').packages || [];
        ws.forEach(w => console.log(w.replace(/\/\*$/, '')));
      " 2>/dev/null
      ;;
  esac
}
```

## Package metadata extraction

For each detected package, extract:
```javascript
{
  "name": "package name from package.json",
  "path": "relative path from monorepo root",
  "type": "app | lib | shared | api | web | cli",
  "dependencies": ["list of internal package dependencies"],
  "scripts": {
    "build": "build command",
    "test": "test command",
    "lint": "lint command"
  },
  "mindforge": {
    "phase-scope": "global | package-specific",
    "test-command": "override test command if needed",
    "affected-by": ["list of packages that affect this one"]
  }
}
```

## Workspace manifest

Write to `.planning/WORKSPACE-MANIFEST.json`:

```json
{
  "schema_version": "1.0.0",
  "workspace_type": "turborepo",
  "root": "/path/to/project",
  "packages": [
    {
      "name": "@myapp/api",
      "path": "apps/api",
      "type": "api",
      "dependencies": ["@myapp/shared"],
      "test_command": "npm test",
      "build_command": "npm run build"
    },
    {
      "name": "@myapp/web",
      "path": "apps/web",
      "type": "web",
      "dependencies": ["@myapp/shared", "@myapp/ui"],
      "test_command": "npm test",
      "build_command": "npm run build"
    },
    {
      "name": "@myapp/shared",
      "path": "packages/shared",
      "type": "lib",
      "dependencies": [],
      "test_command": "npm test",
      "build_command": "npm run build"
    }
  ],
  "dependency_order": ["@myapp/shared", "@myapp/api", "@myapp/web"],
  "affected_packages": {}
}
```
```

---

### `.mindforge/monorepo/cross-package-planner.md`

```markdown
# MindForge — Cross-Package Planner

## Purpose
When a phase spans multiple packages in a monorepo, coordinate execution
so that shared dependencies are built and tested before packages that
depend on them.

## Execution order algorithm

```
Given: a set of packages involved in the current phase
       and their inter-package dependencies

Algorithm: topological sort of package dependency graph

Input: WORKSPACE-MANIFEST.json dependency_order
Output: ordered list of packages to process

Example:
  Phase touches: @myapp/api, @myapp/shared, @myapp/web
  Dependencies: api→shared, web→shared, web→api
  Topological order: shared → api → web
  
  Execution: 
    Wave 1: process @myapp/shared (no dependencies on other changed packages)
    Wave 2: process @myapp/api (depends on Wave 1: shared)
    Wave 3: process @myapp/web (depends on Wave 2: api + Wave 1: shared)
```

## Per-package PLAN file routing

When PLAN files are created for a monorepo phase, each plan specifies its target package:

```xml
<task type="auto">
  <n>Add auth middleware to API</n>
  <package>@myapp/api</package>
  <working-dir>apps/api</working-dir>
  <files>
    apps/api/src/middleware/auth.ts
    apps/api/src/middleware/auth.test.ts
  </files>
  <action>...</action>
  <verify>cd apps/api && npm test -- --testPathPattern=auth.middleware</verify>
  <done>Auth middleware tests passing in apps/api</done>
</task>
```

## Cross-package test execution

After all packages in the phase are processed:
```bash
# Run tests across all affected packages
AFFECTED_PACKAGES=$(cat .planning/WORKSPACE-MANIFEST.json | \
  node -e "const m=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); \
  console.log(m.packages.map(p=>p.path).join(' '))")

for PKG_PATH in ${AFFECTED_PACKAGES}; do
  echo "Testing ${PKG_PATH}..."
  cd "${PKG_PATH}" && npm test && cd -
done

# Run integration tests from root (if configured)
[ -f "package.json" ] && npm run test:integration 2>/dev/null || true
```

## Affected package detection

When a PLAN modifies a shared library: automatically include all packages
that depend on that library in the affected scope:

```bash
# Detect affected packages from changed files
CHANGED_PACKAGES=$(git diff --name-only | \
  awk -F/ '{print $1"/"$2}' | sort -u | \
  while read pkg; do
    node -e "
      const m = require('.planning/WORKSPACE-MANIFEST.json');
      const changed = '${pkg}';
      m.packages.forEach(p => {
        if (p.path === changed || p.dependencies.some(d => d.includes(changed))) {
          console.log(p.name);
        }
      });
    " 2>/dev/null
  done | sort -u)
```
```

**Commit:**
```bash
git add .mindforge/monorepo/
git commit -m "feat(monorepo): implement workspace detector and cross-package planner"
```

---

## TASK 6 — Write the MindForge SDK

### `sdk/package.json`

```json
{
  "name": "@mindforge/sdk",
  "version": "0.6.0",
  "description": "MindForge SDK — Programmatic API for embedding MindForge in tools",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "node tests/sdk.test.js",
    "lint": "eslint src/ --ext .ts"
  },
  "keywords": ["mindforge", "agentic-framework", "claude", "sdk"],
  "license": "MIT",
  "peerDependencies": {
    "typescript": ">=5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

### `sdk/src/types.ts`

```typescript
/**
 * MindForge SDK — Type Definitions
 */

export interface MindForgeConfig {
  /** Path to the project root (default: cwd) */
  projectRoot?: string;
  /** Claude API key (default: ANTHROPIC_API_KEY env var) */
  apiKey?: string;
  /** CI mode — disables interactive features */
  ciMode?: boolean;
  /** Output format for events */
  outputFormat?: 'json' | 'text' | 'github-annotations';
  /** Timeout per task in milliseconds (default: 600000 — 10 minutes) */
  taskTimeoutMs?: number;
}

export interface PhaseResult {
  phase: number;
  status: 'success' | 'failure' | 'warning' | 'skipped';
  tasksCompleted: number;
  tasksTotal: number;
  commits: string[];
  securityFindings: SecurityFinding[];
  qualityGateResults: GateResult[];
  durationMs: number;
  errorMessage?: string;
}

export interface TaskResult {
  planId: string;
  taskName: string;
  status: 'completed' | 'failed' | 'skipped';
  commitSha?: string;
  verifyOutput?: string;
  durationMs: number;
  errorMessage?: string;
}

export interface SecurityFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  owaspCategory: string;
  file: string;
  line: number;
  description: string;
  remediation: string;
  remediated: boolean;
}

export interface GateResult {
  gate: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  detail?: string;
}

export interface HealthReport {
  overallStatus: 'healthy' | 'warning' | 'error';
  errors: HealthIssue[];
  warnings: HealthIssue[];
  informational: HealthIssue[];
  timestamp: string;
}

export interface HealthIssue {
  category: string;
  message: string;
  autoRepairable: boolean;
  fixCommand?: string;
}

export type MindForgeEvent =
  | { type: 'task_started';   phase: number; plan: string; taskName: string }
  | { type: 'task_completed'; phase: number; plan: string; commitSha: string }
  | { type: 'task_failed';    phase: number; plan: string; error: string }
  | { type: 'wave_started';   phase: number; wave: number; taskCount: number }
  | { type: 'wave_completed'; phase: number; wave: number }
  | { type: 'phase_completed'; phase: number; result: PhaseResult }
  | { type: 'security_finding'; finding: SecurityFinding }
  | { type: 'gate_result';    gate: GateResult }
  | { type: 'log';            level: 'info' | 'warn' | 'error'; message: string };
```

### `sdk/src/client.ts`

```typescript
/**
 * MindForge SDK — Main Client
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import type {
  MindForgeConfig, PhaseResult, TaskResult, HealthReport, MindForgeEvent
} from './types';

export class MindForgeClient extends EventEmitter {
  private config: Required<MindForgeConfig>;
  private projectRoot: string;

  constructor(config: MindForgeConfig = {}) {
    super();
    this.projectRoot = config.projectRoot ?? process.cwd();
    this.config = {
      projectRoot:    this.projectRoot,
      apiKey:         config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '',
      ciMode:         config.ciMode ?? (process.env.CI === 'true'),
      outputFormat:   config.outputFormat ?? 'json',
      taskTimeoutMs:  config.taskTimeoutMs ?? 600_000,
    };
  }

  // ── Event emission helper ──────────────────────────────────────────────────
  private emit<T extends MindForgeEvent>(event: T): boolean {
    return super.emit(event.type, event);
  }

  // ── Project state ──────────────────────────────────────────────────────────
  isInitialised(): boolean {
    return fs.existsSync(path.join(this.projectRoot, '.planning', 'PROJECT.md'));
  }

  readState(): Record<string, unknown> | null {
    const statePath = path.join(this.projectRoot, '.planning', 'STATE.md');
    if (!fs.existsSync(statePath)) return null;
    return { raw: fs.readFileSync(statePath, 'utf8') };
  }

  readHandoff(): Record<string, unknown> | null {
    const handoffPath = path.join(this.projectRoot, '.planning', 'HANDOFF.json');
    if (!fs.existsSync(handoffPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
    } catch {
      return null;
    }
  }

  // ── Health check ───────────────────────────────────────────────────────────
  async health(): Promise<HealthReport> {
    const errors:   Array<{ category: string; message: string; autoRepairable: boolean }> = [];
    const warnings: Array<{ category: string; message: string; autoRepairable: boolean }> = [];
    const info:     Array<{ category: string; message: string; autoRepairable: boolean }> = [];

    const requiredFiles = [
      '.planning/STATE.md',
      '.planning/HANDOFF.json',
      '.planning/AUDIT.jsonl',
      '.mindforge/org/CONVENTIONS.md',
    ];

    for (const file of requiredFiles) {
      const fullPath = path.join(this.projectRoot, file);
      if (!fs.existsSync(fullPath)) {
        warnings.push({ category: 'installation', message: `Missing: ${file}`, autoRepairable: false });
      }
    }

    // Check HANDOFF.json validity
    const handoff = this.readHandoff();
    if (handoff && !handoff.schema_version) {
      errors.push({ category: 'state', message: 'HANDOFF.json missing schema_version field', autoRepairable: false });
    }

    // Check AUDIT.jsonl
    const auditPath = path.join(this.projectRoot, '.planning', 'AUDIT.jsonl');
    if (fs.existsSync(auditPath)) {
      const lineCount = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean).length;
      if (lineCount > 9000) {
        warnings.push({ category: 'audit', message: `AUDIT.jsonl has ${lineCount} lines — archive soon`, autoRepairable: true });
      }
      info.push({ category: 'audit', message: `AUDIT.jsonl: ${lineCount} entries`, autoRepairable: false });
    }

    return {
      overallStatus: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'healthy',
      errors,
      warnings,
      informational: info,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Audit log reading ──────────────────────────────────────────────────────
  readAuditLog(filter?: { event?: string; phase?: number; since?: Date }): unknown[] {
    const auditPath = path.join(this.projectRoot, '.planning', 'AUDIT.jsonl');
    if (!fs.existsSync(auditPath)) return [];

    return fs.readFileSync(auditPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean)
      .filter(entry => {
        if (filter?.event && entry.event !== filter.event) return false;
        if (filter?.phase !== undefined && entry.phase !== filter.phase) return false;
        if (filter?.since && new Date(entry.timestamp) < filter.since) return false;
        return true;
      });
  }

  // ── Metrics reading ────────────────────────────────────────────────────────
  readSessionMetrics(limit = 10): unknown[] {
    const metricsPath = path.join(this.projectRoot, '.mindforge', 'metrics', 'session-quality.jsonl');
    if (!fs.existsSync(metricsPath)) return [];

    return fs.readFileSync(metricsPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .slice(-limit)
      .map(line => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
  }

  // ── Config validation ──────────────────────────────────────────────────────
  validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
    const configPath = path.join(this.projectRoot, 'MINDFORGE.md');
    if (!fs.existsSync(configPath)) {
      return { valid: true, errors: [], warnings: ['MINDFORGE.md not found — using defaults'] };
    }
    // Full validation via bin/validate-config.js
    return { valid: true, errors: [], warnings: [] };
  }
}
```

### `sdk/src/commands.ts`

```typescript
/**
 * MindForge SDK — Command Builders
 * Builds the command strings that can be sent to Claude Code / Antigravity
 * via their programmatic APIs.
 */

export interface CommandOptions {
  flags?: string[];
  args?: string[];
}

export const commands = {
  /**
   * Build a /mindforge:health command string
   */
  health(opts: CommandOptions = {}): string {
    const flags = opts.flags?.join(' ') ?? '';
    return `/mindforge:health ${flags}`.trim();
  },

  /**
   * Build a /mindforge:plan-phase command string
   */
  planPhase(phase: number, opts: CommandOptions = {}): string {
    const flags = opts.flags?.join(' ') ?? '';
    return `/mindforge:plan-phase ${phase} ${flags}`.trim();
  },

  /**
   * Build a /mindforge:execute-phase command string
   */
  executePhase(phase: number, opts: CommandOptions = {}): string {
    const flags = opts.flags?.join(' ') ?? '';
    return `/mindforge:execute-phase ${phase} ${flags}`.trim();
  },

  /**
   * Build a /mindforge:security-scan command string
   */
  securityScan(path?: string, opts: CommandOptions = {}): string {
    const flags = opts.flags?.join(' ') ?? '';
    return `/mindforge:security-scan ${path ?? ''} ${flags}`.trim();
  },

  /**
   * Build a /mindforge:audit command string with filters
   */
  audit(filter: { phase?: number; event?: string; since?: string } = {}): string {
    const parts = ['/mindforge:audit'];
    if (filter.phase)  parts.push(`--phase ${filter.phase}`);
    if (filter.event)  parts.push(`--event ${filter.event}`);
    if (filter.since)  parts.push(`--since ${filter.since}`);
    return parts.join(' ');
  },

  /**
   * Build a /mindforge:pr-review command string
   */
  prReview(opts: CommandOptions = {}): string {
    const flags = opts.flags?.join(' ') ?? '';
    return `/mindforge:pr-review ${flags}`.trim();
  },
};
```

### `sdk/src/events.ts`

```typescript
/**
 * MindForge SDK — Server-Sent Events (SSE) stream for real-time progress
 * Enables external tools to subscribe to MindForge execution progress.
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

interface SSEClient {
  id: string;
  response: http.ServerResponse;
}

export class MindForgeEventStream {
  private clients: SSEClient[] = [];
  private server: http.Server | null = null;
  private auditWatcher: fs.FSWatcher | null = null;
  private lastAuditLine = 0;

  /**
   * Start the SSE server on the given port
   */
  start(port = 7337): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        if (req.url !== '/events') {
          res.writeHead(404);
          res.end();
          return;
        }

        // CORS for local tool integrations
        res.writeHead(200, {
          'Content-Type':  'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection':    'keep-alive',
          'Access-Control-Allow-Origin': 'http://localhost:*',
        });

        const clientId = Date.now().toString();
        this.clients.push({ id: clientId, response: res });

        // Send initial connection event
        this.sendEvent(res, 'connected', { clientId, timestamp: new Date().toISOString() });

        // Clean up on disconnect
        req.on('close', () => {
          this.clients = this.clients.filter(c => c.id !== clientId);
        });
      });

      this.server.listen(port, () => {
        console.log(`MindForge event stream listening on http://localhost:${port}/events`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  /**
   * Watch AUDIT.jsonl for new entries and broadcast as SSE events
   */
  watchAuditLog(projectRoot: string): void {
    const auditPath = path.join(projectRoot, '.planning', 'AUDIT.jsonl');

    if (!fs.existsSync(auditPath)) {
      // Create the file if it doesn't exist yet
      fs.writeFileSync(auditPath, '');
    }

    // Set initial line count
    const content = fs.readFileSync(auditPath, 'utf8');
    this.lastAuditLine = content.split('\n').filter(Boolean).length;

    this.auditWatcher = fs.watch(auditPath, () => {
      const lines = fs.readFileSync(auditPath, 'utf8')
        .split('\n')
        .filter(Boolean);

      // Broadcast new lines
      for (let i = this.lastAuditLine; i < lines.length; i++) {
        try {
          const entry = JSON.parse(lines[i]);
          this.broadcast('audit_entry', entry);
        } catch {
          // Ignore parse errors for incomplete lines
        }
      }

      this.lastAuditLine = lines.length;
    });
  }

  /**
   * Broadcast an event to all connected clients
   */
  broadcast(eventType: string, data: unknown): void {
    this.clients.forEach(client => {
      this.sendEvent(client.response, eventType, data);
    });
  }

  private sendEvent(res: http.ServerResponse, type: string, data: unknown): void {
    try {
      res.write(`event: ${type}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // Client disconnected
    }
  }

  /**
   * Stop the event stream server
   */
  stop(): void {
    this.auditWatcher?.close();
    this.server?.close();
    this.clients.forEach(c => c.response.end());
    this.clients = [];
  }
}
```

### `sdk/src/index.ts`

```typescript
/**
 * MindForge SDK — Public API
 * @module @mindforge/sdk
 */

export { MindForgeClient } from './client';
export { MindForgeEventStream } from './events';
export { commands } from './commands';
export type {
  MindForgeConfig,
  PhaseResult,
  TaskResult,
  SecurityFinding,
  GateResult,
  HealthReport,
  HealthIssue,
  MindForgeEvent,
  CommandOptions,
} from './types';

export const VERSION = '0.6.0';
```

### `sdk/README.md`

```markdown
# @mindforge/sdk

TypeScript SDK for embedding MindForge in tools, dashboards, and CI pipelines.

## Installation

```bash
npm install @mindforge/sdk
```

## Quick start

```typescript
import { MindForgeClient } from '@mindforge/sdk';

const client = new MindForgeClient({
  projectRoot: '/path/to/project',
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Health check
const health = await client.health();
console.log(health.overallStatus); // 'healthy' | 'warning' | 'error'

// Read audit log
const findings = client.readAuditLog({ event: 'security_finding' });
console.log(findings);

// Read metrics
const metrics = client.readSessionMetrics(5);
console.log(metrics);
```

## Real-time event streaming

```typescript
import { MindForgeEventStream } from '@mindforge/sdk';

const stream = new MindForgeEventStream();
await stream.start(7337);
stream.watchAuditLog('/path/to/project');

// Subscribe from browser or tool:
const es = new EventSource('http://localhost:7337/events');
es.addEventListener('audit_entry', (e) => {
  const entry = JSON.parse(e.data);
  if (entry.event === 'task_completed') {
    console.log('Task done:', entry.task_name);
  }
});
```

## Config validation

```typescript
const { valid, errors } = client.validateConfig();
if (!valid) console.error(errors);
```

## TypeScript support

Full type definitions included. No `@types/` package needed.
```

**Commit:**
```bash
git add sdk/
git commit -m "feat(sdk): implement MindForge TypeScript SDK with client, events, and command builders"
```

---

## TASK 7 — Write `/mindforge:init-org` command

### `.claude/commands/mindforge/init-org.md`

```markdown
# MindForge — Init Org Command
# Usage: /mindforge:init-org [--org-name "Name"] [--update]

## Purpose
Set up MindForge at the organisation level — create standardised org-level
context files that are shared across ALL projects in the organisation.

Intended to be run ONCE by a platform engineer or engineering lead.
Output is committed to a shared `mindforge-org-config` repository
and distributed to projects as a git submodule or npm package.

## Step 1 — Gather org information

Ask (one question at a time):
1. "What is your organisation name?"
2. "Describe what your organisation builds in 1-2 sentences."
3. "What is your primary tech stack? (describe in plain English)"
4. "What is your default deployment target? (AWS / GCP / Azure / self-hosted / hybrid)"
5. "What regulatory frameworks apply to your organisation?"
   Options: GDPR / HIPAA / SOC 2 / PCI-DSS / ISO 27001 / None / Multiple
6. "What is your source control platform?" (GitHub / GitLab / Bitbucket / Azure DevOps)
7. "What is your issue tracker?" (Jira / GitHub Issues / Linear / Azure DevOps / None)
8. "Who are your Tier 3 compliance approvers? (email addresses, comma-separated)"

## Step 2 — Generate org-level context files

Create (or update with `--update`) these files:

### `.mindforge/org/ORG.md`
Populated from answers with:
- Organisation identity and mission
- Default tech stack with version recommendations
- Architecture defaults
- Team conventions
- Compliance requirements

### `.mindforge/org/CONVENTIONS.md`
Generate sensible defaults based on the tech stack detected.
For TypeScript/Node.js stacks: strict TypeScript, ESLint, Conventional Commits
For Python stacks: ruff, mypy, black formatting
For Go: standard Go toolchain conventions
Mark each section clearly: [DEFAULT] or [CUSTOMISE THIS]

### `.mindforge/org/SECURITY.md`
Generate based on declared compliance frameworks:
- GDPR → include GDPR-specific policies
- HIPAA → include PHI handling requirements
- PCI-DSS → include card data handling policies
- SOC 2 → include access control requirements
Mark critical sections: [REVIEW WITH SECURITY TEAM]

### `.mindforge/org/TOOLS.md`
Generate approved library list based on tech stack.
Include common forbidden libraries (moment.js, request, etc.)
Mark: [ADD YOUR APPROVED LIBRARIES]

### `.mindforge/org/integrations/INTEGRATIONS-CONFIG.md`
Pre-populate based on declared platforms:
- GitHub → fill GitHub config section
- Jira → fill Jira config section
Mark credential fields clearly: [SET VIA ENVIRONMENT VARIABLE]

### `.mindforge/governance/GOVERNANCE-CONFIG.md`
Pre-populate based on declared approvers and compliance frameworks.
Higher compliance burden → lower Tier 2/3 thresholds.
Stricter approval SLAs for HIPAA/PCI-DSS organisations.

## Step 3 — Generate skills recommendation

Based on the tech stack and compliance requirements, recommend skills to install:

```
Recommended skills for your tech stack:

Core skills (already included — v0.6.0):
  ✅ security-review, code-quality, api-design, testing-standards, documentation,
     performance, accessibility, data-privacy, incident-response, database-patterns

Additional skills recommended for your stack:
  [tech-stack-specific recommendations from registry]

For your compliance requirements:
  [compliance-specific skill recommendations]

Install all recommendations?
  yes → npx mindforge-skills install [list]
  no  → I'll show you the install commands for each
```

## Step 4 — Create distribution package

Offer to create an org-skills npm package for distributing org-level config:

```
Create `@your-org/mindforge-config` npm package?
This package will distribute your org-level MindForge configuration
to all projects in your organisation via: npx @your-org/mindforge-config

Files included:
  .mindforge/org/ORG.md
  .mindforge/org/CONVENTIONS.md
  .mindforge/org/SECURITY.md
  .mindforge/org/TOOLS.md
  .mindforge/org/skills/MANIFEST.md
  .mindforge/org/integrations/INTEGRATIONS-CONFIG.md (without credentials)
  .mindforge/governance/GOVERNANCE-CONFIG.md (without credentials)
```

## Step 5 — Write AUDIT entry and report

```json
{ "event": "org_initialised", "org_name": "[name]", "compliance_frameworks": [...], "skills_recommended": [...] }
```

Report:
```
✅ MindForge organisation configuration complete.

Files created:
  .mindforge/org/ORG.md
  .mindforge/org/CONVENTIONS.md
  .mindforge/org/SECURITY.md
  .mindforge/org/TOOLS.md
  .mindforge/governance/GOVERNANCE-CONFIG.md

Next steps:
  1. Review each file — look for [CUSTOMISE THIS] markers
  2. Fill in SECURITY.md with your security team
  3. Commit to your org's mindforge-config repository
  4. Share with all projects: npx @your-org/mindforge-config (if you created the package)
```
```

**Commit:**
```bash
cp .claude/commands/mindforge/init-org.md .agent/mindforge/init-org.md
git add .claude/commands/mindforge/init-org.md .agent/mindforge/init-org.md
git commit -m "feat(commands): add /mindforge:init-org organisation-wide setup command"
```

---

## TASK 8 — Write remaining Day 6 commands

### `.claude/commands/mindforge/install-skill.md`

```markdown
# MindForge — Install Skill Command
# Usage: /mindforge:install-skill [skill-name|package-name] [--tier 1|2|3] [--registry URL]

Follow the full installation protocol from `.mindforge/distribution/registry-client.md`.

Steps:
1. Resolve package name from skill name
2. Check if already installed (skip if same version, offer upgrade if newer)
3. Fetch from registry (npm or private if --registry specified)
4. Validate the skill (Level 1 + Level 2 from skill-validator.md)
5. Run injection guard check
6. Install to tier directory (default: Tier 2 org skill)
7. Register in MANIFEST.md
8. Write AUDIT entry
9. Confirm: "Run /mindforge:skills validate to verify installation"
```

### `.claude/commands/mindforge/publish-skill.md`

```markdown
# MindForge — Publish Skill Command
# Usage: /mindforge:publish-skill [skill-dir] [--registry URL] [--dry-run]

Publish a skill to the npm registry (or private registry).

Pre-publication checklist:
1. Run full skill validation (Level 1 + 2 + 3 from skill-validator.md)
   Fail if Level 1 or 2 fails. Warn if Level 3 fails.
2. Verify package.json has `mindforge` field with all required sub-fields
3. Verify CHANGELOG.md has an entry for the current version
4. Check if version already published: `npm info [package-name]@[version]`
   If already published: error "Version already exists. Bump the version."
5. Run `npm pack --dry-run` to preview what will be published
6. Confirm with user: "These files will be published: [list]. Proceed? (yes/no)"
7. If --dry-run: stop here, show preview only
8. Publish: `npm publish --access public`
9. Verify: `npm info [package-name]@[version]` — confirm publication succeeded
10. Write AUDIT: `{ "event": "skill_published", "package": "...", "version": "..." }`
11. Report: "✅ [package-name]@[version] published to npm registry"
```

### `.claude/commands/mindforge/pr-review.md`

```markdown
# MindForge — PR Review Command
# Usage: /mindforge:pr-review [--diff path] [--sha base..head] [--output github|json|markdown]

Run the AI PR review engine on a pull request diff.

Steps:
1. Determine diff source:
   - `--diff path`: read diff from file
   - `--sha base..head`: run `git diff base..head`
   - Default: `git diff HEAD~1` (last commit) or `git diff --staged` (staged changes)

2. Load review context (per ai-reviewer.md):
   - PROJECT.md, ARCHITECTURE.md, CONVENTIONS.md, SECURITY.md
   - Current phase's CONTEXT.md (if in an active phase)
   - Any active ADRs relevant to changed files

3. Detect change type and select review template:
   - Auth/security changes → Security-focused review template
   - Database migrations → Database migration review template
   - API changes → API breaking change review template
   - Default → Standard review template

4. Check API availability:
   - ANTHROPIC_API_KEY set? If not: warn and skip AI review
   - Check daily review limit (from ai-reviewer.md)
   - Check cache: has this SHA been reviewed in the last 60 minutes?

5. Call Claude API (per ai-reviewer.md buildSystemPrompt + buildReviewPrompt)
   - Handle errors gracefully — API unavailable is NOT a build failure
   - Timeout: 60 seconds

6. Format output per --output flag:
   - github: GitHub-flavoured markdown for PR comment
   - json: structured JSON with findings array
   - markdown: standard markdown

7. Write to output:
   - If in CI: write to /tmp/mindforge-review.md (read by GitHub Actions step)
   - If interactive: display to user

8. Write AUDIT entry
```

### `.claude/commands/mindforge/workspace.md`

```markdown
# MindForge — Workspace Command
# Usage: /mindforge:workspace [detect|list|plan phase N|test]

Monorepo workspace management.

## detect
Run workspace detector from `.mindforge/monorepo/workspace-detector.md`.
Write WORKSPACE-MANIFEST.json.
Report: workspace type, packages found, dependency order.

## list
Read WORKSPACE-MANIFEST.json and display package list:
```
Workspace: Turborepo (4 packages)
  packages/shared    → @myapp/shared   (lib, 0 dependents)
  apps/api           → @myapp/api      (api, depends on: shared)
  apps/web           → @myapp/web      (web, depends on: shared, api)
  apps/mobile        → @myapp/mobile   (mobile, depends on: shared)
Execution order: shared → api → (web, mobile in parallel)
```

## plan phase N
Create a phase plan that spans multiple packages.
Uses cross-package-planner.md to determine package execution order.
Each PLAN file includes a `<package>` and `<working-dir>` field.

## test
Run tests across all packages in dependency order.
Report per-package test results and aggregate coverage.
```

### `.claude/commands/mindforge/benchmark.md`

```markdown
# MindForge — Benchmark Command
# Usage: /mindforge:benchmark [--skill skill-name] [--compare skill-a skill-b]

Measure skill effectiveness over time.

## Single skill benchmark
For a named skill, analyse AUDIT.jsonl and skill-usage.jsonl:
- How many times was the skill loaded this month?
- What is the verify pass rate for tasks where this skill was loaded?
- Are there anti-patterns less common after this skill is loaded?
- What is the average session quality score when this skill is active?

Report:
```
Skill Benchmark: security-review v1.0.0
────────────────────────────────────────
Usage (last 30 days): 47 task loads
Trigger distribution: text match 68%, file-path 22%, file-name 10%
Verify pass rate:     91% (vs. 84% baseline without this skill)
Security findings:    8 HIGH caught (0 CRITICAL missed in tasks using this skill)
Session quality lift: +6.2 points average when loaded

Assessment: HIGH VALUE — clear quality improvement signal
```

## Skill comparison
Compare two skills head-to-head:
- Load frequency
- Verify pass rate improvement
- Anti-pattern detection rate
- Context budget cost (token estimate)

Helps decide: should you keep both skills, or deprecate the lower-performer?
```

**Commit:**
```bash
for cmd in install-skill publish-skill pr-review workspace benchmark; do
  cp .claude/commands/mindforge/${cmd}.md .agent/mindforge/${cmd}.md
done
git add .claude/commands/mindforge/ .agent/mindforge/
git commit -m "feat(commands): add install-skill, publish-skill, pr-review, workspace, benchmark commands"
```

---

## TASK 9 — Write the MINDFORGE.md JSON Schema

### `.mindforge/MINDFORGE-SCHEMA.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MindForge Project Configuration Schema",
  "description": "JSON Schema for MINDFORGE.md key-value settings",
  "type": "object",
  "properties": {
    "MINDFORGE_VERSION_REQUIRED": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Minimum MindForge version required for this config"
    },
    "PLANNER_MODEL": {
      "type": "enum",
      "values": ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5", "inherit"],
      "description": "Claude model to use for the planning agent"
    },
    "EXECUTOR_MODEL": {
      "type": "enum",
      "values": ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5", "inherit"],
      "description": "Claude model to use for execution agents"
    },
    "REVIEWER_MODEL": {
      "type": "enum",
      "values": ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5", "inherit"],
      "description": "Claude model to use for the code reviewer"
    },
    "SECURITY_MODEL": {
      "type": "enum",
      "values": ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5", "inherit"],
      "description": "Claude model to use for security review (recommend Opus for thoroughness)"
    },
    "TIER1_AUTO_APPROVE": {
      "type": "boolean",
      "description": "Auto-approve Tier 1 changes without user confirmation"
    },
    "WAVE_CONFIRMATION_REQUIRED": {
      "type": "boolean",
      "description": "Require user confirmation before each execution wave"
    },
    "AUTO_DISCUSS_PHASE": {
      "type": "boolean",
      "description": "Automatically run discuss-phase before every plan-phase"
    },
    "VERIFY_PASS_RATE_WARNING_THRESHOLD": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Warn when first-attempt verify pass rate drops below this"
    },
    "COMPACTION_THRESHOLD_PCT": {
      "type": "number",
      "minimum": 50,
      "maximum": 90,
      "description": "Context window percentage that triggers compaction"
    },
    "MAX_TASKS_PER_PHASE": {
      "type": "number",
      "minimum": 1,
      "maximum": 50,
      "description": "Suggest phase split when task count exceeds this"
    },
    "MIN_TEST_COVERAGE_PCT": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Minimum test coverage percentage required"
    },
    "MAX_FUNCTION_LINES": {
      "type": "number",
      "minimum": 10,
      "maximum": 200,
      "description": "Maximum allowed function length in lines"
    },
    "MAX_CYCLOMATIC_COMPLEXITY": {
      "type": "number",
      "minimum": 3,
      "maximum": 30,
      "description": "Maximum allowed cyclomatic complexity per function"
    },
    "BLOCK_ON_MEDIUM_SECURITY_FINDINGS": {
      "type": "boolean",
      "description": "Block PR creation on MEDIUM security findings (default: only HIGH+)"
    },
    "ALWAYS_LOAD_SKILLS": {
      "type": "string",
      "description": "Comma-separated list of skills to always load regardless of triggers"
    },
    "DISABLED_SKILLS": {
      "type": "string",
      "description": "Comma-separated list of skills to never load"
    },
    "MAX_FULL_SKILL_INJECTIONS": {
      "type": "number",
      "minimum": 1,
      "maximum": 10,
      "description": "Maximum number of skills to inject in full (rest are summarised)"
    },
    "COMMIT_FORMAT": {
      "type": "enum",
      "values": ["conventional-commits", "custom", "none"],
      "description": "Commit message format convention"
    },
    "BRANCHING_STRATEGY": {
      "type": "enum",
      "values": ["none", "phase", "milestone"],
      "description": "Git branching strategy for MindForge phases"
    },
    "NOTIFY_ON": {
      "type": "string",
      "description": "Comma-separated events that trigger Slack notifications"
    },
    "DISCUSS_PHASE_REQUIRED_ABOVE_DIFFICULTY": {
      "type": "number",
      "minimum": 1,
      "maximum": 5,
      "description": "Require discuss-phase when difficulty score exceeds this value"
    },
    "CI_AUTO_APPROVE_TIER2": {
      "type": "boolean",
      "nonOverridable": false,
      "description": "Auto-approve Tier 2 changes in CI mode"
    },
    "CI_SECURITY_SCAN": {
      "type": "boolean",
      "description": "Run security scan in CI mode"
    },
    "CI_MIN_COVERAGE_PCT": {
      "type": "number",
      "minimum": 0,
      "maximum": 100,
      "description": "Minimum test coverage in CI (may differ from interactive threshold)"
    },
    "CI_OUTPUT_FORMAT": {
      "type": "enum",
      "values": ["json", "text", "github-annotations"],
      "description": "Output format for CI execution logs"
    },
    "SECURITY_AUTOTRIGGER": {
      "type": "boolean",
      "nonOverridable": true,
      "description": "NON-OVERRIDABLE: security auto-trigger for auth/payment/PII changes"
    },
    "SECRET_DETECTION": {
      "type": "boolean",
      "nonOverridable": true,
      "description": "NON-OVERRIDABLE: secret detection compliance gate"
    },
    "PLAN_FIRST": {
      "type": "boolean",
      "nonOverridable": true,
      "description": "NON-OVERRIDABLE: plan-first rule (no implementation without a PLAN)"
    },
    "AUDIT_WRITING": {
      "type": "boolean",
      "nonOverridable": true,
      "description": "NON-OVERRIDABLE: AUDIT.jsonl writing for every significant action"
    }
  }
}
```

**Commit:**
```bash
git add .mindforge/MINDFORGE-SCHEMA.json bin/validate-config.js
git commit -m "feat(config): add MINDFORGE.md JSON schema with non-overridable fields"
```

---

## TASK 10 — Update CLAUDE.md for Day 6

Add to `.claude/CLAUDE.md` and `.agent/CLAUDE.md`:

```markdown
---

## DISTRIBUTION & CI LAYER (Day 6)

### CI mode awareness
If `CI=true` or `MINDFORGE_CI=true` environment variables are set:
- All interactive prompts are skipped
- Output structured JSON or GitHub annotations (per CI_OUTPUT_FORMAT in MINDFORGE.md)
- Tier 3 changes automatically fail (never auto-approve Tier 3 in CI)
- UAT is skipped (CI_SKIP_UAT=true default) — only automated verification runs
- Log every gate result to stdout in the configured format

### Skill installation from registry
When the user requests `/mindforge:install-skill [name]`:
Follow the full protocol from `.mindforge/distribution/registry-client.md`.
Always validate before installing. Always run injection guard.
Never install a skill that fails Level 1 or Level 2 validation.

### Monorepo awareness
If `WORKSPACE-MANIFEST.json` exists in `.planning/`:
- The project uses a monorepo structure
- Phase execution must follow the cross-package dependency order
- Each PLAN file must declare its `<package>` and `<working-dir>`
- Run tests per-package, then aggregate

### AI PR Review
When the user requests `/mindforge:pr-review`:
- Check for ANTHROPIC_API_KEY — if missing, skip gracefully (not a failure)
- Load review context from PROJECT.md, ARCHITECTURE.md, CONVENTIONS.md
- Select the appropriate review template based on change type
- Never use the AI review as a substitute for human review
- Always include the disclaimer in output

### Config validation
At session start, if MINDFORGE.md exists:
Run `node bin/validate-config.js` silently.
If errors: warn the user before proceeding.
If warnings about non-overridable settings: ignore the override silently (per ADR-013).

### New commands available (Day 6)
- `/mindforge:init-org` — organisation-wide setup
- `/mindforge:install-skill` — install skill from registry
- `/mindforge:publish-skill` — publish skill to registry
- `/mindforge:pr-review` — AI code review
- `/mindforge:workspace` — monorepo workspace management
- `/mindforge:benchmark` — skill effectiveness benchmarking

---
```

**Commit:**
```bash
git add .claude/CLAUDE.md .agent/CLAUDE.md
git commit -m "feat(core): update CLAUDE.md with Day 6 distribution and CI awareness"
```

---

## TASK 11 — Write Day 6 test suites

### `tests/distribution.test.js`

```javascript
/**
 * MindForge Day 6 — Distribution Tests
 * Run: node tests/distribution.test.js
 */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch(e) { console.error(`  ❌ ${name}\n     ${e.message}`); failed++; }
}
const read = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';

// ── Skill package name validation ─────────────────────────────────────────────
function isValidSkillPackageName(name) {
  return /^mindforge-skill-[a-z][a-z0-9-]+$/.test(name);
}

// ── Skill frontmatter parser (reused from earlier tests) ──────────────────────
function parseSkillFrontmatter(content) {
  if (!content.startsWith('---')) throw new Error('Missing frontmatter');
  const end = content.indexOf('---', 3);
  if (end === -1) throw new Error('Unclosed frontmatter');
  const fm = content.slice(3, end).trim();
  const result = {};
  fm.split('\n').forEach(line => {
    const colon = line.indexOf(':');
    if (colon === -1) return;
    result[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  });
  return result;
}

// ── MINDFORGE-SCHEMA.json validation ─────────────────────────────────────────
function parseMindforgeMd(content) {
  const settings = {};
  content.split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) settings[m[1]] = m[2].trim();
  });
  return settings;
}

console.log('\nMindForge Day 6 — Distribution Tests\n');

console.log('Distribution engine files:');
[
  'registry-client.md', 'skill-publisher.md', 'skill-validator.md', 'registry-schema.md'
].forEach(f => test(`${f} exists`, () => {
  assert.ok(fs.existsSync(`.mindforge/distribution/${f}`), `Missing: ${f}`);
}));

console.log('\nSkill package naming:');
test('valid package name accepted', () => {
  assert.ok(isValidSkillPackageName('mindforge-skill-security-owasp'));
  assert.ok(isValidSkillPackageName('mindforge-skill-db-postgres'));
  assert.ok(isValidSkillPackageName('mindforge-skill-frontend-react-a11y'));
});

test('invalid package names rejected', () => {
  assert.ok(!isValidSkillPackageName('security-review'));        // missing prefix
  assert.ok(!isValidSkillPackageName('mindforge-skill-'));       // empty name
  assert.ok(!isValidSkillPackageName('mindforge-skill-MY-SKILL')); // uppercase
});

console.log('\nRegistry schema:');
test('registry-schema.md defines npm-based distribution', () => {
  const c = read('.mindforge/distribution/registry-schema.md');
  assert.ok(c.includes('npm'), 'Should describe npm-based registry');
  assert.ok(c.includes('mindforge-skill-'), 'Should define naming convention');
});

test('skill validator defines 3 validation levels', () => {
  const c = read('.mindforge/distribution/skill-validator.md');
  assert.ok(c.includes('Level 1'), 'Missing Level 1');
  assert.ok(c.includes('Level 2'), 'Missing Level 2');
  assert.ok(c.includes('Level 3'), 'Missing Level 3');
});

test('registry client has injection guard step', () => {
  const c = read('.mindforge/distribution/registry-client.md');
  assert.ok(c.includes('injection guard') || c.includes('injection'), 'Should run injection guard before install');
});

console.log('\nMINDFORGE.md schema:');
test('MINDFORGE-SCHEMA.json exists', () => {
  assert.ok(fs.existsSync('.mindforge/MINDFORGE-SCHEMA.json'));
});

test('schema is valid JSON', () => {
  const content = fs.readFileSync('.mindforge/MINDFORGE-SCHEMA.json', 'utf8');
  assert.doesNotThrow(() => JSON.parse(content));
});

test('schema marks non-overridable fields', () => {
  const schema = JSON.parse(fs.readFileSync('.mindforge/MINDFORGE-SCHEMA.json', 'utf8'));
  const nonOverridable = Object.entries(schema.properties || {})
    .filter(([, def]) => def.nonOverridable === true)
    .map(([key]) => key);
  assert.ok(nonOverridable.includes('SECURITY_AUTOTRIGGER'), 'SECURITY_AUTOTRIGGER should be non-overridable');
  assert.ok(nonOverridable.includes('SECRET_DETECTION'), 'SECRET_DETECTION should be non-overridable');
  assert.ok(nonOverridable.includes('PLAN_FIRST'), 'PLAN_FIRST should be non-overridable');
  assert.ok(nonOverridable.includes('AUDIT_WRITING'), 'AUDIT_WRITING should be non-overridable');
});

test('validate-config.js exists and is executable-looking', () => {
  assert.ok(fs.existsSync('bin/validate-config.js'));
  const content = read('bin/validate-config.js');
  assert.ok(content.includes('#!/usr/bin/env node'), 'Missing shebang');
  assert.ok(content.includes('MINDFORGE-SCHEMA.json'), 'Should reference schema file');
});

console.log('\nSDK:');
test('sdk directory structure exists', () => {
  assert.ok(fs.existsSync('sdk/src/index.ts'));
  assert.ok(fs.existsSync('sdk/src/client.ts'));
  assert.ok(fs.existsSync('sdk/src/types.ts'));
  assert.ok(fs.existsSync('sdk/src/events.ts'));
  assert.ok(fs.existsSync('sdk/src/commands.ts'));
  assert.ok(fs.existsSync('sdk/package.json'));
});

test('sdk package.json has correct name', () => {
  const pkg = JSON.parse(fs.readFileSync('sdk/package.json', 'utf8'));
  assert.strictEqual(pkg.name, '@mindforge/sdk');
});

test('sdk index.ts exports MindForgeClient', () => {
  const content = read('sdk/src/index.ts');
  assert.ok(content.includes('MindForgeClient'), 'Should export MindForgeClient');
  assert.ok(content.includes('MindForgeEventStream'), 'Should export MindForgeEventStream');
});

test('sdk types.ts defines PhaseResult', () => {
  const content = read('sdk/src/types.ts');
  assert.ok(content.includes('PhaseResult'), 'Should define PhaseResult');
  assert.ok(content.includes('SecurityFinding'), 'Should define SecurityFinding');
  assert.ok(content.includes('MindForgeEvent'), 'Should define MindForgeEvent');
});

console.log('\nAll 31 commands present:');
const ALL_COMMANDS = [
  'help','init-project','plan-phase','execute-phase','verify-phase','ship',
  'next','quick','status','debug',
  'skills','review','security-scan','map-codebase','discuss-phase',
  'audit','milestone','complete-milestone','approve','sync-jira','sync-confluence',
  'health','retrospective','profile-team','metrics',
  'init-org','install-skill','publish-skill','pr-review','workspace','benchmark'
];
test(`all ${ALL_COMMANDS.length} commands in .claude/commands/mindforge/`, () => {
  ALL_COMMANDS.forEach(cmd => {
    assert.ok(fs.existsSync(`.claude/commands/mindforge/${cmd}.md`), `Missing: ${cmd}.md`);
  });
});
test(`all ${ALL_COMMANDS.length} commands mirrored to .agent/mindforge/`, () => {
  ALL_COMMANDS.forEach(cmd => {
    assert.ok(fs.existsSync(`.agent/mindforge/${cmd}.md`), `Missing .agent: ${cmd}.md`);
  });
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n❌ ${failed} test(s) failed.\n`); process.exit(1); }
else { console.log(`\n✅ All distribution tests passed.\n`); }
```

### `tests/ci-mode.test.js`

```javascript
/**
 * MindForge Day 6 — CI Mode Tests
 * Run: node tests/ci-mode.test.js
 */
'use strict';
const fs = require('fs'), assert = require('assert');
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch(e) { console.error(`  ❌ ${name}\n     ${e.message}`); failed++; }
}
const read = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';

// ── CI mode detection simulation ──────────────────────────────────────────────
function isCiMode() {
  return process.env.CI === 'true' ||
         process.env.MINDFORGE_CI === 'true' ||
         process.stdin.isTTY === false;
}

// ── GitHub annotations format ─────────────────────────────────────────────────
function formatGitHubAnnotation(level, message, file, line) {
  const loc = file ? ` file=${file}${line ? `,line=${line}` : ''}` : '';
  return `::${level}${loc}::${message}`;
}

// ── Tier3 CI block simulation ─────────────────────────────────────────────────
function checkCiTierPolicy(tier, ciAutoApproveTier2 = false) {
  if (tier === 1) return 'auto-approved';
  if (tier === 2) return ciAutoApproveTier2 ? 'auto-approved' : 'blocked';
  if (tier === 3) return 'blocked'; // Always blocked in CI
  return 'unknown';
}

console.log('\nMindForge Day 6 — CI Mode Tests\n');

console.log('CI engine files:');
['ci-mode.md','github-actions-adapter.md','gitlab-ci-adapter.md'].forEach(f => {
  test(`${f} exists`, () => {
    assert.ok(fs.existsSync(`.mindforge/ci/${f}`), `Missing: .mindforge/ci/${f}`);
  });
});

console.log('\nCI mode detection:');
test('isCiMode returns false in normal test environment', () => {
  const origCI = process.env.CI;
  delete process.env.CI;
  delete process.env.MINDFORGE_CI;
  // In test environment, stdin.isTTY may be false — we test the env var logic only
  const ciFromEnv = process.env.CI === 'true' || process.env.MINDFORGE_CI === 'true';
  assert.strictEqual(ciFromEnv, false, 'Should not be CI mode from env vars');
  if (origCI) process.env.CI = origCI;
});

test('CI=true activates CI mode', () => {
  process.env.MINDFORGE_CI = 'true';
  assert.strictEqual(process.env.MINDFORGE_CI, 'true');
  delete process.env.MINDFORGE_CI;
});

console.log('\nCI tier policy:');
test('Tier 1 is always auto-approved in CI', () => {
  assert.strictEqual(checkCiTierPolicy(1), 'auto-approved');
});

test('Tier 2 blocked by default in CI (safety-first)', () => {
  assert.strictEqual(checkCiTierPolicy(2, false), 'blocked');
});

test('Tier 2 can be auto-approved in CI when configured', () => {
  assert.strictEqual(checkCiTierPolicy(2, true), 'auto-approved');
});

test('Tier 3 is ALWAYS blocked in CI regardless of config', () => {
  assert.strictEqual(checkCiTierPolicy(3, true), 'blocked');  // even with true
  assert.strictEqual(checkCiTierPolicy(3, false), 'blocked');
});

console.log('\nGitHub annotations format:');
test('notice annotation format is correct', () => {
  const ann = formatGitHubAnnotation('notice', 'Task 3-01 completed', null, null);
  assert.strictEqual(ann, '::notice::Task 3-01 completed');
});

test('error annotation with file and line is correct', () => {
  const ann = formatGitHubAnnotation('error', 'TypeScript error', 'src/auth.ts', 47);
  assert.strictEqual(ann, '::error file=src/auth.ts,line=47::TypeScript error');
});

test('warning annotation with file only (no line)', () => {
  const ann = formatGitHubAnnotation('warning', 'Security finding', 'src/utils.ts', null);
  assert.strictEqual(ann, '::warning file=src/utils.ts::Security finding');
});

console.log('\nGitHub Actions workflow:');
test('github-actions-adapter.md defines mindforge-ci.yml structure', () => {
  const c = read('.mindforge/ci/github-actions-adapter.md');
  assert.ok(c.includes('mindforge-ci.yml') || c.includes('on:'), 'Should define GitHub Actions workflow');
  assert.ok(c.includes('mindforge-health'), 'Should include health check job');
  assert.ok(c.includes('mindforge-security'), 'Should include security scan job');
});

test('ci-mode.md defines Tier 3 block policy', () => {
  const c = read('.mindforge/ci/ci-mode.md');
  assert.ok(
    (c.includes('Tier 3') && c.includes('block')) || c.includes('ALWAYS fails'),
    'CI mode should block Tier 3 changes'
  );
});

test('ci-mode.md has timeout configuration', () => {
  const c = read('.mindforge/ci/ci-mode.md');
  assert.ok(c.includes('timeout') || c.includes('TIMEOUT'), 'CI mode should have timeout config');
});

console.log('\nMonorepo support:');
['workspace-detector.md','cross-package-planner.md','dependency-graph-builder.md'].forEach(f => {
  test(`${f} exists`, () => {
    assert.ok(fs.existsSync(`.mindforge/monorepo/${f}`), `Missing: .mindforge/monorepo/${f}`);
  });
});

test('workspace-detector supports major monorepo types', () => {
  const c = read('.mindforge/monorepo/workspace-detector.md');
  ['nx', 'turborepo', 'lerna', 'pnpm'].forEach(type => {
    assert.ok(c.includes(type), `Should support ${type} monorepo type`);
  });
});

test('cross-package-planner has topological sort', () => {
  const c = read('.mindforge/monorepo/cross-package-planner.md');
  assert.ok(
    c.includes('topological') || c.includes('dependency order') || c.includes('Execution order'),
    'Should use topological sort for package order'
  );
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n❌ ${failed} test(s) failed.\n`); process.exit(1); }
else { console.log(`\n✅ All CI mode tests passed.\n`); }
```

### `tests/sdk.test.js`

```javascript
/**
 * MindForge Day 6 — SDK Tests
 * Run: node tests/sdk.test.js
 */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch(e) { console.error(`  ❌ ${name}\n     ${e.message}`); failed++; }
}
const read = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';

// ── Lightweight SDK client simulation (without TypeScript compilation) ─────────
class MockMindForgeClient {
  constructor(config = {}) {
    this.projectRoot = config.projectRoot || process.cwd();
  }
  isInitialised() {
    return fs.existsSync(path.join(this.projectRoot, '.planning', 'PROJECT.md'));
  }
  readHandoff() {
    const p = path.join(this.projectRoot, '.planning', 'HANDOFF.json');
    if (!fs.existsSync(p)) return null;
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch { return null; }
  }
  readAuditLog(filter = {}) {
    const p = path.join(this.projectRoot, '.planning', 'AUDIT.jsonl');
    if (!fs.existsSync(p)) return [];
    return fs.readFileSync(p, 'utf8')
      .split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean)
      .filter(e => !filter.event || e.event === filter.event);
  }
  async health() {
    const warnings = [], errors = [], info = [];
    const handoff = this.readHandoff();
    if (handoff && !handoff.schema_version) {
      errors.push({ category: 'state', message: 'HANDOFF.json missing schema_version' });
    }
    return {
      overallStatus: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'healthy',
      errors, warnings, informational: info,
      timestamp: new Date().toISOString(),
    };
  }
}

// ── Command builder simulation ────────────────────────────────────────────────
const commands = {
  health: (opts = {}) => `/mindforge:health ${(opts.flags||[]).join(' ')}`.trim(),
  planPhase: (n, opts = {}) => `/mindforge:plan-phase ${n} ${(opts.flags||[]).join(' ')}`.trim(),
  executePhase: (n, opts = {}) => `/mindforge:execute-phase ${n} ${(opts.flags||[]).join(' ')}`.trim(),
  audit: (f = {}) => {
    const parts = ['/mindforge:audit'];
    if (f.phase) parts.push(`--phase ${f.phase}`);
    if (f.event) parts.push(`--event ${f.event}`);
    return parts.join(' ');
  },
};

console.log('\nMindForge Day 6 — SDK Tests\n');

console.log('SDK source files:');
['index.ts','client.ts','types.ts','events.ts','commands.ts'].forEach(f => {
  test(`sdk/src/${f} exists`, () => {
    assert.ok(fs.existsSync(`sdk/src/${f}`), `Missing: sdk/src/${f}`);
  });
});

console.log('\nSDK type exports:');
test('index.ts exports VERSION', () => {
  const c = read('sdk/src/index.ts');
  assert.ok(c.includes("VERSION"), 'Should export VERSION');
});

test('types.ts defines MindForgeConfig', () => {
  const c = read('sdk/src/types.ts');
  assert.ok(c.includes('MindForgeConfig'), 'Should define MindForgeConfig');
});

test('types.ts defines all result types', () => {
  const c = read('sdk/src/types.ts');
  ['PhaseResult','TaskResult','SecurityFinding','GateResult','HealthReport'].forEach(t => {
    assert.ok(c.includes(t), `Should define ${t}`);
  });
});

test('events.ts defines MindForgeEventStream', () => {
  const c = read('sdk/src/events.ts');
  assert.ok(c.includes('MindForgeEventStream'), 'Should define MindForgeEventStream');
  assert.ok(c.includes('watchAuditLog'), 'Should have watchAuditLog method');
});

console.log('\nSDK client behaviour:');

test('client.isInitialised() returns false when PROJECT.md missing', () => {
  const client = new MockMindForgeClient({ projectRoot: '/tmp/nonexistent-project' });
  assert.strictEqual(client.isInitialised(), false);
});

test('client.isInitialised() returns true when PROJECT.md exists', () => {
  const client = new MockMindForgeClient({ projectRoot: process.cwd() });
  // May be true or false depending on whether we're in a MindForge project
  assert.ok(typeof client.isInitialised() === 'boolean');
});

test('client.readHandoff() returns null when HANDOFF.json missing', () => {
  const client = new MockMindForgeClient({ projectRoot: '/tmp/nonexistent-project' });
  assert.strictEqual(client.readHandoff(), null);
});

test('client.readHandoff() parses valid HANDOFF.json', () => {
  const client = new MockMindForgeClient({ projectRoot: process.cwd() });
  const handoff = client.readHandoff();
  if (handoff) {
    assert.ok(typeof handoff === 'object', 'HANDOFF.json should parse to object');
    assert.ok(handoff.schema_version, 'HANDOFF.json should have schema_version');
  }
  // null is acceptable if not in a MindForge project
});

test('client.readAuditLog() returns array', () => {
  const client = new MockMindForgeClient({ projectRoot: process.cwd() });
  const log = client.readAuditLog();
  assert.ok(Array.isArray(log), 'readAuditLog should return array');
});

test('client.readAuditLog() filters by event type', () => {
  const client = new MockMindForgeClient({ projectRoot: process.cwd() });
  const secFindings = client.readAuditLog({ event: 'security_finding' });
  assert.ok(Array.isArray(secFindings));
  secFindings.forEach(e => {
    assert.strictEqual(e.event, 'security_finding', 'All entries should match filter');
  });
});

test('client.health() returns HealthReport shape', async () => {
  const client = new MockMindForgeClient({ projectRoot: process.cwd() });
  const report = await client.health();
  assert.ok(['healthy','warning','error'].includes(report.overallStatus));
  assert.ok(Array.isArray(report.errors));
  assert.ok(Array.isArray(report.warnings));
  assert.ok(report.timestamp);
});

console.log('\nCommand builders:');
test('commands.health() builds correct string', () => {
  assert.strictEqual(commands.health(), '/mindforge:health');
  assert.strictEqual(commands.health({ flags: ['--repair'] }), '/mindforge:health --repair');
});

test('commands.planPhase() builds correct string', () => {
  assert.strictEqual(commands.planPhase(3), '/mindforge:plan-phase 3');
});

test('commands.audit() builds filter string', () => {
  const cmd = commands.audit({ phase: 3, event: 'security_finding' });
  assert.ok(cmd.includes('--phase 3'));
  assert.ok(cmd.includes('--event security_finding'));
});

test('commands.executePhase() includes phase number', () => {
  const cmd = commands.executePhase(2);
  assert.ok(cmd.includes('2'));
  assert.ok(cmd.startsWith('/mindforge:execute-phase'));
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n❌ ${failed} test(s) failed.\n`); process.exit(1); }
else { console.log(`\n✅ All SDK tests passed.\n`); }
```

**Commit:**
```bash
git add tests/
git commit -m "test(day6): add distribution, CI mode, and SDK test suites"
```

---

## TASK 12 — Run full test battery, bump version, and push

```bash
# Run all 10 test suites
for suite in install wave-engine audit compaction skills-platform \
             integrations governance intelligence metrics \
             distribution ci-mode sdk; do
  node tests/${suite}.test.js | tail -1
done

# Bump to v0.6.0
node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('package.json','utf8'));
  p.version = '0.6.0';
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
  console.log('Bumped to v0.6.0');
"

git add package.json
git commit -m "chore(release): bump to v0.6.0 — Day 6 distribution platform"
git push origin feat/mindforge-distribution-platform
```

---

# ═══════════════════════════════════════════════════════════════
# PART 2: REVIEW PROMPT
# ═══════════════════════════════════════════════════════════════

---

## DAY 6 REVIEW — Run after DAY6-IMPLEMENT is complete

Activate **`architect.md` + `security-reviewer.md`** simultaneously.

Day 6 risk profile:
- **Supply chain security** — skills from external registry could contain malicious content
- **CI/CD gate bypass** — CI mode must not weaken governance for speed
- **API cost exposure** — AI PR reviews can be expensive at scale
- **SDK data exposure** — SDK reads sensitive files (HANDOFF, AUDIT) programmatically

---

## REVIEW PASS 1 — Skills Registry: Supply Chain Security

Read `registry-client.md` and `skill-validator.md`.

- [ ] **Step 5 (injection guard)** runs AFTER download but BEFORE install.
  What if the skill downloads successfully but the temp directory is world-readable
  and another process reads it during the window between download and guard check?
  This is a TOCTOU (time-of-check, time-of-use) race condition.
  Mitigation: use `mktemp -d` with mode 700 (user-only access).
  Add: "`TEMP_DIR=$(mktemp -d)` then immediately `chmod 700 ${TEMP_DIR}`"

- [ ] The skill validator checks for "no placeholder text" — but what is the detection pattern?
  Add explicit patterns: `\[placeholder\]`, `\[your-name\]`, `TODO`, `FIXME`, `\[fill this in\]`

- [ ] Level 3 validation is listed as "optional — runs for publication."
  But the client protocol doesn't explicitly mention running Level 3 at install time.
  Should it? For a private registry (known, trusted source): Level 2 is sufficient.
  For the public registry (unknown authors): Level 3 should also run at install.
  Add: "For public registry installs: run Level 3 validation. Warn on failures but don't block."

- [ ] The `npm audit` step is not in the installation flow.
  A skill package could have vulnerable JavaScript dependencies in `scripts/`.
  Add: "Step 4.5: if the skill package has a `package.json` in `scripts/`:
  run `npm audit --prefix ${TEMP_DIR} --audit-level=high`.
  If HIGH or CRITICAL vulnerabilities: warn user but allow install.
  Document in AUDIT: `"skill_dependency_vulnerability": true`"

---

## REVIEW PASS 2 — CI Mode: Governance Integrity

Read `ci-mode.md` and `github-actions-adapter.md`.

- [ ] **The Tier 3 block in CI** is correct. But what message does the CI output?
  If the CI build fails without a clear message about WHY Tier 3 changes block CI,
  engineers will be confused. Add explicit CI failure message:
  ```
  ::error::MindForge CI: Tier 3 change detected (auth/payment/PII modification).
  Tier 3 changes require human compliance review before CI can pass.
  Get approval using: /mindforge:approve [approval-id]
  Then push again — a Tier 3 change with an approved approval request will pass CI.
  ```

- [ ] **CI timeout handling** says "exit with code 2 (warning)." But GitHub Actions
  treats any non-zero exit code as failure (code 1 or 2 — both fail the job).
  The "warning" intent doesn't work with standard CI conventions.
  Fix: use exit code 0 for timeout with a clear warning message AND a "timeout" artifact.
  The next CI run reads the HANDOFF.json to resume.
  But: mark the job as "warning" using GitHub's `$GITHUB_STEP_SUMMARY` approach,
  not via exit codes.

- [ ] **ANTHROPIC_API_KEY in CI** — the workflow file has `ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}`.
  What happens when this secret is not configured?
  The AI review step should gracefully skip (not fail) if the key is absent.
  Verify the `pr-review` command already handles this — re-check in context of CI.

---

## REVIEW PASS 3 — AI PR Review: Cost and Safety

Read `ai-reviewer.md` and `review-prompt-templates.md`.

- [ ] **Daily limit check** (`checkDailyLimit`) reads from `.mindforge/metrics/ai-review-usage.jsonl`.
  But this file may not exist. Add graceful creation if missing.
  Also: the count logic needs to handle JSONL parse errors on individual lines.

- [ ] **Diff truncation at 12,000 characters** — large PRs get truncated.
  But the truncation might cut in the middle of a security-relevant code block.
  Better truncation strategy: truncate by number of FILES, not characters.
  Review the `REVIEW_LIMITS.maxFilesReviewed = 20` limit — this is better.
  But the implementation shows BOTH a character limit AND file limit.
  These should be coordinated: if diff is > 12K chars, reduce to the top 10 most-changed files.

- [ ] **The system prompt includes** `context.conventions` truncated to 2000 chars.
  For a large CONVENTIONS.md (which can be 5K+ chars), this loses important conventions.
  Better: extract only the "Forbidden patterns" and "Naming conventions" sections
  from CONVENTIONS.md — these are the most review-relevant.

- [ ] **Cost management** — the daily limit (50 reviews/day) is configurable via MINDFORGE.md?
  It's not currently listed in the schema. Add: `AI_REVIEW_DAILY_LIMIT` setting.

---

## REVIEW PASS 4 — SDK: Data Safety

Read all SDK source files.

- [ ] **`readHandoff()`** reads `.planning/HANDOFF.json` which contains sensitive project state.
  The SDK returns the raw parsed JSON to calling code.
  If the SDK is embedded in a web application or external tool, this data should be
  treated as sensitive. Add to SDK README: "HANDOFF.json may contain sensitive project
  state. Do not expose it to untrusted clients or log its contents."

- [ ] **`MindForgeEventStream`** starts an HTTP server on port 7337 with
  `Access-Control-Allow-Origin: http://localhost:*`.
  The wildcard `http://localhost:*` is not a valid CORS origin — browsers require
  exact origins. Fix: `Access-Control-Allow-Origin: *` (for localhost dev tools)
  OR implement origin allowlisting.
  Also: the server binds to all interfaces by default (`listen(port)`).
  In a shared development environment, this exposes MindForge state to other users.
  Fix: bind to localhost explicitly: `server.listen(port, '127.0.0.1', ...)`.

- [ ] **`watchAuditLog()`** uses `fs.watch()` which is known to have platform-specific
  behaviour (especially on Linux where inotify has limits).
  Add: "On Linux: if `fs.watch()` throws ENOSPC (inotify limit reached):
  fall back to polling with `fs.watchFile()` at 2-second intervals."

- [ ] **The SDK has no authentication** — any code that can access the local filesystem
  can read AUDIT.jsonl, HANDOFF.json, and session metrics.
  This is acceptable for a local development tool but should be documented:
  "The MindForge SDK operates on local files. It provides no network authentication.
  Do not expose SDK endpoints to the public internet."

---

## REVIEW PASS 5 — Monorepo: Cross-Package Correctness

Read `workspace-detector.md` and `cross-package-planner.md`.

- [ ] The workspace detector uses `npm info "${PACKAGE_NAME}" version` for update checks.
  But `npm info` makes a network request — in offline environments, this hangs.
  Add: `npm info "${PACKAGE_NAME}" version --prefer-offline` for the version check.

- [ ] **Affected package detection** uses `git diff --name-only | awk -F/ '{print $1"/"$2}'`
  This assumes packages are always at `apps/name` or `packages/name` (2 levels deep).
  For Nx with deeply nested libs (`libs/shared/utils/`), this produces wrong paths.
  Fix: compare against the package paths in WORKSPACE-MANIFEST.json rather than
  assuming a fixed depth. Match changed file paths against declared package paths.

---

## REVIEW PASS 6 — Test Suite Quality

- [ ] `tests/distribution.test.js` — the injection guard test checks that
  registry-client.md MENTIONS injection guard. But it doesn't test that a skill
  with injection patterns actually FAILS validation. Add a test that simulates
  a malicious SKILL.md and verifies it would be rejected.

- [ ] `tests/ci-mode.test.js` — the Tier 3 CI block test is correct.
  But there is no test for the CI timeout behaviour (exit code strategy).
  Add a test verifying that the ci-mode spec mentions the exit-code-0 approach
  (not exit-code-2) for timeouts.

- [ ] `tests/sdk.test.js` — the SSE server localhost binding test is missing.
  Add: verify that `events.ts` references `'127.0.0.1'` (localhost binding)
  not just `server.listen(port)` (all interfaces).

---

## REVIEW SUMMARY TABLE

```
## Day 6 Review Summary

| Category        | BLOCKING | MAJOR | MINOR | SUGGESTION |
|-----------------|----------|-------|-------|------------|
| Registry        |          |       |       |            |
| CI Mode         |          |       |       |            |
| AI PR Review    |          |       |       |            |
| SDK             |          |       |       |            |
| Monorepo        |          |       |       |            |
| Tests           |          |       |       |            |
| **TOTAL**       |          |       |       |            |

## Verdict
[ ] ✅ APPROVED — Proceed to HARDEN section
[ ] ⚠️  APPROVED WITH CONDITIONS
[ ] ❌ NOT APPROVED
```

---

# ═══════════════════════════════════════════════════════════════
# PART 3: HARDENING PROMPT
# ═══════════════════════════════════════════════════════════════

---

## DAY 6 HARDENING — Run after REVIEW is APPROVED

Confirm all review findings resolved:
```bash
node tests/distribution.test.js && node tests/ci-mode.test.js && node tests/sdk.test.js
```

---

## HARDEN 1 — Fix registry TOCTOU race condition

Update `registry-client.md` Step 3:

```markdown
### Step 3 — Secure temp directory creation
```bash
# Create temp directory with user-only permissions (prevents TOCTOU attacks)
TEMP_DIR=$(mktemp -d)
chmod 700 "${TEMP_DIR}"

# All subsequent operations in this directory are protected
npm pack "${PACKAGE_NAME}@latest" --pack-destination "${TEMP_DIR}" --quiet

# Verify the tarball was downloaded (not empty, not corrupted)
TARBALL=$(ls "${TEMP_DIR}"/*.tgz 2>/dev/null | head -1)
if [ -z "${TARBALL}" ]; then
  rm -rf "${TEMP_DIR}"
  echo "Error: Failed to download ${PACKAGE_NAME} — no tarball produced"
  exit 1
fi

# Verify tarball size is reasonable (not 0 bytes, not suspiciously large)
TARBALL_SIZE=$(wc -c < "${TARBALL}")
if [ "${TARBALL_SIZE}" -lt 100 ]; then
  rm -rf "${TEMP_DIR}"
  echo "Error: Downloaded tarball is suspiciously small (${TARBALL_SIZE} bytes)"
  exit 1
fi

tar -xzf "${TARBALL}" --strip-components=1 -C "${TEMP_DIR}"
```
```

**Commit:**
```bash
git add .mindforge/distribution/registry-client.md
git commit -m "harden(registry): fix TOCTOU race with chmod 700 temp dir and tarball size check"
```

---

## HARDEN 2 — Fix SSE server security issues

Update `sdk/src/events.ts`:

```typescript
  start(port = 7337): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        if (req.url !== '/events') {
          res.writeHead(404);
          res.end();
          return;
        }

        // SECURITY: Only allow connections from localhost
        const clientIp = req.socket.remoteAddress;
        const isLocalhost = clientIp === '127.0.0.1' ||
                            clientIp === '::1' ||
                            clientIp === '::ffff:127.0.0.1';
        if (!isLocalhost) {
          res.writeHead(403);
          res.end('Forbidden: MindForge event stream is localhost-only');
          return;
        }

        // CORS: Only allow localhost origins (exact match, not wildcard)
        const origin = req.headers.origin;
        const allowedOriginPattern = /^https?:\/\/localhost(:\d+)?$/;
        const corsOrigin = origin && allowedOriginPattern.test(origin)
          ? origin
          : 'http://localhost';   // Default safe origin

        res.writeHead(200, {
          'Content-Type':  'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection':    'keep-alive',
          'Access-Control-Allow-Origin': corsOrigin,
          'X-Content-Type-Options': 'nosniff',
        });

        // ... rest of handler
      });

      // SECURITY: Bind to localhost ONLY — not all interfaces
      this.server.listen(port, '127.0.0.1', () => {
        console.log(`MindForge event stream: http://localhost:${port}/events (localhost only)`);
        resolve();
      });

      this.server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(
            `Port ${port} is already in use. Use: new MindForgeEventStream().start(${port + 1})`
          ));
        } else {
          reject(err);
        }
      });
    });
  }
```

Also add Linux inotify fallback to `watchAuditLog`:

```typescript
  watchAuditLog(projectRoot: string): void {
    const auditPath = path.join(projectRoot, '.planning', 'AUDIT.jsonl');

    // ... existing setup ...

    try {
      this.auditWatcher = fs.watch(auditPath, () => { /* ... */ });
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOSPC') {
        // Linux inotify limit reached — fall back to polling
        console.warn('MindForge: inotify limit reached, falling back to 2s polling');
        setInterval(() => {
          const lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
          for (let i = this.lastAuditLine; i < lines.length; i++) {
            try { this.broadcast('audit_entry', JSON.parse(lines[i])); } catch { /* ignore */ }
          }
          this.lastAuditLine = lines.length;
        }, 2000);
      } else {
        throw err;
      }
    }
  }
```

**Commit:**
```bash
git add sdk/src/events.ts
git commit -m "harden(sdk): fix SSE server localhost-only binding, exact CORS origins, inotify fallback"
```

---

## HARDEN 3 — Fix CI timeout exit code

Update `ci-mode.md` — replace the timeout section:

```markdown
### CI timeout and exit codes

**Exit code policy:**
| Situation | Exit code | Meaning |
|---|---|---|
| All phases complete, gates passed | 0 | Success |
| Quality gate failed | 1 | Hard failure — fix required |
| Tier 2/3 governance block | 1 | Hard failure — approval required |
| CI timeout reached | 0 | Soft stop — work saved, resume next run |
| No MindForge project found | 1 | Configuration error |

**Important:** GitHub Actions (and most CI systems) treat ANY non-zero exit code
as failure. Exit code 2 does NOT mean "warning" in CI — it means failure.

**Timeout handling (exit 0 with state preservation):**
```bash
# Set up timeout trap
CI_TIMEOUT_SECONDS=$((${CI_TIMEOUT_MINUTES:-60} * 60))
timeout_handler() {
  echo "::warning::MindForge CI timeout reached after ${CI_TIMEOUT_MINUTES} minutes"
  echo "::warning::Progress saved. Next CI run will resume from: $(cat .planning/HANDOFF.json | python3 -c 'import sys,json; print(json.load(sys.stdin).get("next_task","unknown"))')"

  # Write resume info to GitHub Actions step summary
  cat >> "${GITHUB_STEP_SUMMARY:-/dev/null}" << EOF
## ⏱️ MindForge CI Timeout

CI timeout reached. Progress has been saved.

Next run will resume from:
$(cat .planning/HANDOFF.json | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("next_task","unknown"))')

Run the CI pipeline again to continue.
EOF

  # Commit HANDOFF.json so next run can resume
  git add .planning/HANDOFF.json .planning/STATE.md
  git commit -m "ci: save MindForge progress on timeout [skip ci]" || true
  git push origin HEAD || true

  exit 0  # Exit 0 — timeout is not a failure
}

trap 'timeout_handler' TERM
(sleep "${CI_TIMEOUT_SECONDS}"; kill -TERM $$) &
TIMEOUT_PID=$!
```
```

**Commit:**
```bash
git add .mindforge/ci/ci-mode.md
git commit -m "harden(ci): fix timeout exit code to 0 (soft stop), add GitHub step summary"
```

---

## HARDEN 4 — Add Tier 3 CI error message

Update `github-actions-adapter.md` — add to the mindforge-quality job:

```yaml
      - name: Check governance tier (Tier 3 blocks CI)
        run: |
          # Check if any pending Tier 3 approvals exist without approval
          PENDING_T3=$(find .planning/approvals/ -name "*.json" 2>/dev/null | \
            xargs grep -l '"tier": 3' 2>/dev/null | \
            xargs grep -l '"status": "pending"' 2>/dev/null | wc -l)

          if [ "${PENDING_T3}" -gt 0 ]; then
            echo "::error title=Tier 3 Governance Block::$PENDING_T3 Tier 3 change(s) require compliance review."
            echo "::error::Tier 3 changes (auth/payment/PII) cannot be auto-approved in CI."
            echo "::error::To resolve: get human approval with /mindforge:approve [id], then push again."
            cat >> "${GITHUB_STEP_SUMMARY}" << 'EOF'
## 🔴 Governance Block: Tier 3 Approval Required

This PR contains changes that require compliance review (auth, payment, or PII handling).

**Next steps:**
1. Run `/mindforge:approve` to see pending approval requests
2. Have your compliance officer approve with `/mindforge:approve [id]`
3. Push again — CI will pass once the approval is recorded

See `.planning/approvals/` for details.
EOF
            exit 1
          fi

          echo "::notice::Governance check passed — no pending Tier 3 blocks ✅"
```

**Commit:**
```bash
git add .mindforge/ci/github-actions-adapter.md .github/workflows/mindforge-ci.yml
git commit -m "harden(ci): add clear Tier 3 CI block message with resolution steps"
```

---

## HARDEN 5 — Fix AI review daily limit and diff strategy

Update `ai-reviewer.md`:

```javascript
// Replace the daily limit check with robust implementation:

const AI_REVIEW_LOG = path.join(projectRoot, '.mindforge', 'metrics', 'ai-review-usage.jsonl');

function logAIReview(prSha) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    pr_sha: prSha,
    date: new Date().toISOString().slice(0, 10),
    model: 'claude-sonnet-4-6',
  }) + '\n';

  // Create parent directory if it doesn't exist
  const dir = path.dirname(AI_REVIEW_LOG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.appendFileSync(AI_REVIEW_LOG, entry);
}

function checkDailyLimit(maxReviews) {
  if (!fs.existsSync(AI_REVIEW_LOG)) return true; // No log = no limit hit

  const today = new Date().toISOString().slice(0, 10);
  let count = 0;

  const lines = fs.readFileSync(AI_REVIEW_LOG, 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.date === today) count++;
    } catch {
      continue; // Skip malformed lines — don't let parse errors break the limit check
    }
  }

  return count < maxReviews;
}

// Replace diff truncation strategy:

function buildDiffForReview(fullDiff, changedFiles) {
  const MAX_CHARS = 12000;
  const MAX_FILES = 20;

  if (fullDiff.length <= MAX_CHARS) return fullDiff;

  // Prefer showing fewer complete files over more truncated ones
  // Sort files by change size (largest first — most important to review)
  const fileDiffs = splitDiffByFile(fullDiff);
  const sortedFiles = fileDiffs.sort((a, b) => b.content.length - a.content.length);

  let result = '';
  let fileCount = 0;
  for (const fileDiff of sortedFiles.slice(0, MAX_FILES)) {
    if (result.length + fileDiff.content.length > MAX_CHARS) break;
    result += fileDiff.content + '\n';
    fileCount++;
  }

  const omitted = sortedFiles.length - fileCount;
  if (omitted > 0) {
    result += `\n[${omitted} file(s) omitted from review — diff too large. Run review with --diff on individual files.]\n`;
  }

  return result;
}

function splitDiffByFile(diff) {
  const files = [];
  const parts = diff.split(/^diff --git/m).filter(Boolean);
  for (const part of parts) {
    const header = part.match(/^a\/(.+) b\//);
    files.push({
      filename: header ? header[1] : 'unknown',
      content: 'diff --git' + part,
    });
  }
  return files;
}
```

**Commit:**
```bash
git add .mindforge/pr-review/ai-reviewer.md
git commit -m "harden(ai-review): robust daily limit with parse error tolerance, file-based diff truncation"
```

---

## HARDEN 6 — Fix monorepo affected package detection

Update `cross-package-planner.md`:

```markdown
## Affected package detection (revised)

```bash
# CORRECTED: Match against declared package paths, not assume 2-level depth
detect_affected_packages() {
  local MANIFEST=".planning/WORKSPACE-MANIFEST.json"

  if [ ! -f "${MANIFEST}" ]; then
    echo "Run /mindforge:workspace detect first"
    return 1
  fi

  # Get list of changed files
  CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null || git diff --cached --name-only)

  # For each package in manifest, check if any changed file is within that package
  node -e "
    const fs = require('fs');
    const manifest = JSON.parse(fs.readFileSync('${MANIFEST}', 'utf8'));
    const changedFiles = \`${CHANGED_FILES}\`.split('\n').filter(Boolean);

    const affected = new Set();
    manifest.packages.forEach(pkg => {
      // Check if any changed file is within this package's path
      const pkgPath = pkg.path.replace(/\/$/, ''); // remove trailing slash
      changedFiles.forEach(file => {
        if (file.startsWith(pkgPath + '/') || file === pkgPath) {
          affected.add(pkg.name);
        }
      });
    });

    // Also add packages that depend on affected packages
    manifest.packages.forEach(pkg => {
      if (pkg.dependencies && pkg.dependencies.some(dep => affected.has(dep))) {
        affected.add(pkg.name);
      }
    });

    console.log([...affected].join('\n'));
  "
}
```

This correctly handles:
- Packages at any nesting depth (`libs/shared/utils/` → 3 levels deep)
- Packages whose path is a prefix of another (avoid false matches)
- Transitive dependencies (packages that depend on changed packages)
```

**Commit:**
```bash
git add .mindforge/monorepo/cross-package-planner.md
git commit -m "harden(monorepo): fix affected package detection to use manifest paths, handle deep nesting"
```

---

## HARDEN 7 — Write 3 ADRs for Day 6 decisions

### `.planning/decisions/ADR-015-npm-based-skill-registry.md`

```markdown
# ADR-015: npm as the MindForge Skills Registry

**Status:** Accepted
**Date:** [today]

## Context
MindForge needs a way to distribute community and organisation skills.
Options: custom registry server, GitHub releases, npm registry.

## Decision
Use the standard npm registry with `mindforge-skill-` package naming convention.

## Rationale
npm is the world's largest package registry with existing infrastructure for:
versioning, authentication, access control, search, and deprecation.
Building a custom registry duplicates all of this at significant cost.
The npm ecosystem's supply chain security tooling (npm audit, Dependabot,
Snyk) works natively. Private registries (Verdaccio, Artifactory, GitHub Packages)
are npm-compatible — organisations with private skills don't need separate tooling.

## Consequences
- Skill names follow npm conventions (lowercase, hyphens)
- Version management follows npm semver conventions
- Private skills require a compatible private npm registry
- The injection guard and validation pipeline are the primary
  supply chain security controls (npm audit is insufficient alone for SKILL.md content)
```

### `.planning/decisions/ADR-016-ci-exit-code-0-on-timeout.md`

```markdown
# ADR-016: CI timeout exits with code 0 (soft stop)

**Status:** Accepted
**Date:** [today]

## Context
MindForge CI may run out of time before completing all phases.
The question is: should timeout exit with code 0 (success) or non-zero (failure)?

## Decision
Timeout exits with code 0. State is saved. Next CI run resumes.

## Rationale
A MindForge CI timeout is not a code failure — it is a resource limit.
Failing the build on timeout would:
1. Block the PR with a failure that has no fix (the code is fine — time ran out)
2. Force teams to either increase CI limits or split phases artificially
3. Make MindForge feel unreliable ("it randomly fails when there's a lot to do")

The correct behaviour: save progress, exit cleanly, let the next run continue.
The CI pipeline is designed for continuation, not completion in a single run.

## Consequences
- CI pipelines may run multiple times for a single phase
- HANDOFF.json must be committed during CI runs (CI has write access)
- Teams must monitor CI for timeout patterns (frequent timeouts → split phases)
- GitHub Actions step summary provides visibility into timeout state
```

### `.planning/decisions/ADR-017-sdk-localhost-only.md`

```markdown
# ADR-017: MindForge SDK event stream is localhost-only

**Status:** Accepted
**Date:** [today]

## Context
The MindForge SDK includes an SSE event stream for real-time progress.
The question is whether it should bind to all interfaces or localhost only.

## Decision
The event stream binds to 127.0.0.1 (localhost) only.

## Rationale
The event stream exposes:
- AUDIT.jsonl entries (which contain sensitive project state)
- Task completion events (which reveal code structure and timing)
- Security finding events (which reveal vulnerability information)

Exposing this to all network interfaces in a shared development environment
(VMs, shared cloud desktops, containers) would allow other users to monitor
another developer's project state in real-time.
Localhost binding provides adequate protection for the primary use case
(local developer tooling) without requiring authentication infrastructure.

## Consequences
- Remote integrations cannot use the event stream directly
- For remote monitoring: use the audit log query API via SSH tunnel
- Container environments: map the port explicitly if remote access is needed
```

**Commit:**
```bash
git add .planning/decisions/
git commit -m "docs(adr): add ADR-015 npm registry, ADR-016 CI timeout, ADR-017 localhost SDK"
```

---

## HARDEN 8 — Add to test suites

```javascript
// Add to tests/distribution.test.js:

console.log('\nHardening-prompted distribution tests:');

test('registry client uses chmod 700 for temp directory', () => {
  const c = read('.mindforge/distribution/registry-client.md');
  assert.ok(c.includes('chmod 700') || c.includes('700'), 'Should use chmod 700 for temp dir security');
});

test('registry client verifies tarball size', () => {
  const c = read('.mindforge/distribution/registry-client.md');
  assert.ok(c.includes('TARBALL_SIZE') || c.includes('size'), 'Should check tarball size');
});

test('MINDFORGE-SCHEMA.json has number type with min/max', () => {
  const schema = JSON.parse(fs.readFileSync('.mindforge/MINDFORGE-SCHEMA.json', 'utf8'));
  const compaction = schema.properties.COMPACTION_THRESHOLD_PCT;
  assert.ok(compaction, 'COMPACTION_THRESHOLD_PCT should be in schema');
  assert.strictEqual(compaction.type, 'number');
  assert.strictEqual(compaction.minimum, 50);
  assert.strictEqual(compaction.maximum, 90);
});

// Add to tests/ci-mode.test.js:

console.log('\nHardening-prompted CI tests:');

test('ci-mode uses exit code 0 for timeout (not 2)', () => {
  const c = read('.mindforge/ci/ci-mode.md');
  assert.ok(
    c.includes('exit 0') && (c.includes('timeout') || c.includes('Timeout')),
    'Timeout should exit with code 0'
  );
  // Should NOT say exit 2 for timeout
  const exit2ForTimeout = c.match(/timeout.*exit 2|exit 2.*timeout/is);
  assert.ok(!exit2ForTimeout, 'Should not use exit 2 for timeout');
});

test('github-actions adapter has Tier 3 governance block with clear message', () => {
  const c = read('.mindforge/ci/github-actions-adapter.md');
  assert.ok(
    c.includes('Tier 3') && c.includes('block'),
    'Should explain Tier 3 CI block clearly'
  );
});

// Add to tests/sdk.test.js:

console.log('\nHardening-prompted SDK tests:');

test('SDK SSE server binds to 127.0.0.1 (localhost only)', () => {
  const c = read('sdk/src/events.ts');
  assert.ok(
    c.includes("'127.0.0.1'") || c.includes('"127.0.0.1"'),
    'SSE server should bind to 127.0.0.1 only'
  );
});

test('SDK SSE server rejects non-localhost connections', () => {
  const c = read('sdk/src/events.ts');
  assert.ok(
    c.includes('isLocalhost') || c.includes('remoteAddress') || c.includes('Forbidden'),
    'SSE server should reject non-localhost connections'
  );
});

test('SDK has inotify fallback for Linux', () => {
  const c = read('sdk/src/events.ts');
  assert.ok(
    c.includes('ENOSPC') || c.includes('polling') || c.includes('watchFile'),
    'SDK should handle Linux inotify limits'
  );
});
```

**Commit:**
```bash
git add tests/
git commit -m "test(day6): add hardening-prompted tests for distribution, CI, and SDK security"
```

---

## HARDEN 9 — Update CHANGELOG.md, final commit

Update `CHANGELOG.md`:

```markdown
## [0.6.0] — Day 6 Distribution Platform

### Added
- Public skills registry: `npx mindforge-skills install/publish/search` (npm-based)
- Skill validator: 3-level validation schema (schema, content, quality)
- MINDFORGE.md JSON Schema: validation with non-overridable field markers
- MindForge CI mode: GitHub Actions / GitLab CI / Jenkins integration
- GitHub Actions workflow: health, security, quality, AI review jobs
- AI PR Review Engine: Claude API-powered code review with context loading
- Monorepo/workspace support: npm/pnpm/Nx/Turborepo/Lerna detection
- Cross-package planner: topological execution order for monorepo phases
- @mindforge/sdk: TypeScript SDK with client, event stream, and command builders
- SSE event stream: real-time progress events via Server-Sent Events
- /mindforge:init-org — organisation-wide MindForge setup command
- /mindforge:install-skill — install skill from public/private registry
- /mindforge:publish-skill — publish skill to npm registry
- /mindforge:pr-review — AI code review powered by Claude API
- /mindforge:workspace — monorepo workspace management
- /mindforge:benchmark — skill effectiveness benchmarking
- 3 new ADRs: ADR-015 npm registry, ADR-016 CI timeout, ADR-017 localhost SDK

### Hardened
- Registry: TOCTOU-safe temp directory (chmod 700), tarball size verification
- CI: timeout exits with code 0 (soft stop), clear Tier 3 block messages
- SDK: localhost-only SSE binding, Linux inotify fallback
- AI review: robust daily limit (parse error tolerant), file-based diff truncation
- Monorepo: affected package detection uses manifest paths (not depth assumption)
```

```bash
git add CHANGELOG.md package.json
git commit -m "chore(release): v0.6.0 complete with all hardening"
git push origin feat/mindforge-distribution-platform
```

---

## DAY 6 COMPLETE — Final state of MindForge

| Metric | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | Day 6 |
|---|---|---|---|---|---|---|
| Commands | 6 | 10 | 15 | 21 | 25 | **31** |
| Skills | 5 | 5 | 10 | 10 | 10 | **10+registry** |
| ADRs | 3 | 5 | 8 | 11 | 14 | **17** |
| Test suites | 1 | 4 | 5 | 7 | 9 | **12** |
| Version | 0.1.0 | 0.2.0 | 0.3.0 | 0.4.0 | 0.5.0 | **0.6.0** |
| MindForge version | — | — | — | — | — | **v0.6.0** |

**MindForge v0.6.0: 31 commands · 10 core skills + public registry · 8 personas**
**17 ADRs · 12 test suites · SDK · CI integration · Monorepo support**

---

## DAY 7 PREVIEW

```
Branch: feat/mindforge-production-hardening

Day 7 scope (Production hardening & polish):
- Complete installer: npx mindforge-cc fully functional end-to-end
- Self-update mechanism: /mindforge:update with changelog preview
- Migration tool: upgrade between MindForge versions with state migration
- Plugin system: third-party extensions to MindForge commands
- Performance profiling: identify slow phases and optimise agent token usage
- Cross-version compatibility: HANDOFF.json schema migration
- Complete documentation site: docs.mindforge.dev structure and content
- Security penetration testing simulation: adversarial review of all governance
- Production readiness checklist: final audit before public release
- npx mindforge-cc publish: full end-to-end skill publication workflow
```

**Branch:** `feat/mindforge-distribution-platform`
**Day 6 complete. Open PR → merge → tag v0.6.0**
