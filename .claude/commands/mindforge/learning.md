---
description: Consult or initialize the project agentic learning memory - AGENTS_LEARNING.md
---

# /mindforge:learning [init]

Consult the project's persistent engineering memory to avoid past mistakes and follow established best practices.

## Usage

- `/mindforge:learning`: Displays the current learning status and path to the learning file.
- `/mindforge:learning init`: Initializes a new `AGENTS_LEARNING.md` in the project root if it doesn't already exist.

## Why use this?
Before starting any significant implementation or refactor, you MUST consult the learning memory. It contains project-specific "Anti-Patterns" to avoid and "Best Practices" that have been proven in this specific system.

## Example
1. Run `/mindforge:learning` to find where the learning file is.
2. Read the file to understand recent architectural shifts or discovered failure scenarios.
3. If the project is new, run `/mindforge:learning init` to scaffold the memory.
