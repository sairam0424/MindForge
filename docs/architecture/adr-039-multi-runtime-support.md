# ADR-039: Multi-Runtime Platform Support

## Status
Accepted

## Context
MindForge v1.0.0 was primarily designed for Claude Code and Antigravity. As the AI agent ecosystem expands, users are increasingly using runtimes like Cursor, GitHub Copilot, and Gemini CLI. To ensure MindForge remains the universal orchestration layer, we need native support for these platforms.

## Decision
We will implement a multi-runtime adapter system in `installer-core.js`.

1.  **Unified Runtime Map**: A central `RUNTIMES` configuration defining paths, entry files, and capabilities (e.g., `supportsSlash`).
2.  **Content Adapters**: Dynamic transformation of rules files (e.g., GEMINI.md) to match runtime-specific model names and conventions.
3.  **Non-Slash Preambles**: For runtimes that do not support slash commands natively (Cursor, Copilot), we will inject a preamble explaining how to reference MindForge commands via file-path patterns.
4.  **Local/Global Scoping**: Runtime-specific local directory detection (e.g., `.cursor/rules` vs `.agents/workflows`).

## Consequences
- **Positive**: MindForge becomes the first framework to provide a consistent "autonomous enterprise" experience across all major AI IDEs and CLIs.
- **Positive**: Simplified onboarding for users of non-Claude runtimes.
- **Neutral**: Increased complexity in the installer to handle 6+ distinct directory structures.
