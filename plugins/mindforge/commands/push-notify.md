---
name: "mindforge:push-notify"
description: "Design push notification architecture. Usage: /mindforge:push-notify [channel] [--platform ios|android|web] [--priority high|normal|low]"
argument-hint: "[channel] [--platform ios|android|web] [--priority high|normal|low]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design push notification systems with platform-specific optimizations, delivery guarantees, user preference management, and A/B testing capabilities.
</objective>

<execution_context>
@.mindforge/skills/push-notification-architecture/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/push-notification-architecture/`
State: Designs notification delivery pipeline, platform integration (APNS/FCM), segmentation rules, opt-in flows, and analytics tracking.
</context>

<process>
1. **Platform Integration**: iOS (APNs, certificates or token-based auth, silent/regular notifications). Android (FCM, priority handling, notification channels). Web (Push API, VAPID keys, service worker required). Use vendor SDKs (OneSignal, Pusher, Firebase) or direct APIs.

2. **Delivery Architecture**: Queue-based system (SQS, RabbitMQ). Worker processes consume queue. Batch sends (1000/request). Exponential backoff on failure. Dead-letter queue for permanent failures. Monitor send rate and latency.

3. **User Preferences**: Opt-in prompt timing (after first value delivered, not immediately). Granular channels (promotions, updates, transactional). Quiet hours (no notifications 10pm-8am). Frequency caps (max 3/day). Persistent preferences in user profile.

4. **Personalization**: User segmentation (behavior, demographics, device). Dynamic content (name, location, recent activity). A/B testing (message variants, send times). Predictive send time optimization. Track conversion per variant.

5. **Rich Notifications**: Images/videos in notification. Action buttons (reply, snooze, deep link). Grouped notifications (conversation threads). Badge count management. Sound/vibration customization. Lock screen vs notification center.

6. **Analytics**: Delivery rate (sent vs delivered). Open rate (by platform, time, segment). Conversion rate (notification → action). Opt-out tracking (which channels). Notification fatigue metrics (declining engagement over time).

7. **Compliance**: GDPR (explicit consent, right to withdraw). CAN-SPAM (transactional vs promotional). Time-sensitive (medical, financial) vs marketing. Unsubscribe mechanism. Audit log of sends. Rate limiting to prevent spam.
</process>
