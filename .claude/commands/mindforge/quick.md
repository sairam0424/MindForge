# MindForge — Quick Command
# Usage: /mindforge:quick [--research] [--review] [--full]
# For ad-hoc tasks that don't need full lifecycle management.

## When to use quick vs plan-phase
Use QUICK for:
- Bug fixes not tied to a current phase
- Small improvements (< 3 files, < 2 hours)
- Dependency updates
- Documentation corrections
- One-off scripts or utilities

Use PLAN-PHASE for:
- Feature development
- Anything touching more than 6 files
- Anything requiring research before implementation
- Anything with external dependencies or stakeholder requirements

## Step 1 — Task intake

Ask the user:
"What do you want to do?"

Listen to the description. If the task sounds larger than "quick" scope
(more than 6 files, architectural change, new feature), say:
"This sounds like more than a quick task. I recommend using /mindforge:plan-phase
 instead to ensure it's properly planned and verified. Want to proceed with quick anyway?"

## Step 2 — Optional research (--research flag or user requests it)

If `--research` is provided or the task involves unfamiliar libraries:
Spawn a focused research subagent. Give it:
- The task description
- The current tech stack from PROJECT.md
Ask it to: investigate the best approach, identify gotchas, recommend specific
libraries (with versions), and write a brief research note.

Report research findings to the user before proceeding.

## Step 3 — Create a quick plan

### Sequential quick task numbering
Determine the next quick task number by scanning `.planning/quick/`:
1. List directories matching `[0-9][0-9][0-9]-*`
2. Take the max numeric prefix and add 1 (start at 001 if none exist)
3. If a directory already exists for the chosen number, require `--force` to proceed

Create `.planning/quick/[NNN]-[slug]/PLAN.md` where NNN is a sequential number
and slug is a 2-4 word kebab-case description.

Example: `.planning/quick/001-fix-login-null-check/PLAN.md`

Use the standard XML plan format:
```xml
<task type="quick">
  <n>[task name]</n>
  <persona>[appropriate persona]</persona>
  <files>[files to touch]</files>
  <context>[relevant context]</context>
  <action>[implementation instructions]</action>
  <verify>[verification command]</verify>
  <done>[definition of done]</done>
</task>
```

Show the plan to the user. Wait for approval before executing.

## Step 4 — Execute the quick plan

1. Load persona from `.mindforge/personas/`
2. Load any relevant skills based on task keywords
3. Execute the plan
4. Run `<verify>` — must pass before committing
5. Commit: `[type](quick/[NNN]): [task name]`
6. Write `.planning/quick/[NNN]-[slug]/SUMMARY.md`

## Step 5 — Optional review (--review flag)

If `--review` is provided:
Activate `code-quality.md` skill on the diff.
Report any issues before committing.
If BLOCKING issues found: fix before commit.

## Step 6 — Optional full mode (--full flag)

If `--full` is provided, additionally:
- Run the project's full test suite (not just task-specific verify)
- Run the type checker and linter
- Activate `security-reviewer.md` if the task touches any security-sensitive code
- Write an AUDIT entry for the quick task

## Flags are composable
```
/mindforge:quick                     # minimal — task, plan, execute
/mindforge:quick --research          # adds domain research step
/mindforge:quick --review            # adds code quality review of diff
/mindforge:quick --full              # adds full test suite + linting + security
/mindforge:quick --research --full   # all of the above
```

## AUDIT entry for quick tasks
```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "quick_task_completed",
  "agent": "mindforge-orchestrator",
  "phase": null,
  "session_id": "sess_abc",
  "quick_id": "001",
  "task_name": "Fix login null check",
  "commit_sha": "abc1234",
  "files_changed": ["src/auth/login.ts"],
  "flags_used": ["--review"]
}
```
