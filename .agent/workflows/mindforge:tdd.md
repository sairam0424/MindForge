---
description: Strict TDD workflow (Red-Green-Refactor).
---
# 🧪 /mindforge:tdd

<instruction>
Execute a strict Test-Driven Development (TDD) loop using the Red-Green-Refactor pattern with an emphasis on "Tracer Bullets" (vertical slices).
</instruction>

<context>
Follow the specialized MindForge TDD standards defined in [.agent/skills/mindforge-tdd/SKILL.md](file:///Users/sairamugge/Desktop/MindForge/.agent/skills/mindforge-tdd/SKILL.md).
</context>

<rules>
- **No Implementation without Test**: Do not write production code unless it is to make a failing test pass.
- **Minimalist Green**: Write the absolute minimum code required to satisfy the test.
- **Refactor Ruthlessly**: Clean up after every green state while keeping tests passing.
- **Vertical Slicing**: Prioritize end-to-end functionality over horizontal layers.
</rules>

<process>
1.  **RED**: Define a single behavioral requirement and write a failing test.
2.  **GREEN**: Implement the simplest code to fix the failure.
3.  **REFACTOR**: Optimize the code and tests for readability and maintainability.
4.  **VERIFY**: Ensure all tests in the suite pass before proceeding.
</process>

<supporting_documents>
- [Deep Modules](file:///Users/sairamugge/Desktop/MindForge/.agent/skills/mindforge-tdd/deep-modules.md)
- [Interface Design](file:///Users/sairamugge/Desktop/MindForge/.agent/skills/mindforge-tdd/interface-design.md)
- [Mocking Strategies](file:///Users/sairamugge/Desktop/MindForge/.agent/skills/mindforge-tdd/mocking.md)
- [Refactoring Guide](file:///Users/sairamugge/Desktop/MindForge/.agent/skills/mindforge-tdd/refactoring.md)
- [Test Infrastructure](file:///Users/sairamugge/Desktop/MindForge/.agent/skills/mindforge-tdd/tests.md)
</supporting_documents>

<output_format>
Summarize each TDD cycle with:
- `[RED]`: The test added.
- `[GREEN]`: The minimal change made.
- `[REFACTOR]`: Specific improvements made.
</output_format>
