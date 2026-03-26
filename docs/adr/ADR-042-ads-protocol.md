# ADR-042: Adversarial Decision Synthesis (ADS) Protocol

## Status

Accepted (2026-03-26)

## Context

As MindForge moves into the v2.4.0 architectural cycle, architectural planning requires a more robust vetting mechanism than single-agent output. Complex systems require adversarial critique to surface "invisible" flaws in maintainability, security, and scalability.

## Decision

We have implemented the **Adversarial Decision Synthesis (ADS)** protocol. This involves a standardized 3-model loop integrated into the `plan-phase` workflow:

1.  **Blue Team (Architect)**: Generates the initial technical proposal.
2.  **Red Team (Auditor)**: Performs a high-fidelity critique. Hardened via a "jailbreak" prompt to force the identification of at least 3 critical system flaws.
3.  **Gold Team (Synthesizer)**: Consolidates the two perspectives and provides an objective **SOUL Score**.

### SOUL Scoring Formula

`Score = (Impact * Leverage * Reversibility) / (Effort * Risk * Cost)`

- **Score > 1.0**: Proceed with implementation.
- **Score < 1.0**: Requires revision or alternate approach.

## Consequences

- **Improved Quality**: Decisions are vetted by two independent perspectives.
- **Auditability**: Every synthesis is persisted as a SOUL-scored artifact in `.planning/decisions/`.
- **Latency/Cost**: Increased token usage and execution time per planning phase (3 models instead of 1).
