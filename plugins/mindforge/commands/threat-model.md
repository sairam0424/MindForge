---
description: "Run STRIDE/DREAD threat modeling on the current change or specified component. Usage - /mindforge:threat-model [component-path] [--scope full|diff] [--output DFD]"
---

<objective>
Perform structured threat modeling on a system component using STRIDE methodology
with DREAD scoring. Identify attack surfaces, trust boundaries, and recommend mitigations.
</objective>

<execution_context>
@.mindforge/skills/threat-modeling/SKILL.md
@.mindforge/personas/threat-modeler.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse arguments: component path (or current diff), --scope (full component or just diff), --output format.
2. Switch to threat-modeler persona.
3. **Scope definition:**
   - If component path provided: analyze that directory/file
   - If --scope diff: analyze only current uncommitted changes
   - If no path: analyze most recently modified files
4. **Data flow mapping:**
   - Identify entry points (user input, API calls, file uploads)
   - Identify storage (databases, caches, files)
   - Identify processing (business logic)
   - Identify exit points (responses, exports, logs)
   - Mark ALL trust boundary crossings
5. **STRIDE analysis:**
   - For each trust boundary: apply all 6 STRIDE categories
   - Document each identified threat with concrete example
6. **DREAD scoring:**
   - Score each threat (Damage, Reproducibility, Exploitability, Affected Users, Discoverability)
   - Calculate risk score (average of 5 dimensions)
   - Classify: Low (1-3), Medium (4-6), High (7-10)
7. **Attack trees** (for threats scoring 7+):
   - Build prerequisite chain showing attack path
   - Identify cheapest path for attacker
8. **Mitigation recommendations:**
   - For each threat: recommend specific mitigation
   - Prioritize by: risk score * ease of fix
9. Write output to `.planning/THREAT-MODEL-[component]-[timestamp].md`
10. Log threat model in AUDIT with finding counts by severity.
11. If any Critical/High findings: flag that these MUST be addressed before shipping.
</process>
