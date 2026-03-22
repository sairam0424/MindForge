# MindForge v2 — Headless Adapter

## Purpose
Enable MindForge execution in non-interactive environments (CI/CD, GitHub
Actions, remote build servers). The headless adapter handles SIGTERM,
prevents terminal UI rendering, and enforces strict exit codes.

---

## Headless characteristics

### 1. Zero-interaction
All prompts are auto-answered with defaults (or `yes` for security gates
if `TIER_1_AUTO_APPROVE=true`). If a Tier 3 change is detected, it
immediately exits with code 10 (Escalation Required).

### 2. Output redirection
Standard terminal UI (Progress stream) is disabled.
Instead, a structured JSON stream is written to `stdout`.
Informational logs go to `stderr`.

### 3. Graceful termination (SIGTERM/SIGINT) - HARDENED
When running in environments like GitHub Actions, the runner might receive
a SIGTERM (timeout).
**Hardening rule:** On SIGTERM, the engine MUST:
- Finish the current `git commit` if in progress.
- Write the current state to HANDOFF.json.
- Upload current `.planning/` artifacts as a "resume package".
- Prevent the race condition where `SIGTERM` kills the process mid-write.

```javascript
// bin/autonomous/headless.js logic
process.on('SIGTERM', async () => {
  console.error('⚠️ Received SIGTERM. Snapshotting state for resumption...');
  await autoExecutor.pause(); // Flushes all state buffers
  process.exit(0); // Exit 0 to show graceful pause vs failure
});
```

---

## CI Configuration (`.mindforge/ci.yaml`)

Typical GitHub Action setup:

```yaml
steps:
  - uses: actions/checkout@v4
  - name: Run MindForge Auto
    run: npx mindforge auto --phase 3 --headless
    env:
      MINDFORGE_TOKEN: ${{ secrets.MINDFORGE_TOKEN }}
      AUTO_PUSH_ON_WAVE_COMPLETE: true
```

---

## Exit codes

| Code | Meaning |
|------|---------|
| 0    | Success (Phase complete) |
| 1    | General Error (Check logs) |
| 3    | Gate/Compliance Failure |
| 10   | Escalation Required (Human needed) |
| 124  | Timeout (Max duration exceeded) |
