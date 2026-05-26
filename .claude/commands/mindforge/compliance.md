---
description: Generate compliance-as-code policies with automated evidence. Usage - /mindforge:compliance [--framework soc2|hipaa|pci] [--engine opa|sentinel]
---

<objective>
Implement compliance-as-code by translating regulatory framework controls into
automated policy rules, continuous evidence collection, and audit-ready
reporting. Replaces manual compliance checklists with enforceable, versioned
policy gates.
</objective>

<execution_context>
@.mindforge/skills/compliance-as-code/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Map framework controls to technical requirements based on --framework flag. SOC2: CC6.1-CC9.9 (access control, change management, availability). HIPAA: 164.312 (access, audit, integrity, transmission). PCI: Requirements 1-12 (network, encryption, access, monitoring).
2. Write policy rules using the --engine flag: Rego (OPA) for infrastructure and API policies, Sentinel (HashiCorp) for Terraform plans, or both. Each rule maps to a specific control ID with rationale comments.
3. Integrate policies into CI pipeline: OPA/Conftest for Kubernetes manifests, Sentinel for Terraform plan checks, custom rules for application code (secrets detection, encryption verification, access control patterns).
4. Configure evidence collection: automated screenshots of control dashboards, git commit logs for change management, access review exports, vulnerability scan results, and uptime reports. Store evidence in tamper-evident format.
5. Set up compliance dashboard showing: controls total vs passing vs failing, evidence freshness (last collection timestamp), upcoming audit dates, and control owner assignments.
6. Define violation SLAs by severity: Critical (fix within 24h, blocks deploy), High (fix within 7 days), Medium (fix within 30 days), Low (fix within 90 days). Configure escalation paths for each severity.
7. Generate audit report in framework-specific format: control ID, description, implementation evidence, test results, and remediation status. Export as PDF for auditor handoff.
8. Schedule periodic reviews: quarterly access reviews (who has access to what), annual penetration testing, monthly vulnerability scans, and continuous configuration drift detection.
9. Implement exception/waiver process: document risk acceptance for controls that cannot be fully automated, require approval from security lead, set expiration date on all exceptions (max 90 days).
10. Log compliance invocation in AUDIT with: framework, engine, controls mapped, passing percentage, evidence freshness, next audit date.
</process>
