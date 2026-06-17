---
name: progressive-web-app
version: 1.0.0
min_mindforge_version: 10.4.0
status: stable
triggers: progressive web app, service worker architecture, PWA install prompt, push notification design, app shell pattern, PWA offline capability, web manifest design, PWA caching strategy, workbox configuration, PWA performance, PWA update flow, service worker lifecycle
---

# Skill — Progressive Web App Architecture

## When this skill activates
This skill activates when building Progressive Web Apps, including service worker implementation, install prompts, push notifications, app shell patterns, or offline-first web experiences.

## Mandatory actions when this skill is active

### Before writing any code
1. Create comprehensive web manifest (`manifest.json`) with all required fields, icons (192px, 512px), theme colors, and display mode
2. Design service worker caching strategy (cache-first, network-first, stale-while-revalidate) based on resource types
3. Plan app shell architecture — minimal HTML/CSS/JS that loads instantly and provides chrome while content loads
4. Determine push notification strategy, permission timing, and notification content types

### During implementation
- Implement service worker with proper lifecycle management (install, activate, fetch events) and versioning
- Use Workbox for production PWAs — handles caching strategies, precaching, background sync, and updates gracefully
- Implement `beforeinstallprompt` event handler to control install prompt timing and improve conversion
- Cache critical assets during service worker install event, use runtime caching for dynamic content
- Implement proper service worker update flow — show "New version available" banner, `skipWaiting()` with user consent
- Register push notification subscription after user grants permission, handle subscription changes
- Implement proper HTTPS certificate for service worker and push notification requirements

### After implementation
- Test install prompt on Chrome/Edge desktop and Android (iOS has limited PWA support)
- Verify offline functionality using DevTools offline mode and throttling
- Test service worker update flow — deploy new version, verify old cached content updates correctly
- Validate web manifest using Lighthouse PWA audit and browser DevTools Application tab
- Test push notifications across different platforms and browsers, handle click actions

## Self-check before task completion
- [ ] Lighthouse PWA audit score is 100 (all PWA checks pass)
- [ ] Service worker caches critical resources, app works offline with meaningful content
- [ ] Install prompt appears at appropriate time (not immediately on first visit)
- [ ] App shell loads in under 1 second on 3G networks
- [ ] Push notifications work correctly with proper permission handling, rich content, and click actions
- [ ] Service worker updates smoothly without breaking user experience or causing infinite loops
