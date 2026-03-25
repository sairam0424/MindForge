---
description: Human acceptance testing for a completed phase. Usage: /mindforge:verify-phase [N]
---
Human acceptance testing for a completed phase. Usage: /mindforge:verify-phase [N]

## Pre-check
`.planning/phases/[N]/VERIFICATION.md` must exist.
If it does not: instruct the user to run /mindforge:execute-phase [N] first.

## Step 1 — Extract testable deliverables
Read REQUIREMENTS.md and the phase PLAN files.
Generate a list of testable deliverables — things the user can actually check.

Format each as a clear, actionable test instruction:
"Navigate to /login and submit a form with a valid email and password.
 You should be redirected to /dashboard within 2 seconds."

## Step 2 — Walk through each deliverable
Present one at a time. After each:
"Please test this now and tell me: pass ✅ or fail ❌ — and describe what you saw."

Wait for the user's response before proceeding to the next.

## Step 3 — Handle failures
If the user reports a failure:
1. Ask: "What exactly happened? (error message, wrong behaviour, nothing happened)"
2. Spawn a debug subagent with: the failure description, the relevant PLAN file,
   and the relevant source files. Instruct it to find the root cause.
3. Create a fix plan: `.planning/phases/[N]/FIX-PLAN-[N]-[NN].md`
   using the same XML format as regular plans.
4. Ask the user: "Fix plan created. Run /mindforge:execute-phase [N] again
   to apply the fixes?"

## Step 4 — Write UAT record
Write `.planning/phases/[N]/UAT.md`:

```markdown
# UAT — Phase [N]

## Tester
[User name or "developer"]

## Date
[ISO 8601 date]

## Results

| # | Deliverable                        | Result | Notes                  |
|---|------------------------------------|--------|------------------------|
| 1 | [description]                      | ✅     | [what was observed]    |
| 2 | [description]                      | ❌     | [what went wrong]      |

## Overall status
All passed ✅ / Issues found — fix plans created ❌

## Sign-off
[Passed / Pending fixes]
```

## Step 5 — Update state if all pass
If all deliverables pass:
Update STATE.md: phase N = verified and signed off.
Tell the user:
"✅ Phase [N] verified and signed off.
 Run /mindforge:ship [N] to create the release PR."
