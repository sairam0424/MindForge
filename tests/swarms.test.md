# Swarm Orchestration Verification Tests

## Test 1: Swarm Eligibility Detection
- **Input:** PLAN with `difficulty: 8.5`, `impact: HIGH`, touching `src/auth/login.ts`.
- **Expected:** `SwarmController` returns `swarm_cluster` with `SecuritySwarm` template.

## Test 2: Multi-Disciplinary Swarm Trigger
- **Input:** PLAN with `files: ["src/ui/Button.tsx", "src/api/auth.ts"]`.
- **Expected:** `SwarmController` returns `FullStackSwarm`.

## Test 3: Micro-Persona Generation
- **Input:** Base `developer.md`, Context Patch for `zod`.
- **Expected:** `PersonaFactory` generates a valid micro-persona with `Zod` validation rules in `<specialist_knowledge>`.

## Test 4: Swarm State Initialization
- **Action:** Execute a `UISwarm` in a mock Wave.
- **Expected:** `.planning/phases/1/SWARM-STATE-1.json` is created with members: `["ui-auditor", "developer", "accessibility"]`.

## Test 5: Summary Consolidation
- **Action:** `ui-auditor` (leader) writes `SWARM-SUMMARY-1-1.md` after fetching member notes from `SWARM-STATE-1.json`.
- **Expected:** Single summary file exists containing all specialist findings.
