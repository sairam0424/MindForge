---
name: mindforge:serverless
description: "Design serverless function composition and cost model. Usage: /mindforge:serverless [app] [--composition step-functions|choreography] [--cold-start mitigate]"
argument-hint: "[app] [--composition step-functions|choreography] [--cold-start mitigate]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design a serverless function architecture with optimal composition patterns, cold start mitigation, and a transparent cost model that enables predictable scaling economics.
</objective>

<execution_context>
@.mindforge/skills/serverless-patterns/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/serverless-patterns/`
State: Decomposes application logic into discrete functions with defined triggers, state management, and cost projections.
</context>

<process>
1. **Identify Function Boundaries**: Decompose the application into discrete units of work. Each function should have a single responsibility, well-defined input/output, and independent scaling characteristics.
2. **Choose Composition Pattern**: Select between orchestration (Step Functions / Durable Functions with explicit state machine) or choreography (event-driven with pub/sub). Document decision rationale based on workflow complexity and observability needs.
3. **Address Cold Starts**: Implement mitigation strategy — provisioned concurrency for latency-critical paths, bundle optimization (tree-shaking, minimal dependencies), or snap-start where available. Measure and set cold start budget per function.
4. **Design State Management**: Since functions are stateless, design external state persistence (DynamoDB, Redis, or S3) with appropriate consistency guarantees. Define state TTL and cleanup policies.
5. **Configure Event Triggers**: Map each function to its invocation source (HTTP, queue, schedule, stream, storage event). Define retry policies, dead-letter queues, and idempotency keys per trigger.
6. **Set Timeouts with Checkpointing**: Configure execution timeouts per function. For long-running workflows, implement checkpointing to resume from last successful step on timeout or failure.
7. **Model Costs**: Calculate projected costs using formula: (invocations x duration x memory_mb) / pricing_unit. Include data transfer, storage, and orchestration service charges. Produce monthly cost estimate at current and 10x scale.
8. **Compare vs. Container Costs**: Produce break-even analysis comparing serverless vs. container (ECS/Cloud Run) at various traffic levels. Identify the crossover point where containers become more economical.
9. **Define Observability Strategy**: Design distributed tracing across function chains, structured logging with correlation IDs, and custom metrics for business-level monitoring.
10. **Document Deployment Pipeline**: Specify IaC templates (SAM/CDK/Serverless Framework), environment promotion strategy, and canary deployment configuration for function updates.
</process>
