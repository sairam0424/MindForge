---
name: on-call-design
version: 1.0.0
min_mindforge_version: 10.1.0
status: stable
triggers: on-call design, rotation fairness, escalation SLA, runbook coverage, toil budget, on-call compensation, burnout prevention, page frequency, on-call rotation schedule, alert fatigue, on-call handbook, incident response time
compose: incident-management
---

# On-Call Design

## When this skill activates

This skill activates when designing, evaluating, or improving on-call rotations,
escalation policies, alerting strategies, and the operational sustainability of
incident response. It addresses rotation fairness, alert fatigue prevention,
runbook coverage, and burnout prevention to create a humane and effective on-call
system.

## Mandatory actions when this skill is active

### Before

1. **Audit current state** — How many pages per week per person? What percentage have
   runbooks? What is the false-positive rate? How is on-call currently compensated?
2. **Identify pain points** — Survey on-call participants: What is most frustrating?
   What causes the most stress? What pages feel unnecessary?
3. **Define service level objectives** — What response times does the business actually
   need? Not everything requires a 2 AM page.

### During

4. **Rotation design principles:**
   - Minimum 2 people in rotation at all times (primary + secondary)
   - Maximum 1 week per rotation (longer causes burnout)
   - Follow-the-sun for global teams (no one gets paged at 3 AM regularly)
   - Handoff includes: active incidents, known issues, upcoming risky changes
   - New team members shadow for 2 rotations before going primary
   - Easy swap mechanism for personal conflicts

5. **Fairness and compensation:**
   - Equal distribution of on-call burden across all eligible engineers
   - Track after-hours pages per person — redistribute if imbalanced
   - Compensate on-call time (stipend for carrying the pager, additional compensation
     for after-hours pages)
   - Swap-friendly policy — no guilt for requesting swaps
   - On-call load counts toward sprint capacity (reduce story points by 20-30%)
   - Never mandate on-call for people who did not agree to it at hiring

6. **Escalation SLAs:**
   - **Acknowledge** — 5 minutes (confirm human is aware)
   - **Triage** — 15 minutes (assess severity, determine if action needed now)
   - **Resolve or escalate** — 60 minutes (either fix it or pull in help)
   - Clear escalation path: primary → secondary → team lead → engineering manager
   - Automatic escalation if acknowledgment SLA is missed
   - No shame in escalating — better to involve help early than struggle alone

7. **Runbook coverage requirements:**
   - Every alert MUST have a corresponding runbook
   - Runbook contains: what the alert means, impact if ignored, diagnostic steps,
     resolution steps, escalation criteria
   - If no runbook exists for an alert, the alert should not page — it is toil
   - Runbooks must be tested quarterly (can a new engineer follow them successfully?)
   - Runbook updates are mandatory after any incident where the runbook was insufficient

8. **Toil budget management:**
   - Define toil: repetitive, automatable, reactive work with no lasting value
   - If >30% of on-call time is toil, invest in automation
   - Track toil hours separately from incident response hours
   - Dedicate engineering time each sprint to reducing top toil sources
   - Toil that persists for >3 months without investment is a leadership failure

9. **Alert fatigue prevention:**
   - If an alert does not require human action within 5 minutes, delete it
   - Target: fewer than 5 pages per week per person
   - Review all alerts quarterly: keep, tune, or delete
   - Silence non-actionable alerts aggressively (log them, don't page for them)
   - Group related alerts to prevent page storms (one page for a cascading failure,
     not 50)
   - Every page that did not need human intervention is a bug in your alerting

10. **Burnout prevention:**
    - Monitor page frequency trends — rising trends require immediate action
    - After a high-severity incident with extended resolution, give the responder
      compensatory time off
    - Regular check-ins on on-call stress (not just "how many pages" but "how do you
      feel about on-call?")
    - Option to temporarily step out of rotation for personal reasons without stigma
    - Celebrate good on-call: quiet weeks are victories, not luck

### After

11. **Publish on-call handbook** — Document all policies, rotations, escalation paths,
    compensation, and expectations in one discoverable location.
12. **Review quarterly** — Analyze page frequency, response times, toil percentage,
    fairness distribution, and team satisfaction.
13. **Iterate on alerts** — After every on-call rotation, the outgoing person reviews
    alerts received and recommends: keep as-is, tune threshold, add runbook, or delete.

## Self-check before task completion

- [ ] Rotation has minimum 2 people with maximum 1-week shifts
- [ ] Compensation model defined for on-call time and after-hours pages
- [ ] Escalation SLAs documented (acknowledge: 5min, triage: 15min, resolve: 60min)
- [ ] Every alert has a corresponding runbook (or is deleted/silenced)
- [ ] Page frequency target set (<5/week/person) with current baseline measured
- [ ] Toil budget defined (<30%) with automation investment plan for top sources
- [ ] Alert review cadence established (quarterly minimum)
- [ ] Burnout prevention measures in place (comp time, swap policy, check-ins)
- [ ] On-call handbook published and discoverable
- [ ] Fairness tracking mechanism active (pages per person distribution)
