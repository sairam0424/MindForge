---
description: "Get the same code diff reviewed by multiple AI models simultaneously."
---

# MindForge v2 — Cross-Review Command
# Usage: /mindforge:cross-review [--phase N] [--models list] [--focus area]

## Purpose
Get the same code diff reviewed by multiple AI models simultaneously.
Claude finds what Claude finds. GPT-4o finds what GPT-4o finds.
Consensus findings = high confidence issues.

## Round 1: Primary (Claude)
Senior architect review.

## Round 2: Adversarial (GPT-4o)
Critical security and edge case review.

## Synthesis
Consensus detector filters findings.
Verdict is gating for `/mindforge:ship`.
