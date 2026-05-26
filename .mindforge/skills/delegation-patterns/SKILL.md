---
name: delegation-patterns
version: 1.0.0
min_mindforge_version: 10.3.0
status: stable
triggers: delegation engineering, task decomposition team, ownership assignment, accountability framework, work distribution, delegation decision matrix, scope assignment, technical project delegation, parallel workstream assignment, responsibility matrix, RACI technical, decision authority
---

# Delegation Patterns

## When this skill activates

This skill activates when decomposing tasks for teams, assigning ownership, distributing work across engineers, defining accountability frameworks, or delegating technical projects. It applies to tech leads, engineering managers, and senior engineers responsible for coordinating team execution.

## Mandatory actions when this skill is active

### Before delegating

1. **Assess task complexity and risk** — Low-complexity, low-risk tasks can be delegated broadly. High-complexity or high-risk tasks require senior engineers or your direct involvement.
2. **Match task to skill level** — Don't assign senior-level architectural work to juniors. Don't assign junior-level bug fixes to staff engineers (unless it's urgent). Mismatched delegation wastes talent and causes frustration.
3. **Verify availability and capacity** — Don't assume engineers have bandwidth. Check current workload, upcoming PTO, and competing priorities before assigning work.
4. **Define success criteria explicitly** — What does "done" look like? Ambiguous success criteria lead to misalignment. Be specific: "Tests pass, code reviewed, deployed to staging."

### During delegation

#### Task Decomposition for Teams

- **Break large projects into independent workstreams** — Identify natural boundaries (frontend vs backend, service A vs service B, feature 1 vs feature 2). Minimize dependencies between workstreams to enable parallel execution.
- **Size tasks to 1-3 day chunks** — Tasks larger than 3 days are hard to estimate and easy to get stuck on. Smaller tasks improve velocity and visibility.
- **Create a dependency graph** — Visualize which tasks block others. Critical path tasks need the strongest engineers. Non-blocking tasks can be assigned to juniors or done in parallel.
- **Avoid over-fragmentation** — Breaking a 2-week project into 50 tiny tasks creates coordination overhead. Find the balance: small enough to track, large enough to be meaningful.

#### Ownership Assignment

- **Use the DRI (Directly Responsible Individual) model** — Every task has exactly one owner. Shared ownership is no ownership. If two people are responsible, neither is.
- **Clarify ownership boundaries** — DRI owns the outcome, not just the execution. They are accountable for delivery, quality, and communication. Support them, but don't take the ownership back.
- **Match ownership to growth goals** — If an engineer wants to grow into system design, give them a project that requires design work. Delegation is a growth lever.
- **Avoid always delegating to the same high performers** — Spreading work across the team builds depth and prevents burnout. High performers need growth opportunities, not just more work.

#### Delegation Decision Matrix

Use this framework to decide who gets what:

| Task Type | Delegate To | Reasoning |
|-----------|-------------|-----------|
| Low complexity, low risk | Junior engineer | Growth opportunity, low downside |
| High complexity, low risk | Mid-level engineer | Stretch assignment, safe to experiment |
| Low complexity, high risk | Senior engineer | Minimize risk, fast execution |
| High complexity, high risk | Staff/Principal or yourself | Critical tasks need top talent |
| Repetitive toil | Automate or rotate | Don't delegate to the same person forever |
| Cross-team coordination | Tech lead or manager | Requires influence and context |

#### Accountability Framework

- **Define RACI roles explicitly** — For every project or decision:
  - **Responsible**: Who does the work?
  - **Accountable**: Who owns the outcome? (Only one person)
  - **Consulted**: Who provides input?
  - **Informed**: Who needs to know?
- **Document RACI in project kickoffs** — Put it in the project doc, share it with the team. Ambiguous accountability causes dropped work and finger-pointing.
- **Check-ins, not micromanagement** — Set a cadence (daily standup, weekly sync) but trust the DRI to execute. If you're in the weeds every day, you didn't delegate properly.

#### Work Distribution Strategies

**1. Balanced Distribution (Default)**
- **Goal**: Spread work evenly across the team.
- **When to use**: Routine feature work, stable team, predictable roadmap.
- **Pitfall**: Can over-distribute and prevent deep focus. Balance with ownership zones (next pattern).

**2. Ownership Zones (Area-Based)**
- **Goal**: Each engineer owns 1-2 services or features end-to-end.
- **When to use**: Mature team, well-defined boundaries, need for deep expertise.
- **Benefit**: Engineers become experts in their zone, reducing ramp-up time and increasing autonomy.
- **Pitfall**: Creates silos. Mitigate with code reviews across zones and occasional rotation.

**3. Swarming (All-Hands-On-Deck)**
- **Goal**: Entire team focuses on one critical project.
- **When to use**: High-priority launch, critical bug, tight deadline.
- **Benefit**: Fast execution, high alignment.
- **Pitfall**: Interrupts other work. Use sparingly.

**4. Rotation (Shared Responsibility)**
- **Goal**: Engineers rotate through on-call, support, or maintenance tasks.
- **When to use**: Prevent burnout, build shared context, avoid "that one person" syndrome.
- **Benefit**: Spreads toil evenly, prevents knowledge silos.
- **Pitfall**: Context switching overhead. Set rotation cadence (weekly, bi-weekly) to minimize thrash.

#### Delegation Communication

- **Use structured task handoffs** — When delegating, provide:
  - **Context**: Why are we doing this? What's the business value?
  - **Scope**: What's in scope, what's out of scope?
  - **Success criteria**: How will we know it's done?
  - **Resources**: Who can help? What docs are relevant?
  - **Deadline**: When is it due?
  - **Check-in cadence**: How often should we sync?
- **Empower, don't prescribe** — Tell them what to achieve, not how to do it. Let them figure out the approach (unless they ask for guidance).
- **Clarify decision authority** — Can they decide on implementation details? Do they need approval for architectural choices? Make it explicit.

#### Monitoring Delegation Effectiveness

- **Track task completion rate** — If tasks are frequently late or incomplete, you're either over-delegating, under-resourcing, or assigning to the wrong people.
- **Measure rework rate** — If delegated work requires significant rework, either the success criteria were unclear or the engineer wasn't ready for the task.
- **Check engineer satisfaction** — Periodically ask: "Do you feel over/under-utilized? Are you getting enough growth opportunities?" Course-correct before burnout or attrition.

### After delegating

- **Verify understanding** — After assigning work, ask the engineer to summarize: "What's the goal? What's the first step?" Misalignment is common. Catch it early.
- **Set check-in cadence** — For junior engineers: daily check-ins. For mid-level: every 2-3 days. For senior: weekly or as-needed. Adjust based on risk and autonomy.
- **Unblock actively** — If the engineer is stuck, intervene. Don't wait for them to ask. Watch for signs: long periods of silence, lack of progress updates, frustrated messages.
- **Give credit publicly** — When the work is done, recognize the engineer publicly (in team meetings, Slack, all-hands). Delegation without recognition demoralizes.
- **Conduct retrospectives** — After major projects, ask: "What went well? What would we do differently next time?" Improve your delegation process over time.

## Self-check before task completion

- [ ] Task complexity and risk are assessed before assigning
- [ ] Task is matched to engineer's skill level and growth goals
- [ ] Success criteria are explicit and documented
- [ ] Ownership is assigned to exactly one DRI (Directly Responsible Individual)
- [ ] RACI roles are defined (Responsible, Accountable, Consulted, Informed)
- [ ] Task decomposition creates independent workstreams to enable parallel execution
- [ ] Delegation handoff includes context, scope, success criteria, resources, and deadline
- [ ] Check-in cadence is set and followed (daily for juniors, weekly for seniors)
