# ADR-005: Append-only JSONL audit log over structured database

**Status:** Accepted
**Date:** 2026-03-20
**Deciders:** MindForge core team

## Context
MindForge needs an audit trail of agent actions. The storage format choices are:
A) Append-only JSONL file (chosen)
B) SQLite database
C) In-memory log (written to JSON on session end)

## Decision
Append-only JSONL file: `.planning/AUDIT.jsonl`

## Options considered

### Option A — Append-only JSONL (chosen)
Pros:
- Zero dependencies (no SQLite driver needed)
- Readable with standard Unix tools (grep, jq, tail)
- Git-trackable — history of history
- Tamper-evident via git (any deletion or modification is visible in `git diff`)
- Works identically across all platforms and environments

Cons:
- No query language — filtering requires grep/jq
- File grows unboundedly (mitigated by archiving strategy)
- No transactions — a crash mid-write could produce a partial line

### Option B — SQLite
Pros: Full SQL query capability, transactional writes
Cons: Binary file — not readable without tooling, not meaningfully git-diffable,
      adds a native dependency, harder to inspect in CI/CD environments

### Option C — In-memory log
Pros: No I/O overhead during session
Cons: Lost entirely if session crashes mid-execution — exactly when the audit log
      is most needed.

## Rationale
For a framework targeting solo developers and small teams, readability and
zero-dependency simplicity outweigh query sophistication. The primary audit use
case is "what happened in this phase?" which grep handles well.

## Consequences
- A partial-line recovery tool should be built in a future hardening pass.
  (Run `python3 -c "import sys,json;[print(l.strip()) for l in sys.stdin if json.loads(l)]"`
  to filter clean lines from a corrupted AUDIT.jsonl)
- An archiving strategy (rotate after 10,000 lines) will be added in Day 4.
- The `status` command reads AUDIT.jsonl from the tail for performance.
