---
description: Publish approved planning artifacts to Confluence. Usage:
---

Publish approved planning artifacts to Confluence. Usage:
`/mindforge:sync-confluence [--architecture] [--phase N] [--milestone name]`

## Behaviour
- verify Confluence availability through `connection-manager.md`
- publish idempotently by existing page title or page ID
- never publish secrets, raw approval notes, or raw audit logs
- log success, skip, or failure to AUDIT

Publishing failures are non-fatal and create a pending manual action in
 `STATE.md`.
