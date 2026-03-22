# MindForge v2 — Stuck Detection Engine

## Purpose
Identify iterative loops where the agent is making no progress but still
consuming tokens. This engine monitors the AUDIT.jsonl stream and triggers
ESCALATE when specific failure patterns (S01-S05) are detected.

---

## Stuck patterns (Signatures)

### S01 — The Lint Loop (The "Infinite Fixer")
**Signature:** Multi-replace calls on the same file 3+ times with identical
or near-identical (Levenshtein distance < 10) `Instruction` and `TargetContent`.
**Verdict:** Agent is stuck in a "fix lint -> new lint -> fix lint" cycle
without resolving the underlying pattern.
**Action:** ESCALATE. "Stuck in lint loop on [file]."

### S02 — The Command Loop (The "Dead Command")
**Signature:** `run_command` called with identical `CommandLine` 3+ times
within 5 minutes, where each command returns status `done` but with
non-zero exit code or "command not found" stderr.
**Verdict:** Agent expects a command to exist and is retrying it blindly.
**Action:** ESCALATE. "Stuck retrying missing or failing command: [command]."

### S03 — The Dependency Loop (The "Circular Wait")
**Signature:** Two plans (A and B) both mark the other as a dependency in
the PLAN-N-MM.md files, causing the wave engine to never start either.
**Verdict:** Broken wave DAG.
**Action:** ESCALATE. "Circular dependency detected between [A] and [B]."

### S04 — The Verification Loop (The "Proofless Progress")
**Signature:** Path: EXECUTE → VERIFY (fails) → EXECUTE → VERIFY (fails)
where the `ReplacementContent` in EXECUTE is identical to the previous attempt.
**Verdict:** Agent is trying the same fix multiple times expecting a different result.
**Action:** RETRY (once with forced error injection) → DECOMPOSE.
If decomposition also fails this loop signature: ESCALATE.

### S05 — The Multi-Agent Collision
**Signature:** Two subagents in the same wave attempting to `multi_replace`
the same file simultaneously (Gate 1 violation detected multiple times).
**Verdict:** Wave planning is too aggressive or files are poorly isolated.
**Action:** RE-PLAN current wave. Move one of the colliding plans to the next wave.

---

## Stuck detection logic (Monitor)

The stuck monitor runs as a sidecar process in `/mindforge:auto`.
It reads `.planning/AUDIT.jsonl` in real time.

```javascript
// bin/autonomous/stuck-monitor.js logic
const fs = require('fs');

function monitorAuditStream(auditPath) {
  let lastPos = 0;
  setInterval(() => {
    const stats = fs.statSync(auditPath);
    if (stats.size > lastPos) {
      const newLines = readLines(auditPath, lastPos, stats.size);
      newLines.forEach(line => {
        const event = JSON.parse(line);
        checkS01(event);
        checkS02(event);
        checkS04(event);
      });
      lastPos = stats.size;
    }
  }, 5000); // Check every 5 seconds
}
```

---

## Recovery protocols

When a pattern is matched:

1. **Stop the subagent** immediately if still running.
2. **Identify the pattern** in the progress stream.
3. **Execute recovery** based on pattern type:
   - S01/S02/S03: ESCALATE (requires human to fix command/context).
   - S04: Invoke NODE_REPAIR with `DECOMPOSE` mandatory.
   - S05: Invoke AUTO_PLAN --adjust-waves to resolve parallelism issues.
4. **Write to AUDIT**:
   ```json
   { "event": "stuck_pattern_detected", "pattern": "S01", "file": "src/api.js" }
   ```
