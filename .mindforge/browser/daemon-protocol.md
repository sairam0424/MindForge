# MindForge v2 — Browser Daemon Protocol

## Overview
Small, long-lived Node.js process that manages a Chromium instance via Playwright.

## HTTP API (localhost:7338)

| Method | Path | Body | Response |
|---|---|---|---|
| GET | /status | - | { alive: bool, sessions: string[], uptime: sec } |
| POST | /navigate | { url, session, wait_for } | { success: bool, status_code: int, load_time_ms: int } |
| POST | /click | { selector, text, session } | { success: bool, element_found: bool } |
| POST | /type | { selector, text, session } | { success: bool } |
| POST | /screenshot | { session } | { success: bool, screenshot_b64: string } |
| POST | /evaluate | { script, session } | { success: bool, result: any } |
| POST | /assert | { type, selector, expected_text, session } | { passed: bool, actual_text: string, error: string } |
| POST | /session/save | { name } | { success: bool, path: string } |
| POST | /session/load | { name } | { success: bool, cookies: int } |
| DELETE | /session/:name | - | { success: bool } |

## State Management
- Sessions are stored in `.mindforge/browser/sessions/` as JSON.
- Multiple named sessions can be active (different BrowserContexts).
- SIGTERM saves all active sessions if --save-on-exit is passed.
