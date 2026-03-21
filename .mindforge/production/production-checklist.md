# MindForge v1.0.0 — Production Readiness Checklist

## Policy: ALL 55 items must be ✅ before tagging v1.0.0

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

## SECTION F — Release Artifacts (5 points)

| # | Check | Verification step | ✅/❌ | Verified by | Date |
|---|---|---|---|---|---|
| F01 | package.json version === target release version | `node -e "console.log(require('./package.json').version)"` | | | |
| F02 | SDK package.json version matches root version | `node -e "console.log(require('./sdk/package.json').version)"` | | | |
| F03 | Git tag v1.0.0 exists and points to correct commit | `git show v1.0.0 --no-patch` | | | |
| F04 | CHANGELOG.md has v1.0.0 entry with today’s date | `grep -n \"1.0.0\" CHANGELOG.md` | | | |
| F05 | `npm publish --dry-run` shows no unexpected files | Run dry-run, review output | | | |

---

## Release gate procedure

When ALL 50 items show ✅:
