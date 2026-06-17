---
name: react-native-patterns
version: 1.0.0
min_mindforge_version: 10.4.0
status: stable
triggers: react native architecture, react native navigation, native module bridge, react native performance, Hermes engine optimization, react native debugging, new architecture react native, JSI bridge, react native state management, turbo modules, fabric renderer, react native app design
---

# Skill — React Native Architecture Patterns

## When this skill activates
This skill activates when designing or implementing React Native applications, including navigation architecture, native module bridges, performance optimization with Hermes, or adopting the new architecture (Fabric/TurboModules).

## Mandatory actions when this skill is active

### Before writing any code
1. Verify Hermes engine is enabled in `android/app/build.gradle` and iOS build settings for optimal performance
2. Determine if new architecture (Fabric + TurboModules) should be enabled based on library compatibility
3. Establish navigation strategy (React Navigation vs native navigation) and state management approach (Context, Redux, Zustand, Jotai)
4. Review native module requirements and platform-specific functionality needs

### During implementation
- Use `React.memo()` and `useMemo`/`useCallback` strategically to prevent unnecessary re-renders in lists and heavy components
- Implement FlatList with `getItemLayout`, `removeClippedSubviews`, and proper `keyExtractor` for large datasets
- Keep JavaScript bridge crossings minimal — batch updates and avoid rapid state changes from native side
- Use JSI-based libraries (Reanimated 2+, react-native-mmkv) for performance-critical operations
- Follow platform-specific design patterns (Material Design for Android, Human Interface Guidelines for iOS)
- Leverage TurboModules for new native module implementations when new architecture is enabled
- Implement proper error boundaries and crash reporting (Sentry, Bugsnag) with sourcemap upload

### After implementation
- Profile with React DevTools Profiler and Flipper to identify performance bottlenecks
- Test on physical devices (not just simulators) across both platforms and multiple OS versions
- Verify memory leaks using Xcode Instruments and Android Studio Profiler
- Measure app startup time and optimize bundle size with bundle analyzer

## Self-check before task completion
- [ ] Navigation flows work correctly on both platforms with proper back button handling
- [ ] No performance warnings in Metro bundler or runtime (e.g., non-serializable values in navigation params)
- [ ] Native modules include proper error handling and type safety (TypeScript + Codegen if using new arch)
- [ ] Platform-specific code uses proper conditionals (`Platform.select`, `.ios.js`/`.android.js` files)
- [ ] Frame rate maintains 60fps during animations and list scrolling (use Perf Monitor)
