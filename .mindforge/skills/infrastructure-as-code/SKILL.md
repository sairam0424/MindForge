---
name: infrastructure-as-code
version: 1.0.0
min_mindforge_version: 10.0.7
status: stable
triggers: infrastructure as code, terraform pattern, pulumi pattern, state management iac, module design iac, drift detection, plan apply workflow, remote backend, workspace isolation, iac best practice, declarative infrastructure, resource provisioning pattern
---

# Infrastructure as Code

## When this skill activates

This skill activates when the user is designing, implementing, or troubleshooting
infrastructure-as-code patterns. This includes Terraform/OpenTofu module design,
Pulumi program structure, state management strategy, drift detection workflows,
plan/apply pipelines, workspace isolation for multi-environment deployments, and
general IaC best practices for declarative infrastructure provisioning.

## Mandatory actions

### Before

1. Identify the IaC tool in use (Terraform, OpenTofu, Pulumi, CloudFormation, Bicep).
2. Determine the target cloud provider(s) and existing state backend configuration.
3. Assess current module structure and versioning strategy.
4. Check for existing CI/CD pipeline integration (plan on PR, apply on merge).
5. Identify secrets management approach (Vault, SOPS, AWS Secrets Manager).

### During

**Declarative over Imperative:**
- Always prefer declarative resource definitions over procedural scripts.
- Express desired end-state; let the provider handle ordering and dependencies.
- Use `depends_on` only when implicit dependency detection fails.

**State Management:**
- Remote backends are mandatory for team environments (S3+DynamoDB locking, Terraform Cloud, GCS+locking).
- Never commit `.tfstate` files to version control.
- Enable state encryption at rest.
- Use state locking to prevent concurrent modifications.
- Implement state backup/versioning via backend configuration.

**Module Design:**
- Single responsibility: one module = one logical resource group.
- Version all modules with semantic versioning (pin in consumers).
- Define clear input/output contracts via `variables.tf` and `outputs.tf`.
- Use composition (modules calling modules) over monolithic configurations.
- Document module interfaces with descriptions on every variable and output.

**Plan/Apply Workflow:**
- ALWAYS run `plan` first and review the diff before applying.
- Automate plan output on pull requests (comment the diff).
- Require human approval gate before `apply` in production.
- Use `-target` sparingly — it creates state drift risk.
- Save plan files (`-out=plan.tfplan`) for deterministic applies.

**Drift Detection:**
- Schedule periodic plan-only runs to detect configuration drift.
- Alert on any detected drift (resources modified outside IaC).
- Reconcile drift by either importing changes or reverting manual modifications.
- Use `terraform refresh` cautiously — it updates state but not code.

**Workspace Isolation:**
- Separate state files per environment (dev/staging/prod).
- Use Terraform workspaces OR separate root modules per environment.
- Prefer separate root modules for production isolation (stronger blast radius containment).
- Environment-specific variables via `.tfvars` files or workspace-aware variable lookups.

**Secrets Handling:**
- NEVER store secrets in state files or variable defaults.
- Use data sources to fetch secrets from Vault/SOPS at plan time.
- Mark sensitive outputs with `sensitive = true`.
- Encrypt state backend at rest and in transit.

**Testing:**
- Use Terratest or `terraform validate` + `terraform plan` in CI.
- Write integration tests that provision real infrastructure in ephemeral accounts.
- Validate plan output against policy (OPA/Sentinel/Conftest).
- Test module interfaces with example configurations.

### After

1. Verify `terraform plan` shows expected changes (no surprises).
2. Confirm state backend is accessible and lock is released.
3. Validate outputs match expected resource identifiers.
4. Run compliance/policy checks against the final plan.
5. Document any manual steps required outside IaC scope.

## Self-check before task completion

- [ ] All infrastructure is defined declaratively (no imperative scripts for provisioning).
- [ ] State is stored remotely with locking and encryption enabled.
- [ ] Modules follow single responsibility and are versioned.
- [ ] Plan/apply workflow is enforced (no direct applies without review).
- [ ] Secrets are not hardcoded in configurations or state.
- [ ] Drift detection mechanism is in place or recommended.
- [ ] Workspace isolation separates environments with independent state.
- [ ] Testing strategy covers plan validation and policy compliance.
