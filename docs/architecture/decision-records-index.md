# MindForge — Architecture Decision Records Index

All 20 ADRs in chronological order.

| ADR | Title | Status | Day | Key decision |
|---|---|---|---|---|
| ADR-001 | HANDOFF.json for cross-session state | Accepted | HANDOFF.json as the primary cross-session state artifact |
| ADR-002 | Markdown-based commands | Accepted | Slash commands as Markdown files (not code) |
| ADR-003 | Keyword-trigger model for skill loading | Accepted | Deterministic keyword matching over AI-decided selection |
| ADR-004 | Wave parallelism over full parallelism | Accepted | Wave-based (dependency-ordered) over unconstrained parallel |
| ADR-005 | Append-only JSONL for audit log | Accepted | AUDIT.jsonl append-only (never update, never delete) |
| ADR-006 | Three-tier skills architecture | Accepted | Core → Org → Project tier hierarchy |
| ADR-007 | Keyword-trigger model (reaffirmed at scale) | Accepted | Confirmed at 10+ skill scale |
| ADR-008 | Just-in-time skill loading | Accepted | Load at task time, not session start |
| ADR-009 | Environment-variable-only credential storage | Accepted | Credentials only in env vars, never in config files |
| ADR-010 | Compliance gates non-bypassable; approvals allow emergency | Accepted | Gates: never bypass. Approvals: emergency override with audit |
| ADR-011 | Integration failures are non-blocking | Accepted | Jira/Slack/GitHub down ≠ phase blocked |
| ADR-012 | Intelligence outputs feed back into system behaviour | Accepted | Difficulty → granularity, retro → MINDFORGE.md, quality → behaviour |
| ADR-013 | MINDFORGE.md as constitution with non-overridable primitives | Accepted | Non-overridable governance primitives cannot be disabled |
| ADR-014 | Metrics are system signals, not developer performance | Accepted | Quality scores improve the system, not evaluate individuals |
| ADR-015 | npm as the public skills registry | Accepted | npm ecosystem for skill distribution |
| ADR-016 | CI timeout exits with code 0 (soft stop) | Accepted | Timeout = save and resume, not failure |
| ADR-017 | SDK event stream is localhost-only | Accepted | SSE binds to 127.0.0.1 only |
| ADR-018 | Installer detects and handles self-install | Accepted | Installer running inside its own repo = no-op for framework files |
| ADR-019 | Self-update preserves original install scope | Accepted | Update local→local, global→global |
| ADR-020 | v1.0.0 stable interface contract | Accepted | Defines what "stable" means for plugins and SDK consumers |
