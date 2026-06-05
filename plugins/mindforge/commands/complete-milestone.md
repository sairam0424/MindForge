---
description: "Archive a completed milestone, generate a release report, and prepare the next"
---

Archive a completed milestone, generate a release report, and prepare the next
 milestone. Usage: `/mindforge:complete-milestone <name> <version>`

## Step 1 — Validate milestone completion
Ensure every included phase is verified and has no pending blocking approvals.

## Step 2 — Generate milestone report
Summarise shipped phases, notable changes, risks, approvals, and unresolved
 follow-ups.

## Step 3 — Archive milestone artifacts
Archive only the phases included in the milestone, not the entire
 `.planning/phases/` directory. Preserve history in the archive while keeping
 active planning files available in place.

## Step 4 — Release metadata
Create the release tag, update `STATE.md` with milestone summary, and mark the
 project ready for the next version.
