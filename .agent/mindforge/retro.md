---
description: "Facilitate sprint retrospective with pattern detection. Usage: /mindforge:retro [--format 4Ls|sailboat|timeline|starfish] [--track-patterns]"
---

<objective>
Facilitate a structured sprint retrospective that surfaces actionable insights, ensures psychological safety, and detects recurring patterns across retrospectives to drive systemic improvement.
</objective>

<execution_context>
@.mindforge/skills/sprint-retrospective-facilitation/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (optional --format to choose retrospective format, optional --track-patterns)
Knowledge: Previous retro action items, sprint metrics (velocity, bugs, escaped defects), team health survey data.
</context>

<process>
1. **Select Format**: Choose the retrospective format based on team needs. 4Ls (Liked/Learned/Lacked/Longed-for) for general use, Sailboat (wind/anchor/rocks/island) for goal-oriented, Timeline for incident-heavy sprints, Starfish (start/stop/continue/more/less) for behavioral change.
2. **Set Psychological Safety Ground Rules**: Establish Vegas rule (what is said here stays here), no-blame language, equal airtime commitment, and facilitator neutrality. Remind team this is about the system, not individuals.
3. **Time-Box Each Section**: Allocate strict time per section (typically 5-7 minutes for brainstorming, 3 minutes for grouping). Use silent writing first to prevent anchoring bias.
4. **Facilitate Equal Voice**: Ensure all team members contribute. Use round-robin for quieter members, dot-voting for prioritization, and "disagree and commit" for contentious items.
5. **Vote On Discussion Items**: Each participant gets 3 votes to identify the most impactful topics. Discuss top 3-5 voted items in depth.
6. **Discuss Top Voted Items**: For each top item, explore root cause (5 Whys if needed), impact on the team, and potential countermeasures. Keep discussion solution-oriented.
7. **Generate Action Items**: Produce maximum 3 action items that are SMART (Specific, Measurable, Achievable, Relevant, Time-bound). Fewer is better — completion rate drops sharply above 3.
8. **Assign Owners**: Each action item gets a single owner (not a team) and a due date. Owner is accountable for progress update at next retro.
9. **Check For Recurring Patterns**: Review action items from the last 3-5 retros. Flag any themes that recur (same root cause resurfacing = systemic issue needing escalation). Track pattern frequency and escalate if count > 2.
</process>
