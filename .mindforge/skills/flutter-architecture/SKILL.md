---
name: flutter-architecture
version: 1.0.0
min_mindforge_version: 10.4.0
status: stable
triggers: flutter architecture, widget composition pattern, flutter state management, platform channel flutter, dart design pattern, flutter navigation, flutter performance optimization, riverpod provider, flutter plugin development, flutter build runner, flutter layout pattern, flutter app architecture
---

# Skill — Flutter Architecture & Widget Composition

## When this skill activates
This skill activates when building Flutter applications, including widget composition strategies, state management implementation, platform channel integration, or establishing scalable app architecture patterns.

## Mandatory actions when this skill is active

### Before writing any code
1. Choose state management approach based on app complexity (Riverpod for large apps, Provider for medium, setState for simple)
2. Define navigation strategy (GoRouter for declarative routing, Navigator 2.0 for complex flows)
3. Establish platform channel contracts for native functionality and document method signatures
4. Plan widget composition hierarchy to maximize reusability and minimize rebuild scope

### During implementation
- Keep widget `build()` methods pure and deterministic — move side effects to lifecycle methods or controllers
- Use `const` constructors wherever possible to enable widget caching and reduce rebuild overhead
- Implement proper widget keys (GlobalKey, ValueKey, ObjectKey) for stateful widgets in lists
- Leverage code generation (`build_runner`, `freezed`, `json_serializable`) for data models and state classes
- Separate business logic from UI using repositories, services, and view models (MVVM pattern)
- Use platform channels with proper codec (StandardMethodCodec, JSONMethodCodec) and error handling
- Implement proper dispose() methods to prevent memory leaks in StatefulWidgets and controllers

### After implementation
- Run Flutter DevTools to profile widget rebuilds, identify expensive builds, and check memory usage
- Test on both iOS and Android with platform-specific behaviors (back button, system gestures, status bar)
- Verify hot reload works correctly — stateful widgets preserve state, providers remain intact
- Check widget test coverage for critical UI logic and integration tests for user flows

## Self-check before task completion
- [ ] State management solution scales appropriately (no global setState, proper scoping of providers)
- [ ] Platform channels include both method calls and event channels where needed, with proper error codes
- [ ] Widget tree depth is reasonable (use composition over deep nesting, extract widgets strategically)
- [ ] Build performance is acceptable (use `flutter run --profile` to measure frame rendering times)
- [ ] Navigation handles back button, deep links, and state restoration correctly
