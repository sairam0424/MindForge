---
name: dmux-workflows
version: 1.0.0
min_mindforge_version: 10.0.5
status: stable
triggers: dmux, parallel agents, multi-model orchestration, tmux agents, worktree parallel, parallel panes, concurrent execution, multi-harness, orchestrate workers, split work, fan out, parallel branches
---

# Skill — Dmux Workflows (Multi-Agent Parallel Execution)

## When this skill activates

When executing multiple independent tasks simultaneously using parallel agent
instances, tmux panes, or git worktrees. Use when facing 2+ tasks that have no
shared state, no sequential dependencies, and would benefit from concurrent
execution. Handles isolation, coordination, and merge strategies for parallel work.

Core principle: **Independence before parallelism** — never parallelize tasks that
touch the same files or depend on each other's output.

## Mandatory actions when this skill is active

### Before parallel execution begins

1. **Task decomposition:**
   - List all subtasks in the current work item
   - For each pair of subtasks, verify: do they touch the same files? (NO required)
   - For each pair, verify: does one depend on the other's output? (NO required)
   - If ANY dependency exists: serialize those tasks, parallelize the rest

2. **Worker definition:**
   ```json
   {
     "session": "dmux-[feature-name]",
     "workers": [
       {
         "name": "worker-1-description",
         "task": "specific task instructions",
         "model": "sonnet|opus|haiku",
         "branch": "feat/[feature]-[subtask]",
         "files": ["list", "of", "files", "this", "worker", "touches"],
         "timeout_minutes": 30
       }
     ]
   }
   ```

3. **Independence verification matrix:**
   - Create file-touch matrix: workers (rows) x files (columns)
   - If any column has more than one worker marked: STOP, restructure tasks
   - This is the critical safety check — skip it and you get merge conflicts

4. **Select execution pattern:**

   | Pattern | Workers | Use when |
   |---------|---------|----------|
   | Research + Implement | 2 | One explores options, other builds after |
   | Multi-file | 2-4 | Each worker owns distinct files |
   | Test + Fix | 2 | Watcher finds bugs, fixer resolves them |
   | Cross-model review | 3 | Security + perf + coverage perspectives |
   | Fan-out gather | 3-5 | Same prompt, different models, best-of-N |

### During parallel execution

**Launch protocol:**
1. Create tmux session: `tmux new-session -d -s dmux-[name]`
2. For each worker beyond the first: `tmux split-window` or `tmux new-window`
3. Set up git worktree for each pane:
   ```bash
   git worktree add ../worktree-[worker-name] -b [worker-branch]
   ```
4. Launch agent in each pane with task-specific instructions
5. Maximum 5-6 panes (beyond this, coordination overhead exceeds benefit)

**Isolation guarantees:**
- Each worker operates in its own worktree (filesystem isolation)
- Each worker has its own branch (git isolation)
- No worker reads files that another worker writes
- Workers do NOT communicate during execution (no shared state)

**Monitoring during execution:**
- Check pane output periodically for errors or stalls
- If a worker finishes early: do NOT reassign it (avoid introducing dependencies)
- If a worker fails: note the failure, continue others, address in merge phase
- Track wall-clock time per worker for future estimation

**Resource constraints:**
- Max 5-6 concurrent panes (token budget and context limits)
- Each worker should complete within its timeout
- If total token usage exceeds budget: kill lowest-priority worker first
- Prefer fewer workers with clear tasks over many workers with vague tasks

### After parallel execution

1. **Merge strategy (sequential, NOT parallel):**
   - Review each worker's output independently
   - Verify each worker stayed within its file boundaries
   - Merge workers one at a time into the integration branch:
     ```bash
     git checkout main-feature-branch
     git merge worktree-[worker-1-branch] --no-ff
     # verify tests pass
     git merge worktree-[worker-2-branch] --no-ff
     # verify tests pass
     # repeat for each worker
     ```
   - Run full test suite after all merges

2. **Conflict resolution:**
   - If merge conflict occurs: investigate which worker violated boundaries
   - Resolve manually (do not auto-resolve — understand the conflict)
   - Add the conflicting files to a "shared files" list for future runs

3. **Cleanup:**
   - Remove all worktrees: `git worktree remove ../worktree-[name]`
   - Delete worker branches if fully merged
   - Close tmux session: `tmux kill-session -t dmux-[name]`
   - Consolidate results into a single summary

4. **Results consolidation:**
   ```
   ## Dmux Execution Report
   - Session: dmux-[name]
   - Workers: N launched, M succeeded, F failed
   - Wall-clock time: X minutes (vs estimated Y sequential)
   - Speedup factor: sequential_time / parallel_time
   - Conflicts: [none | list with resolution]
   - Output: [summary of what each worker produced]
   ```

## Self-check before task completion

Before marking a parallel execution task done:

- [ ] Did I verify task independence (no shared files, no output dependencies)?
- [ ] Did I use git worktrees for filesystem isolation?
- [ ] Did I stay within the 5-6 pane maximum?
- [ ] Did I review each worker's output independently before merging?
- [ ] Did I run full tests after all merges completed?
- [ ] Did I clean up worktrees and close the tmux session?
- [ ] Did I document the speedup factor and any conflicts encountered?
