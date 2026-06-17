---
name: notification-system-design
version: 1.0.0
min_mindforge_version: 10.0.4
status: stable
triggers: notification system, multi-channel notification, frequency capping, preference management, notification delivery, push notification architecture, notification template, notification queue, do not disturb, notification deduplication, channel routing, notification personalization
---

# Skill — Notification System Design (Multi-Channel Delivery Architecture)

## When this skill activates
When designing notification delivery systems, implementing multi-channel messaging,
building preference management, or architecting notification infrastructure. Use for
any system that needs to send timely, relevant messages to users across push, email,
SMS, in-app, or other channels.

Core principle: **Respect over reach** — every notification should earn its delivery
by being timely, relevant, and respectful of user preferences and attention.

## Mandatory actions when this skill is active

### Channel Selection (Urgency Matrix)

1. **Route notifications by urgency and type:**
   ```
   | Urgency    | Channels                    | Examples                          |
   |------------|-----------------------------|-----------------------------------|
   | Critical   | Push + Email + SMS          | Security alert, payment failure   |
   | Important  | Push + Email                | Order shipped, appointment reminder|
   | Standard   | Push OR Email               | New feature, weekly digest        |
   | Low        | In-app only                 | Social activity, recommendations  |
   ```

   Rules:
   - Critical notifications bypass frequency caps (but still respect DND)
   - Never send SMS for non-critical notifications (highest user annoyance cost)
   - In-app is the lowest-friction channel — use it generously
   - Email is async — never rely on it for time-sensitive actions
   - User channel preferences override the urgency matrix (except Critical/security)

### Frequency Capping

2. **Rate limiting per user:**
   ```json
   {
     "caps": {
       "push": {"max_per_day": 5, "max_per_hour": 2},
       "email": {"max_per_day": 3, "max_per_week": 10},
       "sms": {"max_per_day": 1, "max_per_week": 3},
       "in_app": {"max_per_day": 20}
     },
     "aggregation": {
       "combine_similar": true,
       "digest_threshold": 3,
       "digest_window_minutes": 30
     }
   }
   ```

   Rules:
   - Caps are per-user, per-channel, across ALL notification types
   - When cap is reached: queue for next window OR downgrade to lower-urgency channel
   - Aggregate similar notifications into digests (e.g., "3 new comments" not 3 separate pushes)
   - Track notification fatigue: if open rate drops below 5%, reduce frequency automatically
   - Critical/security notifications are exempt from caps but tracked separately

### Preference Management

3. **User preference schema:**
   ```json
   {
     "user_id": "uuid",
     "global": {
       "muted": false,
       "do_not_disturb": {"enabled": true, "start": "22:00", "end": "08:00", "timezone": "America/New_York"}
     },
     "channels": {
       "push": {"enabled": true},
       "email": {"enabled": true, "digest_mode": "daily"},
       "sms": {"enabled": false}
     },
     "categories": {
       "marketing": {"push": false, "email": true},
       "social": {"push": true, "email": false},
       "transactional": {"push": true, "email": true},
       "security": {"push": true, "email": true, "sms": true}
     }
   }
   ```

   Rules:
   - Users can control preferences at: global, channel, and category level
   - Category-level overrides channel-level (fine-grained control)
   - Security/transactional notifications: always delivered (legal requirement), but user chooses channel
   - DND hours: queue notifications and deliver when DND ends (except Critical)
   - Preference changes take effect immediately (no "takes up to 24 hours")

### Delivery Architecture

4. **System architecture:**
   ```
   Event Source → Notification Service → Channel Router → Delivery Providers → Tracking

   Components:
   1. Event Ingestion: receives trigger events from application services
   2. Notification Service: applies business logic (templates, personalization, dedup)
   3. Preference Engine: checks user preferences and caps
   4. Channel Router: selects delivery channel(s) per urgency matrix + preferences
   5. Queue (per channel): buffers for rate limiting and retry
   6. Delivery Providers: FCM/APNs (push), SendGrid/SES (email), Twilio (SMS)
   7. Tracking: delivery status, opens, clicks, dismissals
   ```

5. **Delivery guarantees:**
   - At-least-once delivery with deduplication
   - Idempotency key per notification (event_type + user_id + dedup_window)
   - Exponential retry with jitter (max 3 retries per channel)
   - Dead letter queue for permanently failed deliveries
   - Track delivery status: queued → sent → delivered → opened → clicked/dismissed

6. **Deduplication:**
   ```
   Dedup key = hash(notification_type + user_id + content_hash)
   Dedup window = configurable per type (default: 1 hour)

   If same dedup key seen within window:
   - Suppress duplicate
   - Log suppression (for debugging)
   - Update existing notification if content changed
   ```

### Template System

7. **Notification templates:**
   ```
   Template: order_shipped
   Channels: push, email
   Personalization tokens: {{user.first_name}}, {{order.id}}, {{order.tracking_url}}

   Push:
     title: "Your order is on its way!"
     body: "{{user.first_name}}, order #{{order.id}} has shipped. Track it here."
     action_url: "{{order.tracking_url}}"

   Email:
     subject: "Order #{{order.id}} shipped"
     template_id: "tmpl_order_shipped_v2"
     variables: {first_name, order_id, tracking_url, items}
   ```

   Rules:
   - Templates support multi-language (locale selected from user preferences)
   - Preview rendering available before send (catch token errors)
   - Version templates (never edit in place — create new version, deprecate old)
   - A/B test notification copy via experiment-design skill

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I define an urgency matrix mapping notification types to channels?
- [ ] Are frequency caps defined per-user, per-channel with aggregation rules?
- [ ] Do user preferences support global, channel, and category-level control?
- [ ] Is DND (do not disturb) implemented with timezone awareness?
- [ ] Is delivery at-least-once with deduplication via idempotency keys?
- [ ] Are retries exponential with a dead letter queue for failures?
- [ ] Are templates versioned, multi-language, and previewable?
- [ ] Are Critical/security notifications exempt from caps but still respect DND?
