---
name: using-git-worktrees
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: git worktree, worktree create, parallel workspace, isolated branch, worktree management, worktree cleanup, worktree per feature, multiple checkouts, worktree workflow, parallel git, worktree list, concurrent branches
---

# Skill — Using Git Worktrees

## When this skill activates

When working with multiple branches simultaneously, needing isolated working
directories for parallel development, or managing worktree lifecycle operations.
Worktrees allow multiple working trees attached to the same repository, sharing a
single `.git` directory. This eliminates stashing, context-switching overhead, and
the risk of uncommitted changes bleeding across tasks.

Use this skill when you need to:
- Work on a feature while reviewing another branch
- Test different branches simultaneously without cloning
- Maintain a clean main checkout while developing in parallel
- Set up dmux-style parallel pane workflows with filesystem isolation

## Mandatory actions when this skill is active

### Before creating worktrees

1. **Understand the model:**
   - A worktree is a separate working directory linked to the same `.git` store
   - All worktrees share the same refs, remotes, and object database
   - Changes committed in any worktree are immediately visible to all others
   - The "main" worktree is the original clone; "linked" worktrees are additions

2. **Pre-flight checks:**
   - Verify the target branch does not already have a worktree checked out
     (git does NOT allow the same branch in two worktrees simultaneously)
   - Ensure the parent directory for new worktrees exists
   - Confirm submodule state if the repo uses submodules (they require manual init)
   - Check available disk space — each worktree is a full working copy

3. **Naming convention (mandatory):**
   - Store worktrees in a sibling `.worktrees/` directory:
     ```
     project/              # main worktree
     project/.worktrees/
       feat-auth/          # linked worktree for auth feature
       fix-payments/       # linked worktree for payments bug
       review-pr-42/       # linked worktree for PR review
     ```
   - Name pattern: `[type]-[short-description]` matching branch suffix
   - Never nest worktrees inside the main worktree directory

### During worktree usage

**Core commands:**

| Operation | Command |
|-----------|---------|
| Create from existing branch | `git worktree add ../.worktrees/[name] [branch]` |
| Create with new branch | `git worktree add -b feat/[name] ../.worktrees/[name]` |
| List all worktrees | `git worktree list` |
| Show worktree details | `git worktree list --verbose` |
| Remove a worktree | `git worktree remove ../.worktrees/[name]` |
| Force remove (dirty) | `git worktree remove --force ../.worktrees/[name]` |
| Clean stale entries | `git worktree prune` |
| Lock (prevent prune) | `git worktree lock ../.worktrees/[name]` |
| Unlock | `git worktree unlock ../.worktrees/[name]` |

**Workflow patterns:**

1. **Feature + Review parallel:**
   ```bash
   # Continue working on your feature
   git worktree add -b feat/new-api ../.worktrees/feat-new-api
   # Simultaneously review a colleague's PR
   git worktree add ../.worktrees/review-pr-42 origin/feat/their-branch
   ```

2. **Test across branches:**
   ```bash
   git worktree add ../.worktrees/test-main main
   git worktree add ../.worktrees/test-release release/2.0
   # Run test suites in each directory independently
   ```

3. **Integration with dmux-workflows:**
   - One tmux pane per worktree
   - Each pane cd's into its worktree directory
   - Each agent instance operates with full filesystem isolation
   - Merge happens sequentially after all panes complete

**Gotchas and constraints:**
- Cannot checkout the same branch in two worktrees — git enforces this
- Submodules are NOT automatically initialized in linked worktrees; run
  `git submodule update --init` in each new worktree if needed
- `.gitignore`'d build artifacts are per-worktree (each has its own node_modules,
  build output, etc.)
- IDE settings (`.vscode/`, `.idea/`) are per-worktree — configure each separately
- Hooks in `.git/hooks/` are shared across all worktrees
- `git stash` is shared — stashes from one worktree are visible in all

### After worktree usage

1. **Cleanup protocol (mandatory after merge):**
   ```bash
   # Verify the branch is fully merged
   git branch --merged main | grep [branch-name]
   # Remove the worktree
   git worktree remove ../.worktrees/[name]
   # Delete the branch if no longer needed
   git branch -d [branch-name]
   # Prune any stale worktree references
   git worktree prune
   ```

2. **Never leave stale worktrees:**
   - Stale worktrees consume disk space and pollute `git worktree list`
   - After every merge or abandoned branch: remove the corresponding worktree
   - Run `git worktree prune` weekly as maintenance hygiene
   - Use `git worktree list` to audit — if a worktree's branch no longer exists
     on remote, it is likely stale

3. **Post-cleanup verification:**
   - `git worktree list` shows only the main worktree (or active ones)
   - No orphaned directories remain in `.worktrees/`
   - `git branch -v` shows no dangling local branches from removed worktrees

## Self-check before task completion

Before marking a worktree-related task done:

- [ ] Did I use the `.worktrees/` sibling directory convention?
- [ ] Did I verify the target branch was not already checked out elsewhere?
- [ ] Did I handle submodule initialization if applicable?
- [ ] Did I clean up worktrees after their purpose was fulfilled?
- [ ] Did I run `git worktree prune` to remove stale references?
- [ ] Did I delete merged branches that no longer need worktrees?
- [ ] Did I verify `git worktree list` shows a clean state?
