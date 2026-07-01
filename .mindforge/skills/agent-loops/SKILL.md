---
name: agent-loops
version: 1.0.0
min_mindforge_version: 10.0.3
status: stable
triggers: loop, circuit breaker, retry, fallback, agent loop, agent loop orchestration, self-repair, recovery, sequential execution, iteration, backoff, provider fallback
---

# Skill — Agent Loops

## When this skill activates
Any task involving repeated automated execution, retry logic, autonomous pipelines,
or self-repairing agent workflows. Also activates when implementing circuit breakers
or provider-aware fallback chains.

## Mandatory actions when this skill is active

### Before implementation
1. Define the loop's **termination condition** explicitly. No infinite loops without escape.
2. Set a **maximum iteration count** (default: 10 for code changes, 50 for data processing).
3. Identify the **checkpoint mechanism** — how will state be preserved between iterations?

### Loop Patterns

**Sequential Pipeline:**
```
Task 1 -> Task 2 -> Task 3 -> ... -> Complete
```
- Each task must succeed before the next starts
- On failure: log, checkpoint state, halt with context for resumption
- Use when: tasks have strict ordering dependencies

**Circuit Breaker Pattern:**
```
Attempt -> Success? -> Continue
            | No
         Failure count++
            |
         Count >= threshold?
            | Yes
         OPEN circuit -> wait -> half-open -> retry once
```
- Threshold: 3 consecutive failures opens the circuit
- Backoff: exponential (1s, 2s, 4s, 8s, max 60s)
- Half-open: after backoff, allow ONE request through
- If half-open succeeds: close circuit, resume normal operation
- If half-open fails: re-open circuit, double backoff

**Provider-Aware Fallback Chain:**
```
Primary Model -> Timeout/Error? -> Fallback Model -> Timeout/Error? -> Degrade gracefully
```
- Always try primary model first (respects cost-aware-routing tier)
- On timeout (>30s) or error: switch to fallback
- Fallback models: same tier or one tier down
- Log every fallback with reason in AUDIT
- Never silently degrade — always inform user of fallback

**Self-Repair Loop:**
```
Execute -> Verify -> Pass? -> Done
                    | No
                 Diagnose -> Fix -> Re-verify (max 3 attempts)
```
- After 3 failed self-repair attempts: STOP and escalate to user
- Each repair attempt must be DIFFERENT from the previous
- Log each diagnosis and attempted fix

### During implementation
- Every loop MUST have: max iterations, checkpoint logic, escalation path
- Never catch-and-swallow errors in loop bodies — always log with context
- Track iteration count in AUDIT entries
- Use SHARED_TASK_NOTES.md for cross-iteration context (see cross-iteration-bridge.md)

### After implementation
- Verify the loop terminates under all test conditions
- Verify the circuit breaker opens and closes correctly
- Confirm escalation path works (simulate max-retries-exceeded)

## Self-check before task completion
- [ ] Did I define explicit termination conditions for every loop?
- [ ] Did I set maximum iteration limits (no unbounded loops)?
- [ ] Did I implement checkpoint/state persistence between iterations?
- [ ] Did I verify the escalation path works when max retries are exceeded?
