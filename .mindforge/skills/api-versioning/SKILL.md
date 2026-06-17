---
name: api-versioning
version: 1.0.0
min_mindforge_version: 10.0.7
status: stable
triggers: api version strategy, api deprecation lifecycle, breaking change detection, consumer contract strategy, sunset header strategy, version negotiation, api migration guide, backward compatibility strategy, api evolution pattern, api lifecycle management, api sunset policy, deprecation timeline
---

# API Versioning

## When this skill activates

This skill activates when the user is designing, implementing, or managing API
versioning strategies. This includes choosing versioning schemes (URL, header, query),
managing deprecation lifecycles, detecting breaking changes, implementing consumer-driven
contracts, designing sunset policies, creating migration guides for consumers, and
planning backward-compatible API evolution.

## Mandatory actions

### Before

1. Identify the API type (REST, GraphQL, gRPC, event-driven) and existing versioning approach.
2. Determine the consumer landscape (internal teams, external partners, public developers).
3. Assess the current API lifecycle stage (greenfield, stable, legacy with many consumers).
4. Review existing breaking change history and consumer migration friction.
5. Check for contractual SLA obligations around API stability and deprecation timelines.

### During

**Versioning Strategies:**
- **URL Path (`/v1/`, `/v2/`):** Most explicit, easiest for consumers to understand. Best for public APIs. Downside: duplicates route definitions.
- **Header (`Accept: application/vnd.api+json;version=2`):** Cleaner URLs, version in content negotiation. Best for APIs with many versions. Downside: harder to test in browser.
- **Query Parameter (`?version=2`):** Easy to implement, visible in URLs. Best for internal APIs. Downside: pollutes query string, caching complexity.
- **No versioning (additive-only):** Evolve by only adding, never removing. Best for GraphQL. Downside: field bloat over time.
- Choose ONE strategy per API surface. Do not mix approaches.

**Breaking vs Non-Breaking Changes:**
- **Breaking (requires new version):** Field removal, type change, adding required field, changing response structure, removing endpoint, changing authentication, altering error codes.
- **Non-breaking (safe to deploy):** Adding optional field, adding new endpoint, adding optional query parameter, adding new enum value (if consumer ignores unknown), relaxing validation.
- When in doubt, treat it as breaking. Consumer assumptions are hard to predict.

**Deprecation Lifecycle:**
- **Phase 1 — Announce:** Document deprecation in changelog, API docs, and developer portal. Set `Sunset` header (RFC 8594) with target date.
- **Phase 2 — Sunset Header:** Return `Sunset: <date>` and `Deprecation: true` headers on every response from deprecated endpoints.
- **Phase 3 — Migration Period:** Minimum 6 months for external APIs, 3 months for internal. Provide migration guide with code examples.
- **Phase 4 — Usage Monitoring:** Track deprecated endpoint usage. Reach out to remaining consumers directly.
- **Phase 5 — Removal:** Return 410 Gone with a body pointing to the new version. Remove after usage drops to zero (or contractual deadline).

**Consumer-Driven Contracts:**
- Consumers declare what fields/endpoints they actually use (contract).
- Provider runs consumer contracts as part of CI (Pact, Spring Cloud Contract).
- Breaking changes are detected automatically when a provider change violates a consumer contract.
- Reduces false positives: only truly consumed features are protected.
- Each consumer maintains their own contract; provider tests against all.

**Sunset Header (RFC 8594):**
- Format: `Sunset: Sat, 01 Jan 2028 00:00:00 GMT`
- Accompanies `Deprecation: true` header.
- Signals to automated tooling when an endpoint will be removed.
- Include `Link` header pointing to migration documentation.
- Example: `Link: <https://api.example.com/docs/migrate-v1-v2>; rel="sunset"`

**Migration Guides:**
- One guide per breaking change (not per version — granularity matters).
- Include: what changed, why, before/after code examples, timeline.
- Provide automated migration tooling where possible (codemods, SDK upgrades).
- Offer a compatibility shim or adapter layer for complex migrations.
- Test migration guide accuracy with a sample consumer before publishing.

**Version Negotiation:**
- Default to latest stable version if no version specified (for new consumers).
- Return `API-Version` response header confirming which version served the request.
- Support version discovery endpoint (`GET /versions` or API docs endpoint).
- For header-based versioning, return 406 Not Acceptable if version is unsupported.

**Backward Compatibility Strategies:**
- Tolerant reader: consumers ignore unknown fields (Postel's law).
- Additive evolution: only add, never remove or rename.
- Envelope pattern: wrap responses so structure can evolve independently.
- Feature flags: toggle new behavior per consumer via API keys or headers.

### After

1. Verify the chosen versioning strategy is consistently applied across all endpoints.
2. Confirm deprecated endpoints include `Sunset` and `Deprecation` headers.
3. Validate migration guides include before/after code examples.
4. Check that consumer-driven contracts run in CI and detect breaking changes.
5. Ensure monitoring tracks deprecated endpoint usage for removal decisions.

## Self-check before task completion

- [ ] A single versioning strategy is chosen and applied consistently.
- [ ] Breaking vs non-breaking changes are clearly categorized.
- [ ] Deprecation lifecycle includes announcement, sunset headers, migration period, and removal.
- [ ] Migration period meets minimum duration (6 months external, 3 months internal).
- [ ] Consumer-driven contracts detect breaking changes automatically in CI.
- [ ] Sunset headers conform to RFC 8594 with linked documentation.
- [ ] Migration guides provide per-change code examples.
- [ ] Deprecated endpoint usage is monitored to inform removal timing.
