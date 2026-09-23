# MindForge MCP Browse Tool (`mindforge_browse`) Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Expose MindForge's own existing Playwright/Chromium browser daemon (`bin/browser/browser-daemon.js`) as an 8th MCP tool (`mindforge_browse`) in `mcp-server/`, so any MCP-capable host — not just the `/mindforge:browse` slash command and the internal QA loop — can drive it.

**Mechanism resolution (verified against current code, 2026-09-09):** This feature does **not** touch the `browser-harness` package/MCP server at all. `browser-harness` is a wholly separate, unrelated MCP tool namespace (`mcp__browser-harness__*`) with no reference anywhere in the MindForge repo (`grep -rl "browser-harness" .` outside `node_modules` returns nothing). The original research's mechanism field ("browser-harness MCP server, a direct proxy") is a labeling error. The real mechanism is: `mcp-server/src/index.ts` (the existing 7-tool MindForge MCP server, built with `esbuild` into a single self-contained `dist/index.js`) gains an 8th `registerTool()` call, `mindforge_browse`, whose handler is a thin HTTP client (`mcp-server/src/browser-client.ts`, new file, zero new npm dependencies — Node's built-in `http`/`fs` only) that proxies to the already-running MindForge-native daemon at `http://127.0.0.1:7338`, exactly mirroring the request pattern `bin/browser/daemon-manager.js` already uses for the trusted `/mindforge:browse` slash command and `bin/browser/qa-engine.js` / `bin/browser/visual-verify-executor.js`.

**Alternative considered and rejected — replace the homegrown daemon with `browser-harness`:** Rejected. `bin/browser/browser-daemon.js` is already production-tested through three real internal callers (`qa-engine.js`, `visual-verify-executor.js`, `/mindforge:browse`) and one already-ratified security decision (ADR-024, localhost-only bind, with a live secondary `remoteAddress` check in the daemon itself). Swapping it for `browser-harness` would (a) force a rewrite of all three callers to a different HTTP/tool surface, (b) require re-litigating and re-verifying ADR-024's localhost-bind guarantee against a codebase this project does not own, and (c) contradict `mcp-server`'s own stated design goal of "zero runtime dependencies... self-contained... offline" (`mcp-server/README.md`, `mcp-server/package.json` description) by pulling in an entire second browser-automation stack. None of that switching cost buys anything the feature actually needs — MindForge's own daemon already does navigate/click/type/screenshot/assert over a token-authenticated localhost HTTP API. Per the Boil-the-Lake framing: wiring the existing, working daemon into one more tool is a lake (bounded, already tested); replacing it is an ocean (out of scope, not asked for, and strictly riskier). **Recommendation: thin-adapter-only, proxy to the existing daemon. Do not replace it.**

**Architecture:** `mcp-server/src/index.ts` gets one new `registerTool('mindforge_browse', ...)` call, following the exact pattern of the 7 existing tools (`registerTool()` helper + `safe()` error-wrapper, both already defined in that file — zero reimplementation). Its handler calls into a new `mcp-server/src/browser-client.ts`, which does a raw `http.request` to `127.0.0.1:7338` scoped by `CLAUDE_PROJECT_DIR` (mirroring `bin/browser/daemon-manager.js#request()`), and returns an actionable "daemon not running, run `/mindforge:browse --start` first" error if nothing is listening — the MCP server **never spawns the daemon itself** (spawning `${PROJECT_ROOT}/bin/browser/browser-daemon.js` from inside the `esbuild`-bundled, offline-by-design MCP server would assume a full `npx mindforge-cc` install exists at `CLAUDE_PROJECT_DIR`, which the other 7 tools deliberately never assume, and would duplicate `daemon-manager.js`'s lifecycle logic a second time in a second language). Because MCP hosts are a less-controlled caller pool than the single existing trusted caller (per the research's own framing), two real gaps found during verification are closed first: (1) `bin/browser/browser-daemon.js` currently enforces its bearer token on **only** `/evaluate` — `/navigate`, `/click`, `/type`, `/screenshot`, and `/assert` are unauthenticated today, protected only by ADR-024's localhost bind — this plan extends the same token check to all of them; (2) the new tool's action set deliberately **excludes** `/evaluate` (arbitrary JS execution — the one endpoint the original author already auth-walled, a signal this plan respects rather than widens) and cookie import (verified NOT IMPLEMENTED — see Global Constraints).

**Tech Stack:** Node ≥18 CommonJS for `bin/browser/*` (unchanged); TypeScript + `@modelcontextprotocol/sdk` + `zod` for `mcp-server/src/*` (unchanged, no new dependency); plain `node:assert` test harness, one process per `*.test.js` file under `tests/`, run via `node tests/run-all.js`.

**Spec:** No separate spec doc exists for this feature; this plan is the design record. It supersedes the following claims from the prior portfolio research, verified false or incomplete against the current repo on 2026-09-09:
- "browser-harness MCP server, a direct proxy" — **false**; see Mechanism resolution above.
- "cookie-import capability" — **false**. `bin/browser/session-manager.js#importFromBrowser()` always throws `not implemented ... the native browser cookie-DB backend (better-sqlite3) was removed project-wide`, and exports `capabilities.importFromBrowser = false`. The daemon only supports live-capture via `saveSession`/`loadSession` (Playwright `context.cookies()`), never a native Chrome/Arc/Brave profile read, despite `/mindforge:browse`'s own `--import-session --from <browser>` doc line implying otherwise. **The new MCP tool must not expose session import at all.**
- "bearer token" auth (implied applying broadly) — **partially false**. The token exists (`crypto.randomBytes(32)`, written 0600 to `.mindforge/.browser-daemon-token`, `crypto.timingSafeEqual` compare) but today gates **only** `/evaluate`. Closed by Task 1-3 below.
- ADR-017 — **does not substantively exist**. `.planning/decisions/ADR-017.md` is a one-line stub (`# ADR-017: Decision Record 17`, no body). The real, relevant ADRs are `docs/adr/ADR-024-browser-localhost-only.md` (mandates the 127.0.0.1 bind + secondary `remoteAddress` check — already correctly implemented in `browser-daemon.js`) and `docs/adr/ADR-026-session-persistence-security.md` (mandates `.mindforge/browser/sessions/` stay gitignored — unaffected by this plan, since the new tool never touches session save/load or import).
- "reportedly 7 already" MCP tools — **confirmed true** (`mindforge_health`, `mindforge_status`, `mindforge_memory_query`, `mindforge_memory_stats`, `mindforge_memory_find_related`, `mindforge_audit_log`, `mindforge_memory_remember`), verified by spawning `mcp-server/dist/index.js` and reading a real `tools/list` reply over the wire.
- rate-limiting / scope-limiting precedent for widening the daemon's caller pool — **none exists** anywhere in `mcp-server/` or `bin/browser/`. This plan does not invent one (YAGNI); instead it relies on (a) the auth hardening in Tasks 1-3, (b) excluding `/evaluate` and cookie-import from the tool surface, and (c) the same "annotate honestly" trust-boundary precedent the existing 7 tools already use (`readOnlyHint`/`destructiveHint`/`openWorldHint`) — `mindforge_browse` is the **first** tool in this file with `openWorldHint: true`, since it is the first one that reaches arbitrary external URLs rather than only the local project's files.

## Global Constraints

- ADR-024 (`docs/adr/ADR-024-browser-localhost-only.md`): the daemon binds `127.0.0.1` only, plus a secondary `req.socket.remoteAddress` check — this plan does not touch either check, only the token-auth gate that runs *after* them.
- ADR-026 (`docs/adr/ADR-026-session-persistence-security.md`): `.mindforge/browser/sessions/` stays gitignored — unaffected; this plan never calls `saveSession`/`loadSession`/`importFromBrowser`.
- `mcp-server/` ships as a single `esbuild`-bundled `dist/index.js` with **zero runtime `node_modules`** (`mcp-server/build.mjs`) — any new `mcp-server/src/*.ts` file must only import Node built-ins (`http`, `fs`, `path`) or already-bundled deps (`zod`), never a new npm package, never a CommonJS `require()` of a file under `bin/browser/` (that directory is not part of the `mcp-server` package and is not guaranteed to exist for a plugin-only install).
- `mindforge_browse` must never expose `/evaluate` (arbitrary JS execution) or cookie/session import — scoped out per the discrepancies above.
- Every new/edited test file follows the existing two conventions in `tests/`: plain `node:assert` with a local `test(name, fn)` + pass/fail tally (see `tests/mcp-server-version.test.js`), and a first-line `// @skip: reason` marker for anything that needs a live Chromium daemon (see `tests/browser.test.js`).
- Run every test directly with `node tests/<file>.test.js` (bypasses `// @skip:`, which is only honored by `tests/run-all.js`); run the full aggregate suite with `node tests/run-all.js` (or `npm test`, which also runs `scripts/ci/validate-assets.js` first).
- `mcp-server/dist/index.js` is a gitignored build artifact (`cd mcp-server && npm install && npm run build`); `plugins/mindforge/mcp/dist/index.js` is the **tracked, committed** copy of that same bundle and must be regenerated (`cp mcp-server/dist/index.js plugins/mindforge/mcp/dist/index.js`) and committed whenever `mcp-server/src/index.ts` changes — this is the exact drift class `tests/mcp-server-version.test.js` already guards for the version string; Task 5 adds the equivalent guard for the tool list.
- Known out-of-scope risk (flag, do not fix here): `bin/browser/browser-daemon.js` does `require('playwright-core')`, but `playwright-core` is not a direct dependency anywhere in root `package.json` — only `playwright` (`^1.40.0`) is listed, and only as a `devDependency`. A production `npx mindforge-cc@latest --claude --local` install (which does not install devDependencies) may be missing `playwright-core` at runtime, meaning `/mindforge:browse --start` could fail to launch the daemon at all in some installs. This plan does not fix that dependency-declaration gap; it is a pre-existing issue orthogonal to exposing the daemon over MCP, called out for the user to decide whether it should be fixed first.

---

### Task 1: Extract daemon bearer-token logic into a pure, unit-testable module

**Files:**
- Create: `bin/browser/daemon-auth.js`
- Create (test): `tests/daemon-auth.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks (first task).
- Produces: `requiresAuth(urlPath: string): boolean`, `isAuthValid(authHeader: string|undefined, token: string): boolean`, `AUTH_REQUIRED_PATHS: Set<string>` — consumed by Task 3 (`bin/browser/browser-daemon.js`).

- [ ] Write the failing test at `tests/daemon-auth.test.js`:
  ```javascript
  /**
   * MindForge — Browser Daemon Auth (pure logic, no Chromium required).
   * Run: node tests/daemon-auth.test.js
   */
  'use strict';

  const assert = require('assert');
  const crypto = require('crypto');
  const { requiresAuth, isAuthValid, AUTH_REQUIRED_PATHS } = require('../bin/browser/daemon-auth');

  let passed = 0, failed = 0;
  const tests = [];
  function test(name, fn) { tests.push({ name, fn }); }

  test('requiresAuth is true for every mutating/eval endpoint', () => {
    for (const p of ['/navigate', '/click', '/type', '/screenshot', '/evaluate', '/assert']) {
      assert.strictEqual(requiresAuth(p), true, `${p} must require auth`);
    }
  });

  test('requiresAuth is false for the unauthenticated /status liveness probe', () => {
    assert.strictEqual(requiresAuth('/status'), false);
  });

  test('isAuthValid accepts a correct Bearer token', () => {
    const token = crypto.randomBytes(32).toString('hex');
    assert.strictEqual(isAuthValid(`Bearer ${token}`, token), true);
  });

  test('isAuthValid rejects a missing Authorization header', () => {
    const token = crypto.randomBytes(32).toString('hex');
    assert.strictEqual(isAuthValid(undefined, token), false);
  });

  test('isAuthValid rejects a non-Bearer scheme', () => {
    const token = crypto.randomBytes(32).toString('hex');
    assert.strictEqual(isAuthValid(`Basic ${token}`, token), false);
  });

  test('isAuthValid rejects a wrong-length token without throwing', () => {
    const token = crypto.randomBytes(32).toString('hex');
    assert.strictEqual(isAuthValid('Bearer short', token), false);
  });

  test('isAuthValid rejects a same-length but incorrect token', () => {
    const token = crypto.randomBytes(32).toString('hex');
    const wrong = crypto.randomBytes(32).toString('hex');
    assert.strictEqual(isAuthValid(`Bearer ${wrong}`, token), false);
  });

  test('AUTH_REQUIRED_PATHS has exactly the 6-endpoint mutating + eval surface', () => {
    assert.strictEqual(AUTH_REQUIRED_PATHS.size, 6);
  });

  for (const { name, fn } of tests) {
    try { fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (e) { console.error(`  FAIL  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nDaemon Auth: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  ```

- [ ] Run it and confirm it fails: `node tests/daemon-auth.test.js` — expected failure: `Error: Cannot find module '../bin/browser/daemon-auth'` (the module does not exist yet).

- [ ] Write the minimal implementation at `bin/browser/daemon-auth.js`:
  ```javascript
  /**
   * MindForge v2 — Browser Daemon Auth
   * Pure bearer-token validation extracted from browser-daemon.js so it can be
   * unit-tested without booting Chromium. See ADR-024 / ADR-026.
   */
  'use strict';

  const crypto = require('crypto');

  /**
   * Endpoints that MUST present a valid bearer token. /status is intentionally
   * excluded: it is the unauthenticated liveness probe daemon-manager.js#isRunning
   * relies on, it leaks only session names + uptime, and it is already covered by
   * ADR-024's localhost bind + remoteAddress check.
   */
  const AUTH_REQUIRED_PATHS = new Set([
    '/navigate', '/click', '/type', '/screenshot', '/evaluate', '/assert',
  ]);

  function requiresAuth(urlPath) {
    return AUTH_REQUIRED_PATHS.has(urlPath);
  }

  function isAuthValid(authHeader, token) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    const provided = authHeader.slice(7);
    if (provided.length !== token.length) return false;
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(token));
  }

  module.exports = { AUTH_REQUIRED_PATHS, requiresAuth, isAuthValid };
  ```

- [ ] Run it and confirm it passes: `node tests/daemon-auth.test.js` — expected output ends with `Daemon Auth: 8 passed, 0 failed`.

- [ ] Commit:
  ```bash
  git add bin/browser/daemon-auth.js tests/daemon-auth.test.js
  git commit -m "feat(browser): extract daemon bearer-token auth into a testable module"
  ```

---

### Task 2: Harden `daemon-manager.js` to send the bearer token automatically

**Files:**
- Modify: `bin/browser/daemon-manager.js` (the `request()` function, lines 70-89 of the current file)
- Create (test): `tests/daemon-manager-auth.test.js`

**Interfaces:**
- Consumes: nothing new from Task 1 (this task reads the token file directly; it does not import `daemon-auth.js`, which is server-side validation logic).
- Produces: `request(method, endpoint, body)` now attaches `Authorization: Bearer <token>` automatically — consumed transitively by every existing caller (`bin/browser/qa-engine.js`, `bin/browser/visual-verify-executor.js`, `tests/browser.test.js`) with no changes required to those callers, and verified end-to-end by Task 3's live test.

- [ ] Write the failing test at `tests/daemon-manager-auth.test.js`:
  ```javascript
  /**
   * MindForge — Daemon Manager Auth Header (stub HTTP server, no Chromium required).
   * Run: node tests/daemon-manager-auth.test.js
   */
  'use strict';

  const assert = require('assert');
  const fs = require('fs');
  const path = require('path');
  const http = require('http');

  const TOKEN_PATH = path.join(process.cwd(), '.mindforge', '.browser-daemon-token');
  const TEST_PORT = 17338; // distinct from the real daemon's default 7338
  const TEST_TOKEN = 'test-token-abc123';

  process.env.BROWSER_PORT = String(TEST_PORT);
  const DaemonMgr = require('../bin/browser/daemon-manager');

  let passed = 0, failed = 0;
  const tests = [];
  function test(name, fn) { tests.push({ name, fn }); }

  test('request() attaches Authorization: Bearer <token> read from .mindforge/.browser-daemon-token', async () => {
    fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
    const hadToken = fs.existsSync(TOKEN_PATH);
    const previous = hadToken ? fs.readFileSync(TOKEN_PATH, 'utf8') : null;
    fs.writeFileSync(TOKEN_PATH, TEST_TOKEN);

    let receivedAuth;
    const stub = http.createServer((req, res) => {
      receivedAuth = req.headers.authorization;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });

    await new Promise((resolve) => stub.listen(TEST_PORT, '127.0.0.1', resolve));
    try {
      await DaemonMgr.request('POST', '/navigate', { url: 'about:blank' });
      assert.strictEqual(receivedAuth, `Bearer ${TEST_TOKEN}`, 'request() must send the token read from disk');
    } finally {
      await new Promise((resolve) => stub.close(resolve));
      if (hadToken) fs.writeFileSync(TOKEN_PATH, previous);
      else fs.rmSync(TOKEN_PATH, { force: true });
    }
  });

  test('request() omits Authorization when no token file exists', async () => {
    const hadToken = fs.existsSync(TOKEN_PATH);
    const previous = hadToken ? fs.readFileSync(TOKEN_PATH, 'utf8') : null;
    if (hadToken) fs.rmSync(TOKEN_PATH, { force: true });

    let receivedAuth = 'unset';
    const stub = http.createServer((req, res) => {
      receivedAuth = req.headers.authorization;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });

    await new Promise((resolve) => stub.listen(TEST_PORT, '127.0.0.1', resolve));
    try {
      await DaemonMgr.request('GET', '/status');
      assert.strictEqual(receivedAuth, undefined, 'request() must not send an Authorization header with no token file');
    } finally {
      await new Promise((resolve) => stub.close(resolve));
      if (hadToken) fs.writeFileSync(TOKEN_PATH, previous);
    }
  });

  (async () => {
    for (const { name, fn } of tests) {
      try { await fn(); console.log(`  PASS  ${name}`); passed++; }
      catch (e) { console.error(`  FAIL  ${name}\n      ${e.message}`); failed++; }
    }
    console.log(`\nDaemon Manager Auth: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  })();
  ```

- [ ] Run it and confirm it fails: `node tests/daemon-manager-auth.test.js` — expected failure: `AssertionError [ERR_ASSERTION]: request() must send the token read from disk` with `Expected: 'Bearer test-token-abc123' Actual: undefined` (today `request()` never sets an `Authorization` header at all).

- [ ] Write the minimal implementation — modify `bin/browser/daemon-manager.js`, adding a token reader and using it in `request()`:
  ```javascript
  // Add near the top, alongside the existing PORT/DAEMON_SCRIPT constants:
  const TOKEN_FILE = path.join(process.cwd(), '.mindforge', '.browser-daemon-token');

  function readToken() {
    try { return fs.readFileSync(TOKEN_FILE, 'utf8').trim(); } catch { return null; }
  }

  // Replace the existing request() function body:
  async function request(method, endpoint, body = null) {
    return new Promise((resolve, reject) => {
      const headers = { 'Content-Type': 'application/json' };
      const token = readToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const req = http.request({
        hostname: '127.0.0.1',
        port: PORT,
        path: endpoint,
        method: method,
        headers
      }, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve({ success: false, error: 'Invalid JSON response' }); }
        });
      });
      req.on('error', err => reject(err));
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }
  ```

- [ ] Run it and confirm it passes: `node tests/daemon-manager-auth.test.js` — expected output ends with `Daemon Manager Auth: 2 passed, 0 failed`.

- [ ] Commit:
  ```bash
  git add bin/browser/daemon-manager.js tests/daemon-manager-auth.test.js
  git commit -m "fix(browser): daemon-manager sends the bearer token on every request"
  ```

---

### Task 3: Enforce the bearer token on every mutating/eval daemon endpoint

**Files:**
- Modify: `bin/browser/browser-daemon.js` (remove the local `isAuthValid`, use `daemon-auth.js`, gate on every path in `AUTH_REQUIRED_PATHS` instead of only `/evaluate`)
- Create (test, live/skipped): `tests/browser-daemon-auth-live.test.js`

**Interfaces:**
- Consumes: `requiresAuth`, `isAuthValid` from `bin/browser/daemon-auth.js` (Task 1); the auto-attached `Authorization` header from `bin/browser/daemon-manager.js#request()` (Task 2).
- Produces: no new exports — this closes the security gap the research flagged, so that `/navigate`, `/click`, `/type`, `/screenshot`, and `/assert` all now require the same token `/evaluate` already required. Consumed implicitly by Task 4 (the MCP tool sends the token on every proxied call and must not be locked out).

- [ ] Write the failing test at `tests/browser-daemon-auth-live.test.js` (real Chromium required — mirrors the existing `// @skip:` convention in `tests/browser.test.js`):
  ```javascript
  // @skip: requires Chromium daemon and display environment
  /**
   * MindForge — Browser Daemon Auth Enforcement (live, requires Chromium).
   * Confirms /navigate is rejected without a bearer token and accepted with one,
   * closing the gap where only /evaluate previously required auth.
   * Run manually: node tests/browser-daemon-auth-live.test.js
   */
  'use strict';

  const assert = require('assert');
  const fs = require('fs');
  const path = require('path');
  const http = require('http');
  const DaemonMgr = require('../bin/browser/daemon-manager');

  const TOKEN_PATH = path.join(process.cwd(), '.mindforge', '.browser-daemon-token');
  const PORT = process.env.BROWSER_PORT || 7338;

  function rawRequest(method, endpoint, body, headers = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port: PORT, path: endpoint, method, headers: { 'Content-Type': 'application/json', ...headers } },
        (res) => {
          let data = '';
          res.on('data', (c) => { data += c; });
          res.on('end', () => resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : {} }));
        }
      );
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  async function run() {
    await DaemonMgr.start();
    try {
      const token = fs.readFileSync(TOKEN_PATH, 'utf8').trim();

      const unauthed = await rawRequest('POST', '/navigate', { url: 'about:blank', session: 'auth-test' });
      assert.strictEqual(unauthed.statusCode, 401, '/navigate without a token must be rejected');
      console.log('  PASS  /navigate rejects a missing bearer token');

      const wrongToken = await rawRequest('POST', '/navigate', { url: 'about:blank', session: 'auth-test' }, { Authorization: 'Bearer not-the-real-token' });
      assert.strictEqual(wrongToken.statusCode, 401, '/navigate with a wrong token must be rejected');
      console.log('  PASS  /navigate rejects an incorrect bearer token');

      const authed = await rawRequest('POST', '/navigate', { url: 'about:blank', session: 'auth-test' }, { Authorization: `Bearer ${token}` });
      assert.strictEqual(authed.statusCode, 200, '/navigate with the real token must succeed');
      assert.strictEqual(authed.body.success, true);
      console.log('  PASS  /navigate accepts the real bearer token');

      const status = await rawRequest('GET', '/status');
      assert.strictEqual(status.statusCode, 200, '/status must stay unauthenticated (liveness probe)');
      console.log('  PASS  /status remains unauthenticated');

      console.log('\nBrowser Daemon Auth (live): all checks passed');
    } finally {
      await DaemonMgr.stop();
    }
  }

  run().catch((err) => { console.error('\nFAIL', err); process.exit(1); });
  ```

- [ ] Run it and confirm it fails: `node tests/browser-daemon-auth-live.test.js` (requires a working local Chromium + `playwright-core`; skip this step if unavailable and note it in the task handoff) — expected failure: `AssertionError [ERR_ASSERTION]: /navigate without a token must be rejected` with `Expected: 401 Actual: 200`, since `browser-daemon.js` today only gates `/evaluate`.

- [ ] Write the minimal implementation — modify `bin/browser/browser-daemon.js`:
  ```javascript
  // Replace the require block at the top:
  const http      = require('http');
  const crypto    = require('crypto');
  const playwright = require('playwright-core');
  const fs        = require('fs');
  const path      = require('path');
  const { requiresAuth, isAuthValid } = require('./daemon-auth');

  // Remove the local isAuthValid(req) function entirely (lines 26-36 of the
  // current file) — validation now lives in daemon-auth.js.

  // In the server's req.on('end', async () => { ... }) handler, add a single
  // centralized auth gate as the FIRST statement inside the try block, before
  // parsing the body or looking up the session:
  req.on('end', async () => {
    try {
      if (requiresAuth(req.url) && !isAuthValid(req.headers.authorization, DAEMON_TOKEN)) {
        return send({ error: 'Authentication required. Use the token printed at daemon startup.' }, 401);
      }
      const { url, session: sessionName, selector, text, script, type, expected_text, name } = body ? JSON.parse(body) : {};
      const { page, context } = await getOrCreateSession(sessionName);
      // ... rest of the handler is unchanged (the /navigate, /click, /type,
      // /screenshot, /evaluate, /assert branches) EXCEPT the /evaluate branch's
      // now-redundant inline auth check must be removed:
      if (req.url === '/evaluate' && req.method === 'POST') {
        const result = await page.evaluate(script);
        return send({ success: true, result });
      }
      // (the /status, /navigate, /click, /type, /screenshot, /assert branches
      // are otherwise byte-identical to the current file)
  ```

- [ ] Run it and confirm it passes: `node tests/browser-daemon-auth-live.test.js` — expected output ends with `Browser Daemon Auth (live): all checks passed`. Also re-run the pre-existing browser suite to confirm no regression: `node tests/browser.test.js` (uses `DaemonMgr.request()`, which Task 2 already made auth-aware) — expected output ends with `ALL BROWSER RUNTIME TESTS PASSED!`.

- [ ] Commit:
  ```bash
  git add bin/browser/browser-daemon.js tests/browser-daemon-auth-live.test.js
  git commit -m "fix(browser): require the bearer token on every mutating daemon endpoint, not just /evaluate"
  ```

---

### Task 4: Add the `mindforge_browse` MCP tool

**Files:**
- Create: `mcp-server/src/browser-client.ts`
- Modify: `mcp-server/src/index.ts` (add the import + one `registerTool()` block)
- Create (test): `tests/mcp-server-browse-tool.test.js`

**Interfaces:**
- Consumes: `PROJECT_ROOT`, `registerTool()`, `safe()` — all already defined in `mcp-server/src/index.ts` (lines 40, 90-105, 46-66 of the current file respectively).
- Produces: `mcp-server/src/browser-client.ts` exports `ensureDaemonRunning(projectRoot: string): Promise<void>` and `browserRequest(projectRoot: string, method: string, endpoint: string, body?: Record<string, unknown> | null): Promise<Record<string, unknown>>`. The 8th registered tool, `mindforge_browse`, is consumed by Task 5's drift-guard test.

- [ ] Write the failing test at `tests/mcp-server-browse-tool.test.js`:
  ```javascript
  /**
   * MindForge — mindforge_browse MCP tool surface (wire-level, no Chromium/daemon required).
   * Spawns the built MCP server bundle and drives it over real MCP JSON-RPC, the same
   * pattern tests/mcp-server-version.test.js uses. The browser daemon is deliberately NOT
   * started here: the test asserts the tool degrades gracefully instead of hanging or crashing.
   *
   * Run: node tests/mcp-server-browse-tool.test.js
   *      MF_REQUIRE_MCP_BUNDLE=1 node tests/mcp-server-browse-tool.test.js
   */
  'use strict';

  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const assert = require('assert');
  const { spawnSync } = require('child_process');

  const ROOT = path.resolve(__dirname, '..');
  const BUNDLE_PATH = path.join(ROOT, 'mcp-server', 'dist', 'index.js');
  const REQUIRE_BUNDLE = process.env.MF_REQUIRE_MCP_BUNDLE === '1';

  let passed = 0, failed = 0, skipped = 0;
  const tests = [];
  function test(name, fn) { tests.push({ name, fn }); }

  function callServer(entryPath, requests) {
    const input = requests.map((r) => JSON.stringify(r)).join('\n') + '\n';
    const proc = spawnSync(process.execPath, [entryPath], {
      input, encoding: 'utf8', timeout: 20000,
      env: { PATH: process.env.PATH, CLAUDE_PROJECT_DIR: os.tmpdir() },
    });
    const replies = String(proc.stdout || '')
      .split('\n').filter(Boolean)
      .map((line) => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
    return { replies, diagnostics: `status=${proc.status} signal=${proc.signal} stderr=${String(proc.stderr || '').slice(0, 500)}` };
  }

  const INIT = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'mf-browse-test', version: '0' } } };
  const INITIALIZED = { jsonrpc: '2.0', method: 'notifications/initialized', params: {} };

  test('tools/list includes mindforge_browse with an honest open-world/destructive annotation', () => {
    if (!fs.existsSync(BUNDLE_PATH)) {
      const why = 'mcp-server/dist/index.js is absent — build it with `cd mcp-server && npm install && npm run build`';
      assert.ok(!REQUIRE_BUNDLE, `MF_REQUIRE_MCP_BUNDLE=1 demands this check, but ${why}`);
      console.log(`\n  !  NOT RUN: ${why}\n`);
      return 'SKIP: ' + why;
    }
    const { replies, diagnostics } = callServer(BUNDLE_PATH, [INIT, INITIALIZED, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }]);
    const list = replies.find((r) => r.id === 2);
    assert.ok(list && list.result && Array.isArray(list.result.tools), `tools/list did not return a tools array (${diagnostics})`);
    const browse = list.result.tools.find((t) => t.name === 'mindforge_browse');
    assert.ok(browse, 'mindforge_browse must be registered as an MCP tool');
    assert.strictEqual(browse.annotations.readOnlyHint, false, 'mindforge_browse is not read-only');
    assert.strictEqual(browse.annotations.destructiveHint, true, 'mindforge_browse can mutate a live page');
    assert.strictEqual(browse.annotations.openWorldHint, true, 'mindforge_browse reaches arbitrary URLs, unlike the other 7 tools');
    assert.strictEqual(list.result.tools.length, 8, `expected 8 registered tools, found ${list.result.tools.length}`);
  });

  test('tools/call mindforge_browse action=status degrades gracefully with no daemon running', () => {
    if (!fs.existsSync(BUNDLE_PATH)) return 'SKIP: mcp-server/dist/index.js is absent';
    const { replies, diagnostics } = callServer(BUNDLE_PATH, [
      INIT, INITIALIZED,
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'mindforge_browse', arguments: { action: 'status' } } },
    ]);
    const call = replies.find((r) => r.id === 3);
    assert.ok(call && call.result, `tools/call did not return a result (${diagnostics})`);
    assert.strictEqual(call.result.isError, true, 'must report isError when the daemon is not running');
    const text = call.result.content[0].text;
    assert.ok(text.includes('browser daemon is not running'), `error text must explain the daemon is not running, got: ${text}`);
    assert.ok(text.includes('/mindforge:browse --start'), `error text must point at the fix, got: ${text}`);
  });

  test('tools/call rejects action="evaluate" at the schema boundary (not exposed)', () => {
    if (!fs.existsSync(BUNDLE_PATH)) return 'SKIP: mcp-server/dist/index.js is absent';
    const { replies, diagnostics } = callServer(BUNDLE_PATH, [
      INIT, INITIALIZED,
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'mindforge_browse', arguments: { action: 'evaluate', script: '1+1' } } },
    ]);
    const call = replies.find((r) => r.id === 4);
    assert.ok(call && call.result, `no result for id 4 (${diagnostics})`);
    assert.strictEqual(call.result.isError, true, 'action="evaluate" must be rejected, not silently accepted');
    assert.ok(call.result.content[0].text.includes('invalid_enum_value'), `expected a zod enum validation error, got: ${call.result.content[0].text}`);
  });

  (async () => {
    for (const { name, fn } of tests) {
      try {
        const result = await fn();
        if (typeof result === 'string' && result.startsWith('SKIP:')) { console.log(`  o  ${name}\n      ${result}`); skipped++; }
        else { console.log(`  PASS  ${name}`); passed++; }
      } catch (e) { console.error(`  FAIL  ${name}\n      ${e.message}`); failed++; }
    }
    console.log(`\nMCP Browse Tool: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    if (failed > 0) process.exit(1);
  })();
  ```

- [ ] Run it and confirm it fails: `node tests/mcp-server-browse-tool.test.js` — expected failure: `AssertionError [ERR_ASSERTION]: mindforge_browse must be registered as an MCP tool` (the tool does not exist in the currently-built `mcp-server/dist/index.js` yet, which still has exactly 7 tools).

- [ ] Write the minimal implementation. First, create `mcp-server/src/browser-client.ts`:
  ```typescript
  /**
   * MindForge MCP Server — Browser Daemon Client.
   *
   * Thin proxy to the already-running MindForge browser daemon (bin/browser/browser-daemon.js,
   * ADR-024). Zero new dependencies — Node built-ins only, consistent with mcp-server's
   * self-contained esbuild bundle (mcp-server/build.mjs). This module NEVER spawns the daemon:
   * that would require bin/browser/daemon-manager.js's spawn logic (which resolves paths via
   * __dirname relative to bin/browser/, incompatible with this package's single-file bundle)
   * and would assume a full `npx mindforge-cc` install exists at CLAUDE_PROJECT_DIR, which the
   * other 7 tools in this server deliberately never assume. Start the daemon with
   * `/mindforge:browse --start` first.
   */
  'use strict';

  import * as http from 'http';
  import * as fs from 'fs';
  import * as path from 'path';

  const BROWSER_PORT = Number(process.env.BROWSER_PORT) || 7338;

  function readDaemonToken(projectRoot: string): string | null {
    const tokenPath = path.join(projectRoot, '.mindforge', '.browser-daemon-token');
    try {
      return fs.readFileSync(tokenPath, 'utf8').trim();
    } catch {
      return null;
    }
  }

  export function browserRequest(
    projectRoot: string,
    method: string,
    endpoint: string,
    body: Record<string, unknown> | null = null
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const token = readDaemonToken(projectRoot);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const req = http.request(
        { hostname: '127.0.0.1', port: BROWSER_PORT, path: endpoint, method, headers },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try { resolve(JSON.parse(data)); } catch { resolve({ success: false, error: 'Invalid JSON response' }); }
          });
        }
      );
      req.setTimeout(10000, () => req.destroy(new Error('Browser daemon request timed out')));
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  async function isDaemonRunning(projectRoot: string): Promise<boolean> {
    try {
      const result = await browserRequest(projectRoot, 'GET', '/status');
      return result.alive === true;
    } catch {
      return false;
    }
  }

  const DAEMON_NOT_RUNNING_HINT =
    'The MindForge browser daemon is not running. Start it first with `/mindforge:browse --start` ' +
    '(requires a full `npx mindforge-cc@latest --claude --local` install in this project — this MCP ' +
    'tool never spawns the daemon itself).';

  export async function ensureDaemonRunning(projectRoot: string): Promise<void> {
    if (!(await isDaemonRunning(projectRoot))) {
      throw new Error(DAEMON_NOT_RUNNING_HINT);
    }
  }
  ```

  Then, in `mcp-server/src/index.ts`, add the import near the top (alongside the existing `MindForgeMemory`/`MindForgeClient` imports) and the tool registration after tool 7 (`mindforge_memory_remember`) and before `async function main()`:
  ```typescript
  import { ensureDaemonRunning, browserRequest } from './browser-client.js';

  // ── 8. Browse (guarded, open-world) ─────────────────────────────────────────
  const BROWSE_ACTIONS = ['status', 'navigate', 'click', 'type', 'screenshot', 'assert'] as const;

  const browseSchema = {
    action: z.enum(BROWSE_ACTIONS).describe('Browser action to perform'),
    url: z.string().optional().describe('URL to navigate to (action=navigate)'),
    selector: z.string().optional().describe('CSS selector (action=click|type|assert)'),
    text: z.string().optional().describe('Text to type, or fallback click-by-text (action=click|type)'),
    session: z.string().optional().describe('Named browser session/context (default "default")'),
    assertType: z.enum(['visible', 'url', 'title']).optional().describe('Assertion kind (action=assert)'),
    expectedText: z.string().optional().describe('Expected value for the assertion (action=assert)'),
  };

  registerTool(
    'mindforge_browse',
    {
      title: 'Control the MindForge browser daemon',
      description:
        'Drive the persistent MindForge Playwright/Chromium daemon (the same one behind ' +
        '/mindforge:browse): check status, navigate, click, type, screenshot, or assert on the ' +
        'current page. The daemon binds to 127.0.0.1 only (ADR-024) and must already be running — ' +
        'start it with `/mindforge:browse --start` first; this tool never spawns it. Arbitrary JS ' +
        'evaluation and native-browser cookie import are intentionally NOT exposed here.',
      inputSchema: browseSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async (args) => safe('browse', async () => {
      const session = args.session ?? 'default';
      await ensureDaemonRunning(PROJECT_ROOT);
      switch (args.action) {
        case 'status':
          return browserRequest(PROJECT_ROOT, 'GET', '/status');
        case 'navigate':
          if (!args.url) throw new Error('action=navigate requires a `url` argument');
          return browserRequest(PROJECT_ROOT, 'POST', '/navigate', { url: args.url, session });
        case 'click':
          if (!args.selector && !args.text) throw new Error('action=click requires `selector` or `text`');
          return browserRequest(PROJECT_ROOT, 'POST', '/click', { selector: args.selector, text: args.text, session });
        case 'type':
          if (!args.selector || args.text === undefined) throw new Error('action=type requires `selector` and `text`');
          return browserRequest(PROJECT_ROOT, 'POST', '/type', { selector: args.selector, text: args.text, session });
        case 'screenshot':
          return browserRequest(PROJECT_ROOT, 'POST', '/screenshot', { session });
        case 'assert':
          if (!args.assertType) throw new Error('action=assert requires `assertType`');
          return browserRequest(PROJECT_ROOT, 'POST', '/assert', {
            type: args.assertType, selector: args.selector, expected_text: args.expectedText, session,
          });
        default:
          throw new Error(`Unsupported action: ${String(args.action)}`);
      }
    })
  );
  ```

  Rebuild: `cd mcp-server && npm run build` (runs `tsc --noEmit` then `node build.mjs`, producing `mcp-server/dist/index.js`).

- [ ] Run it and confirm it passes: `node tests/mcp-server-browse-tool.test.js` — expected output ends with `MCP Browse Tool: 3 passed, 0 failed, 0 skipped`.

- [ ] Commit:
  ```bash
  git add mcp-server/src/browser-client.ts mcp-server/src/index.ts tests/mcp-server-browse-tool.test.js
  git commit -m "feat(mcp-server): add mindforge_browse, the 8th MCP tool, proxying the browser daemon"
  ```
  Note: do not commit `mcp-server/dist/` (gitignored build output) in this task — the tracked plugin bundle is regenerated and committed in Task 5.

---

### Task 5: Tool-surface drift guard, documentation updates, and the tracked plugin bundle

**Files:**
- Create (test): `tests/mcp-server-tool-surface.test.js`
- Modify: `mcp-server/package.json` (description field)
- Modify: `mcp-server/src/index.ts` (header comment, lines 14-16)
- Modify: `mcp-server/README.md` (tools table + "Transport & security" section)
- Modify: `docs/getting-started.md` (line ~51, tool count + list)
- Rebuild/copy: `plugins/mindforge/mcp/dist/index.js` (tracked build artifact)

**Interfaces:**
- Consumes: `mindforge_browse` registered in Task 4; the `sourceToolNames()`/`listTools()` pattern mirrors `tests/mcp-server-version.test.js`'s `readServerInfo()`.
- Produces: nothing new for later tasks (final task).

- [ ] Write the failing test at `tests/mcp-server-tool-surface.test.js`:
  ```javascript
  /**
   * MindForge — MCP tool surface drift guard.
   * Same class of drift tests/mcp-server-version.test.js guards for the version string,
   * applied to the TOOL LIST: mcp-server/src/index.ts is the source of truth for which
   * tools are registered, and both dist/index.js (built) and
   * plugins/mindforge/mcp/dist/index.js (checked-in, copied at release time) must expose
   * exactly that set over a real MCP tools/list call.
   *
   * Run: node tests/mcp-server-tool-surface.test.js
   *      MF_REQUIRE_MCP_BUNDLE=1 node tests/mcp-server-tool-surface.test.js
   */
  'use strict';

  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const assert = require('assert');
  const { spawnSync } = require('child_process');

  const ROOT = path.resolve(__dirname, '..');
  const SRC_PATH = path.join(ROOT, 'mcp-server', 'src', 'index.ts');
  const BUNDLE_PATH = path.join(ROOT, 'mcp-server', 'dist', 'index.js');
  const PLUGIN_BUNDLE_PATH = path.join(ROOT, 'plugins', 'mindforge', 'mcp', 'dist', 'index.js');
  const REQUIRE_BUNDLE = process.env.MF_REQUIRE_MCP_BUNDLE === '1';

  let passed = 0, failed = 0, skipped = 0;
  const tests = [];
  function test(name, fn) { tests.push({ name, fn }); }

  function sourceToolNames() {
    const src = fs.readFileSync(SRC_PATH, 'utf8');
    const names = [];
    const re = /registerTool\(\s*\n?\s*'([a-zA-Z_]+)'/g;
    let m;
    while ((m = re.exec(src)) !== null) names.push(m[1]);
    return names.sort();
  }

  function listTools(entryPath) {
    const request = [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'mf-toolsurface', version: '0' } } },
      { jsonrpc: '2.0', method: 'notifications/initialized', params: {} },
      { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
    ].map((r) => JSON.stringify(r)).join('\n') + '\n';

    const proc = spawnSync(process.execPath, [entryPath], {
      input: request, encoding: 'utf8', timeout: 20000,
      env: { PATH: process.env.PATH, CLAUDE_PROJECT_DIR: os.tmpdir() },
    });
    const reply = String(proc.stdout || '').split('\n').filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .find((f) => f && f.id === 2);
    const names = reply && reply.result ? reply.result.tools.map((t) => t.name).sort() : null;
    return { names, diagnostics: `status=${proc.status} signal=${proc.signal} stderr=${String(proc.stderr || '').slice(0, 300)}` };
  }

  test('mcp-server/src/index.ts registers exactly 8 tools including mindforge_browse', () => {
    const names = sourceToolNames();
    assert.strictEqual(names.length, 8, `expected 8 registerTool() calls, found ${names.length}: ${names.join(', ')}`);
    assert.ok(names.includes('mindforge_browse'), 'mindforge_browse must be registered in src/index.ts');
  });

  test('the vendored plugin bundle exposes exactly the tools declared in src/index.ts', () => {
    const expected = sourceToolNames();
    const { names, diagnostics } = listTools(PLUGIN_BUNDLE_PATH);
    assert.ok(names, `plugin bundle tools/list did not answer (${diagnostics})`);
    assert.deepStrictEqual(names, expected,
      `plugins/mindforge/mcp/dist/index.js tool list ${JSON.stringify(names)} != source ${JSON.stringify(expected)} — ` +
      'rebuild and copy the bundle: `npm --prefix mcp-server run build && cp mcp-server/dist/index.js plugins/mindforge/mcp/dist/index.js`');
  });

  test('the BUILT mcp-server bundle exposes exactly the tools declared in src/index.ts', () => {
    if (!fs.existsSync(BUNDLE_PATH)) {
      const why = 'mcp-server/dist/index.js is absent (build it with `cd mcp-server && npm install && npm run build`)';
      assert.ok(!REQUIRE_BUNDLE, `MF_REQUIRE_MCP_BUNDLE=1 demands this check, but ${why}`);
      console.log(`\n  !  NOT RUN: ${why}\n`);
      return 'SKIP: ' + why;
    }
    const expected = sourceToolNames();
    const { names, diagnostics } = listTools(BUNDLE_PATH);
    assert.ok(names, `built bundle tools/list did not answer (${diagnostics})`);
    assert.deepStrictEqual(names, expected, `built bundle tool list ${JSON.stringify(names)} != source ${JSON.stringify(expected)} (${diagnostics})`);
  });

  (async () => {
    for (const { name, fn } of tests) {
      try {
        const result = await fn();
        if (typeof result === 'string' && result.startsWith('SKIP:')) { console.log(`  o  ${name}\n      ${result}`); skipped++; }
        else { console.log(`  PASS  ${name}`); passed++; }
      } catch (e) { console.error(`  FAIL  ${name}\n      ${e.message}`); failed++; }
    }
    console.log(`\nMCP Tool Surface: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    if (failed > 0) process.exit(1);
  })();
  ```

- [ ] Run it and confirm it fails: `node tests/mcp-server-tool-surface.test.js` — expected failure on the second test: `plugins/mindforge/mcp/dist/index.js tool list [...7 names...] != source [...8 names...]` (the tracked plugin bundle from before Task 4 still only has 7 tools).

- [ ] Write the minimal implementation:
  1. Rebuild and copy the tracked plugin bundle:
     ```bash
     cd mcp-server && npm run build && cd ..
     cp mcp-server/dist/index.js plugins/mindforge/mcp/dist/index.js
     ```
  2. Update `mcp-server/package.json`'s `description` field:
     ```
     "description": "MindForge MCP server — exposes the MindForge engine (knowledge graph, project health, audit log) and the MindForge browser daemon to Claude Code and any MCP host as 8 stdio tools. Self-contained, zero runtime dependencies.",
     ```
  3. Update the header comment in `mcp-server/src/index.ts` (lines 14-16):
     ```
      *  - Tool surface: 6 read-only tools + 1 guarded write (mindforge_memory_remember) +
      *    1 guarded, open-world browse proxy (mindforge_browse, added to expose the existing
      *    /mindforge:browse Playwright daemon to any MCP host), annotated honestly
     ```
  4. Update `mcp-server/README.md`: add a row to the tools table
     ```
     | `mindforge_browse` | **write** (guarded, open-world) | Drive the MindForge browser daemon: status/navigate/click/type/screenshot/assert. Requires the daemon to already be running (`/mindforge:browse --start`); never spawns it, and never exposes JS eval or cookie import. |
     ```
     and correct the "Transport & security" bullet that currently says "no network egress":
     ```
     - **Scope:** read/append only within `CLAUDE_PROJECT_DIR`, plus a loopback-only proxy to the MindForge browser daemon (`mindforge_browse`) — no shell execution. The MCP server process itself only ever talks to `127.0.0.1`; the daemon (a separate, pre-existing process this server never spawns) performs the actual browser network egress when a page navigates.
     ```
  5. Update `docs/getting-started.md` line ~51:
     ```
     Run the MindForge MCP server (`mindforge-mcp-server`) over stdio — it exposes 8 tools (6 read-only, 1 guarded write, plus 1 guarded browse proxy): `mindforge_health`, `mindforge_status`, `mindforge_memory_query`, `mindforge_memory_stats`, `mindforge_memory_find_related`, `mindforge_audit_log`, `mindforge_memory_remember`, and `mindforge_browse`.
     ```

- [ ] Run it and confirm it passes: `node tests/mcp-server-tool-surface.test.js` — expected output ends with `MCP Tool Surface: 3 passed, 0 failed, 0 skipped`. Then run the full suite to confirm no regressions: `node tests/run-all.js` — expected exit code 0.

- [ ] Commit:
  ```bash
  git add tests/mcp-server-tool-surface.test.js mcp-server/package.json mcp-server/src/index.ts \
          mcp-server/README.md docs/getting-started.md plugins/mindforge/mcp/dist/index.js
  git commit -m "docs(mcp-server): document mindforge_browse as the 8th tool and guard tool-list drift"
  ```

---

## Self-Review

- Every research item is covered: mechanism resolution (header), browser-harness alternative (header), daemon endpoints/auth/localhost-bind (Task 1-3, verified against the actual `bin/browser/browser-daemon.js` source), mcp-server tool-registration pattern (Task 4, verified against the actual `mcp-server/src/index.ts` source and a real `tools/list`/`tools/call` wire capture), ADR-024/ADR-017 (Global Constraints + Spec — ADR-017 corrected to "does not substantively exist"), `/mindforge:browse` client-side call pattern (Task 4's `browser-client.ts` mirrors `daemon-manager.js#request()` exactly), test conventions (every test file follows the two conventions actually found in `tests/`: `test(name, fn)` + tally, or `// @skip:`), rate-limiting precedent (Spec — none found, not invented, honest annotations used instead).
- No placeholders: every code block is complete and was checked against the real current file it modifies or a real wire capture from the currently-built `mcp-server/dist/index.js` (verified live during planning: `tools/list` on `mindforge_health` etc., and a zod `invalid_enum_value` rejection on `mindforge_memory_query`).
- Signature consistency: `browser-client.ts`'s `ensureDaemonRunning(projectRoot)` / `browserRequest(projectRoot, method, endpoint, body)` are used identically in Task 4's `index.ts` edit; `daemon-auth.js`'s `requiresAuth(urlPath)` / `isAuthValid(authHeader, token)` are used identically in Task 3's `browser-daemon.js` edit; Task 2's `readToken()` is local to `daemon-manager.js` and not exported (no cross-task signature to check).
- Task ordering is load-bearing: Task 2 (daemon-manager sends the token) is deliberately sequenced *before* Task 3 (daemon enforces the token everywhere), so existing callers (`qa-engine.js`, `visual-verify-executor.js`) are never locked out mid-plan.
