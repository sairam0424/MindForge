---
description: Manage the MindForge long-term memory (knowledge graph).
---
# /mindforge:remember

Manage the MindForge long-term memory (knowledge graph).

## Usage

- Add an entry:
  ```bash
  node bin/mindforge-cli.js remember --add "Your knowledge" --topic "Title"
  ```
- Search memories:
  ```bash
  node bin/mindforge-cli.js remember --search "query" --global
  ```
- View statistics:
  ```bash
  node bin/mindforge-cli.js remember --stats
  ```
- Promote to global:
  ```bash
  node bin/mindforge-cli.js remember --promote "id"
  ```

## Description

MindForge capture, stores, and retrieves knowledge (architectural decisions, code patterns, team preferences) across all sessions and projects. This command allows for manual management and querying of this data.
