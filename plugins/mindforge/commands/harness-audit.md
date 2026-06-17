---
description: "Run the deterministic harness-audit scorecard (0-10 per category) over the MindForge tree, with an optional LLM soft-signal layer."
---

# MindForge — Harness Audit Command
# Usage: /mindforge:harness-audit [scope] [--format text|json]
# Scopes: repo (default) | hooks | skills | commands | agents | security

Two-layer harness health check. The DETERMINISTIC layer is `bin/harness-audit.js`
(explicit file/config checks, reproducible, CI-gateable). The optional LLM layer
adds soft signals the deterministic checks cannot see (quality, drift, coherence).

## Step 1 — Run the deterministic scorecard

```bash
node bin/harness-audit.js              # text scorecard, repo scope
node bin/harness-audit.js --format json # machine-readable (for CI / dashboards)
node bin/harness-audit.js --scope security
```

The JSON contract is stable: `overall_score`, `max_score`, `categories`,
`applicable_categories`, `rubric_version`, `checks[]`, `top_actions[]`. Categories:
Tool Coverage, Context Efficiency, Quality Gates, Memory & Learning, Eval Coverage,
Security Guardrails, Cost Efficiency, Governance & Identity.

## Step 2 — (Optional) LLM soft-signal layer

For each category scoring below 10/10, inspect the failing checks in `top_actions`
and assess severity in context. The deterministic layer says *what* is missing; the
LLM layer judges *whether it matters here* and proposes the highest-leverage fix.

## Step 3 — Report + AUDIT entry

Summarize the scorecard, then write a Merkle-linked AUDIT.jsonl entry:

```json
{
  "event": "harness_audit_completed",
  "scope": "repo",
  "overall_score": 0,
  "max_score": 0,
  "rubric_version": "2026-06-10",
  "failing_categories": [],
  "top_actions": []
}
```

## Relationship to /mindforge:health

`/mindforge:health` calls this command as its deterministic layer. A regression
(e.g. the `permissions.deny` baseline removed, the Gemini settings mirror desynced,
the threat-model doc deleted) drops the Security Guardrails score and surfaces in
`top_actions` — making harness drift visible and CI-blockable.

## Related: cross-harness compliance

`npm run harness:compliance` (`bin/installer/harness-adapter-compliance.js --check`)
validates the per-harness support matrix and gates documentation drift — distinct
from this scorecard, which audits the repo's own harness health.
