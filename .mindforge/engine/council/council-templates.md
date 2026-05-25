# Council Framework — Reusable Templates

## Purpose
Pre-configured council invocations for common decision types. Each template
adjusts the framing and weight of voices for the specific domain.

## Template: Architecture Decision

**Trigger:** New system design, major refactor, technology choice
**Voice weights:** Architect (1.2x), Skeptic (1.0x), Pragmatist (0.9x), Critic (0.9x)

**Framing prompt:**
> We need to decide on [DECISION]. This affects the system's [scalability/maintainability/performance].
> Current constraints: [CONSTRAINTS].
> Options under consideration: [OPTIONS].
> The decision is hard to reverse because: [IRREVERSIBILITY FACTORS].

---

## Template: Breaking Change

**Trigger:** API change, schema migration, dependency upgrade
**Voice weights:** Skeptic (1.3x), Pragmatist (1.1x), Architect (0.8x), Critic (0.8x)

**Framing prompt:**
> We're considering a breaking change: [CHANGE].
> Affected consumers: [WHO].
> Migration path: [HOW].
> Timeline pressure: [WHEN].
> What could go wrong and is it worth the risk?

---

## Template: Security Escalation

**Trigger:** Tier 3 security finding, compliance concern
**Voice weights:** Skeptic (1.4x), Critic (1.2x), Architect (0.8x), Pragmatist (0.6x)

**Framing prompt:**
> Security concern identified: [FINDING].
> Severity: [LEVEL]. Exploitability: [EASE].
> Current mitigation: [IF ANY].
> Options: [FIX OPTIONS WITH EFFORT ESTIMATES].
> User data at risk: [YES/NO + SCOPE].

---

## Template: Ship-or-Wait

**Trigger:** Feature complete but uncertain quality, deadline pressure
**Voice weights:** Pragmatist (1.3x), Critic (1.2x), Skeptic (1.0x), Architect (0.5x)

**Framing prompt:**
> Feature [NAME] is at [COMPLETION%]. Deadline is [DATE].
> Known issues: [ISSUES].
> Test coverage: [COVERAGE%].
> User impact of delay: [IMPACT].
> Should we ship now with known issues, or delay for quality?

---

## Template: Build-vs-Buy

**Trigger:** Evaluating third-party dependencies, SaaS vs self-hosted
**Voice weights:** Pragmatist (1.2x), Architect (1.1x), Skeptic (1.0x), Critic (0.7x)

**Framing prompt:**
> We need [CAPABILITY]. Options:
> Build: [EFFORT ESTIMATE, MAINTENANCE COST]
> Buy: [COST, VENDOR LOCK-IN RISK, FEATURE GAPS]
> Current team capacity: [AVAILABLE BANDWIDTH]
> Strategic importance of owning this: [LOW/MEDIUM/HIGH]

---

## Using Templates

Templates are invoked by the `/mindforge:council` command:
```
/mindforge:council --template architecture "Should we use PostgreSQL or DynamoDB?"
/mindforge:council --template breaking-change "Removing the v1 API"
/mindforge:council --template security "SQL injection in user search"
```

If no template is specified, the command uses the generic protocol from `council-protocol.md`.
