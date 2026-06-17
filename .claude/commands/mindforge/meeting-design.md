---
name: "mindforge:meeting-design"
description: "Design effective meeting or async process. Usage: /mindforge:meeting-design [purpose] [--format sync|async|hybrid] [--size small|large]"
argument-hint: "[purpose] [--format sync|async|hybrid] [--size small|large]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design meetings or async processes that maximize output per minute of team time. Applies forcing functions to eliminate unnecessary sync time and optimize for decision quality over meeting cadence.
</objective>

<execution_context>
@.mindforge/skills/meeting-architecture/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/meeting-architecture/`
State: Evaluates meeting purpose, applies async-first heuristics, designs agendas with decision protocols, outputs structured meeting artifact templates.
</context>

<process>
1. **Async-First Filter**: Ask "Can this be a doc + comment thread?" If yes (status update, one-way announcement, information gathering) → reject meeting, design async artifact instead (RFC, decision doc, survey). Only proceed to sync if: requires real-time debate, builds team rapport, or resolves ambiguity that written async cannot.

2. **Purpose Classification**: Decision (choose between options) → design with pre-read + decision protocol (DACI/RACI). Brainstorm (generate options) → structure with divergent → convergent phases. Alignment (shared understanding) → pre-read heavy, meeting for Q&A only. Planning (decompose work) → prepare draft plan async, sync to resolve dependencies only.

3. **Attendee Optimization**: Required (can't make decision without them), Optional (contribute but not block), FYI (read notes after). Default everyone to FYI. Promote to Required only if they have unique context or decision authority. Cap Required at 5 people. If >5 Required → meeting scope too broad, split into separate sessions.

4. **Pre-Work Design**: Distribute artifact 48h before (1-pager for 30min meeting, 3-pager for 60min). Include: context (why now), options (what are we choosing between), recommendation (what I think we should do), decision needed (what must be resolved in sync). Set expectation: no pre-read = no attendance. Meeting time is for synthesis, not information transfer.

5. **Agenda Structure**: 5min - Restate decision/goal from pre-read. 15min - Surface objections/alternatives (round-robin, everyone speaks). 20min - Debate trade-offs (timebox per topic). 15min - Converge on decision (decision maker calls it). 5min - Document outcomes, next actions, owner. Total 60min max. If more needed → insufficient pre-work or wrong format.

6. **Decision Protocol**: DACI (Driver owns outcome, Approver makes call, Contributors give input, Informed are notified). Identify each role before meeting. During debate, label contributions (this is input vs this is a block). At decision point, Approver explicitly states decision + rationale. Driver documents decision in shared log within 24h.

7. **Async Alternative Design**: For rejected meetings → create structured artifact. Status update → written update in Slack with (accomplished, in-progress, blocked, help-needed). Brainstorm → Miro board with 48h async contribution window. Alignment → Loom video + doc with comment thread. Planning → draft plan in Notion, async review with inline feedback, sync only for dependency resolution.
</process>
