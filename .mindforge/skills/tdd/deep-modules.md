# Deep Modules in TDD

Deep modules are those with complex internal logic but a simple, stable interface. In TDD, our goal is to test the **depth** of the logic through the **surface** of the interface.

## Principles

### 1. Test behavior, not implementation
- Write tests against the public API of the module.
- Avoid testing private methods or internal state directly.
- If the internal logic is too complex to test through the public API, the module might be **too deep** or the interface **too narrow**.

### 2. Isolate complexity
- Use "Socialable Tests" for internal helper classes that are tightly coupled.
- Use "Solitary Tests" (with mocks) for external dependencies (DB, API, etc.).

### 3. Handle state transitions
- Deep modules often manage complex state machines.
- Use TDD to map out every valid (and invalid) state transition.

## Strategy: The "Opaque Box" Approach
Treat the module as an opaque box. Feed it inputs and verify outputs/side-effects. If the logic inside changes but the behavior remains the same, your tests should **not** break.
