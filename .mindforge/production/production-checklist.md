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
- [ ] A01-A10
- [ ] B01-B10
- [ ] C01-C10
- [ ] D01-D10
- [ ] E01-E10
- [ ] F01-F10
- [ ] G01-G05
 [ ] E10
- [ ] F01
- [ ] F02
- [ ] F03
- [ ] F04
- [ ] F05

---

## Release gate procedure

When ALL 50 items show ✅:
