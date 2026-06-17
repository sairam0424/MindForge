# Repository Guidelines

## Project Structure & Module Organization

MindForge v11.2.1 is an agentic intelligence framework distributed as the `mindforge-cc` npm package. Two package roots:

- **Root (`/`)** — CLI + framework. Two bin entries: `mindforge-cc` (installer, `bin/install.js`) and `mindforge` (CLI, `bin/mindforge-cli.js`). The `bin/` runtime layer (~22K LOC) is organized by domain: `governance/` (audit hash-chain), `autonomous/` (wave executor, auto-runner), `engine/` (council runtime, nexus tracer, verification runner, OTel exporter), `models/` (provider clients + pricing registry), `memory/` (knowledge graph, sql.js vector hub, RRF fusion), `security/` (trust boundaries), `eval/` (recall@k, nDCG), `hooks/`, `utils/`, `wizard/`.
- **`sdk/`** — TypeScript SDK (`mindforge-sdk`), own `tsconfig.json` (strict). `tsc` compiles `src/` → `dist/`. Own tests (`cd sdk && npm test`).

Cross-cutting systems worth understanding before editing:

- **Audit hash-chain** — `bin/governance/audit-hash.js` is the single canonical SHA-256 hasher used by both `bin/autonomous/audit-writer.js` and `bin/governance/audit-verifier.js` (note: writer lives under `autonomous/`, verifier under `governance/`); `.planning/AUDIT.jsonl` is tamper-evident via `previous_hash` linkage. Verify with `node bin/verify-audit.js` (fail-closed, exit 1 on break).
- **Pricing registry** — `bin/models/pricing-registry.js` is the single source of truth; all three providers call `priceCall()`. Never hardcode per-model prices in providers.
- **Other roots:** `.mindforge/` (engine configs, ~200 skills, personas, governance), `.agent/` (6 hooks, ~130 workflows, `CLAUDE.md` protocols), `.planning/` (STATE.md, ROADMAP.md, audit), `docs/`, `examples/`, `tests/` (72 `*.test.js`).

## Build, Test, and Development Commands

```bash
npm install                       # Node >= 18 required
npm test                          # node tests/run-all.js (pre-commit hook runs this)
npm run lint                      # eslint .
npm run coverage                  # npx c8 node tests/run-all.js
npm run commit                    # Commitizen (cz) conventional-commit prompt
node bin/mindforge-cli.js verify  # verification runner (bin/engine/verify-cli.js): tests/lint/audit/typecheck → .planning/VERIFICATION.md

# SDK (from sdk/)
cd sdk && npm install && npm run build   # tsc → sdk/dist/
npm test                                  # pretest runs build first
```

Run a single test file: `node tests/sharding.test.js`. Filter the runner: `node tests/run-all.js --filter=security,audit` (case-insensitive filename substring). A test file whose first line is `// @skip: reason` is skipped.

Other validators: `node bin/validate-config.js` (MINDFORGE.md vs schema), `npx tsc --noEmit -p sdk/tsconfig.json`.

**Persistence:** sql.js (WebAssembly SQLite) at `.mindforge/celestial.db` — no native deps, no compile step.

## Coding Style & Naming Conventions

ESLint 9 flat config (`eslint.config.mjs`): single quotes (`error`), semicolons (`error`), `no-unused-vars` warn, `no-console` off; `sourceType: 'module'`, Node + ES2021 globals; ignores `**/dist/`, `coverage/`, `.gemini/`. The SDK adds strict-mode TypeScript (`tsconfig.json`: `strict: true`, target ES2020, CommonJS).

CI lint gates differ by package: root tolerates warnings (`eslint . --max-warnings=9999`, errors only); SDK is zero-tolerance (`eslint src/ --max-warnings 0`).

## Testing Guidelines

Node's built-in `assert` with a custom lightweight harness — no Jest/Mocha. Each file is self-contained and runnable via `node <file>`. CI runs the Node 18/20/22 matrix and gates coverage at 30% lines (`c8 --check-coverage --lines 30`). The Husky pre-commit hook runs `npm test`; all tests must pass to commit. `version-consistency.test.js` asserts the version string across `package.json`, `sdk/package.json`, `.mindforge/config.json`, `MINDFORGE.md` (`[VERSION]` marker), and `sdk/README.md` — bump all five each release.

## Commit & Pull Request Guidelines

Conventional Commits via Commitizen, with a trailing `(UC-XX)` use-case reference where applicable:

```text
feat(council): wire runCouncil runtime to /mindforge:council command (UC-22)
fix(security): harden trust-gate — fail-closed, null-strip (UC-22)
```

Types seen in history: `feat`, `fix`, `chore`, `test`, `docs`, `ci`, `refactor`. The PR template (`.github/pull_request_template.md`) requires: Goal, Proposed Changes (grouped by component/persona), Verification checklist, and Brain Context links.

## Agent Orchestration

Native Claude Code hooks live in `.claude/settings.json` under real event names — `PreToolUse`, `PostToolUse`, `SessionStart`. `.agent/settings.json` is the **Gemini-CLI mirror** using `BeforeTool`/`AfterTool` (not legacy — `mindforge-context-monitor.js` switches `hookEventName` to `AfterTool` when `GEMINI_API_KEY` is set); keep the two in sync when changing hooks. Active hooks: `bin/security/trust-gate-hook.js` (PreToolUse Bash, blocks high-impact commands, fail-closed), `bin/hooks/instinct-capture-hook.js` (PostToolUse), `.agent/hooks/mindforge-{context-monitor,prompt-guard,session-init_extended,check-update}.js`.

`.agent/CLAUDE.md` defines the contributor protocol. Source-of-truth order: SOUL.md → MINDFORGE.md → `.agent/CLAUDE.md` → `.mindforge/`. Enforce **Plan → Execute → Verify**; never skip planning for changes touching >3 files. Changes to Auth/Payment/PII/Uploads auto-trigger a security review — run `mindforge:security-scan` pre-commit and resolve Medium+ findings.
