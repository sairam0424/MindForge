# MindForge v2.4.0 — Commands Reference

MindForge commands are organized into functional pillars to support the entire software development lifecycle (SDLC).

---

## 1. Project Management & Setup

| Command | Description |
| :--- | :--- |
| `/mindforge:init-project` | Scaffolds the `.agent/` framework and initializes project planning files. |
| `/mindforge:map-codebase` | Performs deep architectural mapping of an existing codebase. |
| `/mindforge:health` | Checks the integrity of the MindForge installation and project structure. |
| `/mindforge:health --repair` | Automatically fixes missing files or broken configurations. |

---

## 2. The Unified Workflow (4 Pillars)

| Command | Description |
| :--- | :--- |
| `/mindforge:plan-phase [N]` | Initiates strategic planning for a milestone: discuss → research → plan. |
| `/mindforge:execute-phase [N]` | Starts autonomous execution of task plans in parallel waves. |
| `/mindforge:verify-phase [N]` | Runs Human Acceptance Testing (UAT) and automated validation gates. |
| `/mindforge:ship [N]` | Finalizes delivery, generates release output, and creates a Pull Request. |

---

## 3. Intelligence & Observability

| Command | Description |
| :--- | :--- |
| `/mindforge:dashboard` | Starts or manages the real-time web observability dashboard. |
| `/mindforge:browse [URL]` | Launches the browser daemon for visual verification or research. |
| `/mindforge:personas --list` | Displays all 32+ specialized engineering personas. |
| `/mindforge:personas --set ID` | Switches the current agent to a specific persona (e.g., `architect`, `executor`). |
| `/mindforge:tokens` | Analyzes and profiles token usage for the current session. |
| `shard-helper --verify` | (CLI Internal) Verifies the integrity and SHA-256 checksums of memory shards. |

---

## 4. Knowledge, Skills & Marketplace

| Command | Description |
| :--- | :--- |
| `/mindforge:note "TEXT"` | Captures an architectural decision or project preference into memory. |
| `/mindforge:remember [TERM]` | Searches the MindForge knowledge graph for relevant context. |
| `/mindforge:learn [URL/PATH]` | Ingests documentation or source code to build a new validated Skill. |
| `/mindforge:skills --list` | Lists all active and available skills across the 3-tier registry. |
| `/mindforge:skills validate [PATH]` | Passes a skill through the 7-Dimension Scorer for quality verification. |
| `/mindforge:marketplace search [Q]`| Searches community skills from the central registry. |
| `/mindforge:marketplace install ID` | Installs a verified community skill into the project context. |

---

## 5. Governance & Maintenance

| Command | Description |
| :--- | :--- |
| `/mindforge:security-scan` | Performs deep vulnerability scanning and compliance checks. |
| `/mindforge:update` | Checks for and applies framework updates from the central repository. |
| `/mindforge:migrate` | Migrates project metadata between framework versions. |
| `/mindforge:audit --export` | Generates a human-readable PDF report of the session audit log. |
| `/mindforge:join-discord` | Join the MindForge developer community for support and collaboration. |
