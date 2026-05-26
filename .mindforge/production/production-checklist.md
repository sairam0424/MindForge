# MindForge v2.0.0 — Production Readiness Checklist

## Policy: ALL 65 items must be ✅ before tagging v2.0.0

This is not a "should" list — it is a hard gate.
No item can be marked ✅ without:
1. The specific verification step executed successfully
2. The verifier's git email recorded
3. The date verified recorded

Document completed checks in `.planning/RELEASE-CHECKLIST.md`.

---

## SECTION A — Installation & Upgrade (10 points)
... (existing items A01-A10)

## SECTION B — Command Coverage (10 points)
... (existing items B01-B10)

## SECTION C — Governance Gates (10 points)
... (existing items C01-C10)

## SECTION D — Documentation (10 points)
... (existing items D01-D10)

## SECTION E — Test Coverage (10 points)
... (existing items E01-E10)

## SECTION F — v2.0.0 Features (10 points)

| # | Check | Verification step | ✅/❌ | Verified by | Date |
|---|---|---|---|---|---|
| F01 | `/mindforge:new-runtime` scaffolds commands in both .claude and .agent | Run command, check both dirs | | | |
| F02 | `--gemini` installs GEMINI.md with correct context substitution | Run install --gemini, verify filename and content | | | |
| F03 | `--cursor` and `--copilot` entry files contain usage preambles | Run install, verify preambles in rule files | | | |
| F04 | Migration 1.0.0 → 2.0.0 backfills `runtime` in AUDIT.jsonl | Run migration on v1 audit, verify backfill | | | |
| F05 | Migration 1.0.0 → 2.0.0 backfills `model_group` in tokens | Run migration, verify token-usage.jsonl | | | |
| F06 | Migration creates automatic backup before modification | Verify `.planning/.backups/` exists with files | | | |
| F07 | Installer correctly handles the `--runtime <name>` explicit flag | Run with --runtime opencode, verify install | | | |
| F08 | Install `--all` targets 6 distinct runtimes correctly | Run --all, verify 6 locations | | | |
| F09 | ADRs 039-041 are present and indexed | Verify ADR files and index entry | | | |
| F10 | Self-building skills (Day 13) features pass regression tests | Run self-building-skills.test.js | | | |

## SECTION G — final packaging (5 points)

| # | Check | Verification step | ✅/❌ | Verified by | Date |
|---|---|---|---|---|---|
| G01 | package.json version === 2.0.0 | `node -e "console.log(require('./package.json').version)"` | | | |
| G02 | SDK package.json version === 2.0.0 | `node -e "console.log(require('./sdk/package.json').version)"` | | | |
| G03 | Git tag v2.0.0 exists and points to HEAD | `git show v2.0.0 --no-patch` | | | |
| G04 | CHANGELOG.md has v2.0.0 entry with release highlights | `grep -n "2.0.0" CHANGELOG.md` | | | |
| G05 | `npm publish --dry-run` is clean | Run dry-run, verify file list | | | |

---

## Checkbox summary (for quick audits)
- [ ] A01 — bin/install.js has shebang and runs without error
- [ ] A02 — bin/installer-core.js exports run() function
- [ ] A03 — Installer handles --version flag
- [ ] A04 — Node.js version gate (>= 18)
- [ ] A05 — CI mode detection works
- [ ] A06 — Existing CLAUDE.md backed up before overwrite
- [ ] A07 — Self-install detection prevents double-install
- [ ] A08 — Sensitive files excluded (*.env, *.key, *.pem)
- [ ] A09 — Post-install verification passes
- [ ] A10 — Upgrade from previous version preserves config
- [ ] B01 — All 36 commands present in .claude/commands/mindforge/
- [ ] B02 — All 36 commands mirrored to .agent/mindforge/
- [ ] B03 — No command file is empty (> 100 chars)
- [ ] B04 — Command files include usage or step markers
- [ ] B05 — help command lists all available commands
- [ ] B06 — init-project creates required scaffolding
- [ ] B07 — plan-phase references CONTEXT.md
- [ ] B08 — execute-phase has verify gate
- [ ] B09 — ship command runs full checklist
- [ ] B10 — debug command has hypothesis-driven workflow
- [ ] C01 — SOUL score enforcement active
- [ ] C02 — Cost hard limit blocks overspend
- [ ] C03 — Security gate blocks unsafe changes
- [ ] C04 — Audit log rotation at 10000 lines
- [ ] C05 — ZTAI identity verification active
- [ ] C06 — Policy engine evaluates all intents
- [ ] C07 — Blast radius scoring functional
- [ ] C08 — ADR requirement enforced for architecture changes
- [ ] C09 — Merkle-linked audit trail integrity
- [ ] C10 — Plugin permission model enforced
- [ ] D01 — docs/reference/commands.md exists
- [ ] D02 — docs/security/SECURITY.md has disclosure policy
- [ ] D03 — docs/security/threat-model.md covers 7 threat actors
- [ ] D04 — docs/architecture/decision-records-index.md lists 20 ADRs
- [ ] D05 — docs/contributing/CONTRIBUTING.md exists
- [ ] D06 — README.md has quickstart section
- [ ] D07 — API documentation generated
- [ ] D08 — Migration guide for major version
- [ ] D09 — Troubleshooting guide exists
- [ ] D10 — Architecture diagrams current
- [ ] E01 — Unit tests pass (node tests/run-all.js)
- [ ] E02 — Coverage >= 80%
- [ ] E03 — No skipped tests without documented reason
- [ ] E04 — Security tests pass
- [ ] E05 — Integration tests pass
- [ ] E06 — Performance benchmarks pass
- [ ] E07 — Regression tests for all fixed bugs
- [ ] E08 — CI pipeline green
- [ ] E09 — Test isolation verified (no state leaks)
- [ ] E10 — Edge case tests for boundary conditions
- [ ] F01 — /mindforge:new-runtime scaffolds commands
- [ ] F02 — --gemini installs GEMINI.md correctly
- [ ] F03 — --cursor and --copilot have preambles
- [ ] F04 — Migration backfills runtime in AUDIT
- [ ] F05 — Migration backfills model_group in tokens
- [ ] F06 — Migration creates backup before modification
- [ ] F07 — Installer handles --runtime flag
- [ ] F08 — Install --all targets 6 runtimes
- [ ] F09 — ADRs present and indexed
- [ ] F10 — Self-building skills pass regression
- [ ] G01 — package.json version matches release
- [ ] G02 — SDK package.json version matches
- [ ] G03 — Git tag exists and points to HEAD
- [ ] G04 — CHANGELOG.md has version entry
- [ ] G05 — npm publish --dry-run is clean

---

## Release gate procedure

When ALL 50 items show ✅:
