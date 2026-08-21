#!/usr/bin/env node
/**
 * MindForge v2 — Dashboard Server
 * Real-time web observability at localhost:7339.
 *
 * Usage:
 *   node bin/dashboard/server.js [--port 7339] [--open]
 *   /mindforge:dashboard [--port 7339] [--open] [--stop] [--status]
 *
 * Security: binds to 127.0.0.1 only (ADR-017 policy).
 * Bearer token auth on all mutating endpoints (POST/PUT/DELETE).
 * Token printed to console at startup and written to .mindforge/.dashboard-token.
 */
'use strict';

const http   = require('http');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const ARGS   = process.argv.slice(2);

const PORT     = parseInt(ARGS.find((_, i, a) => a[i-1] === '--port') || '7339', 10);
const OPEN_BROWSER = ARGS.includes('--open');
const PID_FILE = path.join(process.cwd(), '.planning', 'dashboard-server.pid');

// ── Lifecycle flags: --status and --stop ──────────────────────────────────────
//
// THE DEFECT. `--stop` and `--status` were documented in four places and implemented in none. The
// shipped slash command `.claude/commands/mindforge/dashboard.md` listed both in its Usage line and
// gave each a worked example; docs/user-guide.md documented a `--start` that never existed either.
// Worst of all, THIS FILE told the operator to run one of them: on EADDRINUSE it printed
// "[dashboard] Stop it: /mindforge:dashboard --stop". Only `--port` and `--open` were ever parsed,
// so every one of those instructions did nothing but start a second server.
//
// They are implemented rather than deleted because the PID file below already exists to support
// them — it is written on listen and removed on shutdown, so the information was there all along.
//
// This runs BEFORE express is required, deliberately. This module has no `require.main` guard and
// starts a server as a side effect of loading, so a lifecycle flag has to be handled and exited
// here or `--stop` would stop the old server and start a new one. It also means `--status` works
// when express is not installed, which is exactly when an operator is most likely to ask.
if (ARGS.includes('--status') || ARGS.includes('--stop')) {
  const { execFileSync } = require('child_process');

  /** Read the recorded pid, or null when there is no usable PID file. */
  const readPid = () => {
    try {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
      return Number.isInteger(pid) && pid > 0 ? pid : null;
    } catch { return null; }
  };

  /** Signal 0 tests for existence and permission without delivering anything. */
  const isAlive = (pid) => {
    try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
  };

  /**
   * Confirm the pid is THIS dashboard before signalling it.
   *
   * A PID file is not proof: the recorded process can exit without cleanup (a SIGKILL, a power
   * loss) and the operating system will reuse the number. Sending SIGTERM on the strength of a
   * stale file means killing an unrelated process the operator never asked about — so identity is
   * verified from the process table and, when it cannot be verified, this REFUSES. That is the same
   * choice the audit writer and the vector-hub conflict path make: declining loudly beats acting on
   * a guess.
   *
   * Returns the command line on success, or null when identity could not be established.
   */
  const identify = (pid) => {
    if (process.platform === 'win32') return null;      // no ps; --stop refuses below
    try {
      const cmd = execFileSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8' }).trim();

      // IDENTITY, not shape. Two earlier versions of this check were both too loose, and the second
      // was the more dangerous:
      //
      //   /dashboard[/\\]server\.js/                       matched any process whose command line
      //                                                    MENTIONED the path — a shell running a
      //                                                    script that referenced it got a SIGTERM
      //   /^\S*node...\S*dashboard[/\\]server\.js(\s|$)/   matched any `node <anything>/dashboard/
      //                                                    server.js`. `dashboard/server.js` is an
      //                                                    utterly ordinary path: this would have
      //                                                    signalled an UNRELATED app's dashboard
      //                                                    (verified against
      //                                                    `node /var/www/unrelated_app/dashboard/server.js`)
      //
      // Anchoring made the first mistake unreachable and left a worse one, because both were asking
      // "does this look like a dashboard server" when the only safe question is "is this THE one I am".
      // So the script argument is resolved and compared against this file's own realpath.
      //
      // A relative script path cannot be resolved from here — it would need the target process's cwd,
      // which ps does not give us — so that case REFUSES rather than guessing. Same choice as
      // commitDb's conflict path: declining loudly beats acting on a guess, and the cost of being
      // wrong here is someone else's process dying.
      const m = /^\S*node(?:\.exe)?\s+(\S+)/.exec(cmd);
      if (!m) return null;
      const script = m[1];
      if (!path.isAbsolute(script)) return null;        // unresolvable without the target's cwd
      let resolved;
      let self;
      try {
        resolved = fs.realpathSync(script);
        self = fs.realpathSync(__filename);
      } catch { return null; }                          // script gone, or unreadable — refuse
      return resolved === self ? cmd : null;
    } catch { return null; }
  };

  const pid = readPid();
  const alive = pid !== null && isAlive(pid);

  if (ARGS.includes('--status')) {
    if (!alive) {
      console.log(pid === null
        ? '[dashboard] not running (no PID file)'
        : `[dashboard] not running (stale PID file records ${pid})`);
      process.exit(1);
    }
    const cmd = identify(pid);
    // No port claimed. PORT here is whatever THIS invocation was told, not what the running
    // process bound — measured, `--status` on a server started with --port 7466 printed "port 7339",
    // the default this process happened to receive. The PID file records only the pid, so the port is
    // not knowable from here, and stating a number we cannot know is the defect this file is full of
    // fixes for.
    console.log(`[dashboard] running — pid ${pid}`);
    if (!cmd && process.platform !== 'win32') {
      console.log(`[dashboard] warning: pid ${pid} is alive but does not look like this server, so `
        + 'the PID file may be stale and the number reused');
    }
    process.exit(0);
  }

  // --stop
  if (!alive) {
    console.error(pid === null
      ? '[dashboard] nothing to stop (no PID file)'
      : `[dashboard] nothing to stop (stale PID file records ${pid})`);
    if (pid !== null) { try { fs.rmSync(PID_FILE, { force: true }); } catch { /* best effort */ } }
    process.exit(1);
  }
  if (process.platform === 'win32') {
    console.error(`[dashboard] REFUSING to stop pid ${pid}: process identity cannot be verified on `
      + 'this platform. Stop the server with CTRL+C in its own terminal.');
    process.exit(1);
  }
  if (!identify(pid)) {
    console.error(`[dashboard] REFUSING to stop pid ${pid}: it is running, but is not this `
      + 'dashboard. The PID file is stale and the number has been reused — signalling it would kill '
      + `an unrelated process. Delete ${PID_FILE} if you are sure it is obsolete.`);
    process.exit(1);
  }
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`[dashboard] SIGTERM sent to pid ${pid}`);
    process.exit(0);
  } catch (err) {
    console.error(`[dashboard] could not stop pid ${pid}: ${err.message}`);
    process.exit(1);
  }
}
const FRONTEND = path.join(__dirname, 'frontend', 'index.html');

// ── Load dependencies gracefully ──────────────────────────────────────────────
let express;
try {
  express = require('express');
} catch {
  console.error('[dashboard] express not installed. Run: npm install express');
  process.exit(1);
}

const SSE    = require('./sse-bridge');
const API    = require('./api-router');
const TemporalAPI = require('./temporal-api');
const RevOpsAPI   = require('./revops-api');
const { newCorrelationId } = require('./error-response');

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();

// ── Bearer token authentication ──────────────────────────────────────────────
let currentToken = crypto.randomBytes(32).toString('hex');
const TOKEN_FILE = path.join(process.cwd(), '.mindforge', '.dashboard-token');
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
let tokenCreatedAt = Date.now();

function isTokenExpired() {
  return (Date.now() - tokenCreatedAt) > TOKEN_EXPIRY_MS;
}

// Write token to file with restrictive permissions (owner-only read/write)
fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
fs.writeFileSync(TOKEN_FILE, currentToken, { mode: 0o600 });

/**
 * requireAuth — Validates Bearer token on mutating requests (POST/PUT/DELETE).
 * GET requests pass through unguarded for the dashboard UI.
 */
function requireAuth(req, res, next) {
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();

  // Check token expiration first
  if (isTokenExpired()) {
    return res.status(401).json({ error: 'token_expired' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Use the token printed at dashboard startup.'
    });
  }

  const provided = authHeader.slice(7);
  // Constant-time comparison to prevent timing attacks
  const tokenBuf = Buffer.from(currentToken);
  const providedBuf = Buffer.from(provided);
  if (tokenBuf.length !== providedBuf.length || !crypto.timingSafeEqual(providedBuf, tokenBuf)) {
    return res.status(401).json({
      error: 'Authentication required. Use the token printed at dashboard startup.'
    });
  }

  next();
}

// ── Rate limiting (100 req/min/IP) ───────────────────────────────────────────
const rateLimitMap = new Map(); // ip -> { count, resetAt }
const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60000;

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateLimitMap.set(ip, entry);
  }

  entry.count++;

  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({
      error: 'rate_limit_exceeded',
      retry_after_ms: entry.resetAt - now
    });
  }

  next();
}

// Periodically clean stale rate-limit entries to prevent memory growth
const rateLimitCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);
if (rateLimitCleanupInterval.unref) rateLimitCleanupInterval.unref();

// Security middleware
app.use((req, res, next) => {
  const addr = req.socket.remoteAddress;
  const isLocal = addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
  if (!isLocal) {
    return res.status(403).json({ error: 'Dashboard is localhost-only' });
  }
  next();
});

// ── Rate limiting — applied after localhost check, before auth ────────────────
app.use(rateLimitMiddleware);

// CORS — restrict to dashboard's own origin only (prevent cross-origin attacks)
const DASHBOARD_ORIGIN = `http://127.0.0.1:${PORT}`;
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin === DASHBOARD_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', DASHBOARD_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Vary', 'Origin');
  }
  // Reject cross-origin requests from other localhost ports/origins
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(express.json({ limit: '64kb' })); // Limit request body size

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store'); // Never cache dashboard responses
  res.setHeader('Content-Security-Policy', 'default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; connect-src \'self\'');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── Apply requireAuth to mutating API routes ─────────────────────────────────
app.use('/api', requireAuth);

// ── Static frontend ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (!fs.existsSync(FRONTEND)) {
    return res.status(503).send('<h1>Dashboard frontend not found</h1><p>Run: npm run build:dashboard</p>');
  }
  res.sendFile(FRONTEND);
});

// The application itself, as an EXTERNAL script. It used to be an inline <script> in index.html,
// which this server's own CSP (`script-src 'self'`, set above) blocks — so the whole front end never
// executed while the static shell displayed "● Connected". Measured in a headless browser:
// "Executing inline script violates ... 'script-src 'self''. The action has been blocked.",
// typeof window.showPage === undefined, and GET /api/connections === {"clients":0}.
//
// Serving it from the same origin satisfies the existing policy WITHOUT weakening it — no
// 'unsafe-inline', no hash, no nonce. An explicit route rather than express.static: the frontend
// directory is the only thing that should be reachable, and a static mount would expose whatever else
// lands there later.
const FRONTEND_ASSETS = new Set(['app.js']);
app.get('/:asset', (req, res, next) => {
  if (!FRONTEND_ASSETS.has(req.params.asset)) return next();
  const file = path.join(path.dirname(FRONTEND), req.params.asset);
  // Defence in depth: the allowlist already forbids traversal, but resolve and re-check anyway so a
  // future edit to FRONTEND_ASSETS cannot turn this into a file-read primitive.
  if (path.dirname(path.resolve(file)) !== path.dirname(path.resolve(FRONTEND))) return next();
  if (!fs.existsSync(file)) return res.status(404).send('// asset not found');
  res.type('application/javascript');
  return res.sendFile(file);
});

// ── Token refresh endpoint (requires valid existing token) ───────────────────
app.post('/api/v1/token/refresh', requireAuth, (req, res) => {
  const newToken = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(TOKEN_FILE, newToken, { mode: 0o600 });
  tokenCreatedAt = Date.now();
  currentToken = newToken;
  res.json({ success: true, token: newToken, expires_in_ms: TOKEN_EXPIRY_MS });
});

// ── Register API routes ───────────────────────────────────────────────────────
API.register(app);
app.use('/api/temporal', TemporalAPI);
// RevOpsAPI was required at the top of this file but never mounted, so /api/revops
// returned 404 while the AgRevOps dashboard panels and docs described it as live.
app.use('/api/revops', RevOpsAPI);

// ── Terminal error handler (LEAK-01) ─────────────────────────────────────────
// MUST stay last, after every route, and MUST keep its 4-arg signature or express
// will treat it as ordinary middleware. Without it, express's default handler
// renders err.stack into the response body whenever NODE_ENV !== 'production':
// a single unauthenticated malformed-JSON POST (express.json() is mounted BEFORE
// requireAuth, and requireAuth exempts GET anyway) returned the absolute paths of
// node_modules and the repo — the operator's username and home directory — to any
// local caller. Log server-side; return a generic body plus a correlation id.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err); // e.g. an SSE stream already flushed headers
  const status = Number.isInteger(err && err.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;
  const correlationId = newCorrelationId();
  console.error(
    `[dashboard] unhandled ${req.method} ${req.originalUrl} -> ${status} [cid=${correlationId}]:`,
    err && err.stack ? err.stack : err
  );
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : 'Invalid request',
    correlation_id: correlationId
  });
});

// ── Crash guards ──────────────────────────────────────────────────────────────
// Both guards log and exit. That is deliberate and symmetric.
//
// unhandledRejection: an escaped rejection is the ONLY reliable signal that an
// async call was left un-awaited — the ASYNC-01 class this release fixes. Measured
// on v11.9.1: an un-awaited rollbackTo() rejected, and by the time the rejection
// surfaced a hash-chained `hindsight_injected` entry had already been fsync'd and
// auto-state.json flipped to awaiting_regeneration for a rollback that never
// happened; the client got ECONNRESET at ~16ms and the process exited 1. The
// durable damage is committed before any handler can run, so a 500-and-continue
// response would answer the request while leaving the audit chain asserting an
// event that did not occur.
// Keeping it survivable is also not free: express 4.22.1 does not route async
// handler rejections to its error middleware (measured: a 4-arity app.use never
// fires), so log-and-continue leaves the client socket open until the CLIENT gives
// up — 2.5s, 4s and 8s clients all timed out with no response — versus a ~15ms
// connection reset when the process exits. A silent hang is worse than a restart.
// Cost accepted: one faulting request takes the observability surface down. The
// dashboard is a 127.0.0.1-only single-operator tool, and an audit chain that
// verifies as valid while recording events that did not happen is not a survivable
// state to keep serving from.
process.on('unhandledRejection', (reason) => {
  console.error('[Dashboard] Unhandled rejection — exiting:',
    reason instanceof Error ? reason.stack : reason);
  process.exit(1);
});

// uncaughtException MUST exit. After an uncaught throw the process state is
// undefined, and log-and-continue actively broke shutdown: a throw anywhere in the
// first half of shutdown() (SSE.stop(), or unlinking the token file) was swallowed,
// so server.close() was never reached and the forced-exit timer was never armed.
// The result was a dashboard that IGNORED SIGTERM while still serving the
// token-authenticated mutation endpoints, with the bearer token left on disk and
// still valid in memory — i.e. the operator's documented stop command silently
// failed while reporting success. Only SIGKILL stopped it.
process.on('uncaughtException', (err) => {
  console.error('[Dashboard] Uncaught exception — exiting:', err && err.stack ? err.stack : err);
  process.exit(1);
});

// ── Start SSE bridge ──────────────────────────────────────────────────────────
SSE.start();

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer(app);

server.listen(PORT, '127.0.0.1', () => {
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  fs.writeFileSync(PID_FILE, String(process.pid));

  console.log('\n⚡  MindForge Dashboard');
  console.log(`    URL:     http://localhost:${PORT}`);
  console.log(`    Status:  http://localhost:${PORT}/api/status`);
  console.log(`    Events:  http://localhost:${PORT}/events`);
  console.log(`    PID:     ${process.pid}`);
  console.log('[Dashboard] Auth token written to token file (not logged for security).');
  console.log(`    Token file: ${TOKEN_FILE}`);
  console.log('\n    Press CTRL+C to stop\n');

  if (OPEN_BROWSER) {
    const open = process.platform === 'darwin' ? 'open'
      : process.platform === 'win32' ? 'start'
      : 'xdg-open';
    const { spawn } = require('child_process');
    spawn(open, [`http://localhost:${PORT}`], { detached: true, stdio: 'ignore' });
  }
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[dashboard] Port ${PORT} already in use.`);
    console.error('[dashboard] Stop it: /mindforge:dashboard --stop');
    console.error('[dashboard] Or use a different port: /mindforge:dashboard --port 7340');
  }
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[dashboard] ${signal} received — shutting down`);

  // Arm the forced exit FIRST. Every step below can throw (permission drift on the
  // token path, a read-only .mindforge, an SSE listener error), and if any of them
  // does before this timer is set, the process would keep serving the authenticated
  // mutation API after the operator asked it to stop.
  const forced = setTimeout(() => process.exit(0), 3000);
  forced.unref();

  try { SSE.stop(); } catch (err) { console.error('[dashboard] SSE.stop failed:', err.message); }

  // Destroying the bearer token is a security step, not housekeeping — never let it
  // throw. rmSync with force tolerates a missing path and most permission cases.
  try { fs.rmSync(TOKEN_FILE, { force: true }); } catch (err) {
    console.error('[dashboard] could not remove token file:', err.message);
  }

  server.close(() => {
    try { fs.rmSync(PID_FILE, { force: true }); } catch { /* best effort */ }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
