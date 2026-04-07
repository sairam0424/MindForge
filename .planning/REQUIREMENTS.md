# Core Requirements Registry (MindForge v6.5.0)

This registry contains the canonical requirements that all autonomous reasoning waves must align with. This file is parsed by the `ReasonSourceAligner` (RSA).

## [REQ-001] Component Isolation

All newly created engine components must be contained within the `bin/engine/` directory and follow a single-responsibility modular architecture.

## [REQ-002] Intelligence-Drift Coupling (IDC)

The system must proactively detect "logic loops" or reasoning stagnation and trigger compute resource upgrades (MIR tier elevation) when drift exceeds a critical threshold.

## [REQ-003] Context Entropy Guard (CEG)

The framework must actively suppress redundant reasoning thoughts (>85% similarity) and compress stagnant loops into high-density semantic digests before session handoff.

## [REQ-004] Reason-Source Alignment (RSA)

Every reasoning thought in an autonomous wave must be traceable back to at least one REQUIREMENT ID. Waves with <60% alignment must be flagged for refocusing.

## [REQ-005] Zero-Trust Verification

Implementation plans must include a verification phase with automated shell scripts or browser-based UAT to confirm success before claiming feature completion.
