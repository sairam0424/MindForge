---
description: "Manage parallel git worktrees for isolated concurrent work. Usage: /mindforge:worktrees [create|list|remove|cleanup] [--name feature-name]"
---

<objective>
Manage git worktrees to enable parallel, isolated development streams — creating, listing, removing, and cleaning up worktrees with proper branch hygiene and state management.
</objective>

<execution_context>
@.mindforge/skills/using-git-worktrees/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (action: create|list|remove|cleanup, optional --name for branch/worktree name)
Knowledge: Current git state, active branches, remote tracking status, .planning/STATE.md.
</context>

<process>
1. **Parse action**: Determine the requested operation:
   - `create` — Create a new worktree with an associated branch
   - `list` — Show all active worktrees with status
   - `remove` — Remove a specific worktree and optionally its branch
   - `cleanup` — Find and remove stale/orphaned worktrees
   - If no action specified, default to `list`

2. **Verify branch availability** (for create):
   - Check if --name branch already exists locally or remotely
   - If exists locally: offer to reuse or create with suffix
   - If exists remotely but not locally: offer to track
   - If doesn't exist: proceed with creation
   - Validate branch name follows conventions (feat/, fix/, etc.)

3. **Execute worktree operation**:
   - **create**: `git worktree add ../[repo]-[name] -b [branch-name] [base-branch]`
     - Base branch defaults to main/master unless specified
     - Worktree directory placed adjacent to main repo
     - Copy relevant config files (.env.local, .tool-versions) if they exist
   - **list**: `git worktree list --porcelain` parsed into readable table
   - **remove**: `git worktree remove [path]` with force flag if dirty
   - **cleanup**: `git worktree prune` + scan for orphaned directories

4. **Confirm isolation**: After create, verify the worktree is properly isolated:
   - Confirm separate working directory exists
   - Confirm branch is checked out in new worktree
   - Confirm no shared lock files between worktrees
   - Verify node_modules/venv are independent (or symlinked appropriately)
   - Run basic sanity check (git status in new worktree shows clean state)

5. **Setup worktree environment** (for create):
   - Install dependencies if package manager lockfile exists
   - Copy local-only config (.env.local, .env.development.local)
   - Initialize any required local state (database migrations, etc.)
   - Set up IDE/editor workspace if workspace files exist

6. **Report status**: Output clear status information:
   - For `list`: Table with columns [Path | Branch | Last Commit | Status (clean/dirty)]
   - For `create`: Full path to new worktree, branch name, base commit
   - For `remove`: Confirmation of removal, whether branch was also deleted
   - For `cleanup`: Count of pruned worktrees, freed disk space estimate

7. **Cleanup stale worktrees** (for cleanup action):
   - Run `git worktree prune` to remove references to deleted directories
   - Scan for worktree directories that still exist but have no matching git reference
   - Identify branches associated with merged PRs (safe to remove)
   - Present list for user confirmation before deletion
   - Remove node_modules/build artifacts in stale worktrees to free space

8. **Update MindForge state**: Record worktree operations:
   - Log active worktrees in `.planning/WORKTREES.md`
   - Track which task/phase each worktree is associated with
   - Note creation date and last activity date
   - Flag worktrees inactive for >7 days as candidates for cleanup

9. **Handle edge cases**:
   - Worktree on a branch that was force-pushed: detect and offer rebase
   - Worktree with uncommitted changes on remove: warn and require --force
   - Maximum worktree count (suggest limit of 5 to avoid confusion)
   - Disk space check before creating (warn if <2GB available)

10. **Output helper commands**: Provide convenience shortcuts:
    - Command to cd into the new worktree
    - Command to open worktree in new editor window
    - Command to run tests in the worktree
    - Reminder of how to switch back to main worktree
    - Git commands for merging worktree branch back
</process>
