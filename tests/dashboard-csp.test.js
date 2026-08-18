/**
 * Guards the dashboard against being inert under its own Content-Security-Policy.
 *
 * THE DEFECT. bin/dashboard/server.js sets `script-src 'self'` on every response, and
 * bin/dashboard/frontend/index.html held the ENTIRE application in one inline <script> at line 373 of
 * 757, plus 10 inline on* attribute handlers. Both are blocked by that directive. Measured in a real
 * headless browser against a live server:
 *
 *     [error] Executing inline script violates the following Content Security Policy directive
 *             'script-src 'self''. The action has been blocked.
 *     typeof window.showPage   ->  undefined
 *     GET /api/connections     ->  {"clients":0}
 *
 * while the static HTML displayed "● Connected" and "SSE STREAMING ACTIVE". The page returned HTTP
 * 200 and affirmatively reported health it could not have had — because the only code that could have
 * contradicted it was the code being blocked. That is the same defect class as a gate that cannot
 * fail, expressed in a UI.
 *
 * THE FIX externalises the script to app.js, served from the same origin, and converts the 10 inline
 * handlers to addEventListener. It does NOT weaken the policy: adding 'unsafe-inline', a hash, or a
 * nonce would each have restored the <script> while leaving all 10 attribute handlers dead, since
 * those need 'unsafe-hashes' or removal. After the fix, measured the same way: no console errors,
 * window.showPage is a function, one active page, a nav click switches to `metrics`, and
 * /api/connections reports {"clients":1}.
 *
 * A SECOND LATENT BUG surfaced: the inline script ended with a top-level `showPage('activity')` while
 * sitting ABOVE the `.page` elements it queries, so it ran during parsing, matched nothing, and did
 * nothing. `defer` on the external script fixes that too — the CSP block had been masking it.
 *
 * These tests are HTTP- and source-level rather than browser-driven, deliberately: tests/browser.test.js
 * is already an env-dependent skip in this suite, and a required check that silently skips is worth
 * less than one that always runs. The browser verification above was performed by hand and is recorded
 * here so the numbers are reproducible.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const SERVER = path.join(REPO_ROOT, 'bin', 'dashboard', 'server.js');
const FRONTEND_DIR = path.join(REPO_ROOT, 'bin', 'dashboard', 'frontend');
const INDEX = path.join(FRONTEND_DIR, 'index.html');
const APP_JS = path.join(FRONTEND_DIR, 'app.js');
const PORT = 7451;

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function get(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path: pathname, timeout: 8000 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
  });
}

/**
 * The server writes a 0600 bearer token and a PID file into its CWD at module load, so it must never
 * be started with the repo as cwd. A tmpdir also keeps the repo's own .planning/ out of reach.
 */
async function withServer(fn) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-csp-')));
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.mindforge'), { recursive: true });
  const child = spawn(process.execPath, [SERVER, '--port', String(PORT), '--no-open'], {
    cwd: dir, stdio: 'ignore', env: { ...process.env, HOME: dir },
  });
  try {
    for (let i = 0; i < 40; i++) {
      try { await get('/'); break; } catch { await new Promise((s) => setTimeout(s, 250)); }
    }
    return await fn();
  } finally {
    child.kill('SIGTERM');
    await new Promise((s) => setTimeout(s, 400));
    if (!child.killed) child.kill('SIGKILL');
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ── the source-level invariants ──────────────────────────────────────────────

test('index.html contains NO inline script and NO inline event handlers', () => {
  const html = fs.readFileSync(INDEX, 'utf8');
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/.test(html),
    'an inline <script> is blocked by the server\'s own script-src \'self\' — the whole application '
    + 'silently never executes, while the page still renders and returns 200');
  const handlers = html.match(/\son[a-z]+\s*=\s*"/gi) || [];
  assert.deepStrictEqual(handlers, [],
    `${handlers.length} inline on* handler(s) remain: ${handlers.join(', ')}. These are blocked by the `
    + 'SAME directive as an inline script, so externalising the script without converting them would '
    + 'leave every control dead.');
});

test('the application is loaded as an external, deferred script', () => {
  const html = fs.readFileSync(INDEX, 'utf8');
  assert.match(html, /<script\s+src="app\.js"\s+defer><\/script>/,
    'app.js must be loaded with defer. Without defer it executes during parsing, above the .page '
    + 'elements its top-level showPage(\'activity\') call queries — which is how that call silently '
    + 'did nothing before this change.');
  assert.ok(fs.existsSync(APP_JS), 'bin/dashboard/frontend/app.js must exist');
  const js = fs.readFileSync(APP_JS, 'utf8');
  assert.match(js, /addEventListener\('click'/, 'the converted handlers must be addEventListener bindings');
  assert.match(js, /data-page/, 'nav buttons are wired by data-page attribute');
});

test('the CSP was NOT weakened to make the app run', () => {
  // The load-bearing assertion. 'unsafe-inline', a hash, or a nonce would each have made the inline
  // script run — and each would have been the wrong fix, because none of them revives an inline on*
  // attribute handler. Externalising is what satisfies the policy as written.
  // Read the LINE and unescape, rather than capturing with a quote-aware regex. The first version
  // used /'([^']*(?:\\'[^']*)*)'/ and captured only `default-src \\` — because [^']* happily consumes
  // the backslash in `\\'self\\'` and then stops at the quote it was meant to skip. The test failed
  // with "script-src must still allow same-origin scripts" against a CSP that plainly contained it:
  // a broken extractor reporting a policy defect. Simpler is more honest here.
  const src = fs.readFileSync(SERVER, 'utf8');
  const line = src.split('\n').find((l) => l.includes('Content-Security-Policy'));
  assert.ok(line, 'the CSP header must still be set');
  // Single quotes throughout, per eslint.config.mjs. A regex replace avoids needing a double-quoted
  // literal to hold an escaped single quote, which is what tripped the project's quote rule twice.
  const value = line.replace(/\\'/g, String.fromCharCode(39));
  assert.match(value, /script-src [^;]*'self'/, 'script-src must still allow same-origin scripts');
  assert.ok(!/script-src[^;]*'unsafe-inline'/.test(value),
    `script-src must NOT permit 'unsafe-inline'. Got: ${value}`);
  assert.ok(!/script-src[^;]*'unsafe-hashes'/.test(value),
    `script-src must NOT permit 'unsafe-hashes'. Got: ${value}`);
  assert.ok(!/script-src[^;]*(sha256-|nonce-)/.test(value),
    `script-src must not carry a hash or nonce — the fix is externalisation. Got: ${value}`);
});

test('the static shell does not assert health before any code has confirmed it', () => {
  // It used to ship "● Connected" and "SSE STREAMING ACTIVE" as literal markup, so a browser with the
  // script blocked displayed a healthy dashboard. The only code that would have written
  // "● Disconnected" was inside the blocked script.
  const html = fs.readFileSync(INDEX, 'utf8');
  assert.ok(!/>\s*●\s*Connected\s*</.test(html),
    'the shell must not render "● Connected" as static markup — with scripts blocked that is a claim '
    + 'nothing can retract');
  assert.ok(!/SSE STREAMING ACTIVE/.test(html),
    'the shell must not render "SSE STREAMING ACTIVE" statically');
  assert.match(html, /Connecting…|Connecting\.\.\./,
    'the initial state must be provisional, so a blocked or failed script leaves an honest reading');
});

// ── the behavioural invariants ───────────────────────────────────────────────

test('the server actually serves app.js as JavaScript', async () => {
  await withServer(async () => {
    const root = await get('/');
    assert.strictEqual(root.status, 200, 'the shell must still be served');
    assert.match(root.headers['content-security-policy'] || '', /script-src 'self'/,
      'the response must still carry the strict policy');

    const app = await get('/app.js');
    assert.strictEqual(app.status, 200,
      'app.js must be reachable — an externalised script that 404s is worse than an inline one, '
      + 'because the page renders and reports nothing wrong');
    assert.match(app.headers['content-type'] || '', /javascript/,
      `app.js must be served as JavaScript, got ${app.headers['content-type']}`);
    assert.ok(app.body.includes('function showPage'),
      'the served body must be the real application, not an error page');
  });
});

test('the asset allowlist has exactly one member', () => {
  // Behavioural probing alone did NOT catch this. Adding 'server.js' to FRONTEND_ASSETS left every
  // request test green, because the route resolves names INSIDE frontend/ and no server.js exists
  // there — so the request 404s and `notStrictEqual(status, 200)` is satisfied. The test passed for
  // the wrong reason, which is the defect class this whole audit is about.
  //
  // Pinning the membership catches any addition, whether or not a file of that name happens to exist
  // in frontend/ today. A future file landing there would make a stale allowlist entry live.
  const src = fs.readFileSync(SERVER, 'utf8');
  const m = src.match(/const FRONTEND_ASSETS = new Set\(\[([^\]]*)\]\)/);
  assert.ok(m, 'FRONTEND_ASSETS must be declared as an explicit Set literal, not computed');
  const members = m[1].split(',').map((x) => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  assert.deepStrictEqual(members, ['app.js'],
    `the asset route must expose exactly app.js, got [${members.join(', ')}]. Every addition widens `
    + 'what the dashboard serves from disk; add a deliberate test alongside any new entry.');
});

test('the asset route serves ONLY the allowlisted file', async () => {
  // An explicit allowlist rather than express.static, so nothing else that later lands in frontend/
  // becomes reachable. Traversal is checked too: the allowlist forbids it, and the route re-resolves
  // and compares directories so a future edit cannot turn this into a file-read primitive.
  await withServer(async () => {
    for (const attempt of ['/server.js', '/index.html', '/../server.js', '/..%2fserver.js']) {
      const r = await get(attempt);
      assert.notStrictEqual(r.status, 200,
        `${attempt} must not be served by the asset route (got ${r.status})`);
      assert.ok(!String(r.body).includes('Content-Security-Policy'),
        `${attempt} appears to have leaked server source`);
    }
  });
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nDashboard CSP: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
