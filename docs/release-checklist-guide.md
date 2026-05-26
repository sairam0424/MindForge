# MindForge Release Checklist Guide (v1.0.0)

This guide explains how to complete the production readiness checklist
in `.mindforge/production/production-checklist.md` and log results in
`.planning/RELEASE-CHECKLIST.md`.

## How to use
1. Open `.mindforge/production/production-checklist.md`
2. For each item, run the **Verification step** exactly
3. Record results in `.planning/RELEASE-CHECKLIST.md`

## What “✅ verified” means
An item is only ✅ when:
- The verification step was executed
- The result was successful
- The verifier and date were recorded

## Recommended order
1. **Section A** — Installation & upgrade (local + global)
2. **Section B** — Command coverage
3. **Section C** — Governance gates
4. **Section D** — Documentation
5. **Section E** — Test coverage
6. **Section F** — Release artifacts

## Example entry
```
| A03 | ✅ | dev@example.com | 2026-03-22 | Local install verified |
```

## Common pitfalls
- Marking ✅ without running the command
- Skipping CI checks (E09/F03) before tagging
- Forgetting to update SDK version to match root

## Final release gate
Do not tag or publish until **all 55 items** are ✅.
