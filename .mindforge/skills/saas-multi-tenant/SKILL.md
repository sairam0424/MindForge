---
name: saas-multi-tenant
version: 1.0.0
min_mindforge_version: 10.2.0
status: stable
triggers: saas architecture, tenant management, saas billing integration, feature gating saas, white-label platform, saas onboarding, subscription management saas, saas platform design, saas tenant provisioning, usage-based billing, saas data isolation, self-serve saas
compose: multi-tenancy-patterns
---

# Skill — SaaS Multi-Tenant

## When this skill activates
This skill activates when building multi-tenant SaaS platforms with tenant isolation, subscription billing, feature gating, white-labeling, self-serve onboarding, usage-based pricing, tenant provisioning, or plan management systems.

## Mandatory actions when this skill is active

### Before writing any code
1. Design tenant isolation strategy: shared database with tenant_id column (row-level security), schema-per-tenant (PostgreSQL schemas), or database-per-tenant (highest isolation, highest cost), with cross-tenant query prevention (middleware validation, prepared statement parameterization)
2. Model subscription lifecycle: trial start (14 days) → active paid (credit card charged) → past_due (payment failed, retry 3 times) → canceled (end of billing period) → deleted (30 days after cancel), with state machine transitions and webhook events for each stage
3. Map feature entitlements by plan: free tier (5 users, 100 MB storage, core features), starter ($29/mo, 25 users, 10 GB, email support), professional ($99/mo, unlimited users, 100 GB, priority support, advanced analytics), enterprise (custom pricing, SSO, SLA, dedicated support)

### During implementation
- Implement tenant context middleware: extract tenant_id from subdomain (acme.platform.com) or custom domain (app.acme.com with CNAME validation), JWT claims, or API key, inject into request context, validate tenant active (not suspended/deleted), apply row-level security filter (tenant_id = :current_tenant)
- Build feature gating system: define feature flags per plan (analytics_enabled, sso_enabled, api_access_enabled), check entitlements at runtime (before rendering UI, before API execution), return 402 Payment Required for gated features, track usage for upsell prompts
- Design usage-based billing: meter events (API calls, emails sent, storage used), aggregate per billing period, calculate overage charges (tiered pricing: $0.10/GB for 0-100GB, $0.05/GB for 100GB+), generate invoices (line items with metered usage), integrate with Stripe Billing or Chargebee
- Implement white-labeling: support custom domains (validate CNAME ownership via DNS TXT record), customizable branding (logo, colors, fonts stored per tenant), email templates (replace platform name with tenant name), remove "Powered by" footer on enterprise plans
- Build self-serve onboarding: signup flow (email verification, password strength requirements), organization creation (unique subdomain validation), plan selection (trial vs paid), payment method capture (tokenized card via Stripe Elements), provision tenant resources (create schema/database, seed default data)

### After implementation
- Validate tenant isolation: attempt cross-tenant data access (user from tenant A trying to access tenant B data via direct ID manipulation), verify middleware rejects requests, check database queries include tenant_id filter, audit all raw SQL for missing tenant scoping
- Test billing accuracy: simulate monthly billing cycle, verify usage metering (events counted correctly), overage calculation (tiered pricing applied), invoice generation (correct line items, tax applied), payment processing (Stripe webhook handled), and dunning (retry failed payments, send reminders)
- Execute load testing with tenant skew: simulate 100 tenants with 90% traffic on top 10 tenants (power law distribution), measure query performance (ensure indexes on tenant_id), identify noisy neighbor issues (one tenant's load impacting others), validate rate limiting per tenant

## Self-check before task completion
- [ ] Tenant isolation enforced: middleware extracts and validates tenant context, all queries scoped to tenant_id, cross-tenant access prevented
- [ ] Subscription lifecycle managed: trial → active → past_due → canceled states with webhook events, dunning for failed payments
- [ ] Feature gating functional: entitlements defined per plan, runtime checks before UI/API, 402 response for gated features, upsell prompts
- [ ] Usage-based billing: metered events tracked, aggregated per billing period, overage charges calculated (tiered pricing), invoices generated
- [ ] White-labeling supported: custom domains (CNAME validation), branding per tenant (logo, colors), email templates (tenant-specific)
- [ ] Self-serve onboarding: signup flow, plan selection, payment capture (tokenized), tenant provisioning (schema/database creation)
- [ ] Rate limiting per tenant: prevent noisy neighbors, ensure fair resource allocation, alert when tenant exceeds plan limits
