# ADR-041: Stable Runtime Interface Contract

## Status
Accepted

## Context
To support multi-runtime extensibility, we need a stable interface for the installer to interact with different platforms. Historically, these members were private constants within `installer-core.js`.

## Decision
We will promote critical runtime members to a public exported contract.

1.  **Exported Members**: `RUNTIMES` map and `generateEntryContent` adapter function are now officially part of the `module.exports`.
2.  **Stable Registry**: The `RUNTIMES` object must follow a strict schema: `displayName`, `globalDir`, `localDir`, `commandsSubdir`, `entryFile`, and `supportsSlash`.
3.  **Extensibility**: This allows the `/mindforge:new-runtime` command and community plugins to dynamically inspect or extend MindForge support for new AI platforms without core framework modifications.

## Consequences
- **Positive**: Enables community-driven support for emerging AI tools.
- **Positive**: Improved testability of the installer via standard Node.js `require`.
- **Positive**: Decouples platform-specific logic from core installation routines.
- **Neutral**: Any changes to these exported members must now be treated as potentially breaking in terms of semver.
