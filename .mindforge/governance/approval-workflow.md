# MindForge Governance — Approval Workflow

## Purpose
Define the human approval process for Tier 2 peer review, Tier 3
 security/compliance review, and emergency override handling.

## Approval sources
Approvals are represented as files in `.planning/approvals/`. Commands must list
 only `status: pending` approval requests by default.

## Identity model
Current approver identity is derived from `git config user.email` or `$USER`.
This is convenient but spoofable. For higher-assurance environments, integrate
 the approval flow with your IdP or SCM identity provider.

## Standard workflow
1. Classifier determines tier
2. Create approval file with reason, scope, diff summary, and expiry time
3. Notify configured approvers
4. Record approval or rejection
5. On rejection, create a fix task that carries the rejection reason forward
6. Re-request approval only after the rejection reason has been addressed

## Expiry and SLA handling
Expiry processing is session-dependent. If no MindForge session is active, an
 expired approval will be detected the next time the approval command runs.

Use config-driven values from `INTEGRATIONS-CONFIG.md`:
- `TIER2_APPROVERS`
- `TIER3_APPROVERS`
- `EMERGENCY_APPROVERS`
- SLA and expiry hour settings

## Emergency override
Emergency approval requires the `--emergency` flag and an approver identity that
 appears in `EMERGENCY_APPROVERS`. Log the approver identity and rationale in
 AUDIT. Emergency override bypass is never implicit.
