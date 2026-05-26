---
name: conflict-resolution
version: 1.0.0
min_mindforge_version: 10.3.0
status: stable
triggers: conflict resolution engineering, technical disagreement, architecture debate, priority conflict resolution, team friction, code review conflict, design decision deadlock, tech stack disagreement, cross-team dispute, engineering opinion conflict, consensus building, disagree and commit
---

# Conflict Resolution

## When this skill activates

This skill activates when resolving technical disagreements, mediating architecture debates, handling priority conflicts, addressing team friction, or breaking design decision deadlocks. It applies to tech leads, engineering managers, and senior engineers who must navigate conflicts and drive teams toward resolution.

## Mandatory actions when this skill is active

### Before engaging in conflict resolution

1. **Diagnose the conflict type** — Is this a technical disagreement (different approaches to the same goal), a priority conflict (what to work on first), or an interpersonal conflict (personality clash)? Different types require different interventions.
2. **Verify the conflict is real** — Sometimes perceived conflicts are actually misunderstandings. Ask each party to state their position and their understanding of the other party's position. Clarify before attempting resolution.
3. **Assess stakes and urgency** — Low-stakes conflicts (coding style preference) can be deferred or decided by convention. High-stakes conflicts (architectural choice) require immediate resolution. Triage accordingly.
4. **Check your neutrality** — If you have a strong opinion on the outcome, you're not a neutral mediator. Either recuse yourself or explicitly acknowledge your bias before facilitating.

### During conflict resolution

#### Technical Disagreements

- **Separate facts from opinions** — Facts: "Option A has 200ms latency." Opinions: "Option A feels cleaner." Debate facts rigorously. Acknowledge opinions but deprioritize them.
- **Demand evidence** — Don't let "I think" or "in my experience" dominate. Require benchmarks, prototypes, or references to real-world implementations. Speculation loses to data.
- **Use ADRs (Architecture Decision Records)** — Formalize the debate: each side writes a proposal with context, decision, consequences, and alternatives rejected. Writing forces rigor and surfaces unstated assumptions.
- **Run time-boxed experiments** — If the debate can't be resolved theoretically, prototype both approaches. Two engineers, two days, working implementation. Compare results objectively.
- **Escalate with recommendations** — If consensus is impossible, escalate to the tech lead or architect with a clear summary of both positions and a recommended path. Don't ask them to re-litigate the debate.

#### Architecture Debates

- **Ground in requirements** — What are the non-negotiable constraints? Performance? Scalability? Maintainability? Cost? Often debates evaporate when requirements are explicit.
- **Identify tradeoffs explicitly** — No architecture is strictly better. Microservices improve scalability but increase operational complexity. Monoliths simplify deployment but limit independent scaling. Name the tradeoffs.
- **Use the "two-way door" test** — If the decision is reversible, pick one and move on. If it's a one-way door (hard to undo), invest more time in deliberation.
- **Timebox the debate** — Architecture debates can spiral. Set a 1-hour limit. If no consensus, escalate or use decision frameworks (DACI, voting, tech lead decides).
- **Agree on success criteria** — Before implementing, define how you'll evaluate the choice in 3-6 months. If metric X doesn't improve, revert or pivot.

#### Priority Conflicts

- **Quantify impact** — Use a simple framework: Revenue Impact (High/Medium/Low), Risk Mitigation (High/Medium/Low), Strategic Alignment (High/Medium/Low). Score each project. Prioritize High-High-High over Low-Low-Low.
- **Surface opportunity cost** — Every "yes" to one project is a "no" to another. Make the tradeoff explicit: "If we prioritize Project A, Project B slips by 6 weeks. Is that acceptable?"
- **Involve stakeholders early** — Priority conflicts between engineering and product require product input. Don't let engineers decide in isolation.
- **Revisit priorities regularly** — Priorities change. Revisit every quarter. Don't cling to a roadmap when circumstances shift.

#### Code Review Conflicts

- **Distinguish style from substance** — Style conflicts (tabs vs spaces, single quotes vs double quotes) should be decided by linters, not humans. Substance conflicts (error handling, edge cases) require discussion.
- **Use "strong opinions, weakly held"** — If the reviewer feels strongly, they should explain why. If the author disagrees, they should explain their reasoning. The senior engineer or tech lead breaks the tie if necessary.
- **Offer alternatives, not just criticism** — Don't say "This is wrong." Say "Have you considered X? It avoids Y problem and simplifies Z."
- **Distinguish blocking from non-blocking feedback** — Blocking: correctness issues, security vulnerabilities, performance regressions. Non-blocking: refactoring suggestions, readability improvements. Blocking feedback must be addressed before merge. Non-blocking can be deferred to a follow-up PR.

#### Interpersonal Conflicts

- **Separate behavior from identity** — Address observable behavior, not personality. "You interrupted Sarah three times in the last meeting" is actionable. "You're rude" is a personal attack.
- **Hold 1:1 conversations first** — Don't surface interpersonal conflict in group settings. Speak to each party individually, understand their perspective, then bring them together.
- **Use "I" statements, not "you" statements** — "I felt frustrated when the deadline slipped without warning" is less defensive than "You failed to communicate the delay."
- **Focus on shared goals** — Remind both parties: we're all trying to ship great software. Conflict over approach is healthy. Conflict over personalities is not.
- **Escalate when necessary** — If conflict is causing sustained team dysfunction, escalate to your manager or HR. Don't try to play therapist.

#### Consensus Building

- **Start with alignment** — Find common ground first. "We all agree the system is too slow. The disagreement is whether to optimize queries or add caching." Starting with agreement reduces defensiveness.
- **Use the "disagree and commit" principle** — If consensus is impossible and time is limited, the decision-maker (tech lead, architect, manager) makes the call. Dissenters must commit fully once the decision is made, even if they disagreed.
- **Document dissent respectfully** — If someone strongly disagrees, allow them to document their concerns in the ADR. Future-you will appreciate knowing what tradeoffs were considered.
- **Revisit after implementation** — Schedule a retrospective 3-6 months later. Was the decision correct? What would we do differently next time? Learning compounds with reflection.

### After conflict resolution

- **Document the resolution** — Write down: what the conflict was, what decision was made, who made it, and what the reasoning was. Prevents re-litigating the same debate in 6 months.
- **Verify buy-in** — After resolution, check with each party individually: "Are you on board with this decision?" Surface any lingering resentment before it festers.
- **Monitor team dynamics** — Conflict can damage relationships. Check in with team members regularly. If trust is broken, actively rebuild it through transparent communication and collaboration.
- **Reflect on resolution effectiveness** — Did the conflict resolution process work? Was it too slow? Too rushed? Adjust your approach for next time.

## Self-check before task completion

- [ ] Conflict type is diagnosed (technical, priority, or interpersonal)
- [ ] Evidence and facts are used to ground technical disagreements, not opinions
- [ ] Tradeoffs are explicitly identified in architecture debates
- [ ] Priority conflicts are quantified with impact scoring (revenue, risk, strategy)
- [ ] Code review conflicts distinguish blocking vs non-blocking feedback
- [ ] Interpersonal conflicts address observable behavior, not personality
- [ ] Resolution is documented with decision rationale and alternatives considered
- [ ] Buy-in is verified with each party after resolution
