# MindForge v2 — Progress Reporter

## Purpose
Provide real-time visibility into autonomous execution. The reporter
translates the raw AUDIT.jsonl stream into a user-friendly terminal UI
and a persistent `AUTONOMOUS-REPORT.md` file.

---

## Terminal UI (Progress stream)

The progress stream uses standard TTY escape codes (via `ora` or similar)
to show current status without flooding the terminal.

```
MindForge v2 [PHASE 3: API Hardening]
──────────────────────────────────────────────────────────────────
[WAVE 2/3] [TASK 5/8]
[██████████████░░░░░░] 75% Complete

Current:  Plan 3-05 — Implement JWT Refresh Logic
Status:   Running (attempt 1) [elapsed: 1:42]
Token Est: 18,400

Latest:
✅ Plan 3-04 complete (abc1234)
✅ Gate 1-2 Passed
⚠️  Steering applied: "Use jsonwebtoken lib"
──────────────────────────────────────────────────────────────────
Use /mindforge:steer "..." to guide the agent mid-flight.
```

---

## Autonomous report generation

At the end of an auto-mode session (Success or Escalation), a markdown
report is generated in `.planning/phases/[N]/AUTONOMOUS-REPORT-[timestamp].md`.

### Content requirements:
1. **Summary**: Overall status, start/end time, total duration.
2. **Stats**: Tasks completed, tokens consumed (estimate), commits made.
3. **Audit log**: Filtered list of major events (starts, completions, repairs, gates).
4. **Repairs**: Detailed breakdown of any RETRY or DECOMPOSE actions.
5. **Steering**: List of applied steering instructions and their outcomes.
6. **Escalation**: If failed, clear instructions on why and how to resume.

---

## JSON Output (Stream)

For integration with other tools or web UIs, the progress reporter
can output line-delimited JSON messages to a separate file or pipe.

```json
{"type":"progress","phase":3,"wave":2,"task":5,"status":"running","ts":"ISO-8601"}
{"type":"event","id":"abc-123","event":"gate_passed","gate":2}
```
