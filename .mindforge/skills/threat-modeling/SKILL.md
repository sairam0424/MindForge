---
name: threat-modeling
version: 1.0.0
min_mindforge_version: 10.0.3
status: stable
triggers: threat model, STRIDE, attack tree, DREAD, threat surface, trust boundary, attack vector, data flow diagram, DFD, adversary, threat assessment
compose:
  - security-review
---

# Skill — Threat Modeling

## When this skill activates
When analyzing security threats to a system, component, or feature. When
constructing attack trees, identifying trust boundaries, or scoring risks
using structured methodologies.

## Mandatory actions when this skill is active

### Before threat modeling
1. Switch to `threat-modeler` persona.
2. Identify the **scope** — what system/component are we modeling?
3. Gather the system's **data flow** — how does data move through it?
4. Identify all **trust boundaries** — where does trust level change?

### STRIDE Methodology

Apply STRIDE to each trust boundary crossing:

| Threat | Question | Example |
|--------|----------|---------|
| **S**poofing | Can an attacker pretend to be someone else? | Forged auth tokens, session hijacking |
| **T**ampering | Can data be modified in transit or at rest? | Man-in-the-middle, DB manipulation |
| **R**epudiation | Can actions be denied without proof? | Missing audit logs, unsigned transactions |
| **I**nformation Disclosure | Can sensitive data leak? | Error messages with stack traces, verbose APIs |
| **D**enial of Service | Can the system be overwhelmed? | Unbounded queries, missing rate limits |
| **E**levation of Privilege | Can a user gain unauthorized access? | Missing authz checks, IDOR, path traversal |

### DREAD Scoring

Score each identified threat (1-10 for each dimension):

| Dimension | 1 (Low) | 5 (Medium) | 10 (High) |
|-----------|---------|------------|-----------|
| **D**amage | Minor inconvenience | Data loss for some users | Full system compromise |
| **R**eproducibility | Requires rare conditions | Requires specific setup | Anyone can reproduce |
| **E**xploitability | Requires deep expertise | Requires some skill | Script kiddie level |
| **A**ffected Users | Single user | Subset of users | All users |
| **D**iscoverability | Hidden, requires source | Findable with effort | Obvious, publicly known |

**Risk Score** = (D + R + E + A + D) / 5
- Score 1-3: Low risk (monitor)
- Score 4-6: Medium risk (mitigate within sprint)
- Score 7-10: High/Critical risk (mitigate IMMEDIATELY)

### Attack Tree Construction

For high-scoring threats, build an attack tree:
```
[Goal: Unauthorized admin access]
├── [OR] Steal admin credentials
│   ├── [AND] Phish admin user
│   │   ├── Send convincing email
│   │   └── Capture credentials on fake page
│   └── [AND] Exploit password reset
│       ├── Enumerate valid emails
│       └── Intercept reset token
└── [OR] Escalate from regular user
    ├── [AND] Exploit IDOR
    │   ├── Find predictable resource IDs
    │   └── Access admin endpoints directly
    └── [AND] Exploit role assignment bug
```

### Output Format

Write to `.planning/THREAT-MODEL-[component]-[timestamp].md`:
```markdown
# Threat Model: [Component]
Date: [timestamp]
Scope: [what was analyzed]

## Data Flow Diagram
[ASCII or description of data flow with trust boundaries marked]

## Trust Boundaries
1. [boundary]: [what crosses it]

## Identified Threats
| # | Category | Threat | DREAD Score | Mitigation | Status |
|---|----------|--------|-------------|-----------|--------|

## Attack Trees (for High/Critical threats)
[Trees for any threat scoring 7+]

## Recommendations
[Prioritized list of mitigations]
```

### After threat modeling
- Review all High/Critical findings with security-reviewer persona
- Create action items for each unmitigated threat
- Log threat model in AUDIT with finding counts by severity

## Self-check before task completion
- [ ] Did I apply STRIDE to ALL trust boundary crossings (not just obvious ones)?
- [ ] Did I score every identified threat with DREAD?
- [ ] Did I build attack trees for all threats scoring 7+?
- [ ] Did I write the threat model to .planning/THREAT-MODEL-[component].md?
