# MindForge Production — Cross-Version Compatibility Layer

## Purpose
Allow newer MindForge engines to operate safely against older state files
and plugin manifests without breaking workflows or corrupting data.

## Compatibility principles
1. **Read old, write new**: old schemas must remain readable; writes should
   upgrade only when explicitly requested (via `/mindforge:migrate`).
2. **Never block on older schema**: warn, suggest migration, continue.
3. **Preserve unknown fields**: never delete fields you do not recognize.

## State file compatibility
### HANDOFF.json
- If `schema_version` is missing, treat as legacy and warn once per session.
- If `schema_version` < current and delta > patch, suggest `/mindforge:migrate`.
- Add default values at runtime (do not write) for missing fields.

### AUDIT.jsonl
- Treat unknown `event` types as opaque and pass through.
- If `session_id` is missing in legacy entries, display as `unknown`.

### MINDFORGE.md
- Enforce non-overridable keys (ADR-013) regardless of file version.
- If a setting has changed formats (e.g., percent -> decimal), prefer migration.

## Plugin compatibility
Plugin compatibility is enforced at install/validate time:
1. `plugin_api_version` must be `1.0.0` for v1.x.x.
2. `min_mindforge_version` must be <= current version.
3. If incompatible, skip plugin and report to user; do not fail session start.

## SDK compatibility
- SDK clients should tolerate missing optional fields in responses.
- New event types should be additive (never remove existing types in 1.x.x).

## Version policy
- Backwards-incompatible changes require a MAJOR bump (ADR-020).
- Additive changes must be documented in CHANGELOG.md and reference docs.
