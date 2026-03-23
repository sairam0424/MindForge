# MindForge v2 — Auto-Capture Protocol

## Purpose
When `AUTO_CAPTURE_SKILLS=true` in MINDFORGE.md, MindForge automatically
analyses each completed phase for reusable patterns worth capturing as skills.

## When auto-capture runs
After `/mindforge:verify-phase [N]` completes (all gates passed):
The auto-capture hook analyses the phase's output for patterns.

## What auto-capture analyses

### Source 1: SUMMARY files
All SUMMARY-[N]-[M].md files in `.planning/phases/[N]/`.
Looks for: repeated approaches across 3+ tasks, common code patterns,
repeated library usage, consistent error handling approaches.

### Source 2: HANDOFF.json implicit_knowledge
The Level 2/3 compaction extracts implicit knowledge.
Any item with confidence > 0.7 in the implicit_knowledge array is a
candidate for skill capture.

### Source 3: ADR files created this phase
New ADR files represent significant decisions.
ADRs about technology choices → potential technology skill.
ADRs about patterns → potential code-pattern skill.

### Source 4: Debug reports
DEBUG-*.md files contain root cause + fix.
Root causes that are technology-specific → bug_pattern skill contribution.

## Pattern detection algorithm

For each source file, run:
```
Ask EXECUTOR_MODEL:
"Read these [N] files from a completed software development phase.
Identify patterns that appeared 2+ times (strong signal) or once but
are highly important (architectural decisions, security patterns).

Focus on:
1. Code patterns that appear in multiple files
2. Library-specific patterns (how a specific API/library was used)
3. Configuration patterns (how something was set up)
4. Error handling patterns (what edge cases were handled)

For each pattern found, rate:
- Frequency: how many files/tasks used it?
- Generality: would this apply to future phases? (high/medium/low)
- Difficulty: is this hard to get right without knowing it? (high/medium/low)

Return: JSON array of { pattern_name, frequency, generality, difficulty, evidence_files }
Capture candidates: (frequency >= 2 OR difficulty == 'high') AND generality != 'low'
```

## Presentation to user

After analysis, if patterns are found:
```
🎯 Auto-capture: 2 reusable patterns found in Phase [N]

  1. Prisma relation cascade patterns (★★★ high generality)
     Appeared in: Plan 02, Plan 04, Plan 07
     "Cascade delete must be explicitly configured..."

  2. Zod schema composition pattern (★★ medium generality)
     Appeared in: Plan 01, Plan 03
     "Using z.discriminatedUnion() for API response types..."

Save as skills? [y=both] [1=first only] [2=second only] [n=skip]
```

If user selects yes (or a subset):
- Run full learn protocol (Steps 2-7) for each selected pattern
- Sources: the identified SUMMARY files as documentation
- Quality score minimum: 60

If user selects skip:
- Discard pattern drafts
- Note in AUDIT: "auto_capture_skipped, phase: N"
- Do NOT add to knowledge-base.jsonl (they must explicitly remember)

## Minimum thresholds (configurable in MINDFORGE.md)

```
AUTO_CAPTURE_MIN_PATTERN_COUNT=2    # minimum times a pattern appears
AUTO_CAPTURE_MIN_CONFIDENCE=0.75    # HANDOFF.json implicit_knowledge confidence
```
