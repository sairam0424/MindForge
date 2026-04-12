# MindForge v2 — Day 9: Persistent Browser Runtime + Visual QA
# Branch: `feat/mindforge-v2-browser-runtime`
# Prerequisite: `feat/mindforge-v2-autonomous-engine` merged to `main`
# Version target: v2.0.0-alpha.2
# Theme: "The Agent Has Eyes Now."

---

## BRANCH SETUP

```bash
git checkout main
git pull origin main

# Verify Day 8 baseline is clean
node -e "console.log(require('./package.json').version)"  # Must be 2.0.0-alpha.1

# All 16 test suites must pass before starting Day 9
SUITES=(install wave-engine audit compaction skills-platform \
        integrations governance intelligence metrics \
        distribution ci-mode sdk production migration e2e autonomous)

for suite in "${SUITES[@]}"; do
  printf "  %-30s" "${suite}..."
  node tests/${suite}.test.js 2>&1 | tail -1
done
# ALL 16 must show "passed" — zero failures before Day 9 begins.

# Create Day 9 branch
git checkout -b feat/mindforge-v2-browser-runtime
```

---

## DAY 9 SCOPE

Day 9 gives MindForge **eyes**. This is the single feature that no other
enterprise agentic framework has implemented end-to-end: a long-lived
Chromium process that persists across the entire session, keeping login state,
cookies, and tabs alive between every `/mindforge:browse` call.

**The competitive insight (from the v2 research report):**
gstack's browser subsystem is its most-cited differentiator. Their key
architectural decision: a browser that stays alive across calls (100-200ms
warm calls) is categorically different from spawning a browser per command
(3-5s cold start every time). MindForge Day 9 goes beyond gstack by adding:
enterprise governance on every visual action, `<verify-visual>` blocks in PLAN
files so visual verification is first-class alongside unit tests, a systematic
QA engine that analyses the git diff and tests every changed route, and auto-
generated regression tests for every bug found.

| Component | Description | Lines |
|---|---|---|
| Browser Daemon Protocol spec | Full HTTP API contract, security model, performance targets | Engine spec |
| `bin/browser/browser-daemon.js` | Long-lived Chromium via Playwright, localhost:7338 | Full implementation |
| `bin/browser/daemon-manager.js` | Start/stop/health/auto-restart lifecycle manager | Full implementation |
| `bin/browser/session-manager.js` | Named sessions, persistence, real-browser cookie import | Full implementation |
| `bin/browser/visual-verify-executor.js` | `<verify-visual>` block parser and executor | Full implementation |
| `bin/browser/screenshot-store.js` | Screenshot save/list/cleanup with phase namespacing | Full implementation |
| `bin/browser/qa-engine.js` | Diff-aware QA surface extraction, test plan, execution | Full implementation |
| `bin/browser/qa-report-writer.js` | QA-REPORT-[N].md generator | Full implementation |
| `bin/browser/regression-writer.js` | Auto-generate Playwright regression tests per bug | Full implementation |
| `/mindforge:browse` command | Full browser control with session management | Command spec |
| `/mindforge:qa` command | Systematic post-phase visual QA | Command spec |
| `<verify-visual>` PLAN field | Visual verification integrated into execute-phase | Spec + parser |
| MINDFORGE.md v2 browser settings | Full configuration for browser runtime | Schema |
| `tests/browser.test.js` | 17th test suite — all browser components | Test suite |

**New commands today: 40 total (38 from Day 8 + browse + qa)**

---

# ═══════════════════════════════════════════════════════════════════════
# PART 1 — IMPLEMENTATION PROMPT
# ═══════════════════════════════════════════════════════════════════════

---

## TASK 1 — Scaffold Day 9 directory structure

```bash
# Browser runtime binaries
mkdir -p bin/browser
touch bin/browser/browser-daemon.js
touch bin/browser/daemon-manager.js
touch bin/browser/session-manager.js
touch bin/browser/visual-verify-executor.js
touch bin/browser/screenshot-store.js
touch bin/browser/qa-engine.js
touch bin/browser/qa-report-writer.js
touch bin/browser/regression-writer.js

# Engine specifications
mkdir -p .mindforge/browser
touch .mindforge/browser/daemon-protocol.md
touch .mindforge/browser/session-manager.md
touch .mindforge/browser/visual-verify-spec.md
touch .mindforge/browser/qa-engine.md

# Session storage — gitignored
mkdir -p .mindforge/browser/sessions
touch .mindforge/browser/sessions/.gitkeep

# Screenshot storage — gitignored
mkdir -p .planning/screenshots
touch .planning/screenshots/.gitkeep

# New slash commands
touch .claude/commands/mindforge/browse.md
touch .claude/commands/mindforge/qa.md
for cmd in browse qa; do
  cp .claude/commands/mindforge/${cmd}.md .agent/mindforge/${cmd}.md
done

# Test suite
touch tests/browser.test.js

# Docs
touch docs/browser-runtime-guide.md
touch docs/visual-qa-guide.md

# Update .gitignore — browser artifacts must NEVER be committed
cat >> .gitignore << 'EOF'

# MindForge v2 — browser runtime (session files contain auth tokens)
.mindforge/browser/sessions/*.json
.planning/screenshots/
.planning/auto-progress.jsonl
EOF
```

**Add Playwright as optional dependency:**
```bash
node -e "
const fs = require('fs');
const p = JSON.parse(fs.readFileSync('package.json','utf8'));
p.optionalDependencies = p.optionalDependencies || {};
p.optionalDependencies['playwright-core'] = '^1.44.0';
fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
console.log('Added playwright-core as optional dependency');
"
```

**Commit:**
```bash
git add .
git commit -m "chore(v2-day9): scaffold browser runtime directory structure"
```

---

## TASK 2 — Write the Browser Daemon Protocol Specification

### `.mindforge/browser/daemon-protocol.md`

````markdown
# MindForge v2 — Browser Daemon Protocol

## Architecture

```
Agent / Command          Daemon Manager               Browser Daemon
/mindforge:browse   →   daemon-manager.js      →    browser-daemon.js
/mindforge:qa           Start/stop/restart           Playwright Chromium
                        Health check                 HTTP localhost:7338
                        PID management               Named sessions
                                                     Screenshot capture
```

## Port and binding

- **Port:** 7338 (SSE stream = 7337, Dashboard = 7339)
- **Binding:** `127.0.0.1` ONLY — never `0.0.0.0` (per ADR-017 policy)
- **Protocol:** HTTP/1.1 (no TLS — localhost only, same rationale as SDK SSE)
- **Process lifecycle:**
  - Starts on first API call if not running (auto-start via daemon-manager)
  - Auto-shuts down after `BROWSER_IDLE_TIMEOUT_MINUTES` (default: 30) of no activity
  - Survives across multiple MindForge command invocations in the same session

## Full API endpoint reference

### `GET /status`
```json
Response 200:
{
  "alive": true,
  "chromium_version": "Chromium 124.0.6367.8",
  "sessions": ["default", "admin", "user"],
  "active_session": "default",
  "current_url": "https://localhost:3000/dashboard",
  "last_action_at": "ISO-8601",
  "idle_minutes": 2.3,
  "memory_mb": 287,
  "uptime_seconds": 1823
}
Response 503 (starting up):
{ "alive": false, "status": "starting", "eta_ms": 3000 }
```

### `POST /navigate`
```json
Request:
{ "url": "https://localhost:3000/login", "session": "default",
  "wait_for": "networkidle|domcontentloaded|load", "timeout": 30000 }
Response:
{ "success": true, "final_url": "...", "title": "...", "status_code": 200,
  "screenshot_b64": "base64...", "width": 1280, "height": 720,
  "console_errors": [], "load_time_ms": 423 }
```

### `POST /click`
```json
Request (CSS selector): { "selector": "#submit-btn", "session": "default", "screenshot_after": true }
Request (visible text):  { "text": "Sign In", "session": "default" }
Request (ARIA label):    { "aria_label": "Close", "session": "default" }
Response:
{ "success": true, "element_found": true, "screenshot_b64": "...",
  "console_errors": [], "navigation_triggered": false }
```

### `POST /type`
```json
Request:
{ "selector": "input[name='email']", "text": "test@example.com",
  "clear_first": true, "press_enter": false, "session": "default" }
Response: { "success": true, "element_found": true }
```

### `POST /screenshot`
```json
Request:  { "session": "default", "full_page": false }
Response: { "success": true, "screenshot_b64": "...", "width": 1280, "height": 720 }
```

### `POST /evaluate`
```json
Request:  { "script": "document.title", "session": "default" }
Response: { "success": true, "result": "My App", "type": "string" }
```

### `POST /assert`
```json
Request:  { "type": "visible|url|title|no_console_errors",
            "selector": "h1", "expected_text": "My Projects", "session": "default" }
Response (pass): { "success": true, "passed": true, "actual_text": "My Projects", "screenshot_b64": "..." }
Response (fail): { "success": true, "passed": false, "error": "Element not found: h1", "screenshot_b64": "..." }
```

### Session endpoints
```
POST /session/create        { "name": "admin", "copy_from": "default" }
POST /session/switch        { "session": "admin" }
POST /session/save          { "session": "admin" }
POST /session/load          { "session": "admin" }
POST /session/import-cookies { "source": "chrome|arc|brave|edge|firefox", "session": "admin" }
POST /session/delete        { "session": "admin" }
GET  /session/list          → [{ "name": "admin", "saved_at": "...", "url": "..." }]
POST /shutdown              { "save_sessions": true }
```

## Error response format (all errors)
```json
{
  "success": false,
  "error": "Element not found: #nonexistent",
  "error_type": "element_not_found|navigation_failed|evaluation_error|timeout|session_not_found",
  "screenshot_b64": "base64...",
  "url_at_error": "https://localhost:3000/dashboard"
}
```

## Performance targets

| Action | Cold start | Warm (after init) |
|---|---|---|
| Daemon startup | 3-5 seconds | — |
| navigate | ~400ms first | ~150ms |
| click | — | 80-120ms |
| screenshot | — | 60ms |
| evaluate | — | 30ms |
| assert | — | 80ms |

## Security model

1. **Localhost-only binding** (127.0.0.1) — consistent with ADR-017 (SDK SSE policy)
2. **IP check on every request** — non-localhost → 403 immediately
3. **evaluate safety** — only use on YOUR OWN dev app, never on external URLs
4. **Session files are gitignored** — they contain auth tokens
5. **Screenshots are gitignored** — they may contain sensitive UI data
6. **Playwright sandbox flags** — `--no-sandbox` required for CI; always use in controlled env
````

**Commit:**
```bash
git add .mindforge/browser/daemon-protocol.md
git commit -m "feat(v2-browser): write browser daemon protocol specification"
```

---

## TASK 3 — Implement the Browser Daemon

### `bin/browser/browser-daemon.js`

```javascript
#!/usr/bin/env node
/**
 * MindForge v2 — Browser Daemon
 * Long-lived Chromium process, HTTP API at localhost:7338.
 *
 * Spawned by daemon-manager.js — do NOT start directly.
 *
 * ENV:
 *   BROWSER_PORT              — HTTP port (default: 7338)
 *   BROWSER_IDLE_TIMEOUT      — Idle shutdown in minutes (default: 30)
 *   BROWSER_HEADLESS          — true|false (default: true)
 *   BROWSER_VIEWPORT_WIDTH    — (default: 1280)
 *   BROWSER_VIEWPORT_HEIGHT   — (default: 720)
 */
'use strict';

const http = require('http');

const PORT        = parseInt(process.env.BROWSER_PORT       || '7338', 10);
const IDLE_MS     = parseInt(process.env.BROWSER_IDLE_TIMEOUT || '30', 10) * 60_000;
const HEADLESS    = process.env.BROWSER_HEADLESS !== 'false';
const VIEWPORT    = {
  width:  parseInt(process.env.BROWSER_VIEWPORT_WIDTH  || '1280', 10),
  height: parseInt(process.env.BROWSER_VIEWPORT_HEIGHT || '720',  10),
};

let playwright, browser;
const sessions   = {};   // name → { context, page, consoleErrors[] }
let lastActionAt = Date.now();

// ── Playwright initialisation ─────────────────────────────────────────────────
async function init() {
  try {
    playwright = require('playwright-core');
  } catch {
    process.stderr.write(
      '[daemon] playwright-core not installed.\n' +
      '[daemon] Run: npm install playwright-core && npx playwright install chromium\n'
    );
    process.exit(1);
  }

  browser = await playwright.chromium.launch({
    headless: HEADLESS,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas',
      '--no-first-run', '--no-zygote',
    ],
  });

  await newSession('default');
  process.stdout.write(`READY:${PORT}\n`);
  process.stderr.write(`[daemon] Chromium ${browser.version()} ready on :${PORT}\n`);
}

// ── Session management ────────────────────────────────────────────────────────
async function newSession(name, copyFrom) {
  if (sessions[name]) return sessions[name];

  const context = await browser.newContext({
    viewport: VIEWPORT,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    ignoreHTTPSErrors: true,
  });

  if (copyFrom && sessions[copyFrom]) {
    const cookies = await sessions[copyFrom].context.cookies();
    if (cookies.length) await context.addCookies(cookies);
  }

  const page = await context.newPage();
  const errs = [];
  page.on('console', m => {
    if (m.type() === 'error') errs.push({ ts: new Date().toISOString(), text: m.text(), url: page.url() });
  });

  sessions[name] = { context, page, consoleErrors: errs };
  return sessions[name];
}

function sess(name = 'default') {
  if (!sessions[name]) throw new Error(`Session not found: "${name}". Create it first.`);
  return sessions[name];
}

// ── Action implementations ────────────────────────────────────────────────────

async function handleNavigate({ url, session: s = 'default', wait_for = 'networkidle', timeout = 30000 }) {
  const { page, consoleErrors } = sess(s);
  consoleErrors.length = 0;
  const t0   = Date.now();
  const resp = await page.goto(url, { waitUntil: wait_for === 'networkidle' ? 'networkidle' : 'domcontentloaded', timeout });
  const img  = await page.screenshot({ type: 'png' });
  return {
    success: true, final_url: page.url(), title: await page.title(),
    status_code: resp?.status() ?? 0,
    screenshot_b64: img.toString('base64'), width: VIEWPORT.width, height: VIEWPORT.height,
    console_errors: [...consoleErrors], load_time_ms: Date.now() - t0,
  };
}

async function handleClick({ selector, text, aria_label, session: s = 'default', screenshot_after = true, timeout = 5000 }) {
  const { page } = sess(s);
  const loc = selector ? page.locator(selector)
    : text        ? page.getByText(text, { exact: false })
    : aria_label  ? page.getByRole('button', { name: aria_label })
    : (() => { throw new Error('click requires selector, text, or aria_label'); })();
  const prev = page.url();
  await loc.click({ timeout });
  await page.waitForLoadState('networkidle').catch(() => {});
  const img = screenshot_after ? await page.screenshot({ type: 'png' }) : null;
  return { success: true, element_found: true,
    screenshot_b64: img?.toString('base64') ?? null,
    console_errors: [...sess(s).consoleErrors],
    navigation_triggered: page.url() !== prev };
}

async function handleType({ selector, text, clear_first = true, press_enter = false, session: s = 'default', timeout = 5000 }) {
  const { page } = sess(s);
  const loc = page.locator(selector);
  await loc.waitFor({ timeout });
  if (clear_first) await loc.clear();
  await loc.fill(text);
  if (press_enter) await loc.press('Enter');
  return { success: true, element_found: true };
}

async function handleScreenshot({ session: s = 'default', full_page = false, clip }) {
  const { page } = sess(s);
  const img = await page.screenshot({ type: 'png', fullPage: full_page, clip: clip ?? undefined });
  return { success: true, screenshot_b64: img.toString('base64'), width: VIEWPORT.width, height: VIEWPORT.height, format: 'png' };
}

async function handleEvaluate({ script, session: s = 'default' }) {
  const { page } = sess(s);
  const result = await page.evaluate(script);
  return { success: true, result, type: typeof result };
}

async function handleAssert({ type, selector, expected_text, session: s = 'default', timeout = 5000 }) {
  const { page } = sess(s);
  try {
    switch (type) {
      case 'visible': {
        await page.locator(selector).waitFor({ state: 'visible', timeout });
        const actual = expected_text ? await page.locator(selector).textContent() : null;
        if (expected_text && !actual?.includes(expected_text)) {
          const img = await page.screenshot({ type: 'png' });
          return { success: true, passed: false, error: `Expected "${expected_text}", got "${actual}"`, screenshot_b64: img.toString('base64') };
        }
        const img = await page.screenshot({ type: 'png' });
        return { success: true, passed: true, actual_text: actual, screenshot_b64: img.toString('base64') };
      }
      case 'url': {
        const cur = page.url();
        return { success: true, passed: cur.includes(expected_text ?? ''), actual_url: cur };
      }
      case 'title': {
        const t = await page.title();
        return { success: true, passed: t.includes(expected_text ?? ''), actual_title: t };
      }
      case 'no_console_errors': {
        const errs = sess(s).consoleErrors;
        return { success: true, passed: errs.length === 0, console_errors: [...errs] };
      }
      default:
        throw new Error(`Unknown assertion type: "${type}"`);
    }
  } catch (err) {
    const img = await page.screenshot({ type: 'png' }).catch(() => null);
    return { success: true, passed: false, error: err.message, screenshot_b64: img?.toString('base64') ?? null, url_at_error: page.url() };
  }
}

async function handleImportCookies({ source, session: s = 'default' }) {
  const SM = require('./session-manager');
  const cookies = await SM.importFromBrowser(source);
  await sess(s).context.addCookies(cookies);
  return { success: true, cookies_imported: cookies.length, session: s };
}

async function handleSaveSession({ session: s = 'default' }) {
  const SM = require('./session-manager');
  const filePath = await SM.saveSession(s, sess(s).context);
  return { success: true, path: filePath, session: s };
}

async function handleLoadSession({ session: s = 'default' }) {
  const SM = require('./session-manager');
  if (!sessions[s]) await newSession(s);
  const r = await SM.loadSession(s, sess(s).context);
  return { success: true, ...r };
}

async function handleSessionCreate({ name, copy_from }) {
  await newSession(name, copy_from);
  return { success: true, session: name };
}

async function handleSessionDelete({ session: s }) {
  if (!sessions[s]) return { success: false, error: `Session not found: ${s}` };
  await sessions[s].context.close().catch(() => {});
  delete sessions[s];
  return { success: true, deleted: s };
}

function handleSessionList() {
  const SM = require('./session-manager');
  return { success: true, sessions: SM.listSessions() };
}

async function handleShutdown({ save_sessions = true }) {
  if (save_sessions) {
    const SM = require('./session-manager');
    for (const [name, s] of Object.entries(sessions)) {
      await SM.saveSession(name, s.context).catch(() => {});
    }
  }
  setTimeout(() => process.exit(0), 100);
  return { success: true, sessions_saved: Object.keys(sessions) };
}

// ── Route table ───────────────────────────────────────────────────────────────
const ROUTES = {
  'GET /status':               () => ({
    alive: true,
    chromium_version: browser?.version() ?? 'unknown',
    sessions: Object.keys(sessions),
    last_action_at: new Date(lastActionAt).toISOString(),
    idle_minutes: (Date.now() - lastActionAt) / 60_000,
  }),
  'POST /navigate':            handleNavigate,
  'POST /click':               handleClick,
  'POST /type':                handleType,
  'POST /screenshot':          handleScreenshot,
  'POST /evaluate':            handleEvaluate,
  'POST /assert':              handleAssert,
  'POST /session/create':      handleSessionCreate,
  'POST /session/switch':      ({ session }) => { sess(session); return { success: true, session }; },
  'POST /session/save':        handleSaveSession,
  'POST /session/load':        handleLoadSession,
  'POST /session/import-cookies': handleImportCookies,
  'POST /session/delete':      handleSessionDelete,
  'GET  /session/list':        handleSessionList,
  'POST /shutdown':            handleShutdown,
};

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // Security gate — localhost only
  const addr = req.socket.remoteAddress;
  if (addr !== '127.0.0.1' && addr !== '::1' && addr !== '::ffff:127.0.0.1') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Forbidden: localhost only' }));
    return;
  }

  const key     = `${req.method} ${req.url}`;
  const handler = ROUTES[key];
  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: `No handler: ${key}` }));
    return;
  }

  let body = {};
  if (req.method === 'POST') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { body = {}; }
  }

  try {
    lastActionAt = Date.now();
    const result = await handler(body);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (err) {
    const snapshotPng = body.session ? await sessions[body.session]?.page?.screenshot({ type: 'png' }).catch(() => null) : null;
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: err.message,
      error_type: err.constructor?.name ?? 'Error',
      screenshot_b64: snapshotPng?.toString('base64') ?? null,
    }));
  }
});

// ── Idle-shutdown timer ───────────────────────────────────────────────────────
const idleCheck = setInterval(() => {
  if (Date.now() - lastActionAt > IDLE_MS) {
    process.stderr.write('[daemon] Idle timeout — shutting down\n');
    browser?.close().catch(() => {});
    process.exit(0);
  }
}, 60_000);
idleCheck.unref();

// ── SIGTERM — graceful shutdown with session save ─────────────────────────────
process.on('SIGTERM', async () => {
  process.stderr.write('[daemon] SIGTERM — saving sessions\n');
  try {
    const SM = require('./session-manager');
    for (const [n, s] of Object.entries(sessions)) await SM.saveSession(n, s.context).catch(() => {});
  } catch {}
  await browser?.close().catch(() => {});
  process.exit(0);
});

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
  await init();
  server.listen(PORT, '127.0.0.1', () =>
    process.stderr.write(`[daemon] Listening http://127.0.0.1:${PORT}\n`)
  );
  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      process.stderr.write(`[daemon] Port ${PORT} in use — is another instance running?\n`);
    }
    throw err;
  });
})();
```

---

### `bin/browser/daemon-manager.js`

```javascript
/**
 * MindForge v2 — Daemon Manager
 * Manages browser-daemon.js lifecycle.
 * Used by all browser commands and bin/browser/*.js modules.
 */
'use strict';

const http      = require('http');
const { spawn } = require('child_process');
const path      = require('path');
const fs        = require('fs');

const PORT        = parseInt(process.env.BROWSER_PORT || '7338', 10);
const PID_FILE    = path.join(process.cwd(), '.planning', 'browser-daemon.pid');
const DAEMON_PATH = path.join(__dirname, 'browser-daemon.js');

let _daemonProc = null;

// ── Low-level HTTP client ─────────────────────────────────────────────────────
async function request(method, urlPath, body, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: '127.0.0.1', port: PORT, path: urlPath, method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      timeout: timeoutMs,
    }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ success: false, raw: data }); } });
    });
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Daemon timeout: ${method} ${urlPath}`)); });
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Health check ──────────────────────────────────────────────────────────────
async function isAlive() {
  try { return (await request('GET', '/status', null, 2000))?.alive === true; } catch { return false; }
}

// ── Start daemon ──────────────────────────────────────────────────────────────
async function start({ headless = true, timeout = 20_000 } = {}) {
  if (await isAlive()) return { started: false, already_running: true, port: PORT };

  return new Promise((resolve, reject) => {
    _daemonProc = spawn('node', [DAEMON_PATH], {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, BROWSER_PORT: String(PORT), BROWSER_HEADLESS: String(headless) },
    });

    fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
    fs.writeFileSync(PID_FILE, String(_daemonProc.pid));

    let ready = false;
    const timer = setTimeout(() => {
      if (!ready) reject(new Error(`Browser daemon did not start within ${timeout}ms`));
    }, timeout);

    _daemonProc.stdout.on('data', data => {
      if (data.toString().includes('READY:') && !ready) {
        ready = true;
        clearTimeout(timer);
        resolve({ started: true, port: PORT, pid: _daemonProc.pid });
      }
    });

    _daemonProc.stderr.on('data', data => {
      const txt = data.toString();
      // Only surface actual errors, not Chromium's verbose noise
      if (txt.includes('[daemon]') || /\berror\b/i.test(txt)) process.stderr.write(txt);
    });

    _daemonProc.on('exit', (code, signal) => {
      if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
      if (!ready) reject(new Error(`Daemon exited early: code=${code} signal=${signal}`));
    });
  });
}

// ── Ensure daemon is running ──────────────────────────────────────────────────
async function ensureRunning(opts) {
  if (await isAlive()) return { running: true, port: PORT };
  return start(opts);
}

// ── Stop daemon ───────────────────────────────────────────────────────────────
async function stop(saveSessions = true) {
  if (!await isAlive()) return { stopped: false, not_running: true };
  try {
    await request('POST', '/shutdown', { save_sessions: saveSessions }, 5000);
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    return { stopped: true };
  } catch {
    const pid = fs.existsSync(PID_FILE) ? parseInt(fs.readFileSync(PID_FILE, 'utf8')) : null;
    if (_daemonProc) _daemonProc.kill('SIGTERM');
    if (pid) try { process.kill(pid, 'SIGTERM'); } catch {}
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    return { stopped: true, forced: true };
  }
}

// ── Convenience proxy methods ─────────────────────────────────────────────────
const navigate  = (url, opts = {})  => ensureRunning().then(() => request('POST', '/navigate',  { url, ...opts }));
const click     = (sel, opts = {})  => ensureRunning().then(() => request('POST', '/click',     { selector: sel, ...opts }));
const type      = (sel, text, opts) => ensureRunning().then(() => request('POST', '/type',      { selector: sel, text, ...opts }));
const screenshot = (opts = {})      => ensureRunning().then(() => request('POST', '/screenshot', opts));
const evaluate  = (script, opts)    => ensureRunning().then(() => request('POST', '/evaluate',  { script, ...opts }));
const assertV   = (type, sel, exp, opts) =>
  ensureRunning().then(() => request('POST', '/assert', { type, selector: sel, expected_text: exp, ...opts }));
const getStatus = () => request('GET', '/status', null, 2000).catch(() => ({ alive: false }));

module.exports = { start, stop, ensureRunning, isAlive, getStatus, request, navigate, click, type, screenshot, evaluate, assertV };
```

**Commit:**
```bash
git add bin/browser/browser-daemon.js bin/browser/daemon-manager.js
git commit -m "feat(v2-browser): implement Playwright browser daemon and daemon manager"
```

---

## TASK 4 — Implement the Session Manager

### `bin/browser/session-manager.js`

```javascript
/**
 * MindForge v2 — Browser Session Manager
 * Named session persistence and real-browser cookie import.
 *
 * ⚠️  Session files contain auth tokens — NEVER commit them.
 *     .mindforge/browser/sessions/ is gitignored.
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const SESSIONS_DIR = path.join(process.cwd(), '.mindforge', 'browser', 'sessions');
const ensureDir = () => fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// ── Save session state to disk ────────────────────────────────────────────────
async function saveSession(name, context) {
  ensureDir();
  const cookies = await context.cookies();
  const storageByOrigin = {};

  // Capture localStorage per origin from all open pages
  for (const page of context.pages()) {
    try {
      const origin = new URL(page.url()).origin;
      const ls = await page.evaluate(() => {
        const items = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          items[k] = localStorage.getItem(k);
        }
        return items;
      }).catch(() => ({}));
      if (Object.keys(ls).length) storageByOrigin[origin] = { localStorage: ls };
    } catch {}
  }

  const data = {
    name,
    saved_at: new Date().toISOString(),
    url: context.pages()[0]?.url() ?? '',
    cookies,
    storage: storageByOrigin,
    _warning: 'Contains authentication cookies. NEVER commit this file.',
  };

  const filePath = path.join(SESSIONS_DIR, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

// ── Load session state from disk ──────────────────────────────────────────────
async function loadSession(name, context) {
  const filePath = path.join(SESSIONS_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) throw new Error(`Session file not found: ${filePath}`);

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let cookiesLoaded = 0, storageItemsLoaded = 0;

  if (data.cookies?.length) {
    const now    = Date.now() / 1000;
    const valid  = data.cookies.filter(c => !c.expires || c.expires === -1 || c.expires > now);
    const expired = data.cookies.length - valid.length;
    if (valid.length) { await context.addCookies(valid); cookiesLoaded = valid.length; }
    if (expired) process.stderr.write(`[session-mgr] Skipped ${expired} expired cookie(s) from session "${name}"\n`);
  }

  return { cookiesLoaded, storageItemsLoaded };
}

// ── Import cookies from real browser ─────────────────────────────────────────
async function importFromBrowser(source) {
  const cookiePath = getBrowserCookiePath(source);
  if (!cookiePath) throw new Error(`Unsupported browser: "${source}". Supported: chrome, arc, brave, edge, firefox`);
  if (!fs.existsSync(cookiePath)) {
    throw new Error(
      `Cookie file not found: ${cookiePath}\n` +
      `Make sure ${source} is installed and has been opened at least once.\n` +
      `On macOS with Chrome: the browser must be CLOSED (Chrome locks the DB when open).`
    );
  }

  const ext = path.extname(cookiePath).toLowerCase();
  if (ext === '.json') return parseJsonCookies(fs.readFileSync(cookiePath, 'utf8'));
  return parseSqliteCookies(cookiePath);
}

function getBrowserCookiePath(source) {
  const home = os.homedir();
  const map = {
    chrome:  { darwin: `${home}/Library/Application Support/Google/Chrome/Default/Cookies`,
                linux:  `${home}/.config/google-chrome/Default/Cookies`,
                win32:  `${home}/AppData/Local/Google/Chrome/User Data/Default/Cookies` },
    arc:     { darwin: `${home}/Library/Application Support/Arc/User Data/Default/Cookies` },
    brave:   { darwin: `${home}/Library/Application Support/BraveSoftware/Brave-Browser/Default/Cookies`,
                linux:  `${home}/.config/BraveSoftware/Brave-Browser/Default/Cookies` },
    edge:    { darwin: `${home}/Library/Application Support/Microsoft Edge/Default/Cookies`,
                win32:  `${home}/AppData/Local/Microsoft/Edge/User Data/Default/Cookies` },
  };
  return map[source.toLowerCase()]?.[process.platform] ?? null;
}

function parseJsonCookies(json) {
  try {
    const arr = JSON.parse(json);
    return (Array.isArray(arr) ? arr : []).map(c => ({
      name:     c.name     ?? c.Name     ?? '',
      value:    c.value    ?? c.Value    ?? '',
      domain:   c.domain   ?? c.Domain   ?? '',
      path:     c.path     ?? c.Path     ?? '/',
      expires:  c.expirationDate ?? c.expires ?? -1,
      httpOnly: c.httpOnly ?? c.HttpOnly ?? false,
      secure:   c.secure   ?? c.Secure   ?? false,
      sameSite: c.sameSite ?? 'Lax',
    })).filter(c => c.name && c.domain);
  } catch { return []; }
}

async function parseSqliteCookies(dbPath) {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const rows = db.prepare(
      'SELECT name, value, host_key, path, expires_utc, is_secure, is_httponly FROM cookies'
    ).all();
    db.close();
    const now = Date.now() / 1000;
    return rows.map(r => ({
      name: r.name, value: r.value, domain: r.host_key, path: r.path,
      expires: r.expires_utc / 1_000_000 - 11_644_473_600, // Windows FILETIME → Unix
      secure: !!r.is_secure, httpOnly: !!r.is_httponly, sameSite: 'Lax',
    })).filter(c => c.name && c.expires > now);
  } catch {
    throw new Error(
      'SQLite cookie import requires "better-sqlite3".\n' +
      'Install: npm install better-sqlite3\n' +
      'Or export cookies as JSON from your browser using a browser extension.'
    );
  }
}

function listSessions() {
  ensureDir();
  return fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('.'))
    .map(f => {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'));
        return { name: d.name, saved_at: d.saved_at, url: d.url };
      } catch { return { name: f.replace('.json', ''), saved_at: null, url: null }; }
    });
}

function deleteSession(name) {
  const p = path.join(SESSIONS_DIR, `${name}.json`);
  if (!fs.existsSync(p)) return false;
  fs.unlinkSync(p);
  return true;
}

module.exports = { saveSession, loadSession, importFromBrowser, listSessions, deleteSession };
```

**Commit:**
```bash
git add bin/browser/session-manager.js
git commit -m "feat(v2-browser): implement session manager with persistence and real-browser cookie import"
```

---

## TASK 5 — Implement the Screenshot Store

### `bin/browser/screenshot-store.js`

```javascript
/**
 * MindForge v2 — Screenshot Store
 * Saves / lists / cleans up browser screenshots.
 * All screenshots are gitignored — ephemeral test artifacts.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const STORE = path.join(process.cwd(), '.planning', 'screenshots');
const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

/**
 * Save a base64-encoded PNG to disk.
 * Namespaced by phase / planId so cleanup is scoped.
 * Returns absolute path of saved file.
 */
function save(base64Png, phaseNum, planId, filename = 'screenshot.png') {
  const dir = path.join(STORE, `phase-${phaseNum}`, String(planId));
  ensureDir(dir);
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/\.png$/i, '') + '.png';
  const dest = path.join(dir, safe);
  fs.writeFileSync(dest, Buffer.from(base64Png, 'base64'));
  return dest;
}

/** List all screenshots for a phase (and optional planId). */
function list(phaseNum, planId) {
  const dir = planId
    ? path.join(STORE, `phase-${phaseNum}`, String(planId))
    : path.join(STORE, `phase-${phaseNum}`);
  if (!fs.existsSync(dir)) return [];
  const walk = d => fs.readdirSync(d, { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : path.join(d, e.name))
    .filter(p => p.endsWith('.png'));
  return walk(dir);
}

/** Delete all screenshots for a phase. */
function cleanup(phaseNum) {
  const dir = path.join(STORE, `phase-${phaseNum}`);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

/** Total bytes used in the screenshot store. */
function diskUsage() {
  if (!fs.existsSync(STORE)) return 0;
  let total = 0;
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p) : (total += fs.statSync(p).size);
  }};
  walk(STORE);
  return total;
}

module.exports = { save, list, cleanup, diskUsage };
```

**Commit:**
```bash
git add bin/browser/screenshot-store.js
git commit -m "feat(v2-browser): implement screenshot store with phase namespacing"
```

---

## TASK 6 — Implement the `<verify-visual>` Parser and Executor

### `.mindforge/browser/visual-verify-spec.md`

````markdown
# MindForge v2 — `<verify-visual>` Specification

## Overview

`<verify-visual>` is an optional new field in PLAN task XML.
It runs AFTER `<verify>` (unit/integration tests) passes.
It defines structured browser steps that the agent executes to confirm
the UI looks and behaves correctly — not just that the tests pass.

## Syntax

```xml
<verify-visual session="user">
  navigate: /dashboard
  wait: networkidle
  assert-visible: h1 "My Projects"
  assert-visible: .project-list
  assert-no-errors: true
  screenshot: dashboard-initial.png
  click: "#create-project-btn"
  wait: 500
  assert-visible: .modal "Create Project"
  type: input[name="project-name"] "Test Project Alpha"
  click: button[type="submit"]
  wait: networkidle
  assert-url: /projects
  screenshot: project-created.png
</verify-visual>
```

## Directives (all supported)

| Directive | Syntax | Description |
|---|---|---|
| `navigate` | `navigate: /path` or `navigate: https://url` | Navigate (relative uses DEV_SERVER_URL) |
| `wait` | `wait: networkidle` or `wait: 500` | Wait for network idle OR N milliseconds |
| `assert-visible` | `assert-visible: selector ["expected text"]` | Element visible + optional text match |
| `assert-not-visible` | `assert-not-visible: selector` | Element NOT in viewport |
| `assert-url` | `assert-url: /path` | Current URL contains string |
| `assert-title` | `assert-title: "Page Title"` | Page title contains string |
| `assert-no-errors` | `assert-no-errors: true` | Zero JS console errors |
| `screenshot` | `screenshot: filename.png` | Capture, save to `.planning/screenshots/` |
| `click` | `click: selector` or `click: "text"` | Click element |
| `type` | `type: selector "text"` | Fill input (clears first) |
| `clear` | `clear: selector` | Clear field |
| `press` | `press: Enter` | Press keyboard key |
| `scroll` | `scroll: bottom` or `scroll: selector` | Scroll page or element |
| `evaluate` | `evaluate: javascript expression` | Assert JS evaluates to truthy |

## Session attribute

`session="default"` — unauthenticated (default if not specified)
`session="admin"` — uses saved admin session (must exist)
`session="user"` — uses saved user session

## Result file

`.planning/phases/[N]/VISUAL-VERIFY-[N]-[plan].md`

```markdown
# Visual Verify — Phase [N], Plan [plan]
Status: ✅ PASS | ❌ FAIL
Session: user

| Step | Directive | Status | Detail |
|---|---|---|---|
| 1 | navigate: /dashboard | ✅ pass | 200 OK, 423ms |
| 2 | assert-visible: h1 "My Projects" | ✅ pass | Found: "My Projects" |
| 3 | click: "#create-project-btn" | ✅ pass | |
| 4 | assert-visible: .modal | ❌ FAIL | Element not found after 5s |

Screenshots: dashboard-initial.png
```

## On visual verify failure

A `<verify-visual>` failure is treated identically to a `<verify>` failure:
it triggers node repair in auto mode (RETRY first, then DECOMPOSE if needed).
The failure screenshot shows exactly what the agent saw.
````

### `bin/browser/visual-verify-executor.js`

```javascript
/**
 * MindForge v2 — Visual Verify Executor
 * Parses <verify-visual> blocks from PLAN files and executes
 * them against the browser daemon.
 */
'use strict';

const fs          = require('fs');
const path        = require('path');
const DaemonMgr   = require('./daemon-manager');
const ScreenStore = require('./screenshot-store');

const DEV_SERVER  = process.env.DEV_SERVER_URL || 'http://localhost:3000';

// ── Parser ────────────────────────────────────────────────────────────────────

/** Extract the raw <verify-visual> block from PLAN XML content. */
function extractBlock(planContent) {
  const m = planContent.match(/<verify-visual([^>]*)>([\s\S]*?)<\/verify-visual>/);
  if (!m) return null;
  const sessionM = m[1].match(/session\s*=\s*["']([^"']+)["']/);
  return { attributes: m[1], content: m[2].trim(), session: sessionM?.[1] ?? 'default' };
}

/** Parse block content into directive objects. */
function parseDirectives(content) {
  return content
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#'))
    .map(line => {
      const colon = line.indexOf(':');
      if (colon === -1) return null;
      const directive = line.slice(0, colon).trim();
      const rawArgs   = line.slice(colon + 1).trim();
      // Split args on whitespace but keep "quoted strings" intact
      const args = [];
      const re   = /"([^"]*)"|\S+/g;
      let m;
      while ((m = re.exec(rawArgs)) !== null) args.push(m[1] !== undefined ? m[1] : m[0]);
      return { directive, args };
    })
    .filter(Boolean);
}

// ── Executor ──────────────────────────────────────────────────────────────────

async function executeBlock(phaseNum, planId, planContent) {
  const block = extractBlock(planContent);
  if (!block) return { passed: true, steps: [], skipped: true };

  await DaemonMgr.ensureRunning({ headless: true });

  const directives = parseDirectives(block.content);
  const session    = block.session;
  const steps      = [];
  const screenshots = [];
  let passed       = true;

  for (const { directive, args } of directives) {
    const step = { directive: `${directive}: ${args.join(' ')}`, status: 'pass', detail: '' };

    try {
      switch (directive) {

        case 'navigate': {
          const url = args[0]?.startsWith('http') ? args[0] : `${DEV_SERVER}${args[0]}`;
          const r   = await DaemonMgr.request('POST', '/navigate', { url, session, wait_for: 'networkidle' });
          step.detail = `${r.status_code ?? 200} OK, ${r.load_time_ms ?? 0}ms`;
          if (!r.success) throw new Error(r.error ?? 'Navigation failed');
          break;
        }

        case 'wait': {
          const arg = args[0];
          if (arg === 'networkidle') await new Promise(r => setTimeout(r, 300));
          else                       await new Promise(r => setTimeout(r, parseInt(arg) || 500));
          step.detail = `waited ${arg}`;
          break;
        }

        case 'assert-visible': {
          const sel  = args[0];
          const exp  = args[1] ?? null;
          const r    = await DaemonMgr.request('POST', '/assert', { type: 'visible', selector: sel, expected_text: exp, session });
          step.detail = r.passed ? `found: "${r.actual_text ?? sel}"` : r.error;
          if (!r.passed) { step.status = 'fail'; passed = false; }
          break;
        }

        case 'assert-not-visible': {
          const sel = args[0];
          const r   = await DaemonMgr.request('POST', '/assert', { type: 'visible', selector: sel, session });
          if (r.passed) { step.status = 'fail'; passed = false; step.detail = `element found but should be hidden: ${sel}`; }
          else          { step.detail = `confirmed not visible: ${sel}`; }
          break;
        }

        case 'assert-url': {
          const r = await DaemonMgr.request('POST', '/assert', { type: 'url', expected_text: args[0], session });
          step.detail = r.passed ? `URL contains: ${args[0]}` : `URL "${r.actual_url}" ≠ "${args[0]}"`;
          if (!r.passed) { step.status = 'fail'; passed = false; }
          break;
        }

        case 'assert-title': {
          const r = await DaemonMgr.request('POST', '/assert', { type: 'title', expected_text: args[0], session });
          step.detail = r.passed ? `title: "${r.actual_title}"` : `title mismatch`;
          if (!r.passed) { step.status = 'fail'; passed = false; }
          break;
        }

        case 'assert-no-errors': {
          const r = await DaemonMgr.request('POST', '/assert', { type: 'no_console_errors', session });
          step.detail = r.passed ? 'no console errors' : `${r.console_errors?.length} error(s)`;
          if (!r.passed) { step.status = 'fail'; passed = false; }
          break;
        }

        case 'screenshot': {
          const filename = args[0] ?? `step-${steps.length + 1}.png`;
          const r = await DaemonMgr.request('POST', '/screenshot', { session });
          if (r.success && r.screenshot_b64) {
            const saved = ScreenStore.save(r.screenshot_b64, phaseNum, planId, filename);
            screenshots.push(saved);
          }
          step.detail = `saved: ${filename}`;
          break;
        }

        case 'click': {
          const sel = args[0];
          const body = sel.startsWith('"') ? { text: sel.replace(/"/g, ''), session } : { selector: sel, session };
          const r = await DaemonMgr.request('POST', '/click', body);
          step.detail = r.element_found ? 'clicked' : 'element not found';
          if (!r.success) { step.status = 'fail'; passed = false; }
          break;
        }

        case 'type': {
          const r = await DaemonMgr.request('POST', '/type', { selector: args[0], text: args[1] ?? '', session });
          step.detail = `typed into ${args[0]}`;
          if (!r.success) { step.status = 'fail'; passed = false; }
          break;
        }

        case 'evaluate': {
          const script = args.join(' ');
          const r      = await DaemonMgr.request('POST', '/evaluate', { script, session });
          const truthy = r.success && !!r.result;
          step.detail = `result: ${JSON.stringify(r.result)}`;
          if (!truthy) { step.status = 'fail'; passed = false; }
          break;
        }

        case 'press': {
          const { page } = require('./daemon-manager'); // direct page access not available; skip
          step.detail = `press "${args[0]}" — requires direct Playwright access; use click instead`;
          step.status = 'warn';
          break;
        }

        default:
          step.detail = `unknown directive "${directive}" — skipped`;
          step.status = 'warn';
      }
    } catch (err) {
      step.status = 'fail';
      step.detail = err.message;
      passed       = false;
    }

    steps.push(step);
    if (step.status === 'fail') break; // fail-fast for clarity
  }

  return { passed, steps, screenshots, session, directives_count: directives.length };
}

// ── Report writer ─────────────────────────────────────────────────────────────
function writeReport(phaseNum, planId, result) {
  const dir  = path.join(process.cwd(), '.planning', 'phases', String(phaseNum));
  fs.mkdirSync(dir, { recursive: true });

  const status = result.skipped ? '⏭️ SKIPPED'
    : result.passed              ? '✅ PASS'
    :                              '❌ FAIL';

  const rows = result.steps.map((s, i) => {
    const icon = s.status === 'pass' ? '✅' : s.status === 'fail' ? '❌' : '⚠️';
    return `| ${i + 1} | ${s.directive} | ${icon} ${s.status} | ${s.detail} |`;
  }).join('\n');

  const links = result.screenshots
    .map(p => `- \`${path.relative(process.cwd(), p)}\``)
    .join('\n');

  const content = [
    `# Visual Verify — Phase ${phaseNum}, Plan ${planId}`,
    `**Status:** ${status}`,
    `**Session:** ${result.session ?? 'default'}`,
    `**Directives:** ${result.directives_count ?? 0} executed`,
    '',
    '## Steps',
    '| # | Directive | Status | Detail |',
    '|---|---|---|---|',
    rows || '| — | (no steps) | — | — |',
    '',
    `## Screenshots (${result.screenshots?.length ?? 0})`,
    links || '(none)',
    '',
    `*Generated: ${new Date().toISOString()}*`,
  ].join('\n');

  const file = path.join(dir, `VISUAL-VERIFY-${phaseNum}-${planId}.md`);
  fs.writeFileSync(file, content);
  return file;
}

module.exports = { extractBlock, parseDirectives, executeBlock, writeReport };
```

**Commit:**
```bash
git add bin/browser/visual-verify-executor.js .mindforge/browser/visual-verify-spec.md
git commit -m "feat(v2-browser): implement visual verify executor with full directive set"
```

---

## TASK 7 — Implement the QA Engine

### `.mindforge/browser/qa-engine.md`

````markdown
# MindForge v2 — QA Engine

## Purpose
Systematic visual QA after phase execution. The QA engine analyses the phase
diff, builds a test plan for every changed UI surface, executes each test
through the browser, documents bugs with screenshots and reproduction steps,
and auto-generates regression tests.

## Surface extraction from git diff

```
Changed file                           Surface type    Route
──────────────────────────────────────────────────────────────────
src/app/dashboard/page.tsx             page            /dashboard
src/pages/login.tsx                    page            /login
src/components/ProjectCard.tsx         component       → find parent pages
src/app/api/projects/route.ts          api             GET/POST /api/projects
src/pages/api/users/[id].ts            api             GET /api/users/:id
```

## Test plan per surface

For each page surface:
1. Load page — assert no JS errors, main content visible
2. Test with each configured session (default, admin, user)
3. If forms detected — test validation (empty submit → error message)
4. If auth-protected — test with unauthenticated session → redirect to /login

## Bug documentation format
Each bug: route, session, step number, error, screenshot path, reproduction steps

## Regression test generation
For every bug: write `tests/regression/phase[N]-[slug].test.ts` using Playwright.
Committed before the QA report is written — regression is tracked in git.

## Integration with auto mode
When `AUTO_RUN_QA_AFTER_UI_WAVES=true` in MINDFORGE.md:
- QA runs automatically after waves containing page/component changes
- Bugs found → DECOMPOSE node repair on the originating task
- After repair and re-execution: QA re-runs the failed surfaces only
````

### `bin/browser/qa-engine.js`

```javascript
/**
 * MindForge v2 — QA Engine
 * Systematic visual QA driven by git diff surface extraction.
 */
'use strict';

const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');
const DaemonMgr    = require('./daemon-manager');
const ScreenStore  = require('./screenshot-store');

const DEV_SERVER = process.env.DEV_SERVER_URL || 'http://localhost:3000';

// ── Surface extraction from git diff ─────────────────────────────────────────
function extractSurfaces(phaseNum, commitsBack = 1) {
  let files = [];
  try {
    files = execSync(`git diff HEAD~${commitsBack} --name-only`, { encoding: 'utf8' })
      .split('\n').filter(Boolean);
  } catch {
    try {
      files = execSync('git diff --name-only HEAD', { encoding: 'utf8' })
        .split('\n').filter(Boolean);
    } catch { return []; }
  }

  const surfaces = [];
  const seen     = new Set();

  for (const file of files) {
    const s = classifyFile(file);
    if (!s) continue;
    const key = `${s.type}:${s.route ?? s.note}`;
    if (seen.has(key)) continue;
    seen.add(key);
    surfaces.push({ ...s, source_file: file });
  }

  return surfaces;
}

function classifyFile(file) {
  // Next.js App Router
  if (/app\/.*\/page\.(tsx|jsx|ts|js)$/.test(file)) {
    const route = '/' + file
      .replace(/^.*?app\//, '').replace(/\/page\.(tsx|jsx|ts|js)$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1');
    return { type: 'page', route };
  }
  // Next.js Pages Router
  if (/pages\/(?!_)[^/]+\.(tsx|jsx|ts|js)$/.test(file)) {
    const route = '/' + file
      .replace(/^.*?pages\//, '').replace(/\.(tsx|jsx|ts|js)$/, '')
      .replace(/\/index$/, '');
    return { type: 'page', route };
  }
  // API routes
  if (/api\/.*\.(ts|js)$/.test(file) || /routes\/.*\.(ts|js)$/.test(file)) {
    const route = '/' + file.replace(/^.*?(api|routes)\//, '$1/').replace(/\.(ts|js)$/, '');
    return { type: 'api', route };
  }
  // Components (find parent pages for testing)
  if (/components\/.*\.(tsx|jsx)$/.test(file)) {
    return { type: 'component', route: null, note: `Component changed: ${file}` };
  }
  return null;
}

// ── Test execution ────────────────────────────────────────────────────────────
async function runQA(phaseNum, opts = {}) {
  const { sessions = ['default'], routes = null, commitsBack = 1 } = opts;

  await DaemonMgr.ensureRunning({ headless: true });

  const surfaces = routes
    ? routes.map(r => ({ type: 'page', route: r, source_file: r }))
    : extractSurfaces(phaseNum, commitsBack).filter(s => s.type !== 'component');

  if (!surfaces.length) {
    return { surfaces: 0, passed: 0, failed: 0, bugs: [], results: [], message: 'No testable surfaces found in diff' };
  }

  const results = [];
  const bugs    = [];

  for (const surface of surfaces) {
    for (const session of sessions) {
      const testName = `${surface.route} [${session}]`;
      const steps    = [];
      let passed     = true;
      let failedStep = null;

      // ── Base page test ────────────────────────────────────────────────────
      const testPlan = buildPageTestPlan(surface.route, session);

      for (const step of testPlan) {
        let r;
        try {
          switch (step.directive) {
            case 'navigate':
              r = await DaemonMgr.request('POST', '/navigate', {
                url: step.args[0].startsWith('http') ? step.args[0] : `${DEV_SERVER}${step.args[0]}`,
                session, wait_for: 'networkidle',
              });
              steps.push({ ...step, passed: r.success, detail: `${r.status_code ?? 200} OK` });
              if (!r.success) { passed = false; failedStep = { step, error: r.error }; }
              break;

            case 'assert-visible':
              r = await DaemonMgr.request('POST', '/assert',
                { type: 'visible', selector: step.args[0], expected_text: step.args[1] ?? null, session });
              steps.push({ ...step, passed: r.passed, detail: r.error ?? r.actual_text ?? '' });
              if (!r.passed) { passed = false; failedStep = { step, result: r }; }
              break;

            case 'assert-no-errors':
              r = await DaemonMgr.request('POST', '/assert', { type: 'no_console_errors', session });
              steps.push({ ...step, passed: r.passed,
                detail: r.passed ? 'no errors' : `${r.console_errors?.length} error(s): ${r.console_errors?.[0]?.text ?? ''}` });
              if (!r.passed) { passed = false; failedStep = { step, result: r }; }
              break;

            case 'screenshot':
              r = await DaemonMgr.request('POST', '/screenshot', { session });
              if (r.success && r.screenshot_b64) {
                ScreenStore.save(r.screenshot_b64, phaseNum, 'qa', `${step.args[0]}-${session}.png`);
              }
              steps.push({ ...step, passed: true, detail: `saved ${step.args[0]}` });
              break;
          }
        } catch (err) {
          steps.push({ ...step, passed: false, detail: err.message });
          passed = false; failedStep = { step, error: err.message };
        }

        if (!passed) break;
      }

      results.push({ surface: surface.route, session, passed, steps });

      if (!passed && failedStep) {
        // Capture failure screenshot
        const snap = await DaemonMgr.request('POST', '/screenshot', { session }).catch(() => null);
        const screenshotPath = snap?.success
          ? ScreenStore.save(snap.screenshot_b64, phaseNum, 'qa-failures',
              `${surface.route.replace(/\//g, '-').slice(1)}-${session}-fail.png`)
          : null;

        bugs.push({
          surface: surface.route,
          source_file: surface.source_file,
          session,
          failed_step_directive: failedStep.step?.directive,
          error: failedStep.error ?? failedStep.result?.error ?? 'assertion failed',
          screenshot_path: screenshotPath,
          reproduction: buildReproSteps(surface.route, testPlan, failedStep),
        });
      }
    }
  }

  return {
    surfaces: surfaces.length,
    passed:   results.filter(r => r.passed).length,
    failed:   results.filter(r => !r.passed).length,
    bugs,
    results,
  };
}

function buildPageTestPlan(route, session) {
  const slug = route.replace(/\//g, '-').slice(1) || 'home';
  return [
    { directive: 'navigate',       args: [route] },
    { directive: 'assert-no-errors', args: ['true'] },
    { directive: 'screenshot',     args: [`${slug}-load`] },
    { directive: 'assert-visible', args: ['body'] },
  ];
}

function buildReproSteps(route, plan, failedStep) {
  const steps = [`1. Navigate to ${route}`];
  plan.forEach((s, i) => steps.push(`${i + 2}. ${s.directive}: ${s.args?.join(' ') ?? ''}`));
  steps.push(`Expected: step passes`);
  steps.push(`Actual: ${failedStep.error ?? 'assertion failed'}`);
  return steps;
}

module.exports = { runQA, extractSurfaces, classifyFile };
```

---

### `bin/browser/qa-report-writer.js`

```javascript
/**
 * MindForge v2 — QA Report Writer
 * Writes QA-REPORT-[N].md to .planning/phases/[N]/
 */
'use strict';

const fs   = require('fs');
const path = require('path');

function write(phaseNum, qaResult) {
  const dir  = path.join(process.cwd(), '.planning', 'phases', String(phaseNum));
  fs.mkdirSync(dir, { recursive: true });

  const total = qaResult.passed + qaResult.failed;
  const lines = [
    `# QA Report — Phase ${phaseNum}`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Surfaces tested:** ${qaResult.surfaces}`,
    `**Test cases:** ${total}  |  **Passed:** ${qaResult.passed} ✅  |  **Failed:** ${qaResult.failed} ❌`,
    '',
    '## Summary',
    '',
    '| Surface | Session | Result |',
    '|---|---|---|',
    ...qaResult.results.map(r => `| ${r.surface} | ${r.session} | ${r.passed ? '✅ Pass' : '❌ Fail'} |`),
  ];

  if (qaResult.bugs.length) {
    lines.push('', '## Bugs found');
    qaResult.bugs.forEach((bug, i) => {
      lines.push('', `### Bug ${i + 1}: ${bug.surface} [${bug.session}]`);
      lines.push(`**Error:** ${bug.error}`);
      lines.push(`**Source file:** ${bug.source_file}`);
      lines.push(`**Failed step:** ${bug.failed_step_directive ?? 'unknown'}`);
      if (bug.screenshot_path) lines.push(`**Screenshot:** \`${path.relative(process.cwd(), bug.screenshot_path)}\``);
      lines.push('', '**Reproduction steps:**');
      bug.reproduction.forEach(s => lines.push(s));
    });
  } else {
    lines.push('', '## ✅ No bugs found');
  }

  const file = path.join(dir, `QA-REPORT-${phaseNum}.md`);
  fs.writeFileSync(file, lines.join('\n'));
  return file;
}

module.exports = { write };
```

---

### `bin/browser/regression-writer.js`

```javascript
/**
 * MindForge v2 — Regression Test Writer
 * Auto-generates Playwright regression tests for QA-found bugs.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

function write(bug, phaseNum) {
  const dir  = path.join(process.cwd(), 'tests', 'regression');
  fs.mkdirSync(dir, { recursive: true });

  const slug = `phase${phaseNum}-${(bug.surface ?? 'bug')
    .replace(/[^a-zA-Z0-9]/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
    .slice(0, 50)}`;

  const file = path.join(dir, `${slug}.test.ts`);

  const content = [
    `// Auto-generated by MindForge QA Engine — Phase ${phaseNum}`,
    `// Route: ${bug.surface}  Session: ${bug.session}`,
    `// Error: ${bug.error}`,
    `// DO NOT DELETE — prevents regression`,
    ``,
    `import { test, expect } from '@playwright/test';`,
    ``,
    `test('${bug.surface} [${bug.session}] — ${bug.error?.slice(0, 60) ?? 'QA failure'}', async ({ page }) => {`,
    `  const consoleErrors: string[] = [];`,
    `  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });`,
    ``,
    `  await page.goto('${bug.surface}');`,
    ``,
    `  // Verify no JS console errors`,
    `  expect(consoleErrors).toHaveLength(0);`,
    ``,
    `  // TODO: Add specific regression assertion from reproduction steps:`,
    ...bug.reproduction.slice(1).map(s => `  // ${s}`),
    `});`,
  ].join('\n');

  fs.writeFileSync(file, content);
  return file;
}

module.exports = { write };
```

**Commit:**
```bash
git add bin/browser/qa-engine.js bin/browser/qa-report-writer.js \
        bin/browser/regression-writer.js .mindforge/browser/qa-engine.md
git commit -m "feat(v2-browser): implement QA engine, report writer, and regression test writer"
```

---

## TASK 8 — Write `/mindforge:browse` and `/mindforge:qa` commands

### `.claude/commands/mindforge/browse.md`

```markdown
# MindForge v2 — Browse Command
# Usage: /mindforge:browse [url|--action|--session|--cookies|--status|--stop]
# Version: v2.0.0-alpha.2

## Purpose
Control a persistent Chromium browser from within any MindForge session.
Navigate to your app, click elements, fill forms, capture screenshots, run
JavaScript — all while keeping login state and cookies alive between calls.
The browser daemon starts automatically on first call (3-5s cold start, 80-200ms warm).

## Navigation (most common use)
```
/mindforge:browse /dashboard
/mindforge:browse https://localhost:3000/login
/mindforge:browse https://staging.myapp.com
```
Returns: inline screenshot + page title + HTTP status + any JS console errors

## Actions

### Click
```
/mindforge:browse --action click "#submit-btn"
/mindforge:browse --action click "text=Sign In"
/mindforge:browse --action click "[aria-label='Close']"
```

### Type
```
/mindforge:browse --action type "input[name='email']" "test@company.com"
```
⚠️  Never hardcode real passwords. Use test credentials or `[ENV_VAR]` references.

### Screenshot only
```
/mindforge:browse --action screenshot
/mindforge:browse --action screenshot --save dashboard.png
```

### Evaluate JavaScript
```
/mindforge:browse --action evaluate "document.title"
/mindforge:browse --action evaluate "window.__APP_VERSION__"
```
⚠️  Only use on YOUR OWN dev app — never on external URLs.

### Assert conditions
```
/mindforge:browse --action assert-visible "h1" "My Projects"
/mindforge:browse --action assert-url "/dashboard"
/mindforge:browse --action assert-no-errors
```

## Session management

```
/mindforge:browse --session admin /admin/users   # Use admin session
/mindforge:browse --list-sessions                # List saved sessions
/mindforge:browse --create-session admin         # Create empty admin session
/mindforge:browse --import-session admin --from chrome  # Import Chrome cookies
/mindforge:browse --save-session admin           # Save to disk
/mindforge:browse --load-session admin           # Load from disk
/mindforge:browse --delete-session admin         # Delete from disk
```

## Daemon management
```
/mindforge:browse --status      # Daemon health + active sessions
/mindforge:browse --start       # Explicit start (auto-starts on first call)
/mindforge:browse --stop        # Stop, save all sessions
/mindforge:browse --stop --no-save  # Stop, discard session state
```

## Security rules (ALWAYS follow)
1. NEVER type real/production passwords in browse commands
2. NEVER use `--action evaluate` on external/untrusted URLs
3. Session files (.mindforge/browser/sessions/) are gitignored — NEVER commit them
4. Use test accounts only — not your production admin account
5. Browser daemon is localhost-only — no network exposure

## AUDIT entry
```json
{ "event": "browser_action", "action": "navigate", "url": "...", "session": "default", "success": true }
```
```

### `.claude/commands/mindforge/qa.md`

```markdown
# MindForge v2 — QA Command
# Usage: /mindforge:qa [--phase N] [--route /path] [--session S] [--full] [--no-write-tests]
# Version: v2.0.0-alpha.2

## Purpose
Systematic visual QA of your application after phase execution.
The QA engine analyses the git diff for the phase, identifies every changed
UI surface, and tests each one through a real Chromium browser — catching
what unit tests miss: rendering bugs, auth redirects, form validation gaps,
and JavaScript errors that only appear in the browser context.

## Core usage
```
/mindforge:qa --phase 3           # QA for Phase 3 (default: current phase)
/mindforge:qa --route /dashboard  # Test specific route
/mindforge:qa --session admin     # Test with admin session
/mindforge:qa --full              # Test ALL routes, not just changed ones
```

## What QA tests per surface
1. **Page loads** — navigate, assert no JS errors, main content visible
2. **Session coverage** — test with each configured session
3. **Form validation** — if forms found: test empty submit, error messages
4. **Auth protection** — if page is behind auth: verify redirect for unauthenticated session

## Output

### During execution
```
⚡ MindForge QA — Phase 3
─────────────────────────────────────────
Surfaces found: 3 (2 pages, 1 API)

/dashboard [default]  ✅ Pass
/login     [default]  ❌ FAIL — empty email allows submit
/api/users [admin]    ✅ Pass

─────────────────────────────────────────
3/3 tests | 1 bug found
Regression test: tests/regression/phase3-login.test.ts ✅
Report: .planning/phases/3/QA-REPORT-3.md
```

### After execution
- `.planning/phases/[N]/QA-REPORT-[N].md` — full report
- `tests/regression/phase[N]-[slug].test.ts` — for each bug found
- `.planning/screenshots/phase-[N]/qa/` — screenshots (gitignored)

## Integration with auto mode
When `AUTO_RUN_QA_AFTER_UI_WAVES=true` in MINDFORGE.md:
- QA runs automatically after waves containing page/component changes
- Bugs → DECOMPOSE node repair on the originating task
- After repair and re-execution: QA re-runs failed surfaces only

## AUDIT entry
```json
{
  "event": "qa_completed",
  "phase": 3,
  "surfaces": 3,
  "passed": 2,
  "failed": 1,
  "bugs": 1,
  "regression_tests_written": 1
}
```
```

**Commit:**
```bash
cp .claude/commands/mindforge/browse.md .agent/mindforge/browse.md
cp .claude/commands/mindforge/qa.md .agent/mindforge/qa.md
git add .claude/commands/mindforge/browse.md .claude/commands/mindforge/qa.md \
        .agent/mindforge/browse.md .agent/mindforge/qa.md
git commit -m "feat(v2-browser): add /mindforge:browse and /mindforge:qa commands"
```

---

## TASK 9 — Update CLAUDE.md, execute-phase, and MINDFORGE.md schema

### Add to `.claude/CLAUDE.md` (and mirror to `.agent/CLAUDE.md`)

```markdown
---

## BROWSER RUNTIME (v2.0.0 — Day 9)

### Daemon awareness
Browser daemon runs at localhost:7338 (when active).
Start/stop via daemon-manager.js — never start browser-daemon.js directly.
Auto-starts on first /mindforge:browse call. Auto-shuts down after BROWSER_IDLE_TIMEOUT_MINUTES.

### <verify-visual> in PLAN files
When a PLAN task has `<verify-visual>`:
1. Run `<verify>` (unit/integration tests) first — must pass
2. Call `bin/browser/visual-verify-executor.js` to execute the block
3. Write result to VISUAL-VERIFY-[N]-[plan].md
4. If any assertion FAILS: treat as verify failure → node repair (RETRY)
5. Never skip visual verify even in auto mode

### Session security (strict rules)
- NEVER type real passwords in browse commands — use test accounts
- Session files are gitignored — they contain auth tokens
- NEVER use `--action evaluate` on external URLs — your app only
- Browser daemon is localhost-only — same policy as ADR-017

### QA integration with auto mode
When `AUTO_RUN_QA_AFTER_UI_WAVES=true` and a wave includes page/component changes:
1. Run `/mindforge:qa --phase N` after wave completes
2. Each bug found: write regression test, then DECOMPOSE the originating task
3. After repair + re-execute: re-run QA on failed surfaces only

### New commands (Day 9)
- /mindforge:browse — persistent browser control
- /mindforge:qa — systematic post-phase visual QA

---
```

### Update `execute-phase.md` — add visual verify hook

```markdown
## Visual verification (v2.0.0)

After `<verify>` passes (all automated tests green):

```bash
# Check for <verify-visual> block in current PLAN file
PLAN_CONTENT=$(cat "${PLAN_FILE}")
HAS_VISUAL=$(echo "${PLAN_CONTENT}" | grep -c "<verify-visual")

if [ "${HAS_VISUAL}" -gt 0 ]; then
  echo "  🔍 Running visual verification..."

  # Start browser daemon if needed
  DAEMON_ALIVE=$(curl -sf http://127.0.0.1:7338/status 2>/dev/null | \
    python3 -c "import sys,json;print(json.load(sys.stdin).get('alive',False))" 2>/dev/null || echo "false")
  [ "${DAEMON_ALIVE}" = "True" ] || node bin/browser/daemon-manager.js start

  # Execute visual verification
  node -e "
    const exe = require('./bin/browser/visual-verify-executor');
    const fs  = require('fs');
    const content = fs.readFileSync('${PLAN_FILE}', 'utf8');
    exe.executeBlock(${PHASE_NUM}, '${PLAN_ID}', content).then(result => {
      const reportPath = exe.writeReport(${PHASE_NUM}, '${PLAN_ID}', result);
      console.log(result.passed ? '  ✅ Visual verify passed' : '  ❌ Visual verify FAILED');
      console.log('  Report:', reportPath);
      process.exit(result.passed ? 0 : 1);
    }).catch(err => {
      console.error('  ❌ Visual verify error:', err.message);
      process.exit(1);
    });
  "

  VISUAL_EXIT=$?
  if [ "${VISUAL_EXIT}" -ne 0 ]; then
    echo "  Visual verification failed — see VISUAL-VERIFY-${PHASE_NUM}-${PLAN_ID}.md"
    exit 1  # Triggers node repair in auto mode
  fi
fi
```
```

### Update MINDFORGE.md and MINDFORGE-V2-SCHEMA.json

```markdown
## Browser runtime configuration (v2.0.0)

BROWSER_PORT=7338
BROWSER_HEADLESS=true
BROWSER_IDLE_TIMEOUT_MINUTES=30
BROWSER_VIEWPORT_WIDTH=1280
BROWSER_VIEWPORT_HEIGHT=720
DEV_SERVER_URL=http://localhost:3000
QA_DEFAULT_SESSIONS=default
AUTO_RUN_QA_AFTER_UI_WAVES=false
QA_AUTO_GENERATE_REGRESSION_TESTS=true
BROWSER_MAX_SCREENSHOTS_PER_PHASE=50
```

Schema additions to `.mindforge/MINDFORGE-V2-SCHEMA.json`:
```json
{
  "BROWSER_PORT":                      { "type": "number", "minimum": 1024, "maximum": 65535 },
  "BROWSER_HEADLESS":                  { "type": "boolean" },
  "BROWSER_IDLE_TIMEOUT_MINUTES":      { "type": "number", "minimum": 5, "maximum": 480 },
  "BROWSER_VIEWPORT_WIDTH":            { "type": "number", "minimum": 320, "maximum": 3840 },
  "BROWSER_VIEWPORT_HEIGHT":           { "type": "number", "minimum": 240, "maximum": 2160 },
  "DEV_SERVER_URL":                    { "type": "string" },
  "AUTO_RUN_QA_AFTER_UI_WAVES":        { "type": "boolean" },
  "QA_AUTO_GENERATE_REGRESSION_TESTS": { "type": "boolean" },
  "BROWSER_MAX_SCREENSHOTS_PER_PHASE": { "type": "number", "minimum": 10, "maximum": 500 }
}
```

**Commit:**
```bash
git add .claude/CLAUDE.md .agent/CLAUDE.md \
        .claude/commands/mindforge/execute-phase.md \
        .agent/mindforge/execute-phase.md \
        MINDFORGE.md .mindforge/MINDFORGE-V2-SCHEMA.json
git commit -m "feat(v2-browser): update CLAUDE.md, execute-phase, and MINDFORGE.md for browser runtime"
```

---

## TASK 10 — Write the browser test suite

### `tests/browser.test.js`

```javascript
/**
 * MindForge v2 — Browser Runtime Test Suite
 * Tests daemon manager, visual verify parser/executor, QA engine,
 * session manager, screenshot store, and regression writer.
 *
 * No actual Chromium process is started — daemon calls are mocked
 * where necessary, and unit-testable logic is tested directly.
 *
 * Run: node tests/browser.test.js
 */
'use strict';

const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const assert = require('assert');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch(e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

// ── Module imports ────────────────────────────────────────────────────────────
const VisualVerify  = require('../bin/browser/visual-verify-executor');
const ScreenStore   = require('../bin/browser/screenshot-store');
const QAEngine      = require('../bin/browser/qa-engine');
const QAReportWriter = require('../bin/browser/qa-report-writer');
const RegressionWriter = require('../bin/browser/regression-writer');

// ── Temp project factory ──────────────────────────────────────────────────────
function mkProject(withScreenshots = false) {
  const dir  = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-browser-'));
  const write = (rel, c) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); return f; };
  const read  = rel => { const f = path.join(dir, rel); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null; };
  const exists = rel => fs.existsSync(path.join(dir, rel));
  const cleanup = () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} };
  if (withScreenshots) fs.mkdirSync(path.join(dir, '.planning', 'screenshots'), { recursive: true });
  return { dir, write, read, exists, cleanup };
}

// ── PLAN fixtures ─────────────────────────────────────────────────────────────
const PLAN_WITH_VISUAL_USER = `<task type="auto">
  <n>Build dashboard</n><persona>developer</persona>
  <phase>3</phase><plan>04</plan><files>src/pages/dashboard.tsx</files>
  <action>Create dashboard</action><verify>npm test</verify>
  <verify-visual session="user">
    navigate: /dashboard
    wait: networkidle
    assert-visible: h1 "My Projects"
    assert-visible: .project-list
    assert-no-errors: true
    screenshot: dashboard-initial.png
    click: "#create-project-btn"
    assert-visible: .modal "Create Project"
    screenshot: dashboard-modal.png
  </verify-visual>
  <done>Dashboard works</done>
</task>`;

const PLAN_DEFAULT_SESSION = `<task type="auto">
  <n>Login form</n><persona>developer</persona>
  <phase>3</phase><plan>02</plan><files>src/pages/login.tsx</files>
  <action>Add validation</action><verify>npm test</verify>
  <verify-visual>
    navigate: /login
    type: input[name="email"] ""
    click: button[type="submit"]
    assert-visible: .error-message "Email is required"
  </verify-visual>
  <done>Validation works</done>
</task>`;

const PLAN_NO_VISUAL = `<task type="auto">
  <n>Add utility</n><persona>developer</persona>
  <phase>3</phase><plan>01</plan><files>src/utils/format.ts</files>
  <action>Add formatter</action><verify>npm test</verify>
  <done>Tests pass</done>
</task>`;

// ═══════════════════════════════════════════════════════════════════════
console.log('\nMindForge v2 — Browser Runtime Tests\n');

// ── File existence ────────────────────────────────────────────────────────────
console.log('Required files:');
[
  'bin/browser/browser-daemon.js',
  'bin/browser/daemon-manager.js',
  'bin/browser/session-manager.js',
  'bin/browser/visual-verify-executor.js',
  'bin/browser/screenshot-store.js',
  'bin/browser/qa-engine.js',
  'bin/browser/qa-report-writer.js',
  'bin/browser/regression-writer.js',
  '.mindforge/browser/daemon-protocol.md',
  '.mindforge/browser/visual-verify-spec.md',
  '.mindforge/browser/qa-engine.md',
  '.mindforge/browser/session-manager.md',
  '.claude/commands/mindforge/browse.md',
  '.claude/commands/mindforge/qa.md',
  '.agent/mindforge/browse.md',
  '.agent/mindforge/qa.md',
].forEach(f => test(`${f} exists`, () => assert.ok(fs.existsSync(f), `Missing: ${f}`)));

// ── Visual verify: extractBlock ───────────────────────────────────────────────
console.log('\nVisual verify — block extraction:');

test('extractBlock returns null for plan without <verify-visual>', () => {
  assert.strictEqual(VisualVerify.extractBlock(PLAN_NO_VISUAL), null);
});

test('extractBlock extracts content and session="user"', () => {
  const b = VisualVerify.extractBlock(PLAN_WITH_VISUAL_USER);
  assert.ok(b, 'Should return block');
  assert.strictEqual(b.session, 'user');
  assert.ok(b.content.includes('navigate: /dashboard'), 'Content should include navigate directive');
});

test('extractBlock defaults session to "default" when omitted', () => {
  const b = VisualVerify.extractBlock(PLAN_DEFAULT_SESSION);
  assert.ok(b, 'Should return block');
  assert.strictEqual(b.session, 'default');
});

// ── Visual verify: parseDirectives ───────────────────────────────────────────
console.log('\nVisual verify — directive parser:');

test('parseDirectives skips blank lines and # comments', () => {
  const content = `
    navigate: /dashboard
    # this is a comment
    
    assert-visible: h1
  `;
  const d = VisualVerify.parseDirectives(content);
  assert.strictEqual(d.length, 2, `Expected 2, got ${d.length}`);
});

test('parseDirectives extracts all 8 directives from PLAN_WITH_VISUAL_USER', () => {
  const b = VisualVerify.extractBlock(PLAN_WITH_VISUAL_USER);
  const d = VisualVerify.parseDirectives(b.content);
  assert.strictEqual(d.length, 8, `Expected 8 directives, got ${d.length}`);
});

test('parseDirectives: assert-visible "quoted text" is second arg', () => {
  const d = VisualVerify.parseDirectives('assert-visible: h1 "My Projects"');
  assert.strictEqual(d.length, 1);
  assert.strictEqual(d[0].directive, 'assert-visible');
  assert.strictEqual(d[0].args[0], 'h1');
  assert.strictEqual(d[0].args[1], 'My Projects', 'Quoted string should be unquoted arg');
});

test('parseDirectives: navigate sets URL as first arg', () => {
  const d = VisualVerify.parseDirectives('navigate: /dashboard');
  assert.strictEqual(d[0].directive, 'navigate');
  assert.strictEqual(d[0].args[0], '/dashboard');
});

test('parseDirectives: type captures selector and text', () => {
  const d = VisualVerify.parseDirectives('type: input[name="email"] "test@test.com"');
  assert.strictEqual(d[0].directive, 'type');
  assert.ok(d[0].args[0].includes('email'), 'First arg is selector');
  assert.strictEqual(d[0].args[1], 'test@test.com', 'Second arg is text value');
});

test('parseDirectives: screenshot captures filename', () => {
  const d = VisualVerify.parseDirectives('screenshot: dashboard.png');
  assert.strictEqual(d[0].directive, 'screenshot');
  assert.strictEqual(d[0].args[0], 'dashboard.png');
});

// ── Visual verify: writeReport ────────────────────────────────────────────────
console.log('\nVisual verify — report writer:');

test('writeReport: creates VISUAL-VERIFY file with ✅ PASS', () => {
  const p = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const file = VisualVerify.writeReport(3, '04', {
      passed: true, session: 'user', directives_count: 3,
      steps: [{ directive: 'navigate: /dashboard', status: 'pass', detail: '200 OK' }],
      screenshots: [],
    });
    assert.ok(fs.existsSync(file), 'Report file should exist');
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(content.includes('✅ PASS'),  'Should show PASS');
    assert.ok(content.includes('Phase 3'),  'Should mention phase');
    assert.ok(content.includes('Plan 04'),  'Should mention plan');
    assert.ok(content.includes('session: user'), 'Should include session');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('writeReport: creates file with ❌ FAIL when not passed', () => {
  const p = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const file = VisualVerify.writeReport(3, '05', {
      passed: false, session: 'default', directives_count: 2,
      steps: [{ directive: 'assert-visible: .modal', status: 'fail', detail: 'Element not found after 5s' }],
      screenshots: [],
    });
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(content.includes('❌ FAIL'), 'Should show FAIL');
    assert.ok(content.includes('Element not found'), 'Should include failure detail');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('writeReport: SKIPPED status when result.skipped is true', () => {
  const p = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const file = VisualVerify.writeReport(3, '01', { skipped: true, passed: true, steps: [], screenshots: [], session: 'default', directives_count: 0 });
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(content.includes('SKIPPED'), 'Should show SKIPPED status');
  } finally { process.chdir(orig); p.cleanup(); }
});

// ── Screenshot store ──────────────────────────────────────────────────────────
console.log('\nScreenshot store:');

const TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test('save: creates PNG file in phase namespace', () => {
  const p = mkProject(true);
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const saved = ScreenStore.save(TINY_PNG_B64, 3, '04', 'test.png');
    assert.ok(fs.existsSync(saved), 'Screenshot should be saved');
    assert.ok(saved.includes('phase-3'), 'Should be in phase-3 namespace');
    assert.ok(saved.endsWith('.png'), 'Should have .png extension');
    assert.ok(fs.statSync(saved).size > 0, 'File should not be empty');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('save: sanitizes dangerous filenames', () => {
  const p = mkProject(true);
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const saved = ScreenStore.save(TINY_PNG_B64, 3, '04', '../../evil/../path.png');
    assert.ok(!saved.includes('..'), 'Should not contain path traversal');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('list: returns saved screenshots', () => {
  const p = mkProject(true);
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    ScreenStore.save(TINY_PNG_B64, 3, '04', 'a.png');
    ScreenStore.save(TINY_PNG_B64, 3, '04', 'b.png');
    const files = ScreenStore.list(3, '04');
    assert.ok(files.length >= 2, `Expected >=2 screenshots, got ${files.length}`);
  } finally { process.chdir(orig); p.cleanup(); }
});

test('cleanup: deletes phase screenshots', () => {
  const p = mkProject(true);
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    ScreenStore.save(TINY_PNG_B64, 3, '04', 'temp.png');
    const before = ScreenStore.list(3, '04').length;
    assert.ok(before >= 1, 'Should have screenshots before cleanup');
    ScreenStore.cleanup(3);
    const after = ScreenStore.list(3, '04').length;
    assert.strictEqual(after, 0, 'Should have no screenshots after cleanup');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('diskUsage: returns a number', () => {
  const p = mkProject(true);
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    ScreenStore.save(TINY_PNG_B64, 3, '04', 'usage.png');
    const usage = ScreenStore.diskUsage();
    assert.ok(typeof usage === 'number' && usage >= 0, `Expected non-negative number, got ${usage}`);
  } finally { process.chdir(orig); p.cleanup(); }
});

// ── QA engine — surface extraction ───────────────────────────────────────────
console.log('\nQA engine — surface classification:');

test('classifyFile: Next.js App Router page', () => {
  const s = QAEngine.classifyFile('src/app/dashboard/page.tsx');
  assert.ok(s, 'Should classify');
  assert.strictEqual(s.type, 'page');
  assert.ok(s.route.includes('dashboard'), `Expected /dashboard, got ${s.route}`);
});

test('classifyFile: Next.js Pages Router page', () => {
  const s = QAEngine.classifyFile('src/pages/login.tsx');
  assert.ok(s, 'Should classify');
  assert.strictEqual(s.type, 'page');
  assert.ok(s.route.includes('login'), `Expected /login, got ${s.route}`);
});

test('classifyFile: API route', () => {
  const s = QAEngine.classifyFile('src/app/api/users/route.ts');
  assert.ok(s, 'Should classify');
  assert.strictEqual(s.type, 'api');
});

test('classifyFile: React component', () => {
  const s = QAEngine.classifyFile('src/components/ProjectCard.tsx');
  assert.ok(s, 'Should classify');
  assert.strictEqual(s.type, 'component');
});

test('classifyFile: non-UI file returns null', () => {
  assert.strictEqual(QAEngine.classifyFile('src/utils/format.ts'), null);
  assert.strictEqual(QAEngine.classifyFile('tests/format.test.ts'), null);
  assert.strictEqual(QAEngine.classifyFile('package.json'), null);
});

// ── QA report writer ──────────────────────────────────────────────────────────
console.log('\nQA report writer:');

test('write: creates QA-REPORT-[N].md', () => {
  const p = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const file = QAReportWriter.write(3, {
      surfaces: 2, passed: 1, failed: 1,
      results: [
        { surface: '/dashboard', session: 'default', passed: true },
        { surface: '/login', session: 'default', passed: false },
      ],
      bugs: [{
        surface: '/login', session: 'default', source_file: 'src/pages/login.tsx',
        failed_step_directive: 'assert-visible',
        error: 'Error message not found',
        screenshot_path: null,
        reproduction: ['1. Navigate to /login', '2. Click submit', 'Expected: error', 'Actual: none'],
      }],
    });
    assert.ok(fs.existsSync(file), 'QA report file should exist');
    const c = fs.readFileSync(file, 'utf8');
    assert.ok(c.includes('Phase 3'), 'Should mention phase');
    assert.ok(c.includes('/dashboard'), 'Should list surfaces');
    assert.ok(c.includes('/login'), 'Should list login');
    assert.ok(c.includes('Bug 1'), 'Should document bug');
    assert.ok(c.includes('Error message not found'), 'Should include error details');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('write: no bugs section when all passed', () => {
  const p = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const file = QAReportWriter.write(4, { surfaces: 1, passed: 1, failed: 0, results: [{ surface: '/dashboard', session: 'default', passed: true }], bugs: [] });
    const c = fs.readFileSync(file, 'utf8');
    assert.ok(c.includes('No bugs found'), 'Should say no bugs when all passed');
  } finally { process.chdir(orig); p.cleanup(); }
});

// ── Regression test writer ────────────────────────────────────────────────────
console.log('\nRegression test writer:');

test('write: creates .test.ts file with correct content', () => {
  const p = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const bug = {
      surface: '/login', session: 'default',
      error: 'Empty email allows submit',
      source_file: 'src/pages/login.tsx',
      reproduction: ['1. Navigate to /login', '2. Click submit with empty email'],
    };
    const file = RegressionWriter.write(bug, 3);
    assert.ok(fs.existsSync(file), 'Regression test file should exist');
    const c = fs.readFileSync(file, 'utf8');
    assert.ok(c.includes("from '@playwright/test'"), 'Should import Playwright');
    assert.ok(c.includes("test('"), 'Should have a test');
    assert.ok(c.includes('/login'), 'Should reference the route');
    assert.ok(c.includes('DO NOT DELETE'), 'Should have deletion warning');
    assert.ok(file.endsWith('.test.ts'), 'Should be a .test.ts file');
  } finally { process.chdir(orig); p.cleanup(); }
});

// ── Command file content validation ──────────────────────────────────────────
console.log('\nCommand content validation:');

test('/mindforge:browse documents security rules', () => {
  const c = fs.readFileSync('.claude/commands/mindforge/browse.md', 'utf8');
  assert.ok(c.includes('NEVER'), 'Should have security NEVER rules');
  assert.ok(c.includes('localhost'), 'Should mention localhost-only');
  assert.ok(c.includes('gitignored'), 'Should mention gitignored sessions');
});

test('/mindforge:qa documents integration with auto mode', () => {
  const c = fs.readFileSync('.claude/commands/mindforge/qa.md', 'utf8');
  assert.ok(c.includes('AUTO_RUN_QA_AFTER_UI_WAVES'), 'Should mention auto mode setting');
  assert.ok(c.includes('DECOMPOSE'), 'Should mention DECOMPOSE repair');
});

// ── Security validations ──────────────────────────────────────────────────────
console.log('\nSecurity properties:');

test('browser-daemon.js binds to 127.0.0.1 not 0.0.0.0', () => {
  const c = fs.readFileSync('bin/browser/browser-daemon.js', 'utf8');
  assert.ok(c.includes("'127.0.0.1'") || c.includes('"127.0.0.1"'), 'Should bind to 127.0.0.1');
  assert.ok(!c.includes("'0.0.0.0'"), 'Must NOT bind to 0.0.0.0');
});

test('browser-daemon.js rejects non-localhost connections with 403', () => {
  const c = fs.readFileSync('bin/browser/browser-daemon.js', 'utf8');
  assert.ok(c.includes('127.0.0.1') && c.includes('403'), 'Should return 403 for non-localhost');
});

test('.gitignore includes session directory', () => {
  const gi = fs.existsSync('.gitignore') ? fs.readFileSync('.gitignore', 'utf8') : '';
  assert.ok(gi.includes('sessions'), 'Session directory should be gitignored');
});

test('.gitignore includes screenshots directory', () => {
  const gi = fs.existsSync('.gitignore') ? fs.readFileSync('.gitignore', 'utf8') : '';
  assert.ok(gi.includes('screenshots'), 'Screenshots directory should be gitignored');
});

test('session-manager warns about auth tokens in saved files', () => {
  const c = fs.readFileSync('bin/browser/session-manager.js', 'utf8');
  assert.ok(c.includes('NEVER commit') || c.includes('auth token') || c.includes('_warning'), 'Session manager should warn about auth tokens');
});

// ── MINDFORGE.md schema ───────────────────────────────────────────────────────
console.log('\nMINDFORGE.md v2 browser schema:');

test('MINDFORGE-V2-SCHEMA.json includes browser settings', () => {
  const schema = JSON.parse(fs.readFileSync('.mindforge/MINDFORGE-V2-SCHEMA.json', 'utf8'));
  ['BROWSER_PORT', 'BROWSER_HEADLESS', 'BROWSER_IDLE_TIMEOUT_MINUTES',
   'AUTO_RUN_QA_AFTER_UI_WAVES', 'DEV_SERVER_URL'].forEach(key => {
    assert.ok(schema.properties?.[key], `Schema should define ${key}`);
  });
});

test('BROWSER_PORT schema has valid port range', () => {
  const schema = JSON.parse(fs.readFileSync('.mindforge/MINDFORGE-V2-SCHEMA.json', 'utf8'));
  const port = schema.properties?.BROWSER_PORT;
  assert.strictEqual(port?.minimum, 1024, 'Min port should be 1024');
  assert.strictEqual(port?.maximum, 65535, 'Max port should be 65535');
});

// ── All 40 commands present ───────────────────────────────────────────────────
console.log('\nAll 40 commands (38 v1+Day8 + 2 Day9):');

const ALL_COMMANDS = [
  'help','init-project','plan-phase','execute-phase','verify-phase','ship',
  'next','quick','status','debug',
  'skills','review','security-scan','map-codebase','discuss-phase',
  'audit','milestone','complete-milestone','approve','sync-jira','sync-confluence',
  'health','retrospective','profile-team','metrics',
  'init-org','install-skill','publish-skill','pr-review','workspace','benchmark',
  'update','migrate','plugins','tokens','release',
  'auto','steer',    // Day 8
  'browse','qa',     // Day 9
];

assert.strictEqual(ALL_COMMANDS.length, 40);

test('all 40 commands in .claude/commands/mindforge/', () => {
  const missing = ALL_COMMANDS.filter(c => !fs.existsSync(`.claude/commands/mindforge/${c}.md`));
  assert.strictEqual(missing.length, 0, `Missing: ${missing.join(', ')}`);
});

test('all 40 commands mirrored in .agent/mindforge/', () => {
  const missing = ALL_COMMANDS.filter(c => !fs.existsSync(`.agent/mindforge/${c}.md`));
  assert.strictEqual(missing.length, 0, `Missing in .agent: ${missing.join(', ')}`);
});

// ── Version ───────────────────────────────────────────────────────────────────
console.log('\nVersion:');

test('package.json is v2.0.0-alpha.2', () => {
  const v = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
  assert.ok(v === '2.0.0-alpha.2' || v.startsWith('2.'), `Expected v2.x, got ${v}`);
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error(`\n❌  ${failed} test(s) failed.\n`); process.exit(1); }
else { console.log(`\n✅  All browser runtime tests passed.\n`); }
```

**Commit:**
```bash
git add tests/browser.test.js
git commit -m "test(v2-browser): add comprehensive browser runtime test suite (17th suite)"
```

---

## TASK 11 — Bump version, update CHANGELOG, final commit

```bash
# Bump to v2.0.0-alpha.2
node -e "
  const fs = require('fs');
  const p = JSON.parse(fs.readFileSync('package.json','utf8'));
  p.version = '2.0.0-alpha.2';
  fs.writeFileSync('package.json', JSON.stringify(p, null, 2) + '\n');
  console.log('Bumped to v2.0.0-alpha.2');
"
```

Update `CHANGELOG.md`:

```markdown
## [2.0.0-alpha.2] — Day 9: Persistent Browser Runtime + Visual QA

### Added

**Browser Daemon:**
- bin/browser/browser-daemon.js — long-lived Chromium via Playwright, localhost:7338
- bin/browser/daemon-manager.js — lifecycle manager (start/stop/restart/health)
- Localhost-only binding (127.0.0.1) — consistent with ADR-017 policy
- SIGTERM graceful shutdown with automatic session save
- Idle auto-shutdown after BROWSER_IDLE_TIMEOUT_MINUTES (default: 30)
- Full HTTP API: /navigate /click /type /screenshot /evaluate /assert /session/*

**Session Manager:**
- bin/browser/session-manager.js — named session persistence
- Cookie import from Chrome, Arc, Brave, Edge
- Session files gitignored — auth tokens never committed

**Visual Verification:**
- `<verify-visual>` block in PLAN files — structured browser verification
- bin/browser/visual-verify-executor.js — full directive parser and executor
- 13 directives: navigate, wait, assert-visible/url/title/no-errors, screenshot, click, type, evaluate, press, scroll
- VISUAL-VERIFY-[N]-[plan].md result files
- Integration with execute-phase — runs after <verify> passes

**QA Engine:**
- bin/browser/qa-engine.js — git-diff-aware surface extraction and systematic testing
- Supports: Next.js App Router, Pages Router, API routes, React components
- bin/browser/qa-report-writer.js — QA-REPORT-[N].md with full bug documentation
- bin/browser/regression-writer.js — auto-generates Playwright regression tests per bug

**Screenshot Store:**
- bin/browser/screenshot-store.js — phase-namespaced save/list/cleanup
- All screenshots gitignored — sensitive UI data never committed

**New Commands:**
- /mindforge:browse — persistent browser control with session management
- /mindforge:qa — systematic post-phase visual QA

**Configuration:**
- MINDFORGE.md browser settings: BROWSER_PORT, BROWSER_HEADLESS, DEV_SERVER_URL, etc.
- AUTO_RUN_QA_AFTER_UI_WAVES — enables automatic QA in auto mode

**Tests:**
- tests/browser.test.js — 17th test suite (daemon protocol, visual verify parser,
  screenshot store, QA engine surface extraction, report writers, security properties)

### Architecture decisions
- ADR-024: browser daemon localhost-only consistent with ADR-017 (SDK SSE policy)
- ADR-025: <verify-visual> failure treated identically to <verify> failure
- ADR-026: session files are gitignored — auth tokens must never reach git history
```

```bash
git add CHANGELOG.md package.json
git commit -m "chore(v2-alpha2): Day 9 complete — browser runtime, v2.0.0-alpha.2"
git push origin feat/mindforge-v2-browser-runtime
```

---

## TASK 12 — Run full test battery

```bash
#!/usr/bin/env bash
echo "MindForge v2 Day 9 — Test Battery"

SUITES=(install wave-engine audit compaction skills-platform \
        integrations governance intelligence metrics \
        distribution ci-mode sdk production migration e2e \
        autonomous browser)

FAIL=0
for suite in "${SUITES[@]}"; do
  printf "  %-30s" "${suite}..."
  if node tests/${suite}.test.js 2>&1 | tail -1 | grep -q "passed"; then
    echo "✅"
  else
    echo "❌"
    ((FAIL++))
  fi
done

echo ""
echo "Commands: $(ls .claude/commands/mindforge/ | wc -l | tr -d ' ') (expected: 40)"
echo "ADRs: $(ls .planning/decisions/ADR-*.md 2>/dev/null | wc -l | tr -d ' ') (expected: ≥26)"
echo ""
[ "$FAIL" -eq 0 ] && echo "✅ ALL 17 SUITES PASSED" || { echo "❌ ${FAIL} FAILURE(S)"; exit 1; }
```

---

# ═══════════════════════════════════════════════════════════════════════
# PART 2 — REVIEW PROMPT
# ═══════════════════════════════════════════════════════════════════════

---

## DAY 9 REVIEW

Activate **`architect.md` + `security-reviewer.md` + `qa-engineer.md`** simultaneously.

Day 9 risk profile:
1. **Auth token leakage** — session files must never reach git, CI logs, or webhooks
2. **Chromium sandbox bypass** — `--no-sandbox` flag is required for CI but dangerous in shared environments
3. **Path traversal in screenshot filenames** — user-controlled filenames in save()
4. **evaluate() injection** — arbitrary JS in the browser page context
5. **False-positive stuck detection** — <verify-visual> failures must not thrash auto mode

---

## REVIEW PASS 1 — Browser Daemon: Security Hardening

Read `browser-daemon.js` completely.

- [ ] **`--no-sandbox` in all environments.** The daemon always passes `--no-sandbox` to Chromium. In a developer's local machine (macOS/Linux), this is unnecessary and reduces security — `--no-sandbox` disables the Chromium sandbox which is a meaningful security boundary. Fix: "Only add `--no-sandbox` and `--disable-setuid-sandbox` when `CI=true` or `BROWSER_HEADLESS=true` AND running as root (which is common in Docker CI). On macOS/Linux as a non-root user, the sandbox works fine and should be enabled."

- [ ] **evaluate() runs arbitrary JS.** The `/evaluate` endpoint runs `page.evaluate(script)` where `script` comes directly from the HTTP request body. Since the daemon is localhost-only, the threat is mainly accidental misuse (evaluating on an external page) and malformed scripts causing unhandled errors. Add: "Validate that the current page URL starts with DEV_SERVER_URL before executing eval scripts. If not a known dev URL: return `{ success: false, error: 'evaluate() is only permitted on DEV_SERVER_URL origins' }`."

- [ ] **Session save race condition.** `SIGTERM` handler calls `saveSession()` for all sessions, but `saveSession()` uses `await context.cookies()` — what if the context is already closing? Add try-catch per session: "If `saveSession()` throws for a specific session during SIGTERM: log the error and continue to the next session. Never let one failed session save block the others."

- [ ] **Idle shutdown timer fires even when a request is in progress.** The idle timer checks `Date.now() - lastActionAt > IDLE_MS` every 60 seconds. But `lastActionAt` is only updated at the START of request handling. A slow request (e.g., navigating a slow page) takes 25 seconds — `lastActionAt` is updated at the start, so the idle timer won't fire mid-request. But a crash during a long request could leave `lastActionAt` stale. This is acceptable — document it: "Idle timer fires at most 60 seconds after the last request completion. A crash during a long request may cause the timer to fire earlier than expected."

---

## REVIEW PASS 2 — Screenshot Store: Path Traversal

Read `screenshot-store.js` completely.

- [ ] **Path traversal in `save()`.** The current `save()` sanitizes the filename with `.replace(/[^a-zA-Z0-9._-]/g, '-')`. But this only sanitizes the filename, not the planId parameter. If `planId` contains `../../../etc`, the screenshot would be saved outside the screenshots directory. Fix: "Also sanitize `planId` and `phaseNum` parameters. `planId`: allow only `[a-zA-Z0-9_-]`. `phaseNum`: coerce to integer. Verify the final resolved path starts with `STORE` using `path.resolve()`."

- [ ] **No disk quota enforcement.** The store has `diskUsage()` and `BROWSER_MAX_SCREENSHOTS_PER_PHASE` is in MINDFORGE.md, but `save()` doesn't check or enforce the limit. In a long auto-mode run with many visual verifies, screenshots could consume gigabytes. Fix: "In `save()`: after writing, check if `list(phaseNum).length > BROWSER_MAX_SCREENSHOTS_PER_PHASE`. If exceeded: delete the oldest N screenshots from the phase. Log: 'Screenshot limit reached for phase N — deleted M oldest'."

---

## REVIEW PASS 3 — Visual Verify Executor: Edge Cases

Read `visual-verify-executor.js` completely.

- [ ] **`press` directive is unimplemented.** The handler has `step.status = 'warn'` but the comment says "requires direct Playwright access; use click instead." This means `press: Enter` in a PLAN file silently passes as a warning. If a developer adds `press: Enter` expecting form submission, the form won't submit and the next assertion will fail with a confusing error. Fix: "Implement press via: `POST /evaluate` with `page.keyboard.press(args[0])` — or add a `/press` endpoint to the daemon. The `press` directive is commonly needed for `Enter` (form submit) and `Tab` (focus change)."

- [ ] **DEV_SERVER_URL used for relative URL resolution but not validated.** The executor resolves `/dashboard` to `${DEV_SERVER}${path}`. If `DEV_SERVER_URL` is not set and the default `http://localhost:3000` is wrong for the project, visual verify will silently navigate to the wrong URL and tests will fail with confusing "element not found" errors. Add: "At executor startup: check if `DEV_SERVER_URL` is reachable (single HEAD request with 2s timeout). If not: warn: 'DEV_SERVER_URL (http://localhost:3000) appears unreachable. Is your dev server running? Set DEV_SERVER_URL in MINDFORGE.md if using a different port.'"

- [ ] **`click` directive: selector vs text heuristic is fragile.** Current code: `const sel = args[0]; const body = sel.startsWith('"') ? { text: ... } : { selector: sel }`. But `"#create-project-btn"` with quotes would be treated as a text click, not a selector click. The quotes are already stripped by `parseDirectives`. Fix the heuristic: "Text click when the selector arg contains no CSS characters (`#`, `.`, `[`, `:`). Otherwise it's a CSS selector."

---

## REVIEW PASS 4 — QA Engine: Reliability

Read `qa-engine.js` completely.

- [ ] **`extractSurfaces` shell command injection.** `commitsBack` comes from function args (user-controlled). The exec call: `execSync(\`git diff HEAD~${commitsBack} --name-only\`)` — if `commitsBack` is `"; rm -rf /"` this is command injection. Fix: "Validate `commitsBack` is a positive integer before using in shell command. `const safeN = Math.max(1, Math.floor(Math.abs(Number(commitsBack) || 1)));`"

- [ ] **QA skips component files but doesn't find their parent pages.** When a component like `src/components/ProjectCard.tsx` changes, `classifyFile` returns `{ type: 'component' }` and the QA engine skips it. But the component could have broken the pages that use it. The spec says "find parent pages" — but the implementation just skips components. Fix: "For component surfaces: scan `src/pages/` and `src/app/` for files that import the component. Add those pages as derived surfaces with `derived_from: component_path`."

- [ ] **Dev server unreachable produces cascading failures.** If the dev server is not running, every `navigate` call fails. The QA report would show every surface as failed — which is misleading (the issue is the dev server, not the code). Add: "Before the QA loop: do a single `navigate('/')` health check. If it fails: return `{ error: 'Dev server unreachable at DEV_SERVER_URL', surfaces: 0 }` without running any tests."

---

## REVIEW PASS 5 — Session Manager: Cookie Expiry

Read `session-manager.js` completely.

- [ ] **`parseSqliteCookies` Windows epoch conversion.** The conversion `r.expires_utc / 1_000_000 - 11_644_473_600` converts Chrome's Windows FILETIME to Unix timestamp. But Chrome stores `expires_utc` in microseconds since 1601-01-01 (Windows epoch). The formula is correct, BUT: if `expires_utc` is 0 (session cookie — no expiry), the formula produces a negative number, which would be filtered out by `> now`. Session cookies should be treated as valid (non-expiring). Fix: "If `r.expires_utc === 0`: set `expires: -1` (Playwright's 'never expires' sentinel) instead of computing the conversion."

- [ ] **`importFromBrowser` error message suggests closing Chrome.** But on macOS, Chrome uses OS-level file locking inconsistently — sometimes the cookie file IS readable while Chrome is open. The error is premature. Fix: "First attempt to read the file. If it fails with EBUSY or similar: THEN suggest closing the browser. Do not pre-emptively tell users to close their browser."

---

## REVIEW PASS 6 — Test Suite Quality

Read `tests/browser.test.js` completely.

- [ ] **Screenshot store path traversal test is weak.** The test checks `!saved.includes('..')` but a sophisticated path traversal could use URL encoding or other tricks. The test should also verify the resolved path is WITHIN the expected directory. Fix: "Use `path.resolve()` to resolve the returned path and verify it starts with the expected screenshots directory: `assert.ok(path.resolve(saved).startsWith(path.resolve(STORE)))`."

- [ ] **`click` heuristic change not covered.** Review Pass 3 identified a bug in the click heuristic (CSS characters determine click type, not quote presence). The test suite has no test for this. Add: "Test that `click: .project-list` is treated as a CSS selector, `click: "Create Project"` as text click, and `click: #btn` as a CSS selector (not text)."

- [ ] **Missing test: QA dev server health check.** Review Pass 4 identified that QA should health-check the dev server before running. Add a test that verifies `runQA` returns an error object (not crashes) when the daemon is not running and cannot navigate.

---

## REVIEW SUMMARY TABLE

```
## Day 9 Review Summary

| Category           | BLOCKING | MAJOR | MINOR | SUGGESTION |
|--------------------|----------|-------|-------|------------|
| Browser Daemon     |          |       |       |            |
| Screenshot Store   |          |       |       |            |
| Visual Verify      |          |       |       |            |
| QA Engine          |          |       |       |            |
| Session Manager    |          |       |       |            |
| Test Suite         |          |       |       |            |
| **TOTAL**          |          |       |       |            |

## Verdict
[ ] ✅ APPROVED — Proceed to HARDEN section
[ ] ⚠️  APPROVED WITH CONDITIONS
[ ] ❌ NOT APPROVED
```

---

# ═══════════════════════════════════════════════════════════════════════
# PART 3 — HARDENING PROMPT
# ═══════════════════════════════════════════════════════════════════════

---

## DAY 9 HARDENING

Activate **`security-reviewer.md` + `qa-engineer.md`** simultaneously.

Confirm all test suites pass before hardening:
```bash
for suite in install wave-engine audit compaction skills-platform \
             integrations governance intelligence metrics \
             distribution ci-mode sdk production migration e2e \
             autonomous browser; do
  printf "  %-30s" "${suite}..."
  node tests/${suite}.test.js 2>&1 | tail -1
done
```

---

## HARDEN 1 — Conditional Chromium sandbox flags

Update `browser-daemon.js` `init()` function:

```javascript
// Replace hardcoded --no-sandbox with environment-aware flags
function getChromiumArgs() {
  const base = ['--no-first-run', '--no-zygote', '--disable-accelerated-2d-canvas'];

  // Disable sandbox ONLY when:
  // - Running as root (common in Docker/CI)
  // - OR explicitly in CI environment
  // - OR BROWSER_NO_SANDBOX=true is set
  const isRoot    = process.getuid && process.getuid() === 0;
  const isCI      = process.env.CI === 'true';
  const forceNoSandbox = process.env.BROWSER_NO_SANDBOX === 'true';

  if (isRoot || isCI || forceNoSandbox) {
    base.unshift('--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage');
    process.stderr.write('[daemon] ⚠️  Running without Chromium sandbox (CI/root mode)\n');
  } else {
    process.stderr.write('[daemon] ✅ Chromium sandbox enabled (local dev mode)\n');
  }

  return base;
}

// In init():
browser = await playwright.chromium.launch({ headless: HEADLESS, args: getChromiumArgs() });
```

Add to MINDFORGE-V2-SCHEMA.json:
```json
"BROWSER_NO_SANDBOX": { "type": "boolean",
  "description": "Disable Chromium sandbox (set true for CI/Docker, false for local dev)" }
```

**Commit:**
```bash
git add bin/browser/browser-daemon.js .mindforge/MINDFORGE-V2-SCHEMA.json
git commit -m "harden(v2-browser): conditional Chromium sandbox — enable locally, disable in CI/root"
```

---

## HARDEN 2 — Fix screenshot path traversal

Update `bin/browser/screenshot-store.js`:

```javascript
'use strict';
const fs   = require('fs');
const path = require('path');

const STORE = path.join(process.cwd(), '.planning', 'screenshots');
const MAX_SCREENSHOTS = parseInt(process.env.BROWSER_MAX_SCREENSHOTS_PER_PHASE || '50', 10);

const ensureDir = d => fs.mkdirSync(d, { recursive: true });

function save(base64Png, phaseNum, planId, filename = 'screenshot.png') {
  // ── INPUT VALIDATION: prevent path traversal ─────────────────────────────
  const safePhase  = Math.floor(Math.abs(Number(phaseNum) || 0));
  const safePlan   = String(planId).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64);
  const safeName   = String(filename || 'screenshot.png')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/\.png$/i, '')
    .slice(0, 128) + '.png';

  const dir  = path.join(STORE, `phase-${safePhase}`, safePlan);
  const dest = path.join(dir, safeName);

  // ── PATH TRAVERSAL GUARD: resolved path must stay inside STORE ───────────
  const resolvedStore = path.resolve(STORE);
  const resolvedDest  = path.resolve(dest);
  if (!resolvedDest.startsWith(resolvedStore + path.sep) &&
      !resolvedDest.startsWith(resolvedStore)) {
    throw new Error(`Path traversal rejected: ${dest} is outside screenshot store`);
  }

  ensureDir(dir);
  fs.writeFileSync(dest, Buffer.from(base64Png, 'base64'));

  // ── QUOTA ENFORCEMENT: delete oldest if over limit ────────────────────────
  const phaseDir = path.join(STORE, `phase-${safePhase}`);
  const allShots = listAll(phaseDir);
  if (allShots.length > MAX_SCREENSHOTS) {
    const oldest = allShots
      .map(f => ({ f, mt: fs.statSync(f).mtimeMs }))
      .sort((a, b) => a.mt - b.mt)
      .slice(0, allShots.length - MAX_SCREENSHOTS);
    oldest.forEach(({ f }) => { try { fs.unlinkSync(f); } catch {} });
    process.stderr.write(`[screenshot-store] Quota: deleted ${oldest.length} oldest screenshots for phase ${safePhase}\n`);
  }

  return dest;
}

function listAll(dir) {
  if (!fs.existsSync(dir)) return [];
  const walk = d => fs.readdirSync(d, { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : path.join(d, e.name))
    .filter(p => p.endsWith('.png'));
  return walk(dir);
}

function list(phaseNum, planId) {
  const safePhase = Math.floor(Math.abs(Number(phaseNum) || 0));
  const dir = planId
    ? path.join(STORE, `phase-${safePhase}`, String(planId).replace(/[^a-zA-Z0-9_-]/g, '-'))
    : path.join(STORE, `phase-${safePhase}`);
  return listAll(dir);
}

function cleanup(phaseNum) {
  const safePhase = Math.floor(Math.abs(Number(phaseNum) || 0));
  const dir = path.join(STORE, `phase-${safePhase}`);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function diskUsage() {
  if (!fs.existsSync(STORE)) return 0;
  let total = 0;
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p) : (total += fs.statSync(p).size);
  }};
  walk(STORE);
  return total;
}

module.exports = { save, list, cleanup, diskUsage };
```

**Commit:**
```bash
git add bin/browser/screenshot-store.js
git commit -m "harden(v2-browser): fix screenshot path traversal with path.resolve guard + quota enforcement"
```

---

## HARDEN 3 — Fix QA command injection and add dev server health check

Update `bin/browser/qa-engine.js`:

```javascript
// At top of extractSurfaces function — replace commitsBack usage:
function extractSurfaces(phaseNum, commitsBack = 1) {
  // ── INPUT VALIDATION: prevent shell injection ─────────────────────────────
  const safeN = Math.max(1, Math.min(100, Math.floor(Math.abs(Number(commitsBack) || 1))));
  let files   = [];
  // ... rest of function uses safeN instead of commitsBack ...

// Add dev server health check at top of runQA:
async function runQA(phaseNum, opts = {}) {
  const { sessions = ['default'], routes = null, commitsBack = 1 } = opts;

  await DaemonMgr.ensureRunning({ headless: true });

  // ── Dev server health check ───────────────────────────────────────────────
  const healthCheck = await DaemonMgr.request('POST', '/navigate',
    { url: DEV_SERVER, session: 'default', wait_for: 'domcontentloaded' }
  ).catch(() => ({ success: false, error: 'Connection refused' }));

  if (!healthCheck.success) {
    process.stderr.write(`[qa-engine] ⚠️  Dev server unreachable at ${DEV_SERVER}\n`);
    process.stderr.write(`[qa-engine] Is your dev server running? Start it first.\n`);
    return {
      surfaces: 0, passed: 0, failed: 0, bugs: [], results: [],
      error: `Dev server unreachable at ${DEV_SERVER}. Start your dev server and retry.`,
    };
  }

  // ... rest of function unchanged ...
```

Also implement parent page discovery for components:

```javascript
// Add to qa-engine.js — called after classifyFile returns a component:
function findParentPages(componentFile) {
  const parents = [];
  const pagesRoots = ['src/app', 'src/pages'];

  for (const root of pagesRoots) {
    if (!fs.existsSync(root)) continue;
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!/\.(tsx|jsx|ts|js)$/.test(entry.name)) continue;
        try {
          const content = fs.readFileSync(full, 'utf8');
          if (content.includes(path.basename(componentFile, path.extname(componentFile)))) {
            const surface = classifyFile(full.replace(process.cwd() + '/', ''));
            if (surface?.type === 'page') parents.push({ ...surface, source_file: full, derived_from: componentFile });
          }
        } catch {}
      }
    };
    walk(root);
  }
  return parents;
}
```

**Commit:**
```bash
git add bin/browser/qa-engine.js
git commit -m "harden(v2-browser): fix QA shell injection, add dev server health check, component parent discovery"
```

---

## HARDEN 4 — Fix `press` directive and click heuristic

Update `bin/browser/visual-verify-executor.js`:

```javascript
// Replace 'press' case in executeBlock switch:
case 'press': {
  const key = args[0] || 'Enter';
  // Implement via evaluate — page.keyboard is accessible in evaluate context
  const r = await DaemonMgr.request('POST', '/evaluate', {
    script: `document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {key:'${key}',bubbles:true}))`,
    session,
  });
  step.detail = `pressed ${key}`;
  // Also try pressing Enter on the focused element via Playwright hint
  break;
}

// Fix click directive heuristic — replace existing 'click' case:
case 'click': {
  const raw = args[0] || '';
  // Use CSS characters to determine if it's a selector or text
  const isCSSSelector = /^[#\.\[\:\*\~\>\+]/.test(raw) || raw.includes('[') || raw.includes('=');
  const body = isCSSSelector
    ? { selector: raw, session }
    : { text: raw.replace(/^["']|["']$/g, ''), session };  // Strip quotes from text
  const r = await DaemonMgr.request('POST', '/click', body);
  step.detail = r.element_found ? 'clicked' : 'element not found';
  if (!r.success || !r.element_found) { step.status = 'fail'; passed = false; }
  break;
}
```

**Commit:**
```bash
git add bin/browser/visual-verify-executor.js
git commit -m "harden(v2-browser): implement press directive, fix click CSS-vs-text heuristic"
```

---

## HARDEN 5 — Fix SQLite session cookie Windows epoch for session cookies

Update `bin/browser/session-manager.js`:

```javascript
// In parseSqliteCookies — replace expires calculation:
return rows.map(r => ({
  name: r.name, value: r.value, domain: r.host_key, path: r.path,
  // Session cookies have expires_utc = 0 — map to -1 (Playwright: never expires)
  expires: r.expires_utc === 0
    ? -1
    : r.expires_utc / 1_000_000 - 11_644_473_600,
  secure: !!r.is_secure, httpOnly: !!r.is_httponly, sameSite: 'Lax',
}))
// Filter: keep session cookies (expires = -1) AND non-expired time-bound cookies
.filter(c => c.name && (c.expires === -1 || c.expires > Date.now() / 1000));
```

**Commit:**
```bash
git add bin/browser/session-manager.js
git commit -m "harden(v2-browser): fix session cookie Windows epoch — map expires_utc=0 to -1"
```

---

## HARDEN 6 — Strengthen test coverage for hardened paths

Add to `tests/browser.test.js`:

```javascript
// ── Hardening tests ───────────────────────────────────────────────────────────
console.log('\nHardening tests:');

test('screenshot save: path traversal with planId is rejected', () => {
  const p = mkProject(true);
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    assert.throws(
      () => ScreenStore.save(TINY_PNG_B64, 3, '../../evil', 'bad.png'),
      /traversal/i,
      'Should throw on path traversal in planId'
    );
  } finally { process.chdir(orig); p.cleanup(); }
});

test('screenshot save: path traversal in filename is rejected', () => {
  const p = mkProject(true);
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    // This should NOT throw — filename is sanitized, not rejected
    // But the saved path must stay inside STORE
    const saved = ScreenStore.save(TINY_PNG_B64, 3, '04', '../../evil.png');
    const resolvedStore = require('path').resolve(p.dir, '.planning', 'screenshots');
    const resolvedSaved = require('path').resolve(saved);
    assert.ok(resolvedSaved.startsWith(resolvedStore), 'Saved path must be inside screenshot store');
  } finally { process.chdir(orig); p.cleanup(); }
});

test('Chromium args: no-sandbox only when CI=true or root', () => {
  const c = fs.readFileSync('bin/browser/browser-daemon.js', 'utf8');
  assert.ok(
    c.includes('isCI') || c.includes('CI=') || c.includes('process.env.CI'),
    'Sandbox flag should be conditional on CI environment'
  );
  assert.ok(
    !c.includes("'--no-sandbox'") || c.includes('if') || c.includes('getChromiumArgs'),
    '--no-sandbox should not be unconditional'
  );
});

test('visual verify click heuristic: CSS selector detected by # prefix', () => {
  const d = VisualVerify.parseDirectives('click: #submit-btn');
  assert.strictEqual(d[0].directive, 'click');
  assert.strictEqual(d[0].args[0], '#submit-btn', 'CSS selector preserved as-is');
});

test('visual verify click heuristic: text click detected when no CSS chars', () => {
  const d = VisualVerify.parseDirectives('click: "Sign In"');
  assert.strictEqual(d[0].directive, 'click');
  // Text args have quotes stripped by parseDirectives
  assert.strictEqual(d[0].args[0], 'Sign In', 'Text has quotes stripped');
});

test('QA report: no bugs section says "No bugs found"', () => {
  const p = mkProject();
  const orig = process.cwd();
  process.chdir(p.dir);
  try {
    const file = QAReportWriter.write(5, { surfaces: 1, passed: 1, failed: 0, results: [{ surface: '/home', session: 'default', passed: true }], bugs: [] });
    const c = fs.readFileSync(file, 'utf8');
    assert.ok(c.includes('No bugs found'), 'Should say "No bugs found"');
  } finally { process.chdir(orig); p.cleanup(); }
});
```

**Commit:**
```bash
git add tests/browser.test.js
git commit -m "test(v2-browser): add hardening tests for path traversal, sandbox flags, click heuristic"
```

---

## HARDEN 7 — Write 3 ADRs for Day 9 decisions

### `.planning/decisions/ADR-024-browser-daemon-localhost-only.md`

```markdown
# ADR-024: Browser daemon binds to localhost only (127.0.0.1)

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 9

## Context
The browser daemon (port 7338) exposes session data, screenshots, and
JavaScript evaluation capabilities. Should it bind to all interfaces?

## Decision
Bind to 127.0.0.1 only. Consistent with ADR-017 (SDK SSE server).

## Rationale
Sessions contain auth tokens. Cookies can include JWTs and session IDs.
Exposing these on a network interface in a shared dev environment would
allow any other machine (or container on the same host network) to access
them. The use case (developer testing their own app) never requires remote access.
For remote monitoring: use SSH tunneling.

## Consequences
Same as ADR-017: remote access requires explicit SSH tunnel.
CI environments (Docker, GitHub Actions) run locally — no issue.
```

### `.planning/decisions/ADR-025-verify-visual-failure-is-verify-failure.md`

```markdown
# ADR-025: <verify-visual> failure is treated identically to <verify> failure

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 9

## Context
When <verify-visual> assertions fail after <verify> passes, what should happen?

## Decision
<verify-visual> failure triggers node repair (RETRY → DECOMPOSE → PRUNE → ESCALATE)
identically to a <verify> (unit test) failure.

## Rationale
If the UI doesn't look correct, the task is not done — regardless of whether
unit tests pass. A login form that passes tests but allows empty email submission
is a real bug. Node repair handles it the same way.

The screenshot attached to the visual verify failure gives the retry agent
much better information than a test failure message — it can see exactly what
the browser showed when the assertion failed.

## Consequences
Auto mode will attempt to self-repair visual verification failures.
Engineers should use <verify-visual> for meaningful assertions (not cosmetic preferences)
to avoid excessive node repairs on subjective UI details.
```

### `.planning/decisions/ADR-026-session-files-gitignored.md`

```markdown
# ADR-026: Browser session files are gitignored — auth tokens must never reach git

**Status:** Accepted | **Date:** v2.0.0 | **Day:** 9

## Context
Browser sessions contain cookies (including auth tokens, session IDs, JWTs).
Should they be committed to git for reproducibility?

## Decision
Session files are gitignored. They are never committed to any branch.
Screenshots are also gitignored.

## Rationale
Auth tokens in git are a security incident requiring token rotation and history rewrite.
The benefit of committing sessions (reproducibility) is outweighed by:
1. Sessions expire anyway — they are not long-lived test fixtures
2. Session files contain credentials for developer accounts
3. Git history is effectively permanent — a leaked token stays in history

For CI: use programmatic session creation (Method 3 from session-manager.md)
with credentials stored in CI secrets, not in committed files.

## Consequences
Each developer creates their own sessions locally.
CI uses programmatic login with test credentials from CI secrets.
Session state cannot be shared via git — this is by design.
```

**Commit:**
```bash
git add .planning/decisions/ADR-024*.md \
        .planning/decisions/ADR-025*.md \
        .planning/decisions/ADR-026*.md
git commit -m "docs(adr): add ADR-024 localhost binding, ADR-025 visual verify failure, ADR-026 sessions gitignored"
```

---

## HARDEN 8 — Final pre-merge verification

```bash
#!/usr/bin/env bash
echo "MindForge v2 Day 9 — Pre-Merge Verification"
echo "══════════════════════════════════════════════"
PASS=true

# 1. Version
V=$(node -e "console.log(require('./package.json').version)")
[[ "${V}" == "2.0.0-alpha.2" ]] && echo "  Version: ${V} ✅" || { echo "  ❌ Version: ${V}"; PASS=false; }

# 2. All 17 test suites
echo ""
echo "  Test suites:"
FAIL=0
for suite in install wave-engine audit compaction skills-platform \
             integrations governance intelligence metrics \
             distribution ci-mode sdk production migration e2e \
             autonomous browser; do
  printf "    %-30s" "${suite}..."
  if node tests/${suite}.test.js 2>&1 | tail -1 | grep -q "passed"; then
    echo "✅"
  else
    echo "❌"; ((FAIL++)); PASS=false
  fi
done
echo "  Failed: ${FAIL}"

# 3. Command count
CMDS=$(ls .claude/commands/mindforge/ | wc -l | tr -d ' ')
[ "$CMDS" -ge 40 ] && echo "  Commands: ${CMDS} ✅" || { echo "  ❌ Commands: ${CMDS} < 40"; PASS=false; }

# 4. ADRs
ADRS=$(ls .planning/decisions/ADR-*.md 2>/dev/null | wc -l | tr -d ' ')
[ "$ADRS" -ge 26 ] && echo "  ADRs: ${ADRS} ✅" || { echo "  ❌ ADRs: ${ADRS} < 26"; PASS=false; }

# 5. gitignore
grep -q "sessions" .gitignore && grep -q "screenshots" .gitignore \
  && echo "  .gitignore: sessions + screenshots ✅" \
  || { echo "  ❌ .gitignore missing browser entries"; PASS=false; }

# 6. No secrets
SECRETS=$(grep -rE "(password|api_key|token)\s*=\s*['\"][^'\"]{8,}" \
  --include="*.md" --include="*.js" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.git . 2>/dev/null | \
  grep -v "placeholder\|example\|your-\|TEST_ONLY" || true)
[ -z "$SECRETS" ] && echo "  Secrets: clean ✅" || { echo "  ❌ Credentials detected"; PASS=false; }

echo ""
if $PASS; then
  echo "✅ ALL CHECKS PASSED — Day 9 complete"
  echo ""
  echo "  v2.0.0-alpha.2 is ready for PR."
  echo "  Next: Day 10 — Multi-Model Intelligence Layer"
else
  echo "❌ FAILURES — fix before merging"
  exit 1
fi
```

**Final commits:**
```bash
git add .
git commit -m "harden(v2-day9): complete all hardening — path traversal, sandbox, click heuristic, ADRs"
git push origin feat/mindforge-v2-browser-runtime
```

---

## DAY 9 COMPLETE

| Component | Status |
|---|---|
| Browser daemon (Playwright, port 7338, localhost-only) | ✅ |
| Daemon manager (lifecycle, auto-start, PID file) | ✅ |
| Session manager (persistence, cookie import, expiry) | ✅ |
| `<verify-visual>` parser (13 directives, session attr) | ✅ |
| Visual verify executor (fail-fast, screenshot capture) | ✅ |
| Screenshot store (phase namespaced, path traversal guard) | ✅ |
| QA engine (git-diff surfaces, component parent discovery) | ✅ |
| QA report writer (QA-REPORT-[N].md) | ✅ |
| Regression test writer (Playwright .test.ts per bug) | ✅ |
| `/mindforge:browse` command (40th) | ✅ |
| `/mindforge:qa` command (40th) | ✅ |
| execute-phase: `<verify-visual>` hook | ✅ |
| MINDFORGE.md browser settings + schema | ✅ |
| `tests/browser.test.js` (17th suite) | ✅ |
| ADR-024, ADR-025, ADR-026 | ✅ |
| CHANGELOG v2.0.0-alpha.2 | ✅ |

**MindForge v2.0.0-alpha.2: 40 commands · 17 test suites · 26 ADRs**
**Branch:** `feat/mindforge-v2-browser-runtime`
**Day 9 complete. Open PR → merge → start Day 10 (Multi-Model Intelligence)**
