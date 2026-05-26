---
description: Design multi-tenancy isolation strategy. Usage - /mindforge:multi-tenant [app] [--isolation rls|schema|database] [--routing subdomain|header]
---

<objective>
Design a multi-tenancy architecture that provides appropriate data isolation
based on regulatory and security requirements, implements tenant context
propagation through all layers, prevents data leakage between tenants,
and supports efficient tenant provisioning and onboarding.
</objective>

<execution_context>
@.mindforge/skills/multi-tenancy-patterns/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Assess isolation requirements based on the application domain: regulatory constraints (HIPAA/SOC2 may require physical separation), data sensitivity (financial data needs stronger isolation), performance requirements (noisy neighbor concerns), and compliance certifications per tenant.
2. Choose isolation level based on --isolation flag: RLS (Row-Level Security — shared schema, best for most SaaS with cost efficiency), schema-per-tenant (logical separation, good for regulated industries), or database-per-tenant (physical separation, required for enterprise with data residency requirements). Document trade-offs.
3. Implement tenant context middleware: extract tenant identifier from request (subdomain, header, JWT claim, or API key), validate tenant exists and is active, inject tenant context into request lifecycle (AsyncLocalStorage/cls-hooked), and propagate to all downstream service calls.
4. Add query guards for data isolation: for RLS implement PostgreSQL policies (CREATE POLICY tenant_isolation ON table USING (tenant_id = current_setting('app.tenant_id'))), for schema isolation set search_path per request, for DB isolation route connection per tenant. Never rely solely on application-level WHERE clauses.
5. Configure tenant routing based on --routing flag: subdomain routing (tenant1.app.com — DNS wildcard + middleware extraction), header routing (X-Tenant-ID — simpler but less user-friendly), path-prefix routing (/tenant1/api — SEO-friendly). Implement routing at load balancer level for efficiency.
6. Test isolation rigorously: verify no data leakage between tenants (create data as tenant A, query as tenant B must return empty), test with concurrent requests from different tenants, verify tenant context survives async operations, and run automated isolation tests in CI.
7. Plan tenant provisioning workflow: automated tenant creation (database/schema/RLS setup), initial data seeding (defaults, templates), DNS configuration (if subdomain routing), welcome email with onboarding steps, and billing activation. Target <30 seconds for new tenant provisioning.
8. Document onboarding flow: admin creates tenant via API/dashboard, system provisions resources, tenant admin receives invite, configures settings (branding, users, integrations), and begins using the platform. Include self-service tier for instant provisioning.
9. Design tenant-aware observability: tag all logs/metrics/traces with tenant_id, per-tenant dashboards for resource consumption, tenant-level SLO tracking, and usage-based billing data collection. Alert on tenants exceeding resource quotas.
10. Log multi-tenancy design in AUDIT with: app, isolation level, routing strategy, provisioning time target, isolation test coverage, and compliance requirements met.
</process>
