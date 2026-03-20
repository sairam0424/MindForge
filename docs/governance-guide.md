# MindForge Governance Guide

## Goal
Explain how change classification, approvals, compliance gates, and milestone
 governance work in Day 4.

## Governance flow
1. Classify the change before plan execution
2. Apply Tier 3 signals first
3. Request approval when required
4. Enforce compliance gates before completion or release
5. Log decisions and approvals to AUDIT

## Key guarantees
- Tier 3 can be triggered by code content, not just file paths
- GDPR/PII gate runs independently of skill loading
- emergency override requires explicit `--emergency` and listed approver identity
- approval expiry is session-detected and config-driven

## Team operation
- multi-developer sessions coordinate via shared `HANDOFF.json`
- stale active developers expire after 4 hours
- shared state merges happen through git conflict resolution, not silent overwrite
