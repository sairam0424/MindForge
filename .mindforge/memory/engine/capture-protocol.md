# MindForge v2 — Knowledge Capture Protocol

## Purpose

The Capture Engine automatically extracts valuable engineering knowledge from session artifacts to ensure that project-specific wisdom is preserved beyond a single handoff.

## Capture Triggers

MindForge monitors the following lifecycle events for knowledge extraction:

1. **Phase Completion**: Extracting architectural decisions from `PROJECT.md` and phase retrospectives.
2. **Hardened Debugging**: Capturing "root cause -> fix" patterns from completed debug reports.
3. **Manual Command**: Using `/mindforge:remember --add` to explicitly record team preferences or domain knowledge.
4. **ADR Generation**: Parsing newly created Architecture Decision Records.

## Extraction Logic

The extraction process (via `knowledge-capture.js`) involves:

- **Structural Parsing**: Identifying standardized headings (e.g., "Decision", "Root Cause", "Pattern").
- **Deduplication**: Checking for existing entries with similar content to prevent knowledge bloat.
- **Initial Confidence**: Assigning a default confidence score (usually 0.5) to newly captured entries.
- **Auto-Tagging**: Inferring tags based on the file path and content context (e.g., `#nodejs`, `#security`).

## Inhibitors (What NOT to capture)

To prevent the knowledge base from becoming "noisy", the system ignores:

- Transient session state (e.g., local file counts).
- Intermediate debugging steps that didn't lead to a fix.
- Content marked with `#no-capture` or inside blocks labeled "Confidential".

## Retention Policy

- **Append-only**: Entries are never physically deleted.
- **Deprecation**: Outdated entries are marked as `deprecated: true` and replaced by newer entries with the same `source_id`.
