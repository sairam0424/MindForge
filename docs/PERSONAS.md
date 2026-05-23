# MindForge Persona Reference

> A comprehensive guide to the 79 specialized enterprise personas — roles, tools, and orchestration patterns.

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
| **Security & Compliance** | 6 | authentication-architect, compliance-auditor, data-privacy-engineer, dependency-auditor, incident-commander (+ existing security-reviewer) |
| **Architecture & System Design** | 8 | api-designer, api-gateway-architect, cloud-architect, domain-modeler, event-driven-architect, monorepo-architect, queue-architect, state-machine-designer |
| **Frontend & UX** | 10 | a11y-architect, accessibility-tester, browser-extension-architect, design-system-engineer, frontend-architect, internationalization-expert, react-specialist, tailwind-specialist, ux-auditor, seo-specialist |
| **Performance & Reliability** | 5 | api-load-tester, caching-strategist, chaos-engineer, performance-optimizer, build-optimizer |
| **Data & ML** | 4 | data-engineer, database-expert, ml-engineer, search-engineer |
| **DevOps & Infrastructure** | 6 | backup-recovery-specialist, config-management-expert, devops-engineer, kubernetes-debugger, logging-architect, observability-engineer |
| **Language Specialists** | 5 | go-specialist, java-specialist, python-specialist, rust-specialist, typescript-wizard |
| **DX & Operations** | 8 | cli-designer, code-archeologist, code-explorer, git-forensics, git-workflow-expert, migration-specialist, onboarding-guide, sdk-designer |
| **Strategy & Review** | 9 | cost-analyst, product-manager, prompt-engineer, refactoring-expert, senior-reviewer, spec-reviewer, tech-debt-analyst, tech-stack-selector, technical-interviewer |
| **Specialized** | 10 | concurrency-expert, email-systems-engineer, error-handling-architect, graphql-specialist, mobile-engineer, real-time-engineer, regex-craftsman, webhook-designer, contract-tester, test-data-engineer |

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

### mindforge-sre-engineer (The Remediation Pilot)

**Role:** Senior SRE specialist responsible for incident replication and remediation design. Operates across the Shadow Mirror (Level 1/2) to prove fix validity.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `checkSRESignals()`, `/mindforge:agent sre-engineer` |
| **Tools** | Read, Write, Bash, Grep, Git, Docker, CmdStatus |
| **Color** | `red` |
| **Trust Tier** | `3` |
| **Produces** | `REMEDIATION-PLAN.md`, SLI Reports |

**Capabilities:**
- Autonomous incident reconstruction in isolated environments.
- Drafting minimal-impact production hotfixes.
- Validating SLI deltas (Error Rate/Latency) post-fix.

---

### mindforge-sre-auditor (The Elite Gatekeeper)

**Role:** Principal SRE Auditor responsible for the final safety verdict on production remediation. **Locked to Claude 4.5 Opus** for highest-fidelity reasoning.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `REMEDIATION_WAVE`, `/mindforge:agent sre-auditor` |
| **Tools** | Read, Write, Bash, Grep, CmdStatus |
| **Color** | `black` |
| **Trust Tier** | `3` |
| **Produces** | `REMEDIATION-VERDICT.md` |

**Capabilities:**
- Adversarial multi-pass review of remediation plans.
- Enforcement of the "Chaos Resistance" standard.
- Final GO/NO-GO authority for production application.

---

## New Persona Details (v10 — Bedrock Meridian)

---

### mindforge-authentication-architect (The Auth Fortress)

**Role:** Designs authentication and identity systems using OAuth2, OIDC, MFA, and zero-trust patterns.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent authentication-architect` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `red` |
| **Trust Tier** | `3` |

---

### mindforge-compliance-auditor (The Regulatory Sentinel)

**Role:** Ensures every data flow and system interaction meets GDPR, SOC2, and HIPAA regulatory requirements.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent compliance-auditor` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `red` |
| **Trust Tier** | `3` |

---

### mindforge-data-privacy-engineer (The PII Guardian)

**Role:** Protects user data through engineering controls — classification, masking, retention, and encryption.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent data-privacy-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `red` |
| **Trust Tier** | `3` |

---

### mindforge-dependency-auditor (The Supply Chain Watchdog)

**Role:** Audits dependency trees for CVEs, license violations, and malicious packages before they enter production.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent dependency-auditor` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `red` |
| **Trust Tier** | `3` |

---

### mindforge-incident-commander (The Crisis Marshal)

**Role:** Leads incident response — triaging severity, coordinating responders, and driving root cause analysis to resolution.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent incident-commander` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `red` |
| **Trust Tier** | `3` |

---

### mindforge-api-designer (The Contract Crafter)

**Role:** Designs clean, versioned, consumer-friendly API contracts following REST, GraphQL, and gRPC best practices.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent api-designer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `2` |

---

### mindforge-api-gateway-architect (The Gateway Guardian)

**Role:** Architects API gateway patterns — rate limiting, auth delegation, routing, and observability at the edge.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent api-gateway-architect` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `2` |

---

### mindforge-cloud-architect (The Cloud Navigator)

**Role:** Designs cloud-native architectures across AWS, GCP, and Azure with cost optimization and resilience.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent cloud-architect` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `2` |

---

### mindforge-domain-modeler (The Domain Sculptor)

**Role:** Models business domains using DDD patterns — bounded contexts, aggregates, and ubiquitous language.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent domain-modeler` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `2` |

---

### mindforge-event-driven-architect (The Event Weaver)

**Role:** Designs event-driven systems — event sourcing, CQRS, saga patterns, and message bus topologies.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent event-driven-architect` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `2` |

---

### mindforge-monorepo-architect (The Repo Unifier)

**Role:** Architects monorepo strategies — workspace boundaries, build caching, dependency management, and CI optimization.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent monorepo-architect` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `2` |

---

### mindforge-queue-architect (The Message Orchestrator)

**Role:** Designs message queue architectures — ordering guarantees, dead-letter patterns, backpressure, and exactly-once delivery.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent queue-architect` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `2` |

---

### mindforge-state-machine-designer (The State Cartographer)

**Role:** Designs finite state machines for complex business workflows — transitions, guards, and side-effects.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent state-machine-designer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `2` |

---

### mindforge-a11y-architect (The Inclusion Architect)

**Role:** Designs accessibility-first architectures ensuring WCAG 2.2 AA compliance across all user interfaces.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent a11y-architect` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `magenta` |
| **Trust Tier** | `2` |

---

### mindforge-accessibility-tester (The A11y Validator)

**Role:** Tests and validates accessibility compliance using automated and manual techniques across screen readers and input methods.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent accessibility-tester` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `magenta` |
| **Trust Tier** | `1` |

---

### mindforge-browser-extension-architect (The Extension Engineer)

**Role:** Architects browser extensions with proper manifest design, content scripts, and secure messaging patterns.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent browser-extension-architect` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `magenta` |
| **Trust Tier** | `2` |

---

### mindforge-design-system-engineer (The Design System Smith)

**Role:** Builds and maintains design systems — tokens, component APIs, theming, and cross-platform consistency.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent design-system-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `magenta` |
| **Trust Tier** | `2` |

---

### mindforge-frontend-architect (The Frontend Foundation)

**Role:** Architects frontend systems — state management, rendering strategies, module boundaries, and performance budgets.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent frontend-architect` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `magenta` |
| **Trust Tier** | `2` |

---

### mindforge-internationalization-expert (The I18n Specialist)

**Role:** Implements internationalization and localization — plural rules, RTL support, date/number formatting, and translation workflows.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent internationalization-expert` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `magenta` |
| **Trust Tier** | `1` |

---

### mindforge-react-specialist (The React Virtuoso)

**Role:** Expert in React patterns — hooks, suspense, server components, concurrent features, and performance optimization.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent react-specialist` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `magenta` |
| **Trust Tier** | `1` |

---

### mindforge-tailwind-specialist (The Utility Stylist)

**Role:** Masters Tailwind CSS — custom configurations, plugin authoring, design token mapping, and responsive patterns.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent tailwind-specialist` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `magenta` |
| **Trust Tier** | `1` |

---

### mindforge-ux-auditor (The UX Examiner)

**Role:** Audits user experiences for usability, cognitive load, information architecture, and interaction design quality.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent ux-auditor` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `magenta` |
| **Trust Tier** | `1` |

---

### mindforge-seo-specialist (The Search Optimizer)

**Role:** Optimizes web properties for search engines — technical SEO, structured data, Core Web Vitals, and crawl efficiency.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent seo-specialist` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `magenta` |
| **Trust Tier** | `1` |

---

### mindforge-api-load-tester (The Load Breaker)

**Role:** Designs and executes load testing strategies to identify breaking points, bottlenecks, and capacity limits.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent api-load-tester` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `orange` |
| **Trust Tier** | `2` |

---

### mindforge-caching-strategist (The Cache Architect)

**Role:** Designs caching strategies — invalidation patterns, cache hierarchies, TTL policies, and consistency trade-offs.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent caching-strategist` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `orange` |
| **Trust Tier** | `2` |

---

### mindforge-chaos-engineer (The Chaos Scientist)

**Role:** Designs chaos experiments to validate system resilience — failure injection, blast radius analysis, and recovery verification.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent chaos-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `orange` |
| **Trust Tier** | `2` |

---

### mindforge-performance-optimizer (The Speed Demon)

**Role:** Profiles and optimizes system performance — CPU, memory, I/O, network, and algorithmic bottlenecks.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent performance-optimizer` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `orange` |
| **Trust Tier** | `2` |

---

### mindforge-build-optimizer (The Build Accelerator)

**Role:** Optimizes build pipelines — parallelization, caching, incremental builds, and dependency graph pruning.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent build-optimizer` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `orange` |
| **Trust Tier** | `2` |

---

### mindforge-data-engineer (The Pipeline Architect)

**Role:** Designs data pipelines — ETL/ELT workflows, schema evolution, data quality checks, and lakehouse patterns.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent data-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `blue` |
| **Trust Tier** | `2` |

---

### mindforge-database-expert (The Data Modeler)

**Role:** Designs database schemas, query optimization, indexing strategies, and migration patterns across SQL and NoSQL systems.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent database-expert` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `blue` |
| **Trust Tier** | `2` |

---

### mindforge-ml-engineer (The ML Craftsman)

**Role:** Builds ML systems — feature engineering, model training, evaluation pipelines, and production serving infrastructure.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent ml-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `blue` |
| **Trust Tier** | `2` |

---

### mindforge-search-engineer (The Relevance Engineer)

**Role:** Designs search systems — indexing strategies, relevance tuning, faceted search, and hybrid vector/keyword retrieval.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent search-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `blue` |
| **Trust Tier** | `2` |

---

### mindforge-backup-recovery-specialist (The DR Planner)

**Role:** Designs backup and disaster recovery strategies — RPO/RTO targets, replication, and failover orchestration.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent backup-recovery-specialist` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `green` |
| **Trust Tier** | `2` |

---

### mindforge-config-management-expert (The Config Guardian)

**Role:** Manages configuration systems — feature flags, environment promotion, secret rotation, and config drift detection.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent config-management-expert` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `green` |
| **Trust Tier** | `2` |

---

### mindforge-devops-engineer (The Pipeline Engineer)

**Role:** Builds CI/CD pipelines — automated testing, deployment strategies, infrastructure as code, and release automation.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent devops-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `green` |
| **Trust Tier** | `2` |

---

### mindforge-kubernetes-debugger (The K8s Doctor)

**Role:** Diagnoses and resolves Kubernetes issues — pod failures, networking, resource limits, and cluster health.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent kubernetes-debugger` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `green` |
| **Trust Tier** | `2` |

---

### mindforge-logging-architect (The Log Architect)

**Role:** Designs structured logging systems — log levels, correlation IDs, aggregation pipelines, and alerting thresholds.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent logging-architect` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `green` |
| **Trust Tier** | `2` |

---

### mindforge-observability-engineer (The Observability Pilot)

**Role:** Builds observability stacks — metrics, traces, logs, SLOs, and automated anomaly detection.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent observability-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `green` |
| **Trust Tier** | `2` |

---

### mindforge-go-specialist (The Gopher Guide)

**Role:** Expert in Go idioms — goroutines, channels, interfaces, error handling, and high-performance systems programming.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent go-specialist` |
| **Tools** | Read, Write, Bash, Grep, Glob, Context7 |
| **Color** | `cyan` |
| **Trust Tier** | `1` |

---

### mindforge-java-specialist (The JVM Master)

**Role:** Expert in Java/JVM ecosystem — Spring Boot, concurrency, GC tuning, and enterprise patterns.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent java-specialist` |
| **Tools** | Read, Write, Bash, Grep, Glob, Context7 |
| **Color** | `cyan` |
| **Trust Tier** | `1` |

---

### mindforge-python-specialist (The Pythonista)

**Role:** Expert in Python ecosystem — async patterns, type hints, packaging, scientific computing, and web frameworks.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent python-specialist` |
| **Tools** | Read, Write, Bash, Grep, Glob, Context7 |
| **Color** | `cyan` |
| **Trust Tier** | `1` |

---

### mindforge-rust-specialist (The Borrow Checker)

**Role:** Expert in Rust — ownership, lifetimes, trait systems, unsafe code auditing, and zero-cost abstractions.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent rust-specialist` |
| **Tools** | Read, Write, Bash, Grep, Glob, Context7 |
| **Color** | `cyan` |
| **Trust Tier** | `1` |

---

### mindforge-typescript-wizard (The Type Sorcerer)

**Role:** Expert in TypeScript — advanced generics, conditional types, mapped types, and type-safe architecture patterns.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent typescript-wizard` |
| **Tools** | Read, Write, Bash, Grep, Glob, Context7 |
| **Color** | `cyan` |
| **Trust Tier** | `1` |

---

### mindforge-cli-designer (The CLI Crafter)

**Role:** Designs developer CLI tools — argument parsing, output formatting, progressive disclosure, and shell integration.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent cli-designer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `yellow` |
| **Trust Tier** | `1` |

---

### mindforge-code-archeologist (The Code Historian)

**Role:** Investigates legacy codebases — decoding intent from ancient code, tracing evolutionary patterns, and documenting tribal knowledge.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent code-archeologist` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `yellow` |
| **Trust Tier** | `1` |

---

### mindforge-code-explorer (The Codebase Navigator)

**Role:** Rapidly navigates unfamiliar codebases — identifying patterns, conventions, and architectural decisions.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent code-explorer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `yellow` |
| **Trust Tier** | `1` |

---

### mindforge-git-forensics (The Git Detective)

**Role:** Performs git archaeology — blame analysis, bisect workflows, merge conflict resolution, and history reconstruction.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent git-forensics` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `yellow` |
| **Trust Tier** | `1` |

---

### mindforge-git-workflow-expert (The Branch Strategist)

**Role:** Designs git workflows — branching strategies, PR conventions, release flows, and CI/CD integration patterns.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent git-workflow-expert` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `yellow` |
| **Trust Tier** | `1` |

---

### mindforge-migration-specialist (The Migration Pilot)

**Role:** Plans and executes system migrations — database migrations, API versioning, framework upgrades, and zero-downtime transitions.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent migration-specialist` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `yellow` |
| **Trust Tier** | `1` |

---

### mindforge-onboarding-guide (The Welcome Guide)

**Role:** Creates developer onboarding experiences — documentation, starter templates, and progressive learning paths.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent onboarding-guide` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `yellow` |
| **Trust Tier** | `1` |

---

### mindforge-sdk-designer (The SDK Artisan)

**Role:** Designs developer SDKs — API ergonomics, type safety, error handling patterns, and cross-language consistency.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent sdk-designer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `yellow` |
| **Trust Tier** | `1` |

---

### mindforge-cost-analyst (The Cost Optimizer)

**Role:** Analyzes infrastructure and operational costs — identifying waste, forecasting spend, and recommending optimizations.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent cost-analyst` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `1` |

---

### mindforge-product-manager (The Product Shepherd)

**Role:** Translates business objectives into technical requirements — prioritization, roadmapping, and stakeholder alignment.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent product-manager` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `2` |

---

### mindforge-prompt-engineer (The Prompt Architect)

**Role:** Designs and optimizes LLM prompts — system prompts, few-shot examples, chain-of-thought patterns, and evaluation frameworks.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent prompt-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `1` |

---

### mindforge-refactoring-expert (The Refactoring Surgeon)

**Role:** Plans and executes large-scale refactoring — extract/inline patterns, dependency inversion, and safe transformation sequences.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent refactoring-expert` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `2` |

---

### mindforge-senior-reviewer (The Code Sage)

**Role:** Performs staff-engineer-level code reviews — architectural coherence, maintainability, and long-term technical health.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent senior-reviewer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `2` |

---

### mindforge-spec-reviewer (The Spec Auditor)

**Role:** Reviews technical specifications for completeness, ambiguity, testability, and implementation feasibility.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent spec-reviewer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `1` |

---

### mindforge-tech-debt-analyst (The Debt Inspector)

**Role:** Identifies, quantifies, and prioritizes technical debt — creating paydown roadmaps with business-impact justification.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent tech-debt-analyst` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `1` |

---

### mindforge-tech-stack-selector (The Stack Evaluator)

**Role:** Evaluates technology stacks — framework comparisons, ecosystem health, team fit, and long-term maintenance cost.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent tech-stack-selector` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `1` |

---

### mindforge-technical-interviewer (The Interview Architect)

**Role:** Designs technical interview processes — coding challenges, system design questions, and evaluation rubrics.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent technical-interviewer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Trust Tier** | `1` |

---

### mindforge-concurrency-expert (The Concurrency Guardian)

**Role:** Designs concurrent and parallel systems — lock-free algorithms, race condition prevention, and thread safety patterns.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent concurrency-expert` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Trust Tier** | `2` |

---

### mindforge-email-systems-engineer (The Email Engineer)

**Role:** Builds email systems — SMTP configuration, deliverability optimization, template engines, and transactional workflows.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent email-systems-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Trust Tier** | `1` |

---

### mindforge-error-handling-architect (The Error Strategist)

**Role:** Designs error handling architectures — error hierarchies, recovery strategies, user-facing messages, and error boundaries.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent error-handling-architect` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Trust Tier** | `1` |

---

### mindforge-graphql-specialist (The Graph Resolver)

**Role:** Designs GraphQL APIs — schema design, resolver patterns, N+1 prevention, federation, and subscription architecture.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent graphql-specialist` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Trust Tier** | `2` |

---

### mindforge-mobile-engineer (The Mobile Architect)

**Role:** Builds mobile applications — React Native, Flutter, platform APIs, offline-first patterns, and app store optimization.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent mobile-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Trust Tier** | `2` |

---

### mindforge-real-time-engineer (The Real-Time Specialist)

**Role:** Builds real-time systems — WebSockets, Server-Sent Events, CRDT-based collaboration, and presence architectures.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent real-time-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Trust Tier** | `2` |

---

### mindforge-regex-craftsman (The Pattern Artisan)

**Role:** Crafts precise regular expressions — pattern optimization, catastrophic backtracking prevention, and cross-engine compatibility.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent regex-craftsman` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Trust Tier** | `1` |

---

### mindforge-webhook-designer (The Webhook Architect)

**Role:** Designs webhook systems — delivery guarantees, retry policies, signature verification, and fan-out patterns.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent webhook-designer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Trust Tier** | `1` |

---

### mindforge-contract-tester (The Contract Verifier)

**Role:** Implements contract testing — consumer-driven contracts, provider verification, and schema evolution validation.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent contract-tester` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Trust Tier** | `2` |

---

### mindforge-test-data-engineer (The Test Data Smith)

**Role:** Designs test data strategies — factories, fixtures, synthetic data generation, and production data anonymization.

| Property | Value |
| :--- | :--- |
| **Spawned by** | `/mindforge:agent test-data-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Trust Tier** | `1` |

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
+| **SRE Engineer** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | |
+| **SRE Auditor** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | |

**Principle of Least Privilege:**
- **Analyzers** and **Architects** primarily use discovery tools to inform design.
- **Executors** (Developer/Executor) have the broadest implementation access.
- **Security** and **QA** have specialized tools for validation and auditing.
- **Researchers** have browser access for external documentation.
