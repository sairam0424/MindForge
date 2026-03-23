# MindForge Persona Reference

> A comprehensive guide to the 13 specialized enterprise personas — roles, tools, and orchestration patterns.

---

## Overview

MindForge uses a multi-agent orchestration model where specialized personas are invoked to handle specific phases of the project lifecycle. Each persona is defined with a unique role, high-fidelity XML-tagged process, and strict tool permissions to ensure security and precision.

### Persona Categories

| Category | Count | Personas |
|----------|-------|--------|
| **Analyzers** | 2 | analyst, assumptions-analyzer |
| **Architects** | 2 | architect, decision-architect |
| **Executors** | 1 | developer |
| **Quality & Security** | 3 | qa-engineer, security-reviewer, coverage-specialist |
| **Strategy & Ops** | 4 | roadmapper, research-agent, release-manager, tech-writer |
| **Debuggers** | 1 | debug-specialist |

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

**Principle of Least Privilege:**
- **Analyzers** and **Architects** primarily use discovery tools to inform design.
- **Executors** (Developer) have the broadest implementation access.
- **Security** and **QA** have specialized tools for validation and auditing.
- **Researchers** have browser access for external documentation.
