/**
 * MindForge — Dashboard error responses (LEAK-01)
 *
 * Every dashboard route used to return `err.message` — and express's default
 * handler returned `err.stack` — straight to the client. fs-sourced errors embed
 * ABSOLUTE paths (EACCES/ENOENT/EISDIR), so a 500 disclosed the operator's home
 * directory and username. This matters more than a normal 500 body leak because
 * `requireAuth` (server.js) lets GET and OPTIONS through unguarded: every read
 * route was an *unauthenticated* filesystem-layout oracle.
 *
 * Contract: the full error (stack included) is logged server-side against a
 * correlation id; the client receives only a generic message plus that id.
 */
'use strict';

const crypto = require('crypto');

/** Short, non-guessable id used to tie a client response to a server log line. */
function newCorrelationId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Log `err` server-side and answer with a generic 500 carrying a correlation id.
 *
 * @param {object} res            Express response.
 * @param {string} context        Route identifier for the log, e.g. 'GET /api/metrics'.
 * @param {unknown} err           The caught error (or any value).
 * @param {string} clientMessage  Safe, static message for the client.
 * @param {object} [extra]        Extra fields merged into the body (e.g. { success: false }).
 * @returns {object} the Express response.
 */
function sendServerError(res, context, err, clientMessage, extra = {}) {
  const correlationId = newCorrelationId();
  const detail = err && err.stack ? err.stack : String(err);
  console.error(`[dashboard] ${context} failed [cid=${correlationId}]: ${detail}`);
  return res.status(500).json({
    ...extra,
    error: clientMessage,
    correlation_id: correlationId
  });
}

module.exports = { sendServerError, newCorrelationId };
