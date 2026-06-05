---
name: "mindforge:hire"
description: "Design technical interview process. Usage: /mindforge:hire [role] [--level junior|mid|senior|staff] [--type system-design|coding|behavioral]"
argument-hint: "[role] [--level junior|mid|senior|staff] [--type system-design|coding|behavioral]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design comprehensive technical interview processes tailored to role, seniority level, and organization culture. Generates interview rubrics, question banks, and calibration frameworks to ensure consistent, fair, and predictive hiring.
</objective>

<execution_context>
@.mindforge/skills/hiring-engineering/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/hiring-engineering/`
State: Analyzes role requirements, maps to competencies, designs multi-stage interview funnel with scorecards, questions, and calibration mechanisms.
</context>

<process>
1. **Role Decomposition**: Extract core competencies from job description. For Backend → API design, data modeling, concurrency, observability. For Frontend → component architecture, state management, accessibility, performance. For Infra → distributed systems, networking, cost optimization, incident response. Map to 4-6 key evaluation areas.

2. **Seniority Calibration**: Junior → executes tasks, learns patterns, needs guidance. Mid → owns features, solves ambiguous problems, mentors juniors. Senior → designs systems, defines standards, unblocks team. Staff → sets technical direction, influences org-wide decisions, scales team effectiveness. Adjust complexity and autonomy expectations per level.

3. **Interview Stage Design**: Stage 1 (Screening) → 30min technical phone screen with 2 focused questions. Stage 2 (Coding) → 60-90min live coding (algorithm + system implementation). Stage 3 (System Design) → 60min architecture session (scale/reliability/trade-offs). Stage 4 (Behavioral) → 45min STAR method competency questions. Stage 5 (Team Fit) → 30min cultural values alignment.

4. **Question Bank Generation**: For system-design → design URL shortener (junior), design rate limiter (mid), design distributed cache (senior), design multi-region data platform (staff). For coding → two-sum (junior), LRU cache (mid), concurrent task scheduler (senior), distributed transaction coordinator (staff). Include rubric with 1-4 scoring for each question dimension.

5. **Rubric Framework**: Define 4 levels per competency. Level 1 (Below bar) → cannot complete basic task with hints. Level 2 (Mixed signals) → completes with significant guidance. Level 3 (Hire bar) → completes independently with good trade-off reasoning. Level 4 (Strong hire) → exceptional depth, proactive edge case handling, teaches interviewer something new.

6. **Calibration Protocol**: Run shadow interviews for first 3 sessions. Compare scores across interviewers weekly. Flag score variance > 1 point for debrief. Maintain question difficulty metrics (pass rate, average score). Rotate questions quarterly to prevent memorization. Document common failure modes and how to probe deeper.

7. **Bias Mitigation**: Use structured rubrics (not gut feel). Ask same core questions to all candidates. Train interviewers on inclusive language. Anonymize resumes during screening. Track demographic offer rates and adjust process if disparities emerge. Provide clear feedback to rejected candidates.
</process>
