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
  '/navigate',
  '/click',
  '/type',
  '/screenshot',
  '/evaluate',
  '/assert',
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
