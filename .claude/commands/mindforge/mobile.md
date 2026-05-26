---
name: mindforge:mobile
description: "Design mobile app architecture. Usage: /mindforge:mobile [app] [--platform ios|android|cross] [--framework rn|flutter|native]"
argument-hint: "[app] [--platform ios|android|cross] [--framework rn|flutter|native]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design mobile-first architectures that balance native performance with cross-platform developer velocity. Addresses offline-first, app size, battery optimization, and platform-specific patterns.
</objective>

<execution_context>
@.mindforge/skills/mobile-performance/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/mobile-performance/`
State: Analyzes target platforms, performance requirements, team expertise to recommend architecture (native/hybrid/cross-platform) with specific implementation patterns.
</context>

<process>
1. **Platform Strategy**: Single platform (iOS or Android native, best performance) vs Cross-platform (React Native/Flutter, 70% code sharing). Consider team skills (Swift/Kotlin vs JS/Dart), time-to-market, performance needs (gaming/AR → native, content apps → cross-platform).

2. **Architecture Pattern**: MV* pattern selection (MVVM for iOS, MVP for Android, BLoC for Flutter, Redux for React Native). Layer separation (UI/Business Logic/Data). Navigation architecture (stack-based, tab-based, drawer). State management (local vs global, persistence strategy).

3. **Performance Optimization**: App size budget (<50MB for emerging markets). Launch time target (<2s cold start). Frame rate (maintain 60fps scrolling). Battery impact (background tasks, network polling, location tracking). Memory management (image caching, list virtualization).

4. **Offline-First Design**: Local database (SQLite, Realm, WatermelonDB). Sync strategy (optimistic UI, conflict resolution). Queue outgoing requests. Cache images/assets. Handle network transitions gracefully.

5. **Native Integration**: Bridge patterns for platform-specific features (camera, biometrics, push notifications). Third-party SDK integration (analytics, crash reporting). App extensions (widgets, share extensions, Siri shortcuts).

6. **Testing Strategy**: Unit tests (business logic, data layer). UI tests (critical user flows). Screenshot tests (visual regression). Device matrix testing (5-10 representative devices). Performance benchmarking (startup time, frame drops).

7. **Release Pipeline**: CI/CD setup (Fastlane, Bitrise, GitHub Actions). Code signing automation. Beta distribution (TestFlight, Firebase App Distribution). Staged rollout (5% → 25% → 100%). Crash monitoring with auto-rollback triggers.
</process>
