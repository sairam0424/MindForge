# PAR & ZTS Architectural Survey — MindForge v5

## Pillar III: Predictive Agentic Reliability (PAR)

Predictive Agentic Reliability (PAR) addresses the "Reasoning Decay" problem in long-running autonomous sessions. It implements proactive monitoring and self-healing at the reasoning layer.

### 1. Stuck Detection (S03 & S04)
The `StuckMonitor` has been extended to detect advanced reasoning loop patterns:
- **S03 (Semantic Mirroring)**: Detects when the agent paraphrases its own previous thoughts without taking new actions.
- **S04 (Infinite Decomposition)**: Detects when the agent breaks sub-tasks into smaller and smaller pieces indefinitely without resolving the parent task.

### 2. Context Refactoring
The `ContextRefactorer` monitors "Context Density" (the ratio of implementation actions to reasoning thoughts).
- When density falls below 30%, it triggers a proactive **Refactor Event**.
- This encourages the agent to summarize its progress and reset its active context window, preventing bloat.

### 3. C2C Arbitrage
Confidence-to-Cost (C2C) arbitrage ensures that the agent only continues execution when the expected value (confidence) exceeds the operational cost (tokens/compute).

---

## Pillar IV: Supply Chain Trust (ZTS)

Supply Chain Trust (ZTS) ensures that every asset (skill, model, tool) used by MindForge is authenticated and verified against enterprise standards.

### 1. Agentic SBOM (Software Bill of Materials)
MindForge now generates a real-time `MANIFEST.sbom.json` during every autonomous run.
- **Model Tracking**: Logs the exact model version used for every reasoning span.
- **Skill Telemetry**: Tracks which skills were invoked and their specific versions.
- **Timestamping**: Captures full start/end telemetry for supply chain auditing.

### 2. 7-Dimension Certification (7D)
Skills are now evaluated across 7 weighted dimensions:
1. **Schema Compliance (15%)**
2. **Trigger Density (15%)**
3. **Mandatory Coverage (20%)**
4. **Security Sanitization (20%)**
5. **Doc Clarity (10%)**
6. **Edge Case Handling (10%)**
7. **Example Fidelity (10%)**

> [!IMPORTANT]
> In `--enterprise` mode, skills must achieve a minimum score of **7.0/10.0** to be loaded.
