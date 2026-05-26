---
name: mindforge:pwa
description: "Progressive Web App design. Usage: /mindforge:pwa [app] [--cache networkfirst|cachefirst|stale] [--scope full|partial]"
argument-hint: "[app] [--cache networkfirst|cachefirst|stale] [--scope full|partial]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design Progressive Web Apps with service worker caching strategies, offline capabilities, install prompts, and native-like experiences on web.
</objective>

<execution_context>
@.mindforge/skills/progressive-web-app/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/progressive-web-app/`
State: Designs service worker architecture, caching strategies, manifest configuration, and progressive enhancement patterns for installable web apps.
</context>

<process>
1. **Service Worker Strategy**: Network-first (fresh data, fallback to cache) → news apps. Cache-first (performance, stale data OK) → static assets, docs. Stale-while-revalidate (instant + fresh) → social feeds. Network-only → auth endpoints. Cache-only → app shell.

2. **Caching Layers**: App shell (HTML/CSS/JS core, precache on install). Static assets (images/fonts, long cache TTL). API responses (runtime cache, short TTL). User content (IndexedDB for structured data). Max 50MB quota (mobile browsers).

3. **Offline UX**: Detect offline with navigator.onLine. Show offline indicator. Queue mutations (background sync API). Cached content with freshness timestamp. Graceful feature degradation. Custom offline page.

4. **Install Experience**: Manifest.json (name, icons, theme_color, display:standalone). Defer install prompt (show after user engagement). A2HS (Add to Home Screen) button. Track install analytics. Update prompt when new version available.

5. **Performance**: Lighthouse score >90. First Contentful Paint <1.8s. Time to Interactive <3.5s. Cumulative Layout Shift <0.1. Code splitting. Lazy load images. Preload critical resources.

6. **Platform Features**: Push notifications (with user permission). Background sync (retry failed requests). Share target (receive shared content). Shortcuts (quick actions in app icon menu). Badging API (unread count).

7. **Update Strategy**: Skip waiting for critical updates. Prompt user for non-critical updates. Version in cache names. Migration logic for schema changes. Test update flow in CI. Monitor update adoption rate.
</process>
