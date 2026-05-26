# MindForge Intelligence — Smart Context Compaction

## Purpose
Replace truncation with structured extraction so future sessions preserve reasoning,
constraints, and in-progress state.

## Triggering and level selection
Day 2 threshold (`70%`) remains valid and now invokes Day 5 Level 1.
Level selection uses both context usage and session depth.

- Light session (`<5` tasks): use Level 1 even when context is high.
- Moderate session (`5-10` tasks): use Level 2 at `80%+`.
- Deep session (`10+` tasks): use Level 2 at `75%+`.
- Level 3 at `90%+` or urgent near-limit state.

## Levels
### Level 1 — Lightweight
Quick checkpoint: update `STATE.md` and `HANDOFF.json` with next task.

### Level 2 — Structured extraction
Capture:
- decisions made
- discoveries
- implicit knowledge
- quality signals
- precise in-progress state

### Level 3 — Emergency extraction
Capture minimum viable continuation context before hard limit.

## Level 2 extraction protocol
### Block A — Decisions made
For each decision: what, why, alternatives ruled out, impact area, ADR need.

### Block B — Discoveries
For each finding: fact, location, significance, assumption impact.

### Block C — Current task state
Record plan id, completed steps, remaining steps, current file, and inconsistency state.

### Block D — Implicit knowledge
Capture quirks, environment facts, and workarounds.

A knowledge item qualifies as a **quirk** if either:
1. It contradicts documentation or expected tool behavior.
2. A new agent reading only plans/personas would not infer it.

### Block E — Quality signals
Capture failed assumptions, friction patterns, quality gate root causes, and next-plan suggestions.

## Level 2 HANDOFF schema additions
- `decisions_made[]`
- `discoveries[]`
- `implicit_knowledge[]`
- `quality_signals[]`
- `in_progress.current_state`

## Session restart protocol
When loading Level 2 handoff:
1. Print compact summary counts.
2. Preload `implicit_knowledge` before plan execution.
3. If `in_progress.current_state` is inconsistent, block execution and ask to resolve first.
4. If user asks to inspect first, print first 50 lines of the inconsistent file inline.

## Compaction quality metric
Write one entry to `.mindforge/metrics/compaction-quality.jsonl`:
- `decisions_captured`
- `discoveries_captured`
- `implicit_knowledge_items`
- `quality_signals_captured`
- `next_session_continuation_success` (auto-inferred from next session, nullable initially)
