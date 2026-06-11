---
description: "Manage the instinct store via the deterministic instinct-CLI - list/projects/export/import/promote/prune. Usage - /mindforge:instinct <list|projects|export|import|promote|prune> [options]"
---

<objective>
Inspect and maintain the project-scoped instinct store with the deterministic
CLI (bin/learning/instinct-cli.js). Read-only views (list/projects) are always
safe; mutating actions (import/promote/prune) require --force and support
--dry-run. Promotion to a full skill stays with /mindforge:evolve-skills and
/mindforge:cluster-instincts — this command only LISTS candidates.
</objective>

<execution_context>
@.mindforge/engine/instincts/instinct-schema.md
@.mindforge/skills/continuous-learning/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse the subcommand + flags from $ARGUMENTS and shell out to the CLI:
   `node bin/learning/instinct-cli.js <subcommand> [flags]`
   - `list [--project <id>|--all] [--status active|promoted|deprecated|pruned] [--json]`
     — defaults to the current project's instincts plus `global`.
   - `projects [--json]` — per-project counts, active count, avg confidence, last-applied.
   - `export [--project <id>|--all] [--status <s>] [--min-confidence N] [-o file]`
     — emits a JSONL subset (portable interchange) to stdout or a file.
   - `import <file|https-url> [--scope project|global] [--min-confidence N] [--dry-run] [--force]`
     — https-only + SSRF-guarded for URLs; dedups by id keeping higher confidence;
       stamps project_id + source:imported. Default lists what WOULD import; --force writes.
   - `promote [<id>] [--project <id>|--all] [--dry-run] [--force]`
     — LISTS instincts meeting confidence ≥ threshold AND applied ≥ min; does NOT
       create skills (run /mindforge:evolve-skills for that). --force only flags.
   - `prune [--max-age <days>] [--dry-run] [--force]`
     — flags low-confidence/high-applied or stale instincts as pruned; --force writes.
2. Relay the CLI output. For mutating actions, prefer running --dry-run first and
   showing the user the diff before re-running with --force.
3. The CLI writes atomically under an advisory lock, so it is safe to run while
   the capture hook is appending. It spawns no model and incurs no token cost.
4. Optionally log an AUDIT entry for a mutating action (import/promote/prune).

NOTE: this command and its .agent/mindforge/ mirror MUST be edited together —
they are kept byte-identical.
</process>
