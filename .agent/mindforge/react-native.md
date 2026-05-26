---
name: mindforge:react-native
description: "React Native specific architecture guidance. Usage: /mindforge:react-native [feature] [--arch new|legacy] [--state redux|zustand|jotai]"
argument-hint: "[feature] [--arch new|legacy] [--state redux|zustand|jotai]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design React Native apps using New Architecture (Fabric + TurboModules) with optimal bundle size, native module patterns, and JS-to-native bridge optimization.
</objective>

<execution_context>
@.mindforge/skills/react-native-patterns/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/react-native-patterns/`
State: Evaluates RN version, recommends migration to New Architecture, designs state management, native module integration, and performance optimization strategies.
</context>

<process>
1. **New Architecture Migration**: Fabric (concurrent renderer) enables priority-based rendering. TurboModules (lazy-loaded native modules) reduce startup time. JSI (direct JS-to-native binding) eliminates bridge bottleneck. Migrate incrementally (interop mode), test thoroughly (some libraries not yet compatible).

2. **State Management**: Redux → full-featured but verbose, good for complex apps. Zustand → minimal API, better DevEx, sufficient for most apps. Jotai → atomic state, excellent for derived state. React Context → avoid for frequently changing global state (causes re-renders). Choose based on team familiarity and app complexity.

3. **Bundle Optimization**: Enable Hermes engine (faster startup, smaller bundle). Use inline requires (lazy load screens). RAM bundles for faster initial load. Tree shake unused dependencies. Monitor bundle with react-native-bundle-visualizer.

4. **Native Module Patterns**: Write TurboModules for performance-critical code (image processing, encryption). Use codegen for type-safe JS-Native interface. Handle threading correctly (UI thread vs background). Implement proper error boundaries.

5. **Navigation**: Use React Navigation v6+ (native-stack for performance). Pre-load screens with useFocusEffect. Handle deep linking. Implement proper back button behavior. Optimize tab bar (defer rendering of inactive tabs).

6. **Performance**: Use FlashList over FlatList (better performance). Memoize components with React.memo. Avoid anonymous functions in render. Use Reanimated for 60fps animations. Profile with Systrace/Instruments.

7. **Testing**: Jest for unit/integration tests. Detox for E2E. Snapshot testing for UI consistency. Mock native modules properly. CI runs tests on real devices (not just simulators).
</process>
