# MindForge v2 — Knowledge Graph Schema

## Overview

The MindForge knowledge graph is built from five JSONL files — all append-only,
all at `.mindforge/memory/`. Every entry has a consistent base schema plus
type-specific fields.

## Base schema (all entry types)

```json
{
  "id":               "kb-uuid-v4",
  "timestamp":        "ISO-8601",
  "type":             "architectural_decision|code_pattern|bug_pattern|team_preference|domain_knowledge",
  "topic":            "Short title (≤ 80 chars)",
  "content":          "Full knowledge content (no limit)",
  "source":           "Where this was captured: 'Phase 3 retro', 'Debug session 2026-01', 'Manual entry'",
  "project":          "project-name from PROJECT.md",
  "confidence":       0.0,
  "tags":             ["tag1", "tag2"],
  "linked_adrs":      ["ADR-007"],
  "times_referenced": 0,
  "last_referenced":  null,
  "deprecated":       false,
  "deprecated_by":    null
}
```

## Type-specific schemas

### `architectural_decision`

Extended fields:

```json
{
  "decision":     "Use argon2id for password hashing",
  "rationale":    "bcrypt is showing its age; argon2id is the modern standard",
  "alternatives": ["bcrypt", "scrypt", "pbkdf2"],
  "phase_number": 3,
  "adr_reference": "ADR-007"
}
```

Capture trigger: Phase completion (ADR files extracted), `/mindforge:discuss-phase`

### `code_pattern`

Extended fields:

```json
{
  "pattern_type": "good|anti-pattern",
  "language":     "typescript",
  "example_good": "// Code showing the correct pattern",
  "example_bad":  "// Code showing the incorrect pattern (for anti-patterns)",
  "applies_to":   ["auth", "database", "api"]
}
```

Capture trigger: Smart compaction Block D, debug session root cause

### `bug_pattern`

Extended fields:

```json
{
  "bug_category":   "auth|database|api|ui|performance|security",
  "symptom":        "Login works in tests but fails in production with cookie errors",
  "root_cause":     "httpOnly cookies require HTTPS; dev server was HTTP",
  "fix":            "Enable HTTPS in dev or use secure: false in development only",
  "prevention":     "Always configure cookie settings per-environment",
  "severity_when_missed": "HIGH",
  "recurrence_count": 1
}
```

Capture trigger: Debug session completion, security findings, retrospective "what went wrong"

### `team_preference`

Extended fields:

```json
{
  "preference_type": "style|tool|process|convention|architecture",
  "applies_when":    "When implementing auth",
  "preference":      "Always use argon2id, never bcrypt. See ADR-007.",
  "strength":        "strong|moderate|weak",
  "override_allowed": true
}
```

Capture trigger: Retrospective "what should we keep doing", steering instructions,
MINDFORGE.md changes from retrospective

### `domain_knowledge`

Extended fields:

```json
{
  "domain":     "JWT security",
  "tech_stack": ["node.js", "typescript"],
  "knowledge":  "JWT access tokens should be short-lived (15 min). Refresh tokens in httpOnly cookies, not localStorage. Never decode JWT without verifying signature.",
  "source_url": "https://auth0.com/docs/secure/tokens/json-web-tokens",
  "verified_at": "2026-01-15"
}
```

Capture trigger: Research engine output, `/mindforge:remember --add`

## Confidence scoring

Confidence (0.0–1.0) represents how strongly this knowledge should be applied:

| Confidence | Meaning | How set |
| :--- | :--- | :--- |
| 0.9–1.0 | Strong team decision — always apply | Manual entry, strong steering, ADR |
| 0.7–0.9 | Clear pattern — apply unless there's a reason not to | Retrospective, debug session |
| 0.5–0.7 | Observed pattern — consider but verify | Smart compaction Block D |
| 0.3–0.5 | Weak signal — informational only | Single observation |
| < 0.3 | Hypothesis — don't apply proactively | Auto-captured, unverified |

## Confidence reinforcement

Each time an entry is referenced (retrieved and the advice was followed):

```bash
confidence = min(1.0, confidence + 0.05)
times_referenced += 1
```

Each time an entry is contradicted (a different decision was made):

```bash
confidence = max(0.0, confidence - 0.10)
```

## Deprecation

When a knowledge entry becomes outdated (e.g., team switches from argon2id to Passkeys):

```json
{
  "deprecated": true,
  "deprecated_by": "kb-uuid-of-newer-entry",
  "deprecated_reason": "Superseded by WebAuthn/Passkeys approach (ADR-031)"
}
```

Deprecated entries are never deleted — they are excluded from active retrieval
but available for historical queries.
