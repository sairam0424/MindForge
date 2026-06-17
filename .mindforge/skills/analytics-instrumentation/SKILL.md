---
name: analytics-instrumentation
version: 1.0.0
min_mindforge_version: 10.0.4
status: stable
triggers: analytics instrumentation, event taxonomy, tracking plan, data layer architecture, privacy-aware analytics, funnel measurement, event naming convention, analytics schema, user journey tracking, conversion tracking, analytics governance, event validation
---

# Skill — Analytics Instrumentation (Privacy-Aware Event Architecture)

## When this skill activates
When designing event tracking systems, building data layers, creating tracking plans,
instrumenting user journeys, or establishing analytics governance. Use for any task
that involves measuring user behavior in a structured, privacy-respecting way.

Core principle: **Track intent, not surveillance** — measure what users DO to improve
what you BUILD, never to manipulate or over-collect.

## Mandatory actions when this skill is active

### Event Taxonomy Design

1. **Naming convention (object_action format):**
   ```
   Format: [object]_[action]
   Examples:
   - button_clicked
   - form_submitted
   - page_viewed
   - cart_item_added
   - search_performed
   - error_encountered
   ```

   Rules:
   - Always past tense for the action (clicked, not click)
   - Lowercase with underscores (snake_case)
   - Object first, action second (noun_verb)
   - Maximum 3 words total (object can be compound: cart_item_added)
   - Never include PII in event names
   - Never include dynamic values in event names (no "product_12345_viewed")

2. **Event property schema:**
   ```json
   {
     "event": "button_clicked",
     "properties": {
       "button_id": "string (required) — unique identifier",
       "button_text": "string (required) — visible label",
       "page_path": "string (required) — current URL path",
       "section": "string (optional) — page section containing button",
       "variant": "string (optional) — A/B test variant if applicable"
     },
     "context": {
       "timestamp": "ISO-8601 (auto)",
       "session_id": "string (auto)",
       "device_type": "string (auto)",
       "viewport_width": "number (auto)"
     }
   }
   ```

   Rules:
   - Separate event-specific properties from auto-collected context
   - Mark each property as required or optional
   - Include data type and brief description
   - Never include PII in properties without explicit consent flag

### Tracking Plan

3. **Tracking plan structure (source of truth):**
   ```
   | Event Name       | Trigger                    | Properties         | Owner    | Status       |
   |------------------|----------------------------|--------------------|----------|--------------|
   | page_viewed      | Page load complete         | page_path, title   | @fe-team | Implemented  |
   | button_clicked   | Any tracked button click   | button_id, text    | @fe-team | In Review    |
   | form_submitted   | Form submission success    | form_id, fields    | @fe-team | Planned      |
   ```

   Rules:
   - Every event MUST have an owner (team or individual)
   - Status lifecycle: Planned → In Review → Implemented → Validated → Deprecated
   - Review tracking plan quarterly: deprecate unused events
   - New events require tracking plan entry BEFORE implementation

### Data Layer Architecture

4. **Data layer implementation:**
   ```javascript
   // Structured data layer (consumed by analytics tools)
   window.dataLayer = window.dataLayer || [];

   // Push events with standard structure
   window.dataLayer.push({
     event: 'button_clicked',
     properties: {
       button_id: 'cta-signup-hero',
       button_text: 'Start Free Trial',
       page_path: '/pricing'
     }
   });
   ```

   Rules:
   - Data layer is the SINGLE source of truth (analytics tools consume it, don't instrument directly)
   - Never push to data layer before consent is granted
   - Validate data layer pushes against schema in CI
   - Data layer must be populated server-side for critical events (don't rely solely on client JS)

### Privacy-Aware Analytics

5. **Privacy requirements (non-negotiable):**
   - Obtain consent BEFORE any tracking fires (banner/modal with granular choices)
   - Honor Do Not Track (DNT) header — respect user preference
   - Anonymize by default: no full IP, no fingerprinting, no cross-site tracking
   - Data retention: define maximum retention per event type (default 13 months for GDPR)
   - Right to deletion: ensure analytics pipeline can purge by user ID
   - Consent categories: necessary (no consent needed) | analytics (consent required) | marketing (separate consent)

6. **Consent implementation:**
   ```javascript
   // Only track if user has consented to analytics category
   if (consentManager.hasConsent('analytics')) {
     dataLayer.push({ event: 'page_viewed', properties: {...} });
   }
   ```

### Funnel Measurement

7. **Funnel definition:**
   ```
   Funnel: [name]
   Steps:
   1. page_viewed (page_path = '/pricing')     → Entry
   2. button_clicked (button_id = 'select-plan') → Intent
   3. form_submitted (form_id = 'payment')     → Commitment
   4. purchase_completed                        → Conversion

   Metrics per step:
   - Volume (count)
   - Conversion rate (step N / step N-1)
   - Drop-off rate (1 - conversion rate)
   - Time between steps (median, p95)
   ```

   Rules:
   - Define funnels for every critical user journey
   - Segment funnels by: device, acquisition source, user cohort, experiment variant
   - Alert on significant drop-off changes (>10% deviation from baseline)
   - Funnel steps must use the same event taxonomy

### Analytics Governance

8. **Governance processes:**
   - **Schema validation in CI**: every new event must match the tracking plan schema
   - **Unused event cleanup**: quarterly audit, deprecate events with <100 fires/month
   - **Naming review**: new events require team lead approval (prevents drift)
   - **Data quality monitoring**: alert on sudden volume spikes/drops (instrumentation bugs)
   - **Documentation**: tracking plan is the living doc, not code comments

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I follow the object_action naming convention?
- [ ] Is every event documented in the tracking plan with owner and status?
- [ ] Does the data layer implementation gate on user consent?
- [ ] Are PII fields excluded from event properties (or flagged for special handling)?
- [ ] Did I define funnels for critical user journeys with per-step metrics?
- [ ] Is there a governance process for event lifecycle management?
- [ ] Can the schema be validated in CI (preventing undocumented events)?
- [ ] Is data retention defined and compliant with privacy regulations?
