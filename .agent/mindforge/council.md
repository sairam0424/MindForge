---
description: Invoke the 4-voice decision council (Architect, Skeptic, Pragmatist, Critic) for ambiguous architectural decisions. Usage - /mindforge:council [decision description] [--template architecture|breaking-change|security|ship-or-wait|build-vs-buy]
---

<objective>
Run a structured multi-voice debate to resolve an ambiguous decision. Four specialist
voices analyze the options from different perspectives, producing a verdict with
consensus scoring and documented dissent.
</objective>

<execution_context>
@.mindforge/engine/council/council-protocol.md
@.mindforge/engine/council/synthesis-engine.md
@.mindforge/engine/council/council-templates.md
@.mindforge/skills/council/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse the decision description from arguments. If no template specified, use generic protocol.
2. If a --template is specified, load the corresponding template from council-templates.md.
3. Load council personas: council-architect, council-skeptic, council-pragmatist, council-critic.
4. **Frame** — Present the decision with context, options, constraints, and stakes.
5. **Positions** — Each voice independently states their recommendation, top 3 reasons, and confidence (0-1).
6. **Challenge** — Each voice responds to the strongest counterargument against their position.
7. **Synthesize** — Apply synthesis-engine.md algorithm: weighted votes → consensus score → dissent identification.
8. **Output** — Write the verdict to `.planning/decisions/COUNCIL-[timestamp].md`.
9. Present the verdict to the user with consensus score and any dissenting opinions.
10. Log council invocation in AUDIT with: decision, voices, consensus, verdict.
11. If consensus < 0.5: explicitly state "No consensus reached" and present all positions equally.
12. Remind user: "Council is advisory — you have final say."
</process>
