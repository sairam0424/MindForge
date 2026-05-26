---
name: technology-radar
version: 1.0.0
min_mindforge_version: 10.1.0
status: stable
triggers: technology radar, tech adoption, trial technology, hold technology, retire technology, tech evaluation, ecosystem maturity, technology lifecycle, adopt or retire, tech assessment, emerging technology, technology governance
---

# Technology Radar

## When this skill activates

This skill activates when the team needs to evaluate, adopt, trial, or retire a
technology. It provides a structured governance framework for technology decisions
using the four-ring radar model, ensuring technologies are assessed objectively
and lifecycle-managed with clear migration paths.

## Mandatory actions when this skill is active

### Before

1. **Identify the technology under evaluation** — Name, category (language, framework,
   tool, platform, technique), and the problem it claims to solve.
2. **Determine current ring placement** — Where does this technology sit today in the
   organization's radar? (Adopt / Trial / Assess / Hold / Not yet tracked)
3. **Gather context** — Who is requesting the evaluation? What project would use it?
   What does it replace or complement?

### During

4. **Apply the Four Rings model:**
   - **Adopt** — Proven in production, recommended as default choice. Teams should use
     this unless there is a compelling reason not to.
   - **Trial** — Worth pursuing on a specific project with clear boundaries. Team has
     committed to evaluate with production-quality implementation.
   - **Assess** — Worth exploring to understand potential. Research spikes, prototypes,
     and conference talks. No production use yet.
   - **Hold** — Proceed with caution. Do not start new projects with this technology.
     Existing usage should plan migration path.

5. **Evaluate against criteria:**
   - **Community size** — Contributors, GitHub stars trend, Stack Overflow activity,
     corporate backing stability.
   - **Maintenance activity** — Release frequency, issue response time, bus factor of
     maintainers, funding model sustainability.
   - **Breaking change frequency** — Semver discipline, migration tooling quality,
     deprecation communication practices.
   - **Performance benchmarks** — Relevant benchmarks compared to current stack and
     alternatives. Avoid synthetic-only benchmarks.
   - **Hiring pool** — Can you hire people who know this? Is the talent market growing
     or shrinking? Training cost for existing team.
   - **Ecosystem maturity** — Library availability, tooling quality, IDE support,
     documentation completeness, testing story.

6. **Governance rules:**
   - Quarterly radar review — Reassess all Trial and Assess items every quarter.
   - Trial time-box — Maximum 3 months. At end: promote to Adopt, extend with
     justification, or move to Hold.
   - Clear migration paths — Every Hold decision must include a recommended alternative
     and migration timeline estimate.
   - Retire explicitly — Technologies leaving Adopt must have deprecation plan with
     timeline and responsible team.

7. **Risk assessment:**
   - What happens if this technology is abandoned by maintainers?
   - What is the switching cost if we adopt and later need to leave?
   - Does this create a single-vendor dependency?
   - Are there regulatory/compliance implications?

### After

8. **Update the radar** — Record the ring placement decision with date, rationale, and
   evaluation evidence.
9. **Communicate the decision** — Share with engineering org via radar changelog.
   Include: what changed, why, and what teams should do differently.
10. **Set review date** — Schedule next evaluation based on ring (Adopt: annually,
    Trial: 3 months, Assess: 6 months, Hold: review migration progress quarterly).

## Self-check before task completion

- [ ] Technology placed in exactly one ring with clear justification
- [ ] All six evaluation criteria scored or explicitly marked not-applicable
- [ ] Risk assessment completed including abandonment and switching cost
- [ ] Migration path defined if placing in Hold ring
- [ ] Time-box set if placing in Trial ring
- [ ] Radar changelog entry written
- [ ] Next review date scheduled
- [ ] Decision communicated to affected teams
