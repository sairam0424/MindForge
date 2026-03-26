# MindForge Engine — Adversarial Decision Synthesis (ADS) Protocol

## Purpose
Evolve the standard single-agent planning model into a high-fidelity Red-Team/Blue-Team architectural synthesis. This protocol ensures all major decisions are stress-tested for maintainability, security, and scalability before execution begins.

## Core Roles

### 1. The Architect (Blue Team — Performance & Complexity)
- **Persona**: `mindforge-architect` or `mf-planner`
- **Objective**: Propose the most technically superior, performant, and feature-complete solution.
- **Bias**: "We should build for scale and future-proof the system."

### 2. The Auditor (Red Team — Simplicity & Maintainability)
- **Persona**: `mindforge-qa-engineer` or `mindforge-security-reviewer`
- **Objective**: Find logic gaps, security flaws, and architectural "over-engineering".
- **Bias**: "Do we really need this complexity? How will this break tomorrow?"

### 3. The Synthesizer (Gold Team — Decision Merge)
- **Persona**: `mindforge-decision-architect`
- **Objective**: Mediate the debate, score proposals using `SOUL.md` metrics, and merge into a final `PLAN.md`.
- **Bias**: "Objective leverage. Minimal risk. Maximum impact."

## Synthesis Loop — Execution Order

### Step 1: Blue Proposal (Propose)
The **Architect** generates a detailed implementation plan (`PLAN-[P]-BLUE.md`).
- Focus on: Data flow, performance, and API design.

### Step 2: Red Critique (Challenge)
The **Auditor** reviews the Blue plan and generates a critique (`PLAN-[P]-RED-CRITIQUE.md`).
- **Pressure Rule**: Red *must* identify at least 3 potential failure modes or "Complexity Traps."
- Red proposes a "Simpler Alternative" if the Blue plan is deemed over-engineered.

### Step 3: Gold Verdict (Synthesize)
The **Synthesizer** ingest both plans and the critique. 
1. Calculates the **SOUL_SCORE** for each approach:
   `Score = (Impact × Leverage × Reversibility) / (Effort × Risk × Cost)`
2. Generates the final `PLAN.md` by adopting the best parts of both.
3. Produces a `DECISION_ADS.md` (ADR) justifying the synthesis.

## Synthesis Tossing (Iterative Loop)
If the **SOUL_SCORE** difference between approaches is < 0.2, the Synthesizer can trigger one round of "Tossing":
- Both teams are given the other's feedback and asked to refine their proposal.
- Total iterations capped at 2 to avoid scope-paralysis.

## Output Structure
The final result must always move to the standard `.planning/` directory:
- `.planning/PLAN.md` (Validated & Hardened)
- `.planning/decisions/ADS-[UUID].md` (The Proof of Synthesis)

## Trigger Conditions
- Any phase marked "Architectural" in `ROADMAP.md`
- Manual trigger via `/mindforge:plan-phase --ads`
- When a `security-reviewer` flags a high-risk change
