---
description: "Design human-in-the-loop escalation gates and thresholds. Usage: /mindforge:hitl [system] [--autonomy progressive] [--explain always]"
---

<objective>
Design a human-in-the-loop system with calibrated escalation gates that balances agent autonomy with human oversight, using reversibility and impact as the primary classification axes, and progressively expanding autonomy as trust is established.
</objective>

<execution_context>
@.mindforge/skills/human-in-the-loop-design/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (system or agent name, optional --autonomy mode, optional --explain frequency)
Knowledge: Agent action catalog, business criticality classification, regulatory requirements, historical escalation data.
</context>

<process>
1. **Classify All Agent Actions By Reversibility x Impact**: Create a 2x2 matrix: (reversible + low impact = autonomous), (reversible + high impact = confirm), (irreversible + low impact = approve), (irreversible + high impact = block until human review). Catalog every action the agent can take.
2. **Set Autonomy Level Per Action Type**: Assign each action one of four levels: autonomous (agent acts freely, logs for audit), confirm (agent proposes, human clicks approve/reject), approve (agent drafts, human reviews thoroughly before execution), block (agent cannot perform, must hand off to human).
3. **Design Escalation UX**: Create low-friction, informative escalation interfaces. Show: what the agent wants to do, why (evidence/reasoning), what the alternatives are, and what happens if rejected. Minimize context-switching cost for the human reviewer.
4. **Set Confidence Thresholds For Escalation**: Define confidence scores that trigger escalation: agent confidence < 0.7 = escalate even for normally-autonomous actions. Confidence < 0.4 = block. Calibrate thresholds using historical accuracy data.
5. **Implement Explanation Generation**: For every escalation, generate a structured explanation: action proposed, reasoning chain, evidence consulted, confidence score, risk assessment, and recommended human action. Explanations must be concise (< 200 words).
6. **Track Escalation Rate**: Monitor: total escalations per day, escalation rate by action type, human approval rate (high approval = threshold too tight), human rejection rate (high rejection = agent quality issue), and time-to-resolution.
7. **Calibrate Boundaries**: Too many escalations = threshold too tight (human fatigue, defeats purpose). Too few = threshold too loose (risk of unreviewed harmful actions). Target: 5-15% escalation rate for mature systems. Review weekly and adjust.
8. **Plan Progressive Autonomy Expansion**: As the agent demonstrates reliability (>95% approval rate for a category over 30 days), propose promoting that action category to a less restrictive level. Require explicit human approval to expand autonomy. Never auto-promote.
</process>
