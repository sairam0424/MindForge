# MindForge Metrics — Quality Tracker

## Trend windows
- short: last 5 sessions
- medium: last 20 sessions
- long: all sessions

## Key targets
- Verify pass rate > 85% (warning < 75%)
- Task failure rate < 10% (warning > 20%)
- Compactions < 1 per 8 tasks (warning > 2 per session)

## Early warnings
- quality score drop >= 10 points over 3 sessions
- any CRITICAL security finding after clean streak
- compaction overhead > 2/session
- stale skills not triggered in 10 sessions

## Quality metrics -> agent behaviour adjustment
Automatic adjustments at session start:

- If verify pass rate < 75% over last 3 sessions:
  tighten verify-step determinism checks before execution.
- If last-session task failure rate > 20%:
  halve estimated scope and suggest splitting.
- If compaction frequency > 2/session:
  proactively summarize every 4 tasks.
- If security findings trend worsens over 3 phases:
  force-load `security-review` for all tasks in current phase.

Always report adjustment to user:
`Quality signal detected: [signal]. Adjusting behaviour: [adjustment].`
