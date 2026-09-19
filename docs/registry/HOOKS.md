# MindForge — Hook Registry (v11.9.5)

This registry catalogs the real, currently-wired hooks in `.claude/settings.json`/`.agent/settings.json`,
dispatched through a single shared wrapper (`run-with-flags.js`) that enforces a strict
0=allow/2=block exit-code contract.

## 🛡️ Fail-closed (DENY_CLASS — block on any error, not just a real violation)

| Hook | Trigger Event | What it does |
| :--- | :--- | :--- |
| **trust-gate** | `PreToolUse` (Bash) | Blocks high-impact/destructive shell commands, scoped by command content not tool name. |
| **mindforge-block-no-verify** | `PreToolUse` (Bash) | Blocks `git --no-verify` / `core.hooksPath=` bypass flags. |
| **mindforge-config-protection** | `PreToolUse` (Write/Edit) | Blocks edits to existing lint/format/tsconfig/commit-governance files. |

## 📊 Advisory (fail-open — log/inform, never block)

| Hook | Trigger Event | What it does |
| :--- | :--- | :--- |
| **mindforge-session-init_extended** | `SessionStart` | Loads project context and skill index at session start. |
| **mindforge-context-monitor** | `PostToolUse` | Injects context-budget warnings at 35%/25% remaining. |
| **instinct-capture-hook** | `PostToolUse` (Bash\|Task) | Captures lightweight behavioral "instincts" (rate-limited per session). |
| **mindforge-prompt-guard** | `PreToolUse` (Write/Edit into `.planning/`) | Advisory prompt-injection pattern scan. |
| **mindforge-check-update** | `SessionStart` | Background version-check against the npm registry. |
| **mindforge-statusline** | Claude Code's `statusLine` renderer (not a lifecycle hook) | Produces the context-remaining % that `mindforge-context-monitor` reads. |

## ⚠️ Shipped but not currently wired to any event

| Hook | Status |
| :--- | :--- |
| **mindforge-workflow-guard** | Real file, real logic (phase-based enforcement, plan-approval gating) — but not wired into `.claude/settings.json` or `.agent/settings.json` in this version, and no code reads its documented `hooks.workflow_guard` config key yet. |

The three "Version Control & Git Hooks" (pre-commit-security, post-merge-status, pre-push-validation)
previously listed here do not exist as real git hooks anywhere in this repo and have been removed
from this registry.

---
*For the audit hash-chain and its verifier, see `bin/governance/audit-hash.js` / `node bin/verify-audit.js`.*
