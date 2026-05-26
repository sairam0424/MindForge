---
name: human-in-the-loop-design
version: 1.0.0
min_mindforge_version: 10.0.4
status: stable
triggers: human in the loop, escalation gate, approval threshold, confidence threshold, explanation quality, trust calibration, user override, hitl pattern, agent handoff, supervision design, human review trigger, autonomous boundary
compose: guardrails-and-safety
---

# Skill — Human-in-the-Loop Design (Escalation & Supervision Architecture)

## When this skill activates
When designing agent autonomy boundaries, building escalation gates, calibrating
confidence thresholds, or implementing approval workflows. Use for any system where
an AI agent must decide between acting autonomously and requesting human guidance.

Core principle: **Maximum VALUE, not maximum autonomy** — the goal is not to minimize
human involvement. The goal is to maximize the value delivered. Sometimes the highest-value
action is asking the human. The art is knowing WHEN.

## Mandatory actions when this skill is active

### Action Classification (Reversibility x Impact Matrix)

1. **Classify every agent action:**
   ```
   | Impact \ Reversibility | Easily Reversible      | Hard to Reverse        | Irreversible           |
   |------------------------|------------------------|------------------------|------------------------|
   | Low Impact             | AUTONOMOUS             | AUTONOMOUS             | CONFIRM                |
   | Medium Impact          | AUTONOMOUS             | CONFIRM                | APPROVE                |
   | High Impact            | CONFIRM                | APPROVE                | APPROVE + WAIT         |

   Levels:
   - AUTONOMOUS: Agent acts without asking (log for audit)
   - CONFIRM: Agent acts but shows what it did (user can undo)
   - APPROVE: Agent proposes, human approves before execution
   - APPROVE + WAIT: Agent proposes, human approves, agent waits for explicit "go"
   ```

2. **Per-action classification examples:**
   ```
   AUTONOMOUS (act freely):
   - Reading files
   - Running read-only queries
   - Searching codebases
   - Generating suggestions (not applying them)

   CONFIRM (act, show, allow undo):
   - Editing existing files
   - Creating new files in expected locations
   - Running tests
   - Installing dev dependencies

   APPROVE (propose, wait for yes):
   - Deleting files
   - Modifying configuration
   - Running destructive commands
   - Changing auth/security code
   - Making API calls with side effects

   APPROVE + WAIT (high ceremony):
   - Deploying to production
   - Modifying database schema
   - Changing payment logic
   - Force-pushing to shared branches
   - Deleting user data
   ```

### Escalation Triggers

3. **When to escalate (confidence-based):**
   ```
   Always escalate when:
   - Confidence < 0.7 on the correct approach
   - Action is irreversible AND high-impact
   - Multiple valid approaches exist with no clear winner
   - Task contradicts prior user guidance
   - Security-sensitive code is being modified
   - User's intent is ambiguous

   Escalation format:
   "I need your input on [X].
    Context: [what I understand about the situation]
    Options: [A, B, C with tradeoffs]
    My recommendation: [preferred option + why]
    What I'm uncertain about: [specific uncertainty]"
   ```

   Rules:
   - ALWAYS explain WHY you're escalating (don't just say "I'm not sure")
   - ALWAYS provide a recommendation (even when uncertain)
   - ALWAYS state what additional context would resolve the uncertainty
   - Never escalate without having done research first (don't be lazy)

### Approval Gate Design

4. **Designing low-friction approval UX:**
   ```
   Principles:
   - Fast: approval should take <5 seconds for clear cases
   - Informative: show WHAT will happen, not just ask "ok?"
   - Defaulted: suggest the likely answer (approve/reject)
   - Skippable: allow bulk-approve for repetitive low-risk items
   - Auditable: log every approval decision with timestamp and rationale

   Good approval request:
   "I'd like to add an index on users.email (migration file ready).
    This will lock the table for ~2 seconds during deploy.
    [Approve] [Reject] [Show migration SQL first]"

   Bad approval request:
   "Can I make a database change?"
   ```

   Rules:
   - Show the EFFECT of the action, not just the action itself
   - Provide enough context to decide without further research
   - Offer a way to see more detail (for cautious reviewers)
   - Default to the safe option (reject) for high-impact actions
   - Time-box approvals: if no response in X hours, remind or escalate

### Confidence Calibration

5. **Ensuring confidence scores are meaningful:**
   ```
   Calibration goal:
   When the agent says "I'm 90% confident" → it should be correct 90% of the time
   When the agent says "I'm 50% confident" → it should be correct 50% of the time

   Measuring calibration:
   - Collect (confidence, actual_outcome) pairs from eval runs
   - Plot calibration curve (expected accuracy vs actual accuracy)
   - Perfect calibration = diagonal line
   - Overconfident = curve below diagonal (says 90%, is right 70%)
   - Underconfident = curve above diagonal (says 50%, is right 80%)

   Fixing miscalibration:
   - Overconfident: lower confidence thresholds (escalate more)
   - Underconfident: raise thresholds (escalate less, trust yourself)
   - Recalibrate after major model/prompt changes
   ```

   Rules:
   - Calibrate quarterly (or after any major agent change)
   - If overconfident: the agent is making unescalated mistakes → tighten boundaries
   - If underconfident: the agent is annoying users with unnecessary escalations → loosen
   - Track calibration as a first-class metric (alongside accuracy)

### Explanation Quality

6. **How to explain escalations effectively:**
   ```
   Explanation structure:
   1. WHAT: what you're asking about (specific, concrete)
   2. WHY: why you can't decide autonomously (the uncertainty)
   3. OPTIONS: what the choices are (with tradeoffs)
   4. RECOMMENDATION: what you'd do if forced to decide
   5. CONTEXT_GAP: what information would let you decide next time

   Good explanation:
   "I found two approaches to implement caching (Redis vs in-memory).
    Redis is more robust but adds infrastructure cost.
    In-memory is simpler but won't survive restarts.
    I'd lean toward Redis for production, but I don't know your infra budget.
    If you tell me the acceptable monthly cost, I can decide this autonomously next time."

   Bad explanation:
   "Should I use Redis or in-memory caching?"
   ```

### Trust Building (Progressive Autonomy)

7. **Earning autonomy over time:**
   ```
   Trust levels:
   Level 1 — New agent (restrictive):
   - APPROVE for any write operation
   - CONFIRM for most read operations
   - Escalation rate: high (~30% of actions)

   Level 2 — Established (standard):
   - AUTONOMOUS for reads and standard writes
   - CONFIRM for destructive operations
   - APPROVE for irreversible high-impact actions
   - Escalation rate: moderate (~10%)

   Level 3 — Trusted (permissive):
   - AUTONOMOUS for most operations
   - CONFIRM for irreversible actions
   - APPROVE only for production deploys and security changes
   - Escalation rate: low (~3%)

   Level transitions:
   - Promote: 20 consecutive successful autonomous actions without user correction
   - Demote: 1 autonomous action that user explicitly reverses or flags as wrong
   - Demotion is faster than promotion (trust is earned slowly, lost quickly)
   ```

### Monitoring Escalation Health

8. **Tracking escalation quality:**
   ```
   Metrics to monitor:
   - Escalation rate: % of actions that require human input
   - False escalation rate: % of escalations where human says "just do it"
   - Missed escalation rate: % of autonomous actions that were wrong
   - Approval latency: time between escalation and human response
   - Rubber-stamp rate: % of approvals decided in <2 seconds (too fast = not reading)

   Healthy ranges:
   - Escalation rate: 5-15% (too low = risky, too high = annoying)
   - False escalation rate: <20% (too high = boundaries too tight)
   - Missed escalation rate: <2% (too high = boundaries too loose)
   - Rubber-stamp rate: <30% (too high = approval fatigue, redesign needed)
   ```

   Rules:
   - If rubber-stamp rate is high: reduce approval friction or widen autonomy
   - If missed escalation rate is high: tighten boundaries immediately
   - Review escalation metrics weekly (don't let them drift)
   - Treat high rubber-stamp rate as a UX bug (users are being annoyed, not helped)

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Are actions classified by reversibility x impact (autonomous/confirm/approve)?
- [ ] Do escalation triggers include: low confidence, irreversible actions, ambiguity?
- [ ] Is the approval UX low-friction (fast, informative, defaulted)?
- [ ] Are explanations structured (what, why, options, recommendation, context gap)?
- [ ] Is progressive autonomy designed (trust levels with promotion/demotion)?
- [ ] Are escalation health metrics defined (false escalation rate, rubber-stamp rate)?
- [ ] Is confidence calibration measured (says 90% → right 90%)?
- [ ] Does the guardrails-and-safety skill co-activate for safety-critical boundaries?
