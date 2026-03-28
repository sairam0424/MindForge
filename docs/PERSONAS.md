# MindForge Persona Reference

> A comprehensive guide to the 32 specialized enterprise personas — roles, tools, and orchestration patterns.

---

## Overview

MindForge uses a multi-agent orchestration model where specialized personas are invoked to handle specific phases of the project lifecycle. Each persona is defined with a unique role, high-fidelity XML-tagged process, and strict tool permissions to ensure security and precision.

### Persona Categories

| Category | Count | Personas |
| :--- | :--- | :--- |
| **Analyzers & Researchers** | 10 | analyst, assumptions-analyzer, advisor-researcher, assumptions-analyzer-extend, project-researcher, research-synthesizer, ui-researcher, research-agent, phase-researcher, mf-researcher |
| **Architects & Planners** | 5 | architect, decision-architect, planner, plan-checker, mf-planner |
| **Executors** | 3 | developer, executor, mf-executor |
| **Quality & Security** | 10 | qa-engineer, security-reviewer, coverage-specialist, ui-auditor, ui-checker, nyquist-auditor, integration-checker, verifier, debug-specialist, mf-reviewer |
| **Persistence & Memory** | 1 | mf-memory |
| **Infrastructure & Tools** | 1 | mf-tool |
| **Strategy & Ops** | 5 | roadmapper, release-manager, tech-writer, roadmapper-extend, user-profiler |
| **Neural Protocols** | 6 | brainstormer, swarm-pilot, mesh-orchestrator, workspace-manager, skill-author, tdd-master |
| **Debuggers** | 2 | debugger, rca-expert |
| **Mapping** | 2 | codebase-mapper, codebase-mapper-extend |

---

## Persona Details

### mindforge-analyst (The Requirements Engineer)

**Role:** Translates ambiguous business intent into precise, testable, scoped specifications.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:init-project`, `/mindforge:plan-phase`, `/mindforge:agent analyst` |
| **Tools** | Read, Write, Bash, Grep |
| **Color** | `blue` |
| **Trust Tier** | `1` |
| **Produces** | `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md` |

**Capabilities:**
- Socratic clarification loops to resolve ambiguity.
- Drafting acceptance-driven functional/non-functional requirements.
- Defining project scope and exclusions.

---

### mindforge-architect (The System Designer)

**Role:** Principal systems architect and technical decision maker. Responsible for system design, data modeling, and architectural integrity.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent architect` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `3` |
| **Produces** | `.planning/ARCHITECTURE.md`, `.planning/decisions/ADR-*.md` |

**Capabilities:**
- First-principles evaluation of technical trade-offs.
- Data-first design and component boundary definition.
- Writing Architectural Decision Records (ADRs).
- **ADS Blue Team (Architect)**: Proposing performance-first, scalable implementation paths.

---

### mindforge-developer (The Engine of Execution)

**Role:** Senior software engineer. Writes clean, minimal, well-tested code following strict naming and architectural conventions.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:execute-phase`, `/mindforge:agent developer` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus, Context7 |
| **Color** | `green` |
| **Trust Tier** | `2` |
| **Produces** | Source code, Unit tests, Implementation Summaries |

**Capabilities:**
- Implementation of logical changes with zero scope creep.
- Writing co-located unit tests for every feature.
- Atomic commit discipline.

---

### mindforge-qa-engineer (The Adversarial Verifier)

**Role:** Senior test engineer. Thinks adversarially to find failure modes, boundary conditions, and logic gaps.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:verify-phase`, `/mindforge:agent qa-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `yellow` |
| **Trust Tier** | `2` |
| **Produces** | `UAT.md`, `BUGS.md` |

**Capabilities:**
- Stress-testing inputs and identifying silent failures.
- Zero-tolerance regression verification.
- Objective PASS/FAIL signing of phase goals.
- **ADS Red Team (Auditor)**: Critiquing architectural over-engineering and finding "Complexity Traps."

---

### mindforge-security-reviewer (The Gatekeeper)

**Role:** Senior application security engineer. Reviews code for vulnerabilities, hardcoded secrets, and compliance with the OWASP Top 10.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:security-scan`, `/mindforge:agent security-reviewer` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `red` |
| **Trust Tier** | `3` |
| **Produces** | `SECURITY-REVIEW.md` |

**Capabilities:**
- Automated and manual scanning for hardcoded secrets.
- Systematic OWASP Top 10 evaluation.
- Dependency vulnerability auditing.

---

### mindforge-debug-specialist (The Root Cause Expert)

**Role:** Principal engineering specialist in production debugging and root cause analysis (RCA). Solves complex defects by finding causes, not patching symptoms.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:debug`, `/mindforge:agent debug-specialist` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus, ReadTerminal, Context7 |
| **Color** | `orange` |
| **Produces** | `DEBUG-REPORT.md` (RCA) |

**Capabilities:**
- Scientific hypothesis testing and variable elimination.
- Isolation of failures across frontend, API, and database layers.
- Implementation of minimal, regression-proof fixes.

---

### mindforge-roadmapper (The Execution Strategist)

**Role:** Strategic technical program manager. Defines the optimal sequence of delivery and ensures every task has a clear "Proof of Done".

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:milestone`, `/mindforge:agent roadmapper` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Produces** | `ROADMAP.md`, `STATE.md` |

**Capabilities:**
- Risk-first project sequencing.
- Mapping requirements to atomic, verifiable phases.
- Defining "Proof of Done" for every task.

---

### mindforge-assumptions-analyzer (The Pre-flight Auditor)

**Role:** Senior systems auditor. Audits codebase against requirements to find hidden problems and conflicts before work starts.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent assumptions-analyzer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `blue` |
| **Produces** | `ASSUMPTIONS-REPORT.md` |

**Capabilities:**
- Blast radius analysis of proposed changes.
- Conflict detection between new plans and existing abstractions.
- Evidence-based validation of technical assumptions.

---

### mindforge-research-agent (The Knowledge Detective)

**Role:** Technical research specialist. Ingests large documentation sets and codebases to identify patterns and integration paths.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:research`, `/mindforge:agent research-agent` |
| **Tools** | Read, Write, Bash, Grep, Glob, Browser, Context7 |
| **Color** | `cyan` |
| **Trust Tier** | `1` |
| **Produces** | `RESEARCH-NOTES-*.md` |

**Capabilities:**
- Exhaustive ingestion of external documentation and local source.
- Extraction of patterns, performance limits, and integration pitfalls.
- Evidence-based recommendations with full citations.

---

### mindforge-decision-architect (The Chief of Logic)

**Role:** Principal engineering lead. Synthesizes research and audits into actionable architectural verdicts and roadmap adjustments.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent decision-architect` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `3` |
| **Produces** | `DECISION-*.md` |

**Capabilities:**
- Synthesis of conflicting research and audit data.
- Force-balancing of technical trade-offs.
- Updating project stack and roadmap based on verdicts.
- **ADS Gold Team (Synthesizer)**: Mediating Red/Blue debates and generating SOUL-scored architectural verdicts.

---

### mindforge-release-manager (The Delivery Gatekeeper)

**Role:** Senior release manager. Ensures every release is traceable, reversible, and communicated through structured semver and changelogs.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:release`, `/mindforge:agent release-manager` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `blue` |
| **Trust Tier** | `3` |
| **Produces** | `CHANGELOG.md`, Git tags, Release Notes |

**Capabilities:**
- Verification of UAT and Security sign-offs before tagging.
- Correct application of Semantic Versioning (SemVer).
- Synthesis of multi-phase implementation summaries into human-readable logs.

---

### mindforge-tech-writer (The Doc Specialist)

**Role:** Senior technical writer. Produces minimal, high-utility documentation for developers and stakeholders.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:ship`, `/mindforge:agent tech-writer` |
| **Tools** | Read, Write, Bash, Grep, Glob, Context7 |
| **Color** | `cyan` |
| **Trust Tier** | `1` |
| **Produces** | `README.md`, API Reference, Runbooks |

**Capabilities:**
- Translation of complex engineering concepts into "Developer-First" documentation.
- Ensuring instructions are tested and verified before publication.
- Optimization for "Time to First Value".

---

### mindforge-coverage-specialist (The Logic Auditor)

**Role:** Senior test engineer specialized in logic sampling and adversarial gap detection (Nyquist-level coverage).

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:validate-phase`, `/mindforge:agent coverage-specialist` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `yellow` |
| **Trust Tier** | `2` |
| **Produces** | `COVERAGE-AUDIT.md` |

**Capabilities:**
- Detection of logic gaps in core business logic.
- Adversarial state sampling (testing states the developer missed).
- **Strictly read-only for `src/`**: only modifies test files.

---

### mindforge-advisor-researcher (The Trade-off Specialist)

**Role:** Researches single decision points and provides structured comparisons with rationale.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:research`, `/mindforge:agent advisor-researcher` |
| **Tools** | Read, Write, Bash, Grep, Glob, Browser, Context7 |
| **Color** | `cyan` |
| **Trust Tier** | `1` |
| **Produces** | Comparison tables, Rationale documents |

**Capabilities:**
- Structured evaluation of technical trade-offs between libraries or patterns.
- Data-driven recommendations grounded in codebase constraints.
- Identifying architectural impact and risk surface.

---

### mindforge-project-researcher (The Ecosystem Explorer)

**Role:** Researches the technical ecosystem for new projects or milestones.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:init-project`, `/mindforge:agent project-researcher` |
| **Tools** | Read, Write, Bash, Grep, Glob, Browser, Context7 |
| **Color** | `purple` |
| **Trust Tier** | `1` |
| **Produces** | `SUMMARY.md`, `STACK.md`, `ARCHITECTURE.md` |

**Capabilities:**
- Investigation of third-party integrations and platform limitations.
- Mapping high-level technical requirements to specific stack choices.
- Initial feasibility analysis for large-scale features.

---

### mindforge-research-synthesizer (The Strategy Fuser)

**Role:** Synthesizes research outputs from multiple parallel agents into a cohesive strategy.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:research`, `/mindforge:agent research-synthesizer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `1` |
| **Produces** | Integrated `SUMMARY.md` |

**Capabilities:**
- Consolidating fragmented findings into a unified technical direction.
- Identifying cross-cutting patterns and risks.
- Providing "Commanders Intent" for the Roadmapper.

---

### mindforge-ui-researcher (The Visual Architect)

**Role:** Produces design contracts (UI-SPEC.md) for frontend phases.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent ui-researcher` |
| **Tools** | Read, Write, Bash, Grep, Glob, Browser, Context7 |
| **Color** | `#E879F9` |
| **Trust Tier** | `1` |
| **Produces** | `UI-SPEC.md` |

**Capabilities:**
- Defining design tokens, typography, and spacing scales.
- Inventing and specifying component-level behaviors.
- Drafting final user-facing copywriting for critical flows.

---

### mindforge-phase-researcher (The Domain Deep-Diver)

**Role:** Investigates the specific technical domain or codebase area for an active phase.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent phase-researcher` |
| **Tools** | Read, Write, Bash, Grep, Glob, Context7 |
| **Color** | `blue` |
| **Trust Tier** | `1` |
| **Produces** | `RESEARCH.md` |

**Capabilities:**
- Deep-codebase discovery to identify existing patterns.
- Surface-area analysis of proposed changes.
- Locating undocumented side-effects and technical traps.

---

### mindforge-planner (The Task Architect)

**Role:** Decomposes phase goals into precise, atomic, executable implementation plans.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent planner` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `blue` |
| **Trust Tier** | `1` |
| **Produces** | `PLAN-*.md` (XML task breakdown)|

**Capabilities:**
- Goal-backward task decomposition.
- Precise dependency mapping between implementation steps.
- Defining verification steps for every atomic task.

---

### mindforge-integration-checker (The Connection Auditor)

**Role:** Verifies cross-component wiring, API consumers, and end-to-end user flows.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:verify-phase`, `/mindforge:agent integration-checker` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `blue` |
| **Trust Tier** | `1` |
| **Produces** | `INTEGRATION-REPORT.md` |

**Capabilities:**
- Tracing data flows from source to UI rendering.
- Identifying orphaned components and broken API connections.
- Auditing sensitive routes for required auth protection.

---

### mindforge-nyquist-auditor (The Fidelity Inspector)

**Role:** Specialized verification auditor focused on filling testing gaps.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:validate-phase`, `/mindforge:agent nyquist-auditor` |
| **Tools** | Read, Write, Bash, Grep, Glob, CmdStatus, ReadTerminal |
| **Color** | `#8B5CF6` |
| **Trust Tier** | `2` |
| **Produces** | `VALIDATION-REPORT.md` |

**Capabilities:**
- Identifying "sampling gaps" in automated test suites.
- Generating minimal, high-impact behavioral tests.
- Escalating implementation bugs found during audit.

---

### mindforge-plan-checker (The Logic Guard)

**Role:** Verifies implementation plans against project goals and constraints.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent plan-checker` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `yellow` |
| **Trust Tier** | `1` |
| **Produces** | `PLAN-VERDICT.md` |

**Capabilities:**
- Detecting missing tasks or logical errors in plans.
- Ensuring hard dependencies are respected.
- Checking for alignment with ARCHITECTURE.md and ADRs.

---

### mindforge-ui-auditor (The Polish Inspector)

**Role:** Performs retroactive visual and interaction audits of UI code.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:verify-phase`, `/mindforge:agent ui-auditor` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `#F472B6` |
| **Trust Tier** | `1` |
| **Produces** | `UI-REVIEW.md` |

**Capabilities:**
- 6-Pillar audit of copywriting, visuals, color, type, spacing, and experience.
- Identifying "skeleton UI" and missing loading states.
- Providing specific, coordinate-based visual fix-its.

---

### mindforge-ui-checker (The Design Gatekeeper)

**Role:** Validates UI-SPEC.md design contracts before planning starts.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent ui-checker` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `#22D3EE` |
| **Trust Tier** | `1` |
| **Produces** | `UI-SPEC-VERDICT.md` |

**Capabilities:**
- Ensuring design tokens follow a disciplined spacing and type scale.
- Blocking vague design requirements or missing empty states.
- Verifying that final copywriting is professional and noun+verb based.

---

### mindforge-verifier (The Goal Sentinel)

**Role:** Principal specialist in goal-backward verification.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:verify-phase`, `/mindforge:agent verifier` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `green` |
| **Trust Tier** | `1` |
| **Produces** | `VERIFICATION.md` |

**Capabilities:**
- Multi-level truth verification (Existence, Substance, Wiring).
- Mapping code artifacts back to specific Requirement IDs.
- Detecting "hollow implementation" (stubs/TODOs) in finished work.

---

### mindforge-executor (The Implementation Pilot)

**Role:** Executes implementation plans with atomic commit discipline.

| **Property** | **Value** |
| :--- | :--- |
| **Spawned by** | `/mindforge:execute-phase`, `/mindforge:agent executor` |
| **Tools** | Read, Write, Bash, Grep, Glob, CmdStatus, ReadTerminal |
| **Color** | `yellow` |
| **Trust Tier** | `3` |
| **Produces** | Atomic commits, Execution summaries |

**Capabilities:**
- High-fidelity execution of XML-tagged task plans.
- Autonomous handling of minor technical blockers and deviations.
- Maintaining repository cleanliness through strict staging rules.

---

### mindforge-debugger (The RCA Scientist)
**Trust Tier:** `1`

**Role:** Specialist in systematic root cause analysis and complex defect resolution.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:debug`, `/mindforge:agent debugger` |
| **Tools** | Read, Write, Bash, Grep, Glob, CmdStatus, ReadTerminal, Browser, Context7 |
| **Color** | `orange` |
| **Produces** | `DEBUG-REPORT.md` (RCA) |

**Capabilities:**
- Falsifiable hypothesis testing for non-obvious failures.
- Binary search isolation of defects across layers.
- Implementation of minimal, regression-proof fixes.

---

### mindforge-assumptions-analyzer-extend (The Reality Checker)
**Trust Tier:** `1`

**Role:** Reality checker for identifying hidden codebase constraints and risks.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent assumptions-analyzer-extend` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `blue` |
| **Produces** | `ASSUMPTIONS-REPORT.md` |

**Capabilities:**
- Evidence-based validation of technical assumptions.
- Identifying "impossible" plan tasks early.
- Gap detection between mental models and file-system reality.

---

### mindforge-codebase-mapper (The Explorer)

**Role:** Senior engineer specialized in autonomous codebase discovery and high-fidelity documentation.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:map-codebase`, `/mindforge:agent codebase-mapper` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Trust Tier** | `1` |
| **Produces** | `CONVENTIONS.md`, `STRUCTURE.md` |

**Capabilities:**
- Exploration of unfamiliar brownfield codebases.
- Identification of testing patterns, linting rules, and directory layers.
- Production of [DRAFT] conventions for project alignment.

---

### mindforge-codebase-mapper-extend (The Structuralist)

**Role:** Generates structured maps of tech stacks, architecture, and conventions.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:map-codebase`, `/mindforge:agent codebase-mapper-extend` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Trust Tier** | `1` |
| **Produces** | `STACK.md`, `ARCHITECTURE.md`, `CONVENTIONS.md` |

**Capabilities:**
- Explaining how the codebase *should* be interacted with.
- Context reduction for incoming subagents.
- Inventory of packages, versions, and critical data flows.

---

### mindforge-roadmapper-extend (The Continuity Lead)

**Role:** Enhanced execution strategist focused on requirement traceability and phase continuity.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:milestone`, `/mindforge:agent roadmapper-extend` |
| **Tools** | Read, Write, Bash, Grep, Glob, Browser |
| **Color** | `cyan` |
| **Produces** | `ROADMAP.md`, `STATE.md` |

**Capabilities:**
- Goal-backward phase derivation from requirements.
- Zero-orphan requirement mapping.
- Definition of verifiable behavioral success criteria.

---

---

### mindforge-brainstormer (The Ideation Catalyst)

**Role:** Expert in deep requirements discovery and behavioral ideation.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:brainstorming` |
| **Tools** | Read, Write, Bash, Grep |
| **Color** | `magenta` |
| **Trust Tier** | `1` |

**Capabilities:**
- Proactive discovery of edge cases and user intent.
- Drafting high-fidelity visual companions and behavioral specs.
- Challenging assumptions through Socratic engineering.

---

### mindforge-swarm-pilot (The Parallel Executor)

**Role:** Orchestrates multiple independent implementation tasks simultaneously.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:swarm-execution` |
| **Tools** | Read, Write, Bash, Grep, CmdStatus |
| **Color** | `yellow` |
| **Trust Tier** | `2` |

**Capabilities:**
- Managing independent "Execution Waves".
- Merging parallel contributions with zero conflict.
- Maintaining high-velocity implementation loops.

---

### mindforge-mesh-orchestrator (The Context Guardian)

**Role:** Synchronizes state and context across parallel agent workstreams.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:parallel-mesh` |
| **Tools** | Read, Write, Bash, Grep, Context7 |
| **Color** | `cyan` |
| **Trust Tier** | `2` |

**Capabilities:**
- Maintaining a unified "Shared Reality" for swarms.
- Preventing context drift in complex multi-agent sessions.
- Dynamic propagation of architectural decisions.

---

### mindforge-workspace-manager (The Environment Architect)

**Role:** Manages isolated development environments and project sharding.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:workspace-isolated` |
| **Tools** | Read, Write, Bash, Git |
| **Color** | `blue` |
| **Trust Tier** | `3` |

**Capabilities:**
- Provisioning git worktrees for isolated feature branches.
- Managing workspace cleanup and state protection.
- Ensuring atomic environment parity across branches.

---

### mindforge-skill-author (The Framework Evolver)

**Role:** Expert in authoring and validating new MindForge skills.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:skill-creation` |
| **Tools** | Read, Write, Bash, Grep |
| **Color** | `purple` |
| **Trust Tier** | `3` |

**Capabilities:**
- Drafting [SKILL.md] instructions and tool-chains.
- Validating skill quality against the 7-Dimension Registry.
- Hardening framework protocols for framework-level releases.

---

### mindforge-tdd-master (The Quality Zealot)

**Role:** Enforces strict Test-Driven Development loops with adversarial rigor.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:tdd` |
| **Tools** | Read, Write, Bash, Grep, CmdStatus |
| **Color** | `red` |
| **Trust Tier** | `2` |

**Capabilities:**
- Enforcing Red-Green-Refactor discipline.
- Automated generation of regression-proof test suites.
- Validating implementation against pure behavioral specs.

---

### mindforge-rca-expert (The Forensic Scientist)

**Role:** Principal specialist in advanced root cause analysis and forensic debugging.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:debug_extended` |
| **Tools** | Read, Write, Bash, Grep, CmdStatus, ReadTerminal |
| **Color** | `orange` |
| **Trust Tier** | `2` |

**Capabilities:**
- Log-based forensic reconstruction of failures.
- Identifying systemic architectural flaws.
- Proving fix validity through falsifiable regression tests.

---

### mindforge-neural-orchestrator (The Framework Pilot)

**Role:** The core identity responsible for activating and managing the protocol mesh.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:neural-orchestrator` |
| **Tools** | All |
| **Color** | `white` |
| **Trust Tier** | `3` |

**Capabilities:**
- Booting the MindForge Session Engine.
- Dynamically loading required protocols for the task.
- Enforcing the Master Directive across all sub-agents.

---

### mindforge-user-profiler (The Relationship Manager)

**Role:** Analyzes session history to personalize agent interactions and technical alignment.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent user-profiler` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `magenta` |
| **Trust Tier** | `1` |
| **Produces** | `USER-PROFILE.md` |

**Capabilities:**
- Identifying technical preferences and risk tolerance from logs.
- Generating imperative interaction directives for other agents.
- Evidence-based scoring of developer working patterns.

---

## Swarm Clusters (The Agentic Mesh) [v4.2]

MindForge V4 introduces the ability to spawn dynamic, task-aware clusters of specialist personas. These swarms work in parallel with shared state to solve complex enterprise challenges.

### Enterprise Swarm Templates

| Swarm | Leader | Members | Focus |
| :--- | :--- | :--- | :--- |
| **UISwarm** | ui-auditor | developer, accessibility, whimsy-injector | Visual fidelity, interaction, WCAG 2.2 |
| **BackendSwarm** | architect | developer, security-reviewer, db-optimizer | Architecture, performance, API versioning |
| **SecuritySwarm** | security-reviewer | architect, developer, threat-detection | OWASP mitigation, secret detection |
| **AIEngineeringSwarm** | ai-engineer | prompt-engineer, developer, model-qa | Hallucination mitigation, grounding |
| **IncidentResponse** | sre-engineer | developer, incident-commander, debugger | RCA, hotfix, post-mortem |
| **ComplianceSwarm** | compliance-auditor | legal-compliance, architect, security | GDPR/SOC2 alignment, PII masking |
| **IdentityTrustSwarm** | identity-architect | security-reviewer, architect, blockchain | Zero-Trust, DID-based signing |
| **DataMeshSwarm** | data-engineer | db-optimizer, analyst, compliance | Lakehouse patterns, ETL integrity |
| **NeuralSwarm** | mesh-orchestrator | brainstormer, swarm-pilot, workspace-manager | High-fidelity protocol execution |

### Swarm Governance Protocols

- **Trust Tiers**: Swarms are enforced by ZTAI (Zero-Trust Agentic Identity) tiers (0-3).
- **Decision Gates**: High-risk swarms (e.g., Compliance) use **Human-in-the-Loop (HITL)** gates.
- **Resource Budgets**: Performance-aware routing based on confidence-to-cost (C2C) ratios.
- **Mesh Synthesis**: The Swarm Leader synthesizes all specialist outputs into a single, cohesive `SWARM-SUMMARY`.

---

### MF-Series: Fundamental Framework Identities

The MF-Series represents the "Core Essence" of the MindForge agentic framework. These personas provide a standardized, high-value foundation for delegation and multi-agent interaction.

#### mf-planner (The Strategist)
**Trust Tier:** `1`
**Role:** High-level goal decomposition and structured planning.
- **Triggers:** `plan`, `decompose`, `roadmap`.
- **Produces:** Structured JSON/Markdown execution plans.

#### mf-executor (The Pilot)
**Trust Tier:** `3`
**Role:** Precise implementation and high-fidelity plan execution.
- **Triggers:** `execute`, `implement`, `fix`.
- **Produces:** Implementation details and completion status.

#### mf-researcher (The Detective)
**Trust Tier:** `1`
**Role:** Knowledge gathering and objective approach comparison.

- **Triggers:** `research`, `explore`, `benchmark`.
- **Produces:** Tradeoff analysis and strategy recommendations.

#### mf-reviewer (The Auditor)
**Trust Tier:** `1`
**Role:** Quality assurance and output validation.

- **Triggers:** `review`, `audit`, `validate`.
- **Produces:** Feedback, issues, and approval status.

#### mf-memory (The Clerk)
**Trust Tier:** `1`
**Role:** Persistence management and knowledge graph maintenance.

- **Triggers:** `remember`, `store`, `learning`.
- **Produces:** Memory updates and linked patterns.

#### mf-tool (The Operator)
**Trust Tier:** `2`
**Role:** Safe external system interaction and tool execution.
- **Triggers:** `tool`, `git`, `api`, `shell`.
- **Produces:** Action results and safety logs.

---

### Invocation Matrix

MindForge identities can be invoked through multiple channels depending on your environment.

| Method | Syntax | Use Case |
| :--- | :--- | :--- |
| **In-IDE (Command)** | `/mindforge:agent <name>` | Quick task delegation while coding. |
| **In-IDE (Persona)** | Use `mf-planner` etc. | Specialized logic for complex phases. |
| **CLI (Execution)** | `mindforge-cli spawn <name>` | CI/CD pipelines and remote execution. |
| **CLI (Identity)** | `mindforge-cli identity <role>` | Direct loading of specialized research identities. |
| **Shell (Global)** | `mindforge <command>` | Fast access from any terminal directory. |

---

### Specialized Workflows

These high-fidelity workflows bridge multiple skills and personas to solve specific engineering challenges.

| Workflow | Command | Context / Skill |
| :--- | :--- | :--- |
| **TDD Loop** | `/mindforge:tdd` | mindforge-tdd skill |
| **System Architecture** | `/mindforge:architecture` | mindforge-system-architecture skill |
| **Strategic Planning** | `/mindforge:planner` | mf-planner persona |
| **Implementation Pilot** | `/mindforge:executor` | mf-executor persona |

---

| Persona | Read | Write | Bash | Grep | Glob | CmdStatus | Browser | Terminal | Context7 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Analyst** | ✓ | ✓ | ✓ | ✓ | | | | | |
| **Architect** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| **Developer** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | ✓ |
| **QA Engineer** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Security Reviewer** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Debug Specialist** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ |
| **Roadmapper** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| **Assumptions Analyzer** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| **Research Agent** | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | | ✓ |
| **Decision Architect** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Release Manager** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Tech Writer** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | ✓ |
| **Coverage Specialist** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Advisor Researcher** | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | | ✓ |
| **Project Researcher** | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | | ✓ |
| **Research Synthesizer** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| **UI Researcher** | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | | ✓ |
| **Phase Researcher** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | ✓ |
| **Planner** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| **Integration Checker** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| **Nyquist Auditor** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | |
| **Plan Checker** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| **UI Auditor** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| **UI Checker** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| **Verifier** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| **Executor** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | |
| **Debugger** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Assumptions (Ext)** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| **Codebase Map (Ext)** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| **Roadmapper (Ext)** | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | | |
| **User Profiler** | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |

**Principle of Least Privilege:**
- **Analyzers** and **Architects** primarily use discovery tools to inform design.
- **Executors** (Developer/Executor) have the broadest implementation access.
- **Security** and **QA** have specialized tools for validation and auditing.
- **Researchers** have browser access for external documentation.
