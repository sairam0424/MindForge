---
name: contract-testing
version: 1.0.0
min_mindforge_version: 10.0.8
status: stable
triggers: contract testing, consumer driven contract, pact testing, provider verification, contract broker, schema compatibility, contract first, api contract test, consumer contract, provider contract, contract breaking, bilateral contract
compose: testing-standards
---

# Contract Testing

## When this skill activates

This skill activates when working with API contract verification between services, consumer-driven contract workflows, schema compatibility checks, or any task involving service boundary agreements. It applies to both synchronous (HTTP/gRPC) and asynchronous (message queue) contracts.

## Mandatory actions when this skill is active

### Before

1. Identify all parties in the contract relationship (consumers and providers).
2. Determine the contract format in use (Pact, OpenAPI, AsyncAPI, Protobuf).
3. Check if a contract broker is already configured (Pactflow, Pact Broker, custom).
4. Review existing contracts for the affected endpoints or messages.
5. Confirm the environment supports contract verification (CI pipeline, broker access).

### During

**Consumer-Driven Contract Workflow:**
- Consumers define the interactions they require (request/response pairs).
- Consumer tests generate contract files (pact files, schemas).
- Contracts are published to a broker with version metadata.
- Providers pull contracts and verify they satisfy all consumer expectations.
- Verification results are published back to the broker.

**Schema Compatibility Levels:**
- **Backward compatible**: New schema can read data written by old schema.
- **Forward compatible**: Old schema can read data written by new schema.
- **Full compatible**: Both backward and forward (safest for production).
- Always validate compatibility BEFORE deploying schema changes.

**Breaking Change Detection:**
- Removing a field consumers depend on = BREAKING.
- Changing a field type or format = BREAKING.
- Adding a required field to a request = BREAKING for providers.
- Adding an optional field = SAFE (backward compatible).
- Run `can-i-deploy` checks in CI to gate deployments.

**Contract Broker Practices:**
- Tag contracts with environment names (dev, staging, prod).
- Use semantic versioning for contract participants.
- Enable webhook notifications on verification failures.
- Maintain contract history for rollback capability.

**Pact-Specific Workflow:**
1. Write consumer test using Pact DSL (define interaction).
2. Run consumer test to generate `.pact` JSON file.
3. Publish pact to broker with consumer version.
4. Provider runs verification against all registered consumer pacts.
5. Provider publishes verification result to broker.
6. CI runs `can-i-deploy` before any deployment proceeds.

**CI Integration:**
- Consumer pipeline: test → generate pact → publish → trigger provider verification.
- Provider pipeline: pull pacts → verify → publish result → deploy if green.
- Use pending pacts for new consumers (failures don't block provider).
- Use WIP pacts for contracts not yet verified on provider's main branch.

### After

1. All contracts are published to the broker with correct version tags.
2. Verification results are recorded for both consumer and provider.
3. `can-i-deploy` passes for the target environment.
4. Breaking changes are flagged and communicated to affected teams.
5. Contract coverage includes all critical interactions (not just happy paths).

## Self-check before task completion

- [ ] Consumer tests define the minimal required interaction (no over-specification).
- [ ] Provider verification runs against ALL registered consumer contracts.
- [ ] Schema changes are validated for the correct compatibility level.
- [ ] Breaking changes have been identified and a migration plan exists.
- [ ] Contract broker has up-to-date versions for all participants.
- [ ] CI pipeline gates deployment on `can-i-deploy` result.
- [ ] Error scenarios and edge cases are covered in contracts (not just 200 responses).
- [ ] Contract tests run in isolation (no network calls, no shared state).
