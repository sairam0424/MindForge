# MindForge — Confluence Integration

## Purpose
Publish architecture snapshots, ADRs, and milestone/phase documentation to a
 shared wiki without making Confluence the execution source of truth.

## Published artifacts

| MindForge artifact | Confluence target |
|---|---|
| `.planning/ARCHITECTURE.md` | Architecture overview page |
| `.planning/decisions/ADR-*.md` | ADR child pages |
| Phase verification summaries | Sprint or phase pages |
| Milestone reports | Release or program pages |

## Publishing rules
Use update-by-title or update-by-page-ID so repeated publishes are idempotent.
Do not create duplicate pages on re-run. If the target exists, update in place
 and preserve the page history.

## Data safety
Confluence publishing must exclude secrets, tokens, raw audit log content, and
 internal-only approver notes. Publish curated summaries, not raw machine state.

## Failure handling
Publishing failures are non-fatal. Log them, append a pending manual action to
 `.planning/STATE.md`, and provide a retry command via `/mindforge:sync-confluence`.
