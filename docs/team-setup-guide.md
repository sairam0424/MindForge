# MindForge Team Setup Guide

## Step 1 — Configure approvers
Set approvers in `.mindforge/org/integrations/INTEGRATIONS-CONFIG.md` and
governance config.

## Step 2 — Profile team
Run:
`/mindforge:profile-team --questionnaire`

## Step 3 — Branch strategy
Set branch strategy in `MINDFORGE.md`, for example:
- `BRANCHING_STRATEGY=phase`
- `PHASE_BRANCH_TEMPLATE=feat/phase-{N}-{slug}`

## Step 4 — Coordinate ownership
Use `HANDOFF.json` and plan files to avoid overlapping write scopes.

## Ethics policy
Per ADR-014 and TEAM-PROFILE policy, metrics are for process and system
improvement only, not individual performance evaluation.
