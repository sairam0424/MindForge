---
description: "Design consumer-driven contract test suite. Usage - /mindforge:contract-test [service] [--consumer|--provider] [--broker]"
---

<objective>
Design and implement a consumer-driven contract testing strategy that validates
service interactions at integration boundaries without requiring full end-to-end
environments. Ensures providers never break consumer expectations.
</objective>

<execution_context>
@.mindforge/skills/contract-testing/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Identify all consumers and providers for the target service. Map the dependency graph showing which services call which endpoints.
2. Define consumer expectations as explicit contract specifications — request shape, response shape, status codes, and headers that each consumer relies on.
3. Generate Pact files (or equivalent contract format) from consumer test suites. Each consumer writes tests that describe what it expects from the provider.
4. Set up a contract broker (Pact Broker or PactFlow) to store and version contracts. Configure webhook notifications for new contracts published.
5. Verify the provider against all published consumer contracts. Run provider verification tests that replay consumer expectations against the real provider.
6. Integrate contract tests into CI pipeline — consumer tests run on consumer PRs, provider verification runs on provider PRs. Block merges on contract failures.
7. Configure can-i-deploy checks to gate deployments. Before any service deploys, verify its contracts are satisfied by the currently-deployed versions of its dependencies.
8. Set up contract versioning strategy (git SHA or semantic) and configure participant version selectors (latest from main, deployed environments).
9. Document the contract testing workflow: how to add new interactions, how to handle breaking changes, and how to use pending/WIP pacts for new consumers.
10. Log contract-test invocation in AUDIT with: service, role (consumer/provider), broker configured, interactions count.
</process>
