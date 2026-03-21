# MindForge — Architecture Decision Records Index

All 20 ADRs in chronological order.

| ADR | Title | Status | Day | Key decision |
|---|---|---|---|---|
| ADR-001 | HANDOFF.json for cross-session state | Accepted | Day 2 | HANDOFF.json as the primary cross-session state artifact |
| ADR-002 | Markdown-based commands | Accepted | Day 1 | Slash commands as Markdown files (not code) |
| ADR-003 | Keyword-trigger model for skill loading | Accepted | Day 1 | Deterministic keyword matching over AI-decided selection |
| ADR-004 | Wave parallelism over full parallelism | Accepted | Day 2 | Wave-based (dependency-ordered) over unconstrained parallel |
| ADR-005 | Append-only JSONL for audit log | Accepted | Day 2 | AUDIT.jsonl append-only (never update, never delete) |
| ADR-006 | Three-tier skills architecture | Accepted | Day 3 | Core → Org → Project tier hierarchy |
| ADR-007 | Keyword-trigger model (reaffirmed at Day 3 scale) | Accepted | Day 3 | Confirmed at 10+ skill scale |
| ADR-008 | Just-in-time skill loading | Accepted | Day 3 | Load at task time, not session start |
| ADR-009 | Environment-variable-only credential storage | Accepted | Day 4 | Credentials only in env vars, never in config files |
| ADR-010 | Compliance gates non-bypassable; approvals allow emergency | Accepted | Day 4 | Gates: never bypass. Approvals: emergency override with audit |
| ADR-011 | Integration failures are non-blocking | Accepted | Day 4 | Jira/Slack/GitHub down ≠ phase blocked |
| ADR-012 | Intelligence outputs feed back into system behaviour | Accepted | Day 5 | Difficulty → granularity, retro → MINDFORGE.md, quality → behaviour |
| ADR-013 | MINDFORGE.md as constitution with non-overridable primitives | Accepted | Day 5 | Non-overridable governance primitives cannot be disabled |
| ADR-014 | Metrics are system signals, not developer performance | Accepted | Day 5 | Quality scores improve the system, not evaluate individuals |
| ADR-015 | npm as the public skills registry | Accepted | Day 6 | npm ecosystem for skill distribution |
| ADR-016 | CI timeout exits with code 0 (soft stop) | Accepted | Day 6 | Timeout = save and resume, not failure |
| ADR-017 | SDK event stream is localhost-only | Accepted | Day 6 | SSE binds to 127.0.0.1 only |
| ADR-018 | Installer detects and handles self-install | Accepted | Day 7 | Installer running inside its own repo = no-op for framework files |
| ADR-019 | Self-update preserves original install scope | Accepted | Day 7 | Update local→local, global→global |
| ADR-020 | v1.0.0 stable interface contract | Accepted | Day 7 | Defines what "stable" means for plugins and SDK consumers |
