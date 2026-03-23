---
name: mindforge:approve
description: Process pending approvals and emergency overrides
argument-hint: [approval-id] [--approve|--reject] [--reason "..."] [--emergency]
allowed-tools:
  - list_dir
  - view_file
  - write_to_file
---

<objective>
Manage the governance layer by reviewing and confirming high-tier architectural or security changes, ensuring all sensitive operations have explicit human authorization.
</objective>

<execution_context>
.claude/commands/mindforge/approve.md
</execution_context>

<context>
Storage: .planning/approvals/
Governance Config: INTEGRATIONS-CONFIG.md
</context>

<process>
1. **List**: Scan for pending approval requests and present them to the user.
2. **Identity Verification**: Confirm the user's identity via git config or environment.
3. **Audit Eligibility**: Verify the user has sufficient permissions for the requested tier.
4. **Record Verdict**: Update the approval file with status, timestamp, and the provided reason.
5. **Emergency Override**: If `--emergency` is used, bypass standard checks if the identity matches the pre-defined emergency approver list.
</process>
