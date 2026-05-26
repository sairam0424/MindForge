# Mocking Strategies

Mocking is a double-edged sword. Used correctly, it isolates your code. Used poorly, it creates brittle tests that break with every refactor.

## When to Mock
- **External Systems**: Databases, File Systems, Network APIs, 3rd-party libraries.
- **Non-Deterministic Logic**: Time (`Date.now()`), Random numbers, GUID generation.
- **Expensive Operations**: Heavy computations or long-running tasks that would slow down the TDD loop.

## What NOT to Mock
- **Value Objects**: Objects that only hold data.
- **Internal Helpers**: If a helper is part of the module's logic, let the test exercise it ("Socialable Testing").
- **Language Features**: Don't mock standard library functions unless necessary for environment isolation.

## The Mocking Traps

### 1. The "Mirror" Trap
- **Problem**: Mocking internal calls so closely that the test just mirrors the implementation code.
- **Result**: You can't refactor without breaking the test.
- **Fix**: Assert on final outcomes or side-effects, not inner method calls.

### 2. The "Over-Mocking" Trap
- **Problem**: Mocking so many things that you aren't actually testing your code.
- **Fix**: Use **Fakes** (real implementations of interfaces, e.g., `InMemoryDatabase`) over Mocks where possible.
