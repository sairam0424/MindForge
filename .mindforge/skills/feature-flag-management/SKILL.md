---
name: feature-flag-management
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
triggers: feature flag, flag lifecycle, targeting rules, percentage rollout, kill switch, flag debt, openfeature, flag evaluation, flag cleanup, flag dependency, experiment flag, operational flag
---

# Skill — Feature Flag Management

## When this skill activates
Any task involving feature flag implementation, progressive rollouts, kill
switches, flag lifecycle management, or flag debt cleanup.

## Mandatory actions when this skill is active

### Before writing any code
1. Classify the flag type (release, experiment, operational, permission).
2. Define the flag lifecycle including planned cleanup date.
3. Determine targeting rules (who sees what).

### During implementation
- Set expiration date on every flag (max 90 days for release flags).
- Implement clean fallback behavior for both flag states.
- Use server-side evaluation for security-sensitive flags.

### After implementation
- Register flag in the flag inventory with owner and cleanup date.
- Add monitoring for flag evaluation metrics.
- Schedule cleanup task for after 100% rollout.

## Flag Types

### Release Flags
- Purpose: ship code behind a flag, enable when ready.
- Lifecycle: short-lived (days to weeks).
- Example: `enable_new_checkout_flow`
- Cleanup: remove after 100% rollout is stable (max 90 days).

### Experiment Flags
- Purpose: A/B testing with controlled variants.
- Lifecycle: duration of experiment (2-8 weeks).
- Example: `experiment_pricing_page_v2`
- Cleanup: remove after experiment concludes and winner is chosen.

### Operational Flags (Kill Switches)
- Purpose: disable features under load or during incidents.
- Lifecycle: permanent (always present in codebase).
- Example: `kill_switch_recommendations_engine`
- Cleanup: never — these are infrastructure.

### Permission Flags (Entitlements)
- Purpose: gate features by user plan/tier.
- Lifecycle: permanent (tied to business model).
- Example: `entitlement_advanced_analytics`
- Cleanup: only when business model changes.

## Flag Lifecycle

```
CREATE → DEVELOP → TEST → ROLLOUT → STABLE → CLEANUP
```

### Create
- Register flag with name, type, owner, description, planned cleanup date.
- Default state: OFF (new flags start disabled).

### Develop
- Code both paths (flag ON and flag OFF).
- Both paths must be tested and functional.

### Test
- Enable in staging/QA environments.
- Test both variants thoroughly.
- Verify fallback behavior when flag service is unavailable.

### Rollout
- Progressive: 1% → 5% → 25% → 50% → 100%.
- Monitor error rates and performance at each stage.
- Hold at each percentage for minimum observation period.

### Stable
- Flag at 100% for > 7 days with no issues.
- Old code path is dead code.

### Cleanup
- Remove flag evaluation from code.
- Remove dead code path (the OFF variant).
- Delete flag from management system.
- Remove from flag inventory.

## Targeting Rules

### User Attributes
```json
{
  "flag": "new_dashboard",
  "rules": [
    {"attribute": "plan", "operator": "in", "values": ["enterprise", "pro"]},
    {"attribute": "country", "operator": "equals", "value": "US"}
  ]
}
```

### Segments
- Define reusable user groups: "beta_users", "internal_team", "enterprise_customers".
- Target flags at segments rather than individual attributes.
- Segments update independently of flag rules.

### Percentage Rollout
- Hash user_id to determine bucket (consistent — same user always in same bucket).
- Increase percentage gradually: 1% → 5% → 25% → 50% → 100%.
- Sticky: user in 5% group stays in 25% group (no flip-flopping).

### Geographic Targeting
- Enable by region/country for compliance or staged global rollout.
- Example: launch in US first, then EU, then APAC.

## Flag Evaluation

### Server-Side (Preferred for Security)
- Flag evaluated on server, client receives result.
- Source code and flag rules not exposed to client.
- Use for: payment features, access control, security-sensitive logic.

### Client-Side (Better Performance)
- Flag rules sent to client, evaluated locally.
- Faster (no network round-trip for each evaluation).
- Use for: UI changes, non-sensitive features.
- Risk: rules visible in client bundle.

### Default Values
- Always provide a sensible default if flag service is unreachable.
- Release flags default to OFF (safe — old behavior).
- Kill switches default to ON (safe — feature stays enabled).

## Flag Debt Management

### Indicators of Flag Debt
- Flags older than 90 days still in codebase.
- Flags at 100% rollout not cleaned up.
- Nested flag dependencies (flag A depends on flag B).
- Dead code paths that will never execute.

### Prevention
- Automated reminders: alert owner when flag exceeds planned cleanup date.
- Flag inventory review: monthly audit of all active flags.
- CI check: warn on PR if modifying code with expired flags.
- Metric: track total active flag count as a health metric.

### Cleanup Process
1. Verify flag is at 100% and stable for > 7 days.
2. Remove flag evaluation from code.
3. Remove dead code path.
4. Delete flag from management system.
5. Update tests (remove flag-variant test cases).

## OpenFeature (Vendor-Neutral Standard)

### Why OpenFeature
- Standard SDK interface regardless of flag provider.
- Switch providers (LaunchDarkly, Flagsmith, custom) without code changes.
- Community-driven specification with official SDKs.

### Usage Pattern
```typescript
import { OpenFeature } from '@openfeature/js-sdk';

const client = OpenFeature.getClient();
const showNewUI = await client.getBooleanValue('new_ui', false, context);
```

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Does every flag have a type classification?
- [ ] Does every release/experiment flag have a cleanup date?
- [ ] Are both code paths (ON and OFF) tested?
- [ ] Is there a sensible default for flag service unavailability?
- [ ] Is the flag registered in the inventory with owner?
- [ ] Is server-side evaluation used for security-sensitive flags?
