---
name: incident-management
version: 1.0.0
min_mindforge_version: 10.0.7
status: stable
triggers: incident management process, runbook authoring, severity classification framework, communication template design, on-call rotation design, escalation path design, blameless postmortem facilitation, incident timeline reconstruction, incident playbook, war room methodology, incident retrospective framework, pager rotation scheduling
compose:
  - observability-stack
---

# Incident Management

## When this skill activates

This skill activates when the user is designing, implementing, or improving incident
management processes. This includes severity classification frameworks, runbook
authoring, on-call rotation scheduling, escalation path design, blameless postmortem
facilitation, war room methodology, communication templates for stakeholders, and
incident timeline reconstruction for retrospectives.

## Mandatory actions

### Before

1. Identify the current incident management maturity (ad-hoc, documented, measured, optimized).
2. Determine the team size, timezone coverage, and existing on-call tooling (PagerDuty, Opsgenie, etc.).
3. Assess existing runbook coverage and documentation gaps.
4. Review past incident frequency and mean-time-to-recovery (MTTR) trends.
5. Confirm observability stack integration (alerts feed into incident workflow).

### During

**Severity Framework:**
- **SEV1 (Critical):** Total service outage affecting all users. Revenue impact. All-hands response. Target acknowledgment: 5 minutes. Target resolution: 1 hour.
- **SEV2 (Major):** Significant degradation affecting many users. Key features unavailable. On-call + escalation. Target acknowledgment: 15 minutes. Target resolution: 4 hours.
- **SEV3 (Minor):** Partial degradation affecting a subset of users. Workarounds exist. On-call handles. Target acknowledgment: 30 minutes. Target resolution: 24 hours.
- **SEV4 (Low):** Minor issue with minimal user impact. Handled during business hours. Target resolution: 72 hours.
- Severity is determined by impact (users affected) x urgency (revenue/safety/compliance risk).

**Runbook Template:**
- **Trigger Conditions:** What alert or symptom initiates this runbook.
- **Investigation Steps:** Ordered diagnostic commands and checks (copy-pasteable).
- **Mitigation Actions:** Immediate steps to restore service (rollback, failover, scale).
- **Escalation Criteria:** When to involve additional teams or bump severity.
- **Communication Templates:** Pre-written status page updates and stakeholder messages.
- **Verification:** How to confirm the incident is resolved.
- Keep runbooks in version control, review quarterly, update after every incident.

**On-Call Rotation:**
- Follow-the-sun model for distributed teams (no one owns overnight).
- Maximum rotation length: 1 week. Longer causes burnout.
- Provide compensation (extra pay, time off, or both).
- Escalation after 15 minutes of no acknowledgment.
- Secondary on-call as backup for every primary.
- On-call handoff includes open incidents, recent changes, and known risks.

**War Room Methodology:**
- Designate an Incident Commander (IC) who coordinates, does not debug.
- IC assigns roles: Communications Lead, Technical Lead, Scribe.
- Communication cadence: status page updates every 15 minutes during SEV1/SEV2.
- Use a shared channel (Slack/Teams) with pinned timeline.
- No blame during active incident — focus on mitigation only.

**Postmortem Structure:**
- **Timeline:** Minute-by-minute reconstruction of events.
- **Impact:** Users affected, duration, revenue/SLA impact.
- **Root Cause:** The systemic failure that allowed the incident.
- **Contributing Factors:** What made detection/resolution harder.
- **Action Items:** Specific, assigned, time-boxed improvements.
- Blameless: focus on systems and processes, never individuals.
- Share postmortems broadly — learning is organizational.
- Track action item completion rate as a metric.

**Communication:**
- Status page updates every 15 minutes during active incidents.
- Internal stakeholder updates via designated channel.
- Customer-facing communication: acknowledge → investigate → mitigate → resolve.
- Post-resolution: summary email with impact and next steps.

### After

1. Verify runbooks are tested (tabletop exercises quarterly).
2. Confirm escalation paths are current and contact information is valid.
3. Validate on-call schedule has no coverage gaps.
4. Review postmortem action item completion from previous incidents.
5. Measure MTTR trends and identify systemic improvement opportunities.

## Self-check before task completion

- [ ] Severity levels are clearly defined with response time targets.
- [ ] Runbooks follow the template and are actionable (copy-pasteable commands).
- [ ] On-call rotation is sustainable (max 1 week, compensation, follow-the-sun).
- [ ] Escalation paths have timeout-based auto-escalation.
- [ ] Postmortem template is blameless and includes action items.
- [ ] Communication cadence is defined for each severity level.
- [ ] All processes integrate with existing alerting and observability tooling.
- [ ] Quarterly review cadence is established for runbook freshness.
