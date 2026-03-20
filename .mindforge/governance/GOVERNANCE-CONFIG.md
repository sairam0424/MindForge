# MindForge Governance Configuration

## Tier policy
- Tier 1: low-risk documentation or isolated code cleanup
- Tier 2: broader product or operational changes
- Tier 3: security, privacy, auth, secrets, payments, compliance, or emergency

## Enforcement rules
- Tier 3 signals have higher priority than file-count heuristics
- Compliance gates are blocking
- Integration failures are non-fatal unless they prevent a required approval or
  compliance decision from being observed

## Record locations
- Approval files: `.planning/approvals/`
- Audit archive: `.planning/audit-archive/`
- Milestones: `.planning/milestones/`
