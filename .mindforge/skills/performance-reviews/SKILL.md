---
name: performance-reviews
version: 1.0.0
min_mindforge_version: 10.3.0
status: stable
triggers: performance review engineering, promotion case writing, feedback framework, calibration session, engineering evaluation criteria, performance improvement plan, impact documentation, promotion packet, peer feedback engineering, engineering levels, growth assessment, performance calibration
---

# Performance Reviews

## When this skill activates

This skill activates when conducting engineering performance evaluations, writing promotion cases, designing feedback frameworks, participating in calibration sessions, creating performance improvement plans, or assessing growth against engineering levels. It applies to engineering managers, tech leads, and senior engineers involved in performance management.

## Mandatory actions when this skill is active

### Before performance reviews

1. **Define evaluation criteria explicitly** — What does success look like at each engineering level? Common dimensions: technical execution, system design, code quality, communication, collaboration, ownership, impact, mentorship. Map criteria to levels (junior, mid, senior, staff, principal).
2. **Collect evidence throughout the cycle** — Don't rely on memory. Keep a running doc of: projects shipped, PRs reviewed, incidents handled, design docs written, mentoring moments. Real-time logging prevents recency bias.
3. **Gather 360-degree feedback** — Ask peers, cross-functional partners, and direct reports (if applicable) for input. Single-source feedback is incomplete. Use structured prompts: "What does [Engineer] do well?" "Where could they grow?"
4. **Review the engineer's self-assessment** — Ask them to evaluate their own performance before writing your review. Gaps between self-assessment and manager assessment are learning opportunities.

### During performance evaluation

#### Engineering Level Expectations

Use a competency matrix to define clear expectations at each level. Example dimensions:

| Dimension | Junior | Mid-Level | Senior | Staff | Principal |
|-----------|--------|-----------|--------|-------|-----------|
| Scope of Work | Well-defined tasks | Small features | Full features/services | Multi-team projects | Org-wide initiatives |
| Technical Complexity | Low complexity | Medium complexity | High complexity | Architectural decisions | Strategic direction |
| Autonomy | Needs guidance | Some autonomy | Fully autonomous | Defines direction | Sets vision |
| Code Quality | Learns best practices | Applies best practices | Role models best practices | Defines standards | Elevates org quality |
| Design | Implements designs | Designs small features | Designs systems | Designs platforms | Shapes architecture |
| Mentorship | Learns from others | Helps peers | Mentors 1-2 juniors | Mentors team | Mentors org |
| Communication | Within team | Cross-team (technical) | Cross-functional | Executives + external | Industry thought leader |
| Impact | Individual tasks | Team features | Service/product | Organization | Company/industry |

#### Evaluation Process

- **Rate performance on each dimension** — Use a 1-5 scale: 1 = Below expectations, 2 = Partially meets, 3 = Meets, 4 = Exceeds, 5 = Greatly exceeds.
- **Provide specific examples** — Don't say "Strong communicator." Say "Led design review for Payment Service rewrite, clearly articulated tradeoffs, and incorporated feedback from 5 engineers."
- **Distinguish between performance at level vs readiness for next level** — Meeting expectations at Senior level doesn't automatically mean ready for Staff. Promotion requires sustained performance at the next level.
- **Identify growth areas** — Every engineer has gaps. Name them specifically and provide actionable guidance: "To reach Staff, you need to mentor 2-3 engineers and lead a cross-team project."

#### Feedback Framework: SBI + Coaching

Use **Situation-Behavior-Impact (SBI)** for developmental feedback:
- **Situation**: "In last week's design review..."
- **Behavior**: "...you dismissed Sarah's concern about edge cases without discussing it..."
- **Impact**: "...which made the team hesitant to raise concerns in future reviews."

Follow SBI with **Coaching**:
- "Next time, try acknowledging the concern and discussing it openly. Even if you ultimately disagree, demonstrating openness builds trust."

#### Writing Performance Reviews

**Structure:**
1. **Summary** — Overall performance (meets/exceeds expectations), 2-3 key strengths, 1-2 growth areas.
2. **Key Accomplishments** — 3-5 most impactful projects or contributions with specific outcomes (metrics, launches, quality improvements).
3. **Dimension-by-Dimension Assessment** — Rate and provide examples for each competency (technical execution, collaboration, ownership, etc.).
4. **Growth Areas** — 1-3 specific areas for development with actionable suggestions.
5. **Career Development** — If promotion-track, outline path to next level. If not promotion-track, outline how to grow within current level.

**Tone:**
- Be direct but supportive. Sugarcoating developmental feedback doesn't help.
- Use "I observed" not "you are." Focus on behavior, not identity.
- Balance positive and developmental. If someone is strong, say so. If they have gaps, name them.

#### Promotion Case Writing

**Promotion Readiness Criteria:**
- **Sustained performance at the next level** — For 6-12 months, not just one stellar project. Consistency matters.
- **Demonstrated scope expansion** — Taking on bigger, more complex, more ambiguous work.
- **Organizational impact** — Contributed beyond their immediate team (mentoring, tooling, process improvements).

**Promotion Packet Structure:**
1. **Summary** — Candidate name, current level, target level, tenure, manager endorsement.
2. **Case for Promotion** — Why are they ready? Use the competency matrix. Show where they meet or exceed next-level expectations.
3. **Key Accomplishments** — 3-5 high-impact projects with measurable outcomes. Align each to next-level competencies.
4. **Peer Feedback** — 3-5 quotes from peers, cross-functional partners, or senior engineers. Shows they operate at the next level already.
5. **Growth Areas** — Even strong candidates have gaps. Acknowledge them but show they're manageable.
6. **Comparison to Peers** — How does this candidate compare to others at the target level? Calibration context matters.

**Pitfall:** Nominating someone for promotion because they've been around a long time, not because they perform at the next level. Tenure is not a promotion criterion.

#### Performance Improvement Plans (PIPs)

**When to Use PIPs:**
- Performance is significantly below expectations for 2+ months.
- Specific, documented performance issues that haven't improved despite feedback.
- Not a surprise. PIP should be the culmination of ongoing feedback, not a sudden shock.

**PIP Structure:**
1. **Performance Gaps** — Specific areas where performance is below expectations. Use examples.
2. **Success Criteria** — What does improvement look like? Measurable, time-bound goals (e.g., "Ship 2 features with <2 rounds of rework within 60 days").
3. **Support Provided** — What will the manager, mentor, or team do to support improvement? (e.g., weekly 1:1s, pairing sessions, dedicated mentor).
4. **Timeline** — Typically 30-60 days. Clear checkpoints (15 days, 30 days).
5. **Consequences** — If performance doesn't improve, what happens? (Usually termination or role change.)

**Facilitation:**
- Weekly check-ins during the PIP period. Don't wait until the end to give feedback.
- Document everything. Notes from 1:1s, progress on goals, feedback given.
- Be honest but supportive. The goal is improvement, not punishment.

#### Calibration Sessions

**Purpose:** Ensure consistency in performance ratings across managers. Prevents rating inflation or deflation.

**Process:**
1. **Managers submit preliminary ratings** — Each manager rates their team members on the 1-5 scale.
2. **Group discussion** — Managers present outlier cases (all 5s, any 1s or 2s). Justify ratings with evidence.
3. **Identify inconsistencies** — If Manager A rates their team higher than Manager B for similar performance, probe why. Normalize.
4. **Adjust ratings** — Based on discussion, managers adjust ratings to reflect consistent standards.

**Best Practices:**
- Come prepared with evidence. Don't rely on vague impressions.
- Challenge inflation. If someone rates their entire team 4s and 5s, that's not a high-performing team; that's grade inflation.
- Use the competency matrix as the source of truth. Ratings should map to observable behaviors at each level.

### After performance reviews

- **Deliver feedback in 1:1s** — Don't just send the written review. Walk through it together. Give the engineer space to ask questions or disagree.
- **Create a growth plan** — Based on the review, define 30-60-90 day goals tied to growth areas. Make it concrete and actionable.
- **Follow up regularly** — Check progress on growth goals in 1:1s. Don't wait for the next review cycle to give feedback.
- **Track promotion pipeline** — Identify engineers who are on a promotion track. Ensure they get the projects and visibility needed to demonstrate readiness.
- **Document outcomes** — If performance improves or worsens, note it. Builds a longitudinal record that's useful for calibration and promotion discussions.

## Self-check before task completion

- [ ] Evaluation criteria are explicitly defined with clear expectations at each engineering level
- [ ] Evidence is collected throughout the review cycle (projects, PRs, incidents, mentoring)
- [ ] 360-degree feedback is gathered from peers, cross-functional partners, and reports
- [ ] Performance review includes specific examples for each competency, not vague statements
- [ ] Developmental feedback uses SBI framework (Situation-Behavior-Impact) with coaching
- [ ] Promotion case demonstrates sustained performance at the next level for 6-12 months
- [ ] Promotion packet includes key accomplishments, peer feedback, and calibration context
- [ ] PIPs include specific performance gaps, measurable success criteria, and support plan
