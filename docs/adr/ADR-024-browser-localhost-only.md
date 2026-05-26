# ADR-024: Browser Daemon Localhost Binding

## Status
Accepted

## Context
The MindForge v2 Browser Runtime exposes an HTTP API for controlling a Chromium instance. This API allows for powerful actions like navigation, interaction, and data extraction, which could be exploited if exposed to the network.

## Decision
We will strictly bind the Browser Daemon to `127.0.0.1` (localhost) only.

1. The HTTP server will only listen on `127.0.0.1`.
2. The server will perform a secondary check on `req.socket.remoteAddress` to reject any requests not originating from `127.0.0.1`, `::1`, or `::ffff:127.0.0.1`.

## Consequences
- The daemon cannot be controlled remotely by default, significantly reducing the attack surface.
- Developers needing remote control must use an explicit SSH tunnel or reverse proxy with authentication.
