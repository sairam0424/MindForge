---
name: mindforge:flutter
description: "Flutter architecture and pattern guidance. Usage: /mindforge:flutter [feature] [--state riverpod|bloc|provider]"
argument-hint: "[feature] [--state riverpod|bloc|provider]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design Flutter applications using BLoC or Riverpod patterns with platform channels for native integration, optimized widget trees, and Dart-native performance.
</objective>

<execution_context>
@.mindforge/skills/flutter-architecture/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/flutter-architecture/`
State: Recommends state management approach, widget composition patterns, platform channel design, and Flutter-specific performance optimizations.
</context>

<process>
1. **State Management**: Riverpod 2.0 → type-safe, compile-time DI, async support, testing-friendly (recommended). BLoC → event-driven, good for complex flows, reactive streams. Provider → simple but verbose, being phased out. GetX → avoid (too much magic, hard to debug).

2. **Widget Architecture**: Composition over inheritance. Extract reusable widgets. Use const constructors (performance win). Separate stateful logic from UI. Keys for list performance. Avoid deep widget trees (>10 levels).

3. **Platform Channels**: Method channels for one-time calls. Event channels for streams. Use pigeon for type-safe codegen. Handle threading (iOS main thread requirement). Implement proper error handling across boundary.

4. **Performance**: Use ListView.builder (lazy loading). DevTools for widget rebuild analysis. Avoid setState in loops. Use RepaintBoundary strategically. Profile with Observatory. Target 60fps (120fps on ProMotion).

5. **Code Generation**: Freezed for immutable models. json_serializable for JSON parsing. built_value for value objects. auto_route for type-safe navigation. Run build_runner watch during development.

6. **Testing**: Unit tests (business logic). Widget tests (UI components). Integration tests (full app flows). Golden tests (pixel-perfect UI). Mock platform channels. Aim for >80% coverage.

7. **Release**: Obfuscate Dart code. Minimize app size (tree-shaking, deferred loading). Configure ProGuard rules. Test on min SDK version. Set up code push (Shorebird) for hotfixes.
</process>
