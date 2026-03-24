<purpose>
List all MindForge workspaces found in ~/mindforge-workspaces/ with their status.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

## 1. Setup

```bash
INIT=$(node ".agent/bin/mindforge-tools.cjs" init list-workspaces)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Parse JSON for: `workspace_base`, `workspaces`, `workspace_count`.

## 2. Display

**If `workspace_count` is 0:**

```
No workspaces found in ~/mindforge-workspaces/

Create one with:
  /mindforge-new-workspace --name my-workspace --repos repo1,repo2
```

Done.

**If workspaces exist:**

Display a table:

```
MindForge Workspaces (~/mindforge-workspaces/)

| Name | Repos | Strategy | MindForge Project |
|------|-------|----------|-------------|
| feature-a | 3 | worktree | Yes |
| feature-b | 2 | clone | No |

Manage:
  cd ~/mindforge-workspaces/<name>     # Enter a workspace
  /mindforge-remove-workspace <name>   # Remove a workspace
```

For each workspace, show:
- **Name** — directory name
- **Repos** — count from init data
- **Strategy** — from WORKSPACE.md
- **MindForge Project** — whether `.planning/PROJECT.md` exists (Yes/No)

</process>
