# MindForge Engine — Dependency Parser

## Purpose
Parse all PLAN files for a given phase and build a directed acyclic graph (DAG)
of task dependencies. This graph is the input to the wave grouping algorithm.

## Input
All files matching: `.planning/phases/[N]/PLAN-[N]-*.md`

## Parsing protocol

### Step 1 — Read all plan files
For each PLAN file in the phase directory:
1. Read the full file content
2. Extract the `<task>` XML block
3. Parse these fields:
   - `<n>` → task name (string)
   - `<plan>` → plan ID (e.g., "01", "02")
   - `<dependencies>` → comma-separated list of plan IDs, or "none"
   - `<files>` → newline-separated list of file paths

### Step 2 — Build the dependency graph
Represent the graph as an adjacency list:

```
Graph = {
  "01": { name: "...", dependsOn: [],         blockedBy: [] },
  "02": { name: "...", dependsOn: [],         blockedBy: [] },
  "03": { name: "...", dependsOn: ["01"],     blockedBy: [] },
  "04": { name: "...", dependsOn: ["01","02"],blockedBy: [] },
  "05": { name: "...", dependsOn: ["03","04"],blockedBy: [] },
}
```

### Step 3 — Validate the graph
Before proceeding, validate:

**Circular dependency check:**
Perform a depth-first traversal. If any node is visited twice in the same
traversal path, a cycle exists. Stop and report:
"Circular dependency detected: [plan A] → [plan B] → [plan A]"
A cycle makes execution impossible. The user must fix the PLAN files.

**Missing dependency check:**
For every plan ID in any `<dependencies>` list, verify that a corresponding
PLAN file exists. If not:
"Plan [N]-[M] declares dependency on [X] but PLAN-[N]-[X].md does not exist."

**File conflict check:**
If two plans in the same potential wave touch the same file, they CANNOT
run in parallel — they must be in different waves. Flag any such conflicts:
"Plans [A] and [B] both modify [file]. Placing [B] in a later wave."
Automatically adjust wave assignment to resolve file conflicts.

### Step 4 — Output the dependency report
Write to `.planning/phases/[N]/DEPENDENCY-GRAPH-[N].md`:

```markdown
# Dependency Graph — Phase [N]

## Tasks
| Plan | Name                  | Depends On    | Wave | File Conflicts |
|------|-----------------------|---------------|------|----------------|
| 01   | Create user model     | none          | 1    | none           |
| 02   | Create product model  | none          | 1    | none           |
| 03   | User API endpoints    | 01            | 2    | none           |
| 04   | Product API endpoints | 02            | 2    | none           |
| 05   | Checkout UI           | 03, 04        | 3    | none           |

## Validation
- Circular dependencies: None ✅
- Missing dependencies: None ✅
- File conflicts resolved: [list any that were adjusted]

## Execution order
Wave 1 → Wave 2 → Wave 3
(see wave-executor.md for wave grouping)

## Wave assignments
- Wave 1: 01, 02
- Wave 2: 03, 04
- Wave 3: 05
```
