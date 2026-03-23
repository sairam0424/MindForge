# MindForge Persona Reference

> A comprehensive guide to the 31 specialized enterprise personas — roles, tools, and orchestration patterns.

---

## Overview

MindForge uses a multi-agent orchestration model where specialized personas are invoked to handle specific phases of the project lifecycle. Each persona is defined with a unique role, high-fidelity XML-tagged process, and strict tool permissions to ensure security and precision.

### Persona Categories

| Category | Count | Personas |
|----------|-------|--------|
| **Analyzers & Researchers** | 8 | analyst, assumptions-analyzer, advisor-researcher, assumptions-analyzer-extend, project-researcher, research-synthesizer, ui-researcher, research-agent |
| **Architects & Planners** | 5 | architect, decision-architect, planner, phase-researcher, plan-checker |
| **Executors** | 2 | developer, executor |
| **Quality & Security** | 8 | qa-engineer, security-reviewer, coverage-specialist, ui-auditor, ui-checker, nyquist-auditor, integration-checker, verifier |
| **Strategy & Ops** | 5 | roadmapper, release-manager, tech-writer, roadmapper-extend, user-profiler |
| **Debuggers** | 2 | debug-specialist, debugger |
| **Mapping** | 1 | codebase-mapper-extend |

---

## Persona Details

### mindforge-analyst (The Requirements Engineer)
**Role:** Translates ambiguous business intent into precise, testable, scoped specifications.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:init-project`, `/mindforge:plan-phase`, `/mindforge:agent analyst` |
| **Tools** | Read, Write, Bash, Grep |
| **Color** | `blue` |
| **Produces** | `.planning/REQUIREMENTS.md`, `.planning/PROJECT.md` |

**Capabilities:**
- Socratic clarification loops to resolve ambiguity.
- Drafting acceptance-driven functional/non-functional requirements.
- Defining project scope and exclusions.

---

### mindforge-architect (The System Designer)
**Role:** Principal systems architect and technical decision maker. Responsible for system design, data modeling, and architectural integrity.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent architect` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Produces** | `.planning/ARCHITECTURE.md`, `.planning/decisions/ADR-*.md` |

**Capabilities:**
- First-principles evaluation of technical trade-offs.
- Data-first design and component boundary definition.
- Writing Architectural Decision Records (ADRs).

---

### mindforge-developer (The Engine of Execution)
**Role:** Senior software engineer. Writes clean, minimal, well-tested code following strict naming and architectural conventions.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:execute-phase`, `/mindforge:agent developer` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `green` |
| **Produces** | Source code, Unit tests, Implementation Summaries |

**Capabilities:**
- Implementation of logical changes with zero scope creep.
- Writing co-located unit tests for every feature.
- Atomic commit discipline.

---

### mindforge-qa-engineer (The Adversarial Verifier)
**Role:** Senior test engineer. Thinks adversarially to find failure modes, boundary conditions, and logic gaps.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:verify-phase`, `/mindforge:agent qa-engineer` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `yellow` |
| **Produces** | `UAT.md`, `BUGS.md` |

**Capabilities:**
- Stress-testing inputs and identifying silent failures.
- Zero-tolerance regression verification.
- Objective PASS/FAIL signing of phase goals.

---

### mindforge-security-reviewer (The Gatekeeper)
**Role:** Senior application security engineer. Reviews code for vulnerabilities, hardcoded secrets, and compliance with the OWASP Top 10.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:security-scan`, `/mindforge:agent security-reviewer` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `red` |
| **Produces** | `SECURITY-REVIEW.md` |

**Capabilities:**
- Automated and manual scanning for hardcoded secrets.
- Systematic OWASP Top 10 evaluation.
- Dependency vulnerability auditing.

---

### mindforge-debug-specialist (The Root Cause Expert)
**Role:** Principal engineering specialist in production debugging and root cause analysis (RCA). Solves complex defects by finding causes, not patching symptoms.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:debug`, `/mindforge:agent debug-specialist` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus, ReadTerminal |
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
|----------|-------|
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
|----------|-------|
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
|----------|-------|
| **Spawned by** | `/mindforge:research`, `/mindforge:agent research-agent` |
| **Tools** | Read, Write, Bash, Grep, Glob, Browser |
| **Color** | `cyan` |
| **Produces** | `RESEARCH-NOTES-*.md` |

**Capabilities:**
- Exhaustive ingestion of external documentation and local source.
- Extraction of patterns, performance limits, and integration pitfalls.
- Evidence-based recommendations with full citations.

---

### mindforge-decision-architect (The Chief of Logic)
**Role:** Principal engineering lead. Synthesizes research and audits into actionable architectural verdicts and roadmap adjustments.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent decision-architect` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Produces** | `DECISION-*.md` |

**Capabilities:**
- Synthesis of conflicting research and audit data.
- Force-balancing of technical trade-offs.
- Updating project stack and roadmap based on verdicts.

---

### mindforge-release-manager (The Delivery Gatekeeper)
**Role:** Senior release manager. Ensures every release is traceable, reversible, and communicated through structured semver and changelogs.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:release`, `/mindforge:agent release-manager` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `blue` |
| **Produces** | `CHANGELOG.md`, Git tags, Release Notes |

**Capabilities:**
- Verification of UAT and Security sign-offs before tagging.
- Correct application of Semantic Versioning (SemVer).
- Synthesis of multi-phase implementation summaries into human-readable logs.

---

### mindforge-tech-writer (The Doc Specialist)
**Role:** Senior technical writer. Produces minimal, high-utility documentation for developers and stakeholders.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:ship`, `/mindforge:agent tech-writer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Produces** | `README.md`, API Reference, Runbooks |

**Capabilities:**
- Translation of complex engineering concepts into "Developer-First" documentation.
- Ensuring instructions are tested and verified before publication.
- Optimization for "Time to First Value".

---

### mindforge-coverage-specialist (The Logic Auditor)
**Role:** Senior test engineer specialized in logic sampling and adversarial gap detection (Nyquist-level coverage).

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:validate-phase`, `/mindforge:agent coverage-specialist` |
| **Tools** | Read, Write, Bash, Grep, Glob, CommandStatus |
| **Color** | `yellow` |
| **Produces** | `COVERAGE-AUDIT.md` |

**Capabilities:**
- Detection of logic gaps in core business logic.
- Adversarial state sampling (testing states the developer missed).
- **Strictly read-only for `src/`**: only modifies test files.

---

### mindforge-advisor-researcher (The Trade-off Specialist)
**Role:** Researches single decision points and provides structured comparisons with rationale.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:research`, `/mindforge:agent advisor-researcher` |
| **Tools** | Read, Write, Bash, Grep, Glob, Browser |
| **Color** | `cyan` |
| **Produces** | Comparison tables, Rationale documents |

**Capabilities:**
- Structured evaluation of technical trade-offs between libraries or patterns.
- Data-driven recommendations grounded in codebase constraints.
- Identifying architectural impact and risk surface.

---

### mindforge-project-researcher (The Ecosystem Explorer)
**Role:** Researches the technical ecosystem for new projects or milestones.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:init-project`, `/mindforge:agent project-researcher` |
| **Tools** | Read, Write, Bash, Grep, Glob, Browser |
| **Color** | `purple` |
| **Produces** | `SUMMARY.md`, `STACK.md`, `ARCHITECTURE.md` |

**Capabilities:**
- Investigation of third-party integrations and platform limitations.
- Mapping high-level technical requirements to specific stack choices.
- Initial feasibility analysis for large-scale features.

---

### mindforge-research-synthesizer (The Strategy Fuser)
**Role:** Synthesizes research outputs from multiple parallel agents into a cohesive strategy.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:research`, `/mindforge:agent research-synthesizer` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `purple` |
| **Produces** | Integrated `SUMMARY.md` |

**Capabilities:**
- Consolidating fragmented findings into a unified technical direction.
- Identifying cross-cutting patterns and risks.
- Providing "Commanders Intent" for the Roadmapper.

---

### mindforge-ui-researcher (The Visual Architect)
**Role:** Produces design contracts (UI-SPEC.md) for frontend phases.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent ui-researcher` |
| **Tools** | Read, Write, Bash, Grep, Glob, Browser |
| **Color** | `#E879F9` |
| **Produces** | `UI-SPEC.md` |

**Capabilities:**
- Defining design tokens, typography, and spacing scales.
- Inventing and specifying component-level behaviors.
- Drafting final user-facing copywriting for critical flows.

---

### mindforge-phase-researcher (The Domain Deep-Diver)
**Role:** Investigates the specific technical domain or codebase area for an active phase.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent phase-researcher` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `blue` |
| **Produces** | `RESEARCH.md` |

**Capabilities:**
- Deep-codebase discovery to identify existing patterns.
- Surface-area analysis of proposed changes.
- Locating undocumented side-effects and technical traps.

---

### mindforge-planner (The Task Architect)
**Role:** Decomposes phase goals into precise, atomic, executable implementation plans.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent planner` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `blue` |
| **Produces** | `PLAN-*.md` (XML task breakdown) |

**Capabilities:**
- Goal-backward task decomposition.
- Precise dependency mapping between implementation steps.
- Defining verification steps for every atomic task.

---

### mindforge-integration-checker (The Connection Auditor)
**Role:** Verifies cross-component wiring, API consumers, and end-to-end user flows.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:verify-phase`, `/mindforge:agent integration-checker` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `blue` |
| **Produces** | `INTEGRATION-REPORT.md` |

**Capabilities:**
- Tracing data flows from source to UI rendering.
- Identifying orphaned components and broken API connections.
- Auditing sensitive routes for required auth protection.

---

### mindforge-nyquist-auditor (The Fidelity Inspector)
**Role:** Specialized verification auditor focused on filling testing gaps.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:validate-phase`, `/mindforge:agent nyquist-auditor` |
| **Tools** | Read, Write, Bash, Grep, Glob, CmdStatus, ReadTerminal |
| **Color** | `#8B5CF6` |
| **Produces** | `VALIDATION-REPORT.md` |

**Capabilities:**
- Identifying "sampling gaps" in automated test suites.
- Generating minimal, high-impact behavioral tests.
- Escalating implementation bugs found during audit.

---

### mindforge-plan-checker (The Logic Guard)
**Role:** Verifies implementation plans against project goals and constraints.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent plan-checker` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `yellow` |
| **Produces** | `PLAN-VERDICT.md` |

**Capabilities:**
- Detecting missing tasks or logical errors in plans.
- Ensuring hard dependencies are respected.
- Checking for alignment with ARCHITECTURE.md and ADRs.

---

### mindforge-ui-auditor (The Polish Inspector)
**Role:** Performs retroactive visual and interaction audits of UI code.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:verify-phase`, `/mindforge:agent ui-auditor` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `#F472B6` |
| **Produces** | `UI-REVIEW.md` |

**Capabilities:**
- 6-Pillar audit of copywriting, visuals, color, type, spacing, and experience.
- Identifying "skeleton UI" and missing loading states.
- Providing specific, coordinate-based visual fix-its.

---

### mindforge-ui-checker (The Design Gatekeeper)
**Role:** Validates UI-SPEC.md design contracts before planning starts.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:plan-phase`, `/mindforge:agent ui-checker` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `#22D3EE` |
| **Produces** | `UI-SPEC-VERDICT.md` |

**Capabilities:**
- Ensuring design tokens follow a disciplined spacing and type scale.
- Blocking vague design requirements or missing empty states.
- Verifying that final copywriting is professional and noun+verb based.

---

### mindforge-verifier (The Goal Sentinel)
**Role:** Principal specialist in goal-backward verification.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:verify-phase`, `/mindforge:agent verifier` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `green` |
| **Produces** | `VERIFICATION.md` |

**Capabilities:**
- Multi-level truth verification (Existence, Substance, Wiring).
- Mapping code artifacts back to specific Requirement IDs.
- Detecting "hollow implementation" (stubs/TODOs) in finished work.

---

### mindforge-executor (The Implementation Pilot)
**Role:** Executes implementation plans with atomic commit discipline.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:execute-phase`, `/mindforge:agent executor` |
| **Tools** | Read, Write, Bash, Grep, Glob, CmdStatus, ReadTerminal |
| **Color** | `yellow` |
| **Produces** | Atomic commits, Execution summaries |

**Capabilities:**
- High-fidelity execution of XML-tagged task plans.
- Autonomous handling of minor technical blockers and deviations.
- Maintaining repository cleanliness through strict staging rules.

---

### mindforge-debugger (The RCA Scientist)
**Role:** Specialist in systematic root cause analysis and complex defect resolution.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:debug`, `/mindforge:agent debugger` |
| **Tools** | Read, Write, Bash, Grep, Glob, CmdStatus, ReadTerminal, Browser |
| **Color** | `orange` |
| **Produces** | `DEBUG-REPORT.md` (RCA) |

**Capabilities:**
- Falsifiable hypothesis testing for non-obvious failures.
- Binary search isolation of defects across layers.
- Implementation of minimal, regression-proof fixes.

---

### mindforge-assumptions-analyzer (Extended)
**Role:** Reality checker for identifying hidden codebase constraints and risks.

| Property | Value |
|----------|-------|
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
|----------|-------|
| **Spawned by** | `/mindforge:map-codebase`, `/mindforge:agent codebase-mapper` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Produces** | `CONVENTIONS.md`, `STRUCTURE.md` |

**Capabilities:**
- Exploration of unfamiliar brownfield codebases.
- Identification of testing patterns, linting rules, and directory layers.
- Production of [DRAFT] conventions for project alignment.

---

### mindforge-codebase-mapper (Extended)
**Role:** Generates structured maps of tech stacks, architecture, and conventions.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:map-codebase`, `/mindforge:agent codebase-mapper-extend` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `cyan` |
| **Produces** | `STACK.md`, `ARCHITECTURE.md`, `CONVENTIONS.md` |

**Capabilities:**
- Explaining how the codebase *should* be interacted with.
- Context reduction for incoming subagents.
- Inventory of packages, versions, and critical data flows.

---

### mindforge-roadmapper (Extended)
**Role:** Enhanced execution strategist focused on requirement traceability.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:milestone`, `/mindforge:agent roadmapper-extend` |
| **Tools** | Read, Write, Bash, Grep, Glob, Browser |
| **Color** | `cyan` |
| **Produces** | `ROADMAP.md`, `STATE.md` |

**Capabilities:**
- Goal-backward phase derivation from requirements.
- Zero-orphan requirement mapping.
- Definition of verifiable behavioral success criteria.

---

### mindforge-user-profiler (The Behavioral Analyst)
**Role:** Analyzes session history to personalize agent interactions.

| Property | Value |
|----------|-------|
| **Spawned by** | `/mindforge:agent user-profiler` |
| **Tools** | Read, Write, Bash, Grep, Glob |
| **Color** | `magenta` |
| **Produces** | `USER-PROFILE.md` |

**Capabilities:**
- Identifying technical preferences and risk tolerance from logs.
- Generating imperative interaction directives for other agents.
- Evidence-based scoring of developer working patterns.

---

## Tool Permissions Summary

| Persona | Read | Write | Bash | Grep | Glob | CmdStatus | Browser | Terminal |
|---------|------|-------|------|------|------|-----------|---------|----------|
| **Analyst** | ✓ | ✓ | ✓ | ✓ | | | | |
| **Architect** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Developer** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| **QA Engineer** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| **Security Reviewer** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| **Debug Specialist** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ |
| **Roadmapper** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Assumptions Analyzer** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Research Agent** | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | |
| **Decision Architect** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Release Manager** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| **Tech Writer** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Coverage Specialist** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| **Advisor Researcher** | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | |
| **Project Researcher** | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | |
| **Research Synthesizer** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **UI Researcher** | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | |
| **Phase Researcher** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Planner** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Integration Checker**| ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Nyquist Auditor** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ |
| **Plan Checker** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **UI Auditor** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **UI Checker** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Verifier** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Executor** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ |
| **Debugger** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Assumptions (Ext)** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Codebase Map (Ext)** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| **Roadmapper (Ext)** | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | |
| **User Profiler** | ✓ | ✓ | ✓ | ✓ | ✓ | | | |

**Principle of Least Privilege:**
- **Analyzers** and **Architects** primarily use discovery tools to inform design.
- **Executors** (Developer/Executor) have the broadest implementation access.
- **Security** and **QA** have specialized tools for validation and auditing.
- **Researchers** have browser access for external documentation.
