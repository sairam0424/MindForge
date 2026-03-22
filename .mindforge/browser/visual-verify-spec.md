# MindForge v2 — <verify-visual> Specification

## Overview
`<verify-visual>` is an optional field in PLAN task XML.
It runs AFTER `<verify>` (unit/integration tests) passes.
It confirms the UI looks and behaves correctly via browser automation.

## Syntax
```xml
<verify-visual session="user">
  navigate: /dashboard
  wait: networkidle
  assert-visible: h1 "My Projects"
  screenshot: dashboard.png
  click: "#create-btn"
  assert-visible: .modal
</verify-visual>
```

## Directives
| Directive | Description |
|---|---|
| `navigate: /path` | Navigate to URL (relative to DEV_SERVER_URL) |
| `wait: N` | Wait N ms or 'networkidle' |
| `assert-visible: sel ["text"]` | Assert element is visible |
| `assert-url: /path` | Assert current URL |
| `screenshot: name.png` | Capture screenshot |
| `click: selector` | Click element |
| `type: sel "text"` | Type into field |
| `evaluate: js` | Evaluate JS expression |
| `press: Key` | Press keyboard key |
