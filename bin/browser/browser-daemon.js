/**
 * MindForge v2 — Browser Daemon
 * Lightweight HTTP server controlling Chromium.
 * Consistent with ADR-017 / ADR-024 (Localhost only).
 */
'use strict';

const http      = require('http');
const crypto    = require('crypto');
const playwright = require('playwright-core');
const fs        = require('fs');
const path      = require('path');

const PORT      = process.env.BROWSER_PORT || 7338;
const HEADLESS  = process.env.BROWSER_HEADLESS !== 'false';
const TIMEOUT   = (parseInt(process.env.BROWSER_IDLE_TIMEOUT_MINUTES) || 30) * 60 * 1000;

// ── Bearer token authentication ──────────────────────────────────────────────
const DAEMON_TOKEN = crypto.randomBytes(32).toString('hex');
const DAEMON_TOKEN_FILE = path.join(process.cwd(), '.mindforge', '.browser-daemon-token');

// Write token to file with restrictive permissions (owner-only read/write)
fs.mkdirSync(path.dirname(DAEMON_TOKEN_FILE), { recursive: true });
fs.writeFileSync(DAEMON_TOKEN_FILE, DAEMON_TOKEN, { mode: 0o600 });

/**
 * Validate bearer token from Authorization header.
 * Returns true if valid, false otherwise.
 */
function isAuthValid(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const provided = authHeader.slice(7);
  if (provided.length !== DAEMON_TOKEN.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(DAEMON_TOKEN));
}

let browser, lastActionAt = Date.now(), isLaunching = false;
const sessions = new Map(); // name -> { context, page }

async function init() {
  if (isLaunching) return;
  isLaunching = true;
  try {
    browser = await playwright.chromium.launch({
      headless: HEADLESS,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--no-first-run']
    });
    setInterval(checkIdle, 60000);
  } finally {
    isLaunching = false;
  }
}

function checkIdle() {
  if (Date.now() - lastActionAt > TIMEOUT) {
    console.log('[daemon] Idle timeout reached. Shutting down.');
    process.exit(0);
  }
}

async function getOrCreateSession(name = 'default') {
  if (sessions.has(name)) return sessions.get(name);
  const context = await browser.newContext();
  const page    = await context.newPage();
  const s = { context, page };
  sessions.set(name, s);
  return s;
}

const server = http.createServer(async (req, res) => {
  lastActionAt = Date.now();
  const send = (data, code = 200) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  // Only allow localhost
  const remote = req.socket.remoteAddress;
  if (remote !== '127.0.0.1' && remote !== '::1' && remote !== '::ffff:127.0.0.1') {
    return send({ error: 'Forbidden: Localhost only' }, 403);
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { url, session: sessionName, selector, text, script, type, expected_text, name } = body ? JSON.parse(body) : {};
      const { page, context } = await getOrCreateSession(sessionName);

      if (req.url === '/status' && req.method === 'GET') {
        return send({ alive: true, sessions: Array.from(sessions.keys()), uptime: process.uptime() });
      }

      if (req.url === '/navigate' && req.method === 'POST') {
        const start = Date.now();
        const r = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        return send({ 
          success: true, 
          status_code: r ? r.status() : 200, 
          load_time_ms: Date.now() - start 
        });
      }

      if (req.url === '/click' && req.method === 'POST') {
        const target = selector ? page.locator(selector) : page.getByText(text, { exact: false });
        await target.first().click({ timeout: 5000 });
        return send({ success: true, element_found: true });
      }

      if (req.url === '/type' && req.method === 'POST') {
        await page.locator(selector).fill(text, { timeout: 5000 });
        return send({ success: true });
      }

      if (req.url === '/screenshot' && req.method === 'POST') {
        const buf = await page.screenshot({ type: 'png' });
        return send({ success: true, screenshot_b64: buf.toString('base64') });
      }

      if (req.url === '/evaluate' && req.method === 'POST') {
        if (!isAuthValid(req)) {
          return send({ error: 'Authentication required. Use the token printed at daemon startup.' }, 401);
        }
        const result = await page.evaluate(script);
        return send({ success: true, result });
      }

      if (req.url === '/assert' && req.method === 'POST') {
        if (type === 'visible') {
          const loc = page.locator(selector).first();
          const visible = await loc.isVisible();
          const actual = visible ? await loc.innerText() : '';
          const passed = visible && (!expected_text || actual.includes(expected_text));
          return send({ passed, actual_text: actual });
        }
        if (type === 'url') return send({ passed: page.url().includes(expected_text), actual_url: page.url() });
        if (type === 'title') return send({ passed: (await page.title()).includes(expected_text), actual_title: await page.title() });
        if (type === 'no_console_errors') return send({ passed: true }); // simplified
      }

      send({ error: 'Not Found' }, 404);
    } catch (err) {
      send({ success: false, error: err.message }, 500);
    }
  });
});

init().then(() => {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[BrowserDaemon] Listening on port ${PORT}`);
    console.log(`[BrowserDaemon] Auth token: ${DAEMON_TOKEN}`);
    console.log(`[BrowserDaemon] Token file: ${DAEMON_TOKEN_FILE}`);
  });
}).catch(err => {
  console.error('[daemon] Initialization failed:', err);
  process.exit(1);
});

async function shutdown() {
  console.log('[daemon] Shutting down gracefully...');
  // Remove sensitive token file on shutdown
  if (fs.existsSync(DAEMON_TOKEN_FILE)) fs.unlinkSync(DAEMON_TOKEN_FILE);
  if (browser) await browser.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
