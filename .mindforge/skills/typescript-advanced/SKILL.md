---
name: typescript-advanced
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: typescript advanced, generics pattern, conditional type, discriminated union, mapped type, template literal type, type inference pattern, utility type, type guard, type narrowing, branded type, variance annotation
---

# Skill — TypeScript Advanced Type Patterns

## When this skill activates
Any task involving advanced TypeScript type system features: generics design,
conditional types, discriminated unions, mapped types, template literal types,
branded types, variance annotations, or complex type inference patterns.

## Mandatory actions when this skill is active

### Before writing any code
1. Identify the type-level problem being solved. Ask: "What invalid states should
   the type system make impossible?"
2. Check the project's `tsconfig.json` for `strict: true`. If not enabled, flag it
   as a prerequisite for advanced type patterns to work correctly.
3. Determine if the pattern needs to be exported for consumers (public API types
   require more careful design than internal utility types).

### During implementation

#### Generics
- Always add constraints to generic parameters: `<T extends BaseType>` not bare `<T>`.
- Provide defaults when there is a sensible one: `<T extends Record<string, unknown> = Record<string, unknown>>`.
- Place inference sites at the position where TypeScript can infer the type from usage:
  ```typescript
  // Good: T is inferred from the argument
  function wrap<T>(value: T): Wrapper<T>
  // Bad: T cannot be inferred, caller must specify
  function wrap<T>(): Wrapper<T>
  ```
- Avoid "generic soup" (3+ type parameters). If needed, use a config object type:
  ```typescript
  type Config<TInput, TOutput, TError> = { ... }
  function process<C extends Config<any, any, any>>(config: C): ...
  ```

#### Conditional Types
- Use `infer` keyword to extract types from structures:
  ```typescript
  type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
  type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never;
  ```
- Understand distributive behavior: `T extends U ? X : Y` distributes over unions
  when T is a naked type parameter. Wrap in `[T] extends [U]` to prevent distribution.
- Nest conditional types sparingly (max 3 levels). Extract intermediate types for clarity:
  ```typescript
  // Instead of deeply nested conditionals
  type Step1<T> = T extends Array<infer U> ? U : T;
  type Step2<T> = Step1<T> extends object ? keyof Step1<T> : never;
  ```

#### Discriminated Unions
- Every variant MUST have a literal-typed discriminant field (typically `type` or `kind`):
  ```typescript
  type Shape =
    | { kind: "circle"; radius: number }
    | { kind: "rectangle"; width: number; height: number }
    | { kind: "triangle"; base: number; height: number };
  ```
- Implement exhaustive handling with `never` checks:
  ```typescript
  function assertNever(x: never): never {
    throw new Error(`Unexpected: ${JSON.stringify(x)}`);
  }
  function area(shape: Shape): number {
    switch (shape.kind) {
      case "circle": return Math.PI * shape.radius ** 2;
      case "rectangle": return shape.width * shape.height;
      case "triangle": return 0.5 * shape.base * shape.height;
      default: return assertNever(shape);
    }
  }
  ```
- Adding a new variant to the union automatically causes compile errors at every
  switch/if that is missing the new case. This is the primary value.

#### Mapped Types
- Use key remapping (`as`) for transforming keys:
  ```typescript
  type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
  };
  ```
- Use modifiers (`readonly`, `?`, `-readonly`, `-?`) deliberately:
  ```typescript
  type Mutable<T> = { -readonly [K in keyof T]: T[K] };
  type Required<T> = { [K in keyof T]-?: T[K] };
  ```
- Filter keys using `as` with `never`:
  ```typescript
  type OnlyStrings<T> = {
    [K in keyof T as T[K] extends string ? K : never]: T[K];
  };
  ```

#### Template Literal Types
- Use for string manipulation at the type level:
  ```typescript
  type EventName<T extends string> = `on${Capitalize<T>}`;
  type Route = `/${string}` | `/${string}/${string}`;
  ```
- Combine with mapped types for powerful API typing:
  ```typescript
  type CSSProperties = {
    [K in keyof CSSStyleDeclaration as K extends string
      ? `--${K}` | K
      : never]: string;
  };
  ```
- Use intrinsic string types: `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize`.

#### Branded / Opaque Types
- Use for domain safety (preventing accidental misuse of primitive types):
  ```typescript
  declare const brand: unique symbol;
  type Brand<T, B> = T & { readonly [brand]: B };

  type UserId = Brand<string, "UserId">;
  type OrderId = Brand<string, "OrderId">;

  // Now these are incompatible even though both are strings
  function getUser(id: UserId): User { ... }
  const orderId = "abc" as OrderId;
  getUser(orderId); // Compile error!
  ```
- Provide constructor functions that validate at runtime:
  ```typescript
  function createUserId(raw: string): UserId {
    if (!raw.startsWith("usr_")) throw new Error("Invalid UserId format");
    return raw as UserId;
  }
  ```

#### Variance Annotations
- Use `in` (contravariant) and `out` (covariant) on generic type parameters
  for explicit variance when the compiler cannot infer it:
  ```typescript
  type Consumer<in T> = (value: T) => void;
  type Producer<out T> = () => T;
  type Transformer<in I, out O> = (input: I) => O;
  ```
- Benefits: faster type checking, earlier error detection, documents intent.
- Only needed on interface/type alias declarations, not on function signatures.

#### The `satisfies` Operator
- Use `satisfies` to validate a value matches a type without widening:
  ```typescript
  const palette = {
    red: [255, 0, 0],
    green: "#00ff00",
  } satisfies Record<string, string | number[]>;
  // palette.red is still number[] (not string | number[])
  ```
- Prefer `satisfies` over `as const` + type annotation when you need both
  type checking AND narrow inference.

#### Type Guards and Narrowing
- Prefer `is` return type for custom type guards:
  ```typescript
  function isCircle(shape: Shape): shape is { kind: "circle"; radius: number } {
    return shape.kind === "circle";
  }
  ```
- Use `asserts` for assertion functions that throw:
  ```typescript
  function assertDefined<T>(val: T | undefined): asserts val is T {
    if (val === undefined) throw new Error("Expected defined value");
  }
  ```
- Prefer `in` operator narrowing for object type checks over `typeof` for complex objects.

### After implementation
1. Verify `npx tsc --noEmit` passes with zero errors.
2. Hover over inferred types in the IDE to confirm they resolve to expected shapes.
3. Write at least one "negative test" — a `// @ts-expect-error` comment proving the
   type correctly rejects invalid usage.
4. Check that type computation does not cause noticeable IDE lag (overly recursive
   types can crash the language server).

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] All generic type parameters have constraints (no bare `<T>` without `extends`).
- [ ] Discriminated unions have exhaustive switch/if with `never` fallback.
- [ ] No `any` types introduced (use `unknown` and narrow).
- [ ] Branded types have runtime validation constructors.
- [ ] Conditional types are no more than 3 levels deep.
- [ ] `@ts-expect-error` negative tests prove the types reject invalid input.
- [ ] `tsc --noEmit` passes cleanly.
- [ ] IDE responsiveness is acceptable (no type computation lag).
