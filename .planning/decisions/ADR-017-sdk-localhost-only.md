# ADR-017: MindForge SDK event stream is localhost-only

**Status:** Accepted
**Date:** 2026-03-21

## Context
The MindForge SDK includes an SSE event stream for real-time progress.
The question is whether it should bind to all interfaces or localhost only.

## Decision
The event stream binds to 127.0.0.1 (localhost) only.

## Rationale
The event stream exposes:
- AUDIT.jsonl entries (which contain sensitive project state)
- Task completion events (which reveal code structure and timing)
- Security finding events (which reveal vulnerability information)

Exposing this to all network interfaces in a shared development environment
(VMs, shared cloud desktops, containers) would allow other users to monitor
another developer's project state in real-time.
Localhost binding provides adequate protection for the primary use case
(local developer tooling) without requiring authentication infrastructure.

## Consequences
- Remote integrations cannot use the event stream directly
- For remote monitoring: use the audit log query API via SSH tunnel
- Container environments: map the port explicitly if remote access is needed
