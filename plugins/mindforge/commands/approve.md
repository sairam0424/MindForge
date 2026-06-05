---
description: "Process pending approvals and emergency overrides. Usage:"
---

Process pending approvals and emergency overrides. Usage:
`/mindforge:approve [approval-id] [--approve|--reject] [--reason "..."] [--emergency]`

## Listing approvals
Scan `.planning/approvals/` and show only files with `status: pending` unless
 the user explicitly asks for historical records.

## Standard approval flow
1. Read the approval file
2. Confirm current identity from `git config user.email` or `$USER`
3. Validate approver eligibility from `INTEGRATIONS-CONFIG.md`
4. Record approval or rejection with timestamp and reason

## Emergency overrides
Emergency override requires the `--emergency` flag.
Read `EMERGENCY_APPROVERS` from `INTEGRATIONS-CONFIG.md` and deny the request if
 the current identity is not listed. Document that git-config-based identity is
 a convenience layer, not a high-assurance identity proof.
