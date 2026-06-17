#!/usr/bin/env node
/**
 * MindForge v2 — Dashboard Server
 * Real-time web observability at localhost:7339.
 *
 * Usage:
 *   node bin/dashboard/server.js [--port 7339] [--open]
 *   /mindforge:dashboard [--port 7339] [--open] [--stop]
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
  SSE.stop();
  // Remove sensitive token file on shutdown
  if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
  server.close(() => {
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
