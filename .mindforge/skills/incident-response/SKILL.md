---
name: incident-response
version: 1.0.0
min_mindforge_version: 0.3.0
status: stable
triggers: incident, outage, downtime, alert, pagerduty, oncall, on-call, postmortem,
          post-mortem, runbook, degraded, unavailable, error rate, p0, P0, p1, P1,
          rollback, hotfix, revert, emergency, spike, anomaly, SLA, SLO, SLI
---

# Skill — Incident Response Engineering

## When this skill activates
Any task involving incident runbooks, monitoring setup, alerting configuration,
hotfixes, rollbacks, or post-incident review documentation.

## Incident severity classification

| Level | Definition | Response time | Examples |
|---|---|---|---|
| P0 (Critical) | Complete service outage affecting all users | Immediate (24/7) | Site down, database unreachable, payment processing failed |
| P1 (High) | Major feature broken for all/most users | < 15 minutes | Login broken, core feature unavailable |
| P2 (Medium) | Feature degraded, workaround exists | < 2 hours | Slow API, intermittent errors for subset of users |
| P3 (Low) | Minor issue, cosmetic or edge case | Next business day | UI glitch, non-critical feature broken |

## Runbook template (write one for every critical path)

File: `docs/runbooks/[service-name]-[issue-type].md`

```markdown
# Runbook: [Service/Feature] — [Issue Type]

## Overview
**Service:** [name]
**Symptom:** [what the monitoring alert describes]
**Impact:** [who is affected and how]
**Severity:** P[0-3]

## Detection
**Alert:** [alert name and source — PagerDuty, Datadog, etc.]
**Metrics to check:**
- [metric 1]: normal range [X-Y], alert threshold [Z]
- [metric 2]: normal range [X-Y], alert threshold [Z]

## Immediate actions (first 5 minutes)
1. Acknowledge the alert in [alerting tool]
2. Check [dashboard URL] for current status
3. [Specific first diagnostic step]
4. [Specific second diagnostic step]
5. If confirmed P0/P1: page the on-call lead

## Diagnosis steps
1. Check [log location] for errors: `grep -E "ERROR|FATAL" [log file] | tail -50`
2. Check database connectivity: `[connection test command]`
3. Check external dependencies: `curl -I [dependency health URL]`
4. Check recent deployments: `git log --oneline -5`

## Mitigation options (in order of preference)
1. **Restart the service:** `[restart command]` — use if: [condition]
2. **Scale horizontally:** `[scale command]` — use if: [condition]
3. **Rollback deployment:** `[rollback command]` — use if: [condition]
4. **Failover to backup:** `[failover steps]` — use if: [condition]
5. **Feature flag off:** `[flag command]` — use if: [condition]

## Communication template
**Internal Slack:** "@oncall [P0] [service] is [symptom]. Investigating. ETA: [X] min"
**Status page:** "[Service] is currently experiencing [symptom]. We are investigating."
**Customer email:** [only for P0 lasting > 30 minutes]

## Post-incident (after mitigation)
1. Update status page: "Resolved. [Brief cause]."
2. Write postmortem within 48 hours (see template below)
3. Create follow-up tickets for permanent fix

## Escalation path
L1 On-call → L2 Senior engineer → L3 Engineering lead → L4 CTO
Escalate when: unable to mitigate within [X] minutes or if [condition]
```

## Postmortem template (blameless — always)

File: `docs/postmortems/[YYYY-MM-DD]-[short-title].md`

```markdown
# Postmortem: [Title]
**Date of incident:** [ISO-8601]
**Duration:** [start] → [end] ([X] minutes)
**Severity:** P[0-3]
**Author:** [who wrote this]
**Reviewed by:** [who reviewed]

## Summary
[2-3 sentences: what happened, what the impact was, what resolved it]

## Timeline (UTC)
| Time | Event |
|---|---|
| HH:MM | [Alert fired / Issue observed] |
| HH:MM | [First responder acknowledged] |
| HH:MM | [Root cause identified] |
| HH:MM | [Mitigation applied] |
| HH:MM | [Incident resolved] |

## Root cause
[One paragraph describing the technical root cause. Factual, no blame.]

## Impact
- Users affected: [number or percentage]
- Duration: [X] minutes
- Data loss: Yes / No (if yes: what data, how much)
- Revenue impact: [estimate if known]
- SLA breach: Yes / No

## What went well
- [Thing 1 that helped: good alert, good runbook, fast diagnosis]
- [Thing 2]

## What went poorly
- [Thing 1 that slowed resolution: no runbook, missed alert, unclear owner]
- [Thing 2]

## Action items
| Action | Owner | Due date | Priority |
|---|---|---|---|
| [Preventive action 1] | [name] | [date] | P[1-3] |
| [Detection improvement] | [name] | [date] | P[1-3] |

## Lessons learned
[What systemic changes does this incident motivate?]
```

## Monitoring standards (write monitoring alongside every feature)

Every new feature must ship with:
1. **Health check endpoint:** `GET /health` returns 200 when service is operational
2. **Key metrics instrumented:** request count, error rate, p95 latency, queue depth
3. **Alerts defined:** at minimum:
   - Error rate > 1% for 5 minutes → P1 alert
   - p95 latency > [NFR threshold] for 5 minutes → P2 alert
   - Zero requests for 5 minutes (if expected traffic) → P1 alert
4. **Runbook linked in alert:** every alert description links to its runbook

## Hotfix protocol

When a production issue requires an immediate code fix:

```bash
# 1. Create hotfix branch from production tag
git checkout -b hotfix/[description] v[last-release-tag]

# 2. Apply the minimal fix — do not add anything else
# 3. Write or update the test that catches this bug
# 4. Verify the fix
npm test

# 5. PR to main AND to the release branch
# 6. Deploy to production immediately after approval
# 7. Tag the hotfix release
git tag -a v[X.Y.Z+1] -m "Hotfix: [description]"
```
