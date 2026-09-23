'use strict';

/**
 * Project detection for instinct scoping.
 *
 * Ported from ECC's detect-project.sh (continuous-learning-v2). Produces a
 * stable project id so instincts captured in repo A never leak into repo B —
 * fixing the long-standing invariant violation where the capture hook hardcoded
 * project: 'mindforge' for every project (instinct-schema.md line 44 claims no
 * cross-project leak; this makes that true).
 *
 * Detection priority (matches ECC):
 *   1. git remote URL (credential-stripped + normalized, SHA256 -> 12 chars)
 *      — portable across machines/clones of the same repo.
 *   2. git repo root path (SHA256 -> 12 chars) — machine-specific fallback.
 *   3. "global" — no git context.
 *
 * Returns { id, name, root }.
 */

const crypto = require('crypto');
const { spawnSync } = require('child_process');
const path = require('path');

function git(cwd, args) {
  const r = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  return r.status === 0 ? (r.stdout || '').trim() : '';
}

function sha12(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex').slice(0, 12);
}

/**
 * Normalize a git remote URL so the same repo hashes identically across
 * https/ssh/scp forms: strip credentials, scheme, user@host:, .git suffix,
 * trailing slashes; lowercase network URLs.
 */
function normalizeRemoteUrl(url) {
  if (!url) return '';
  const isNetwork = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(url) && !url.startsWith('file://')
    || /^[^@/:]+@[^:/]+:/.test(url);

  let u = url
    .replace(/:\/\/[^@]+@/, '://')              // strip creds in scheme://user@
    .replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/\//, '') // strip scheme
    .replace(/^[^@/:]+@([^:/]+):/, '$1/')        // scp form git@host:path -> host/path
    .replace(/\.git\/?$/, '')                    // drop .git
    .replace(/\/+$/, '');                         // drop trailing slashes

  return isNetwork ? u.toLowerCase() : u;
}

function detectProject(cwd = process.cwd()) {
  // Resolve repo root
  const root = git(cwd, ['rev-parse', '--show-toplevel']);
  if (!root) {
    return { id: 'global', name: 'global', root: '' };
  }

  const name = path.basename(root.replace(/\\/g, '/'));

  // Prefer remote URL hash (portable); fall back to root path hash.
  let remote = git(root, ['remote', 'get-url', 'origin']);
  if (remote) remote = remote.replace(/:\/\/[^@]+@/, '://'); // strip creds
  const normalized = remote ? normalizeRemoteUrl(remote) : '';
  const hashInput = normalized || remote || root;

  return { id: sha12(hashInput), name, root };
}

module.exports = { detectProject, normalizeRemoteUrl, sha12 };
