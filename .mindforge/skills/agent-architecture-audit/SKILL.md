---
name: agent-architecture-audit
version: 1.0.0
min_mindforge_version: 11.4.0
status: stable
triggers: agent audit, wrapper regression, memory contamination, tool discipline, hidden repair loop, 12-layer stack, multi-layer self-audit, agent architecture, harness diagnostic, layer-by-layer review, NexusTracer audit, soul-engine audit, swarm wave audit
compose: agent-introspection-debugging
---

# Skill — Agent Architecture Audit

A full-stack diagnostic for MindForge's own multi-layer agent stack. Audits the
12-layer stack for wrapper regression, memory contamination, tool-discipline
failures, hidden repair loops, and rendering/transport corruption. Produces
severity-ranked findings with code-first fixes — for agent systems that hide
failures behind wrapper layers, stale memory, retry loops, or transport
mutations.

This skill **composes with `agent-introspection-debugging`** (already in
`.mindforge/skills/`): introspection debugs a single runtime failure (loop,
timeout, hallucination); this skill audits the whole stack for the systemic
wrapper-layer causes behind those failures. Invoke via `/mindforge:introspect`
when a single-failure debug keeps recurring or points at a structural cause.

## When this skill activates

**MANDATORY for:**
- Releasing any MindForge-driven agent or LLM-powered behavior to production
- Shipping features touching tool calling, the Sharded Memory Loop, or
  multi-step swarm workflows
- Agent behavior degrades after adding a wrapper layer (new PersonaFactory
  patch, new prompt-assembly stage, new WaveExecutor step)
- User reports "the agent is getting worse" or "tools are flaky"
- Same model works in playground but breaks inside the MindForge wrapper stack
- Debugging agent behavior for more than 15 minutes without finding root cause

**Especially critical when:**
- New prompt layers, tool definitions, or memory systems have been added
- Different swarm specialists behave inconsistently on the same input
- The model was fine yesterday but is hallucinating today
- You suspect a hidden repair/retry loop is silently mutating responses

**Do not use for:**
- Single-failure runtime debugging — use `agent-introspection-debugging`
- Code review — use language-specific reviewer agents
- Security scanning — use `/mindforge:security-scan` / `security-reviewer`
- Agent performance benchmarking — use `/mindforge:agent-eval`
- Writing new features — use the appropriate workflow skill

## Mandatory actions when this skill is active

### The MindForge 12-Layer Stack

Every MindForge agent run passes through these layers. Any one can corrupt the
answer. The concrete MindForge component owning each layer is named so the
audit has a real target, not an abstraction.

| # | Layer | MindForge Component | What Goes Wrong |
|---|-------|---------------------|-----------------|
| 1 | System prompt | SOUL.md + MINDFORGE.md + `.agent/CLAUDE.md` assembly | Conflicting directives, instruction bloat across the source-of-truth hierarchy |
| 2 | Session history | NexusTracer turn log | Stale context injected from previous turns |
| 3 | Long-term memory | shard-controller (Cold tier) | Pollution across sessions, old topics in new conversations |
| 4 | Distillation | shard-controller compaction (Hot/Warm rotation) | Compressed shards re-entering as pseudo-facts |
| 5 | Active recall | continuous-learning instinct recall | Redundant re-summary / instinct replay wasting context |
| 6 | Tool selection | PersonaFactory + hooks_route routing | Wrong tool routing, model skips a required tool |
| 7 | Tool execution | swarm WaveExecutor dispatch | Hallucinated execution — claims to call but doesn't |
| 8 | Tool interpretation | WaveExecutor result consolidation | Misread or ignored tool output |
| 9 | Answer shaping | SWARM-SUMMARY consolidation | Format corruption in the final response |
| 10 | Platform rendering | Dashboard (localhost:7339) / CLI / API transport | Transport-layer mutation of a valid answer |
| 11 | Hidden repair loops | soul-engine ADS rewrite + Temporal hindsight regeneration | Silent fallback/retry running a second LLM pass |
| 12 | Persistence | auto-state.json + Merkle audit log | Expired state or cached artifacts reused as live evidence |

### Common Failure Patterns

#### 1. Wrapper Regression
The base model produces correct answers, but MindForge's wrapper layers make it
worse.

**Symptoms:**
- Model works fine in playground or direct API call, breaks in the swarm
- Added a new PersonaFactory patch or prompt stage, existing behavior degraded
- Agent sounds confident but is confidently wrong
- "It was working before the last update"

#### 2. Memory Contamination
Old topics leak into new conversations through NexusTracer history, shard
recall, or distillation.

**Symptoms:**
- Agent brings up unrelated past topics
- User corrections don't stick (old shard/instinct overwrites new)
- Same-session artifacts re-enter as pseudo-facts
- Cold-tier memory grows without bound, degrading response quality over time

#### 3. Tool Discipline Failure
Tools are declared in the prompt but not enforced in code. The model skips them
or hallucinates execution.

**Symptoms:**
- "Must use tool X" in the prompt, but model answers without calling it
- Tool results look correct but were never actually executed by WaveExecutor
- Different swarm specialists fight over the same responsibility
- Model uses a tool when it shouldn't, or skips it when it must

#### 4. Rendering/Transport Corruption
The agent's internal answer is correct, but the platform layer mutates it during
delivery.

**Symptoms:**
- NexusTracer logs show the correct answer, user sees broken output
- Markdown rendering, JSON parsing, or streaming fragments corrupt valid output
- A hidden fallback quietly replaces the answer before delivery
- Output differs between the CLI and the dashboard

#### 5. Hidden Agent Layers
Silent repair, retry, summarization, or recall layers run without explicit
contracts.

**Symptoms:**
- Output changes between internal generation and user delivery
- soul-engine ADS "auto-fix" runs a second LLM pass the user doesn't know about
- Multiple swarm layers modify the same output without coordination
- Answers get "smoothed" or "corrected" by invisible layers

### Audit Workflow

#### Phase 1: Scope
Define what you're auditing:
- **Target system** — which MindForge agent / swarm / command?
- **Entrypoints** — how do users interact (CLI command, dashboard, hook)?
- **Model stack** — which LLM(s) and providers?
- **Symptoms** — what does the user report?
- **Time window** — when did it start?
- **Layers to audit** — which of the 12 layers apply?

#### Phase 2: Evidence Collection
Gather evidence from the codebase:
- **Source code** — swarm loop, hooks_route tool router, shard admission, prompt
  assembly across the source-of-truth hierarchy
- **Logs** — NexusTracer session traces, Merkle-linked AUDIT entries, tool-call
  records
- **Config** — MINDFORGE.md parameters, tool schemas, PersonaFactory patches,
  provider settings
- **Memory files** — instinct store, shard archives, `auto-state.json`

Use `rg` to search for anti-patterns:

```bash
# Tool requirements expressed only in prompt text (not code)
rg "must.*tool|required.*call" --type md

# Tool execution without validation
rg "tool_call|toolCall|tool_use"

# Hidden LLM calls outside the main swarm loop
rg "completion|chat\.create|messages\.create|llm\.invoke"

# Shard/instinct admission without user-correction priority
rg "memory.*admit|shard.*admit|instinct.*capture|persist.*memory"

# Fallback / repair loops that run additional LLM calls (soul-engine, hindsight)
rg "fallback|retry.*llm|repair.*prompt|re-?prompt|soul-engine|regenerat"

# Silent output mutation
rg "mutate|rewrite.*response|transform.*output|shap"
```

#### Phase 3: Failure Mapping
For each finding, document:
- **Symptom** — what the user sees
- **Mechanism** — how the wrapper causes it
- **Source layer** — which of the 12 layers (and which MindForge component)
- **Root cause** — the deepest cause
- **Evidence** — file:line or NexusTracer/AUDIT row reference
- **Confidence** — 0.0 to 1.0

#### Phase 4: Fix Strategy
Default fix order (code-first, not prompt-first):
1. **Code-gate tool requirements** — enforce in WaveExecutor, not prompt text
2. **Remove or narrow hidden repair layers** — make soul-engine / hindsight
   regeneration explicit with contracts
3. **Reduce context duplication** — same info through prompt + NexusTracer
   history + shard memory + distillation
4. **Tighten memory admission** — user corrections > agent assertions (shard +
   instinct admission)
5. **Tighten distillation triggers** — don't compact shards that shouldn't be
   compacted
6. **Reduce rendering mutation** — dashboard/CLI pass-through, don't transform
7. **Convert to typed JSON envelopes** — structured internal flow (SWARM-SUMMARY
   as schema), not freeform prose

### Severity Model

| Level | Meaning | Action |
|-------|---------|--------|
| `critical` | Agent can confidently produce wrong operational behavior | Fix before next release |
| `high` | Agent frequently degrades correctness or stability | Fix this sprint |
| `medium` | Correctness usually survives but output is fragile or wasteful | Plan for next cycle |
| `low` | Mostly cosmetic or maintainability issues | Backlog |

### Output Format
Present findings to the user in this order:
1. **Severity-ranked findings** (most critical first)
2. **Architecture diagnosis** (which layer / component corrupted what, and why)
3. **Ordered fix plan** (code-first, not prompt-first)

Do not lead with compliments or summaries. If the system is broken, say so
directly.

### Quick Diagnostic Questions
When auditing a MindForge agent system, answer these:

| # | Question | If Yes → |
|---|----------|----------|
| 1 | Can the model skip a required tool and still answer? | Tool not code-gated in WaveExecutor |
| 2 | Does old conversation content appear in new turns? | Memory contamination (NexusTracer/shard) |
| 3 | Is the same info in system prompt AND shard memory AND history? | Context duplication |
| 4 | Does soul-engine or hindsight run a second LLM pass before delivery? | Hidden repair loop |
| 5 | Does output differ between internal generation and user delivery? | Rendering corruption (dashboard/CLI) |
| 6 | Are "must use tool X" rules only in prompt text? | Tool discipline failure |
| 7 | Can the agent's own monologue become a persistent instinct/shard? | Memory poisoning |

### Anti-Patterns to Avoid
- Avoid blaming the model before falsifying wrapper-layer regressions.
- Avoid blaming memory without showing the contamination path (which shard /
  instinct / NexusTracer turn).
- Do not let a clean current `auto-state.json` erase a dirty historical incident.
- Do not treat markdown prose as a trustworthy internal protocol.
- Do not accept "must use tool" in prompt text when WaveExecutor never enforces it.
- Keep findings direct, evidence-backed, and severity-ranked.

### Report Schema
Audits MUST produce a structured report following this shape:

```json
{
  "schema_version": "mindforge.agent-architecture-audit.report.v1",
  "executive_verdict": {
    "overall_health": "high_risk",
    "primary_failure_mode": "string",
    "most_urgent_fix": "string"
  },
  "scope": {
    "target_name": "string",
    "model_stack": ["string"],
    "layers_to_audit": ["string"]
  },
  "findings": [
    {
      "severity": "critical|high|medium|low",
      "title": "string",
      "mechanism": "string",
      "source_layer": "string",
      "root_cause": "string",
      "evidence_refs": ["file:line"],
      "confidence": 0.0,
      "recommended_fix": "string"
    }
  ],
  "ordered_fix_plan": [
    { "order": 1, "goal": "string", "why_now": "string", "expected_effect": "string" }
  ]
}
```

## Self-check before task completion
- [ ] Did I scope the audit to a concrete MindForge target, entrypoint, and model stack?
- [ ] Did I map each finding to one of the 12 layers AND its MindForge component (NexusTracer, soul-engine, shard-controller, PersonaFactory, WaveExecutor, etc.)?
- [ ] Did I check all five failure patterns (wrapper regression, memory contamination, tool discipline, rendering/transport corruption, hidden repair loops)?
- [ ] Is every finding evidence-backed with a file:line or NexusTracer/AUDIT reference and a confidence score?
- [ ] Did I emit the `mindforge.agent-architecture-audit.report.v1` JSON report (severity-ranked findings + ordered, code-first fix plan)?
- [ ] Did I hand off to `agent-introspection-debugging` for any single runtime failure that still needs contained recovery?
