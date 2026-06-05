---
name: "mindforge:communicate"
description: "Stakeholder communication planning. Usage: /mindforge:communicate [audience] [--type update|risk|proposal|decision]"
argument-hint: "[audience] [--type update|risk|proposal|decision]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design targeted communication plans for technical stakeholders. Analyzes audience context, selects optimal communication channels, and structures messages for maximum clarity and actionability.
</objective>

<execution_context>
@.mindforge/skills/stakeholder-communication/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/stakeholder-communication/`
State: Evaluates audience technical depth, urgency, decision authority, and relationship context to produce communication plan with channel, timing, structure, and follow-up strategy.
</context>

<process>
1. **Audience Analysis**: Map stakeholder to persona (exec/product/eng/support/external). Identify technical depth (1-5), decision authority (blocker/influencer/informed), urgency sensitivity (critical/moderate/low), preferred channels (sync/async/written).

2. **Communication Type Selection**: For "update" → status report with progress metrics + blockers. For "risk" → impact assessment + mitigation options + decision request. For "proposal" → problem context + solution options + recommendation + trade-offs. For "decision" → decision record with rationale + alternatives considered + implementation plan.

3. **Channel Optimization**: Execs → brief written summary + optional sync for questions. Product → detailed narrative + visual roadmap. Engineering → technical RFC + architecture diagrams. Support → FAQ + runbook. External → polished deck + demo.

4. **Message Structure**: Open with TL;DR (1-2 sentences). Context section (why this matters now). Core content (structured by type). Action items (who/what/when). Appendix (supporting data/links).

5. **Timing Strategy**: Critical → synchronous escalation with written follow-up. Urgent → async with 24h response SLA. Normal → weekly update cycle. Low priority → monthly digest.

6. **Feedback Loop Design**: Specify response mechanism (reply/comment/meeting/survey). Set explicit decision deadline. Define escalation path if no response. Plan follow-up cadence (1 day/1 week/1 sprint).

7. **Artifact Generation**: Produce templated communication draft. Include pre-meeting agenda if sync. Generate post-communication summary template. Create decision log entry if applicable.
</process>
