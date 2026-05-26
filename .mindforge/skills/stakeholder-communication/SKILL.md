---
name: stakeholder-communication
version: 1.0.0
min_mindforge_version: 10.3.0
status: stable
triggers: stakeholder communication, technical translation, non-technical explanation, executive reporting technical, risk communication, engineering status update, technical storytelling, cross-functional communication, engineering metrics reporting, progress communication, technical presentation, stakeholder alignment
---

# Stakeholder Communication

## When this skill activates

This skill activates when translating technical concepts for non-technical audiences, writing executive status reports, communicating risks and tradeoffs, presenting technical work to cross-functional teams, or aligning stakeholders on technical decisions. It applies to engineers, tech leads, and engineering managers who interface with product, design, executives, or customers.

## Mandatory actions when this skill is active

### Before communicating with stakeholders

1. **Identify the audience** — Executives care about business impact, timelines, and risks. Product managers care about feature tradeoffs and user impact. Designers care about constraints and implementation feasibility. Tailor the message to the audience.
2. **Define the communication goal** — Are you informing (status update), persuading (proposal approval), or aligning (shared understanding)? Different goals require different structures.
3. **Anticipate questions** — What will stakeholders ask? Prepare answers for: "How long will this take?", "What happens if we skip this?", "What's the risk?", "Can we do X instead?"
4. **Remove jargon** — Read your draft out loud. If you use terms like "idempotency," "eventual consistency," or "distributed lock," either define them or use simpler language. Jargon creates confusion, not credibility.

### During stakeholder interactions

#### Technical Translation Principles

- **Start with outcomes, not implementation** — Don't say "We're migrating from REST to GraphQL." Say "Users will get faster page loads because we'll fetch only the data they need, not the entire object."
- **Use analogies for complex concepts** — Distributed systems are like postal mail (messages can arrive out of order). Caching is like a notepad (faster but can be outdated). Load balancing is like grocery store checkout lanes (distributes work evenly).
- **Quantify whenever possible** — "This will improve performance" is vague. "This will reduce page load from 3 seconds to 1 second for 80% of users" is concrete.
- **Avoid binary thinking** — Technical decisions rarely have a single "right" answer. Frame as tradeoffs: "Option A is faster but harder to maintain. Option B is slower but more reliable."

#### Executive Reporting

- **Use BLUF (Bottom Line Up Front)** — Lead with the conclusion: "Migration is on track for Q3 launch" or "We discovered a critical security issue that delays launch by 2 weeks." Executives don't have time for preamble.
- **Structure as Situation-Complication-Resolution** — Situation: what's the context? Complication: what's the problem or opportunity? Resolution: what are we doing about it?
- **Report in threes** — Three key accomplishments, three blockers, three upcoming milestones. Human brains chunk information in threes. More than that, and retention drops.
- **Surface risks early** — Executives hate surprises. If there's a 30% chance of delay, say so now. Don't wait until it's a certainty.
- **Show trend lines, not snapshots** — Don't just report current status. Show momentum: "Test coverage increased from 60% to 75% over the past month."

#### Risk Communication

- **Use likelihood + impact matrix** — Classify risks as High/Medium/Low likelihood and High/Medium/Low impact. High-likelihood + High-impact risks need mitigation plans immediately.
- **Describe risks in business terms** — "The database could fail" is technical. "If the database fails, users can't place orders, costing $X/hour in lost revenue" is business risk.
- **Always pair risks with mitigations** — Don't just say "We might miss the deadline." Say "We might miss the deadline. To mitigate, we're cutting feature X and adding 2 engineers to the critical path."
- **Avoid crying wolf** — Reserve "critical" for genuine emergencies. If every risk is critical, stakeholders tune out.

#### Cross-Functional Alignment

- **Run decision-making meetings, not information dumps** — Send status updates via email or Slack. Use synchronous meetings only for decisions that require discussion and alignment.
- **Document decisions in real-time** — Designate a note-taker. Write down: decision made, who owns it, by when, and any open questions. Share notes immediately after the meeting.
- **Use the RACI model** — For every decision or project, clarify: Responsible (who does the work), Accountable (who owns the outcome), Consulted (who gives input), Informed (who needs to know). Ambiguity causes dropped work and conflict.
- **Create shared mental models** — Draw diagrams during discussions. Visuals align faster than words. Use whiteboards, Miro, or Excalidraw.

#### Progress Communication

- **Set expectations early** — At project kickoff, define what "done" looks like, milestones, and communication cadence. Prevents misalignment later.
- **Use percent-complete cautiously** — Software projects are non-linear. "80% complete" often means "50% of the hardest work remains." Instead, report: completed milestones, in-progress work, and blockers.
- **Celebrate milestones publicly** — When you ship a feature, complete a migration, or hit a quality goal, share it with the team and stakeholders. Momentum builds morale.
- **Adjust timelines transparently** — If the deadline slips, explain why, by how much, and what's being done to prevent further slips. Hiding delays destroys trust.

#### Technical Presentations

- **Start with the "so what"** — First slide: what is this, why does it matter, what should the audience do with this information. Hook attention immediately.
- **One idea per slide** — Dense slides are unreadable. One chart, one diagram, or one key point per slide. Use speaker notes for details.
- **Demo, don't describe** — If possible, show the thing working. Live demos (with a backup video) are 10x more compelling than screenshots.
- **End with a call to action** — What do you want stakeholders to do? Approve the proposal? Provide feedback? Assign resources? Make the ask explicit.

### After stakeholder communication

- **Verify understanding** — After a presentation or status update, ask: "What questions do you have?" or "Does this make sense?" Silence doesn't mean alignment; it often means confusion.
- **Summarize in writing** — Follow up with a concise summary: key decisions, action items, owners, and deadlines. Spoken agreements fade; written agreements persist.
- **Track communication effectiveness** — If stakeholders repeatedly ask the same questions, your communication isn't landing. Adjust format, frequency, or content.
- **Collect feedback** — Periodically ask stakeholders: "Are my status updates helpful? Too detailed? Not detailed enough?" Course-correct before dissatisfaction builds.

## Self-check before task completion

- [ ] Message is tailored to the specific audience (execs, product, design, customers)
- [ ] Communication goal is clear (inform, persuade, or align)
- [ ] Jargon is removed or defined; analogies are used for complex concepts
- [ ] Outcomes and business impact are emphasized over implementation details
- [ ] Risks are quantified with likelihood + impact and paired with mitigations
- [ ] Executive reports use BLUF (Bottom Line Up Front) and report in threes
- [ ] Decisions are documented with RACI (Responsible, Accountable, Consulted, Informed)
- [ ] Written follow-up summarizes key decisions, action items, and deadlines
