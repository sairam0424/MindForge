'use strict';

/**
 * MindForge — SSRF + path-traversal + id-validation guards for instinct import.
 *
 * Ported from ECC's instinct-cli.py (_validate_import_url / _fetch_import_url /
 * _validate_file_path / _validate_instinct_id). Node has no stdlib IP
 * classification (Python used `ipaddress`), so isPublicAddress is hand-written
 * to cover IPv4 + IPv6 private/loopback/link-local/multicast/reserved/
 * unspecified, INCLUDING IPv4-mapped IPv6 (::ffff:x) and IPv6 ULA/link-local.
 *
 * Layer-3 hardening OVER the donor: 3xx redirects are REJECTED (the donor's
 * urlopen followed them, so an allowed host could 302 to a private one).
 */

const dns = require('dns').promises;
const https = require('https');
const net = require('net');
const path = require('path');
const fs = require('fs');

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const DEFAULT_TIMEOUT_MS = 15000;

// System dirs an import/export path must never target (port of the py list;
// macOS resolves /etc -> /private/etc, so both forms are blocked).
const BLOCKED_PREFIXES = [
  '/etc', '/usr', '/bin', '/sbin', '/proc', '/sys',
  '/var/log', '/var/run', '/var/lib', '/var/spool',
  '/private/etc', '/private/var/log', '/private/var/run', '/private/var/db',
];

/**
 * True if `ip` is a public, routable address (NOT private/loopback/link-local/
 * multicast/reserved/unspecified). Handles IPv4, IPv6, and IPv4-mapped IPv6.
 */
function isPublicAddress(ip) {
  const v = net.isIP(ip);
  if (v === 4) return isPublicV4(ip);
  if (v === 6) {
    // Unwrap IPv4-mapped IPv6 (::ffff:127.0.0.1) and classify the V4 part.
    const mapped = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
    if (mapped) return isPublicV4(mapped[1]);
    return isPublicV6(ip);
  }
  return false; // not a valid IP literal → treat as non-public (fail closed)
}

function isPublicV4(ip) {
  const o = ip.split('.').map(Number);
  if (o.length !== 4 || o.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = o;
  if (a === 10) return false;                          // 10/8 private
  if (a === 172 && b >= 16 && b <= 31) return false;   // 172.16/12 private
  if (a === 192 && b === 168) return false;            // 192.168/16 private
  if (a === 127) return false;                         // 127/8 loopback
  if (a === 169 && b === 254) return false;            // 169.254/16 link-local
  if (a === 0) return false;                           // 0.0.0.0/8 unspecified/reserved
  if (a >= 224) return false;                          // 224/4 multicast + 240/4 reserved
  if (a === 100 && b >= 64 && b <= 127) return false;  // 100.64/10 CGNAT (treat as non-public)
  return true;
}

function isPublicV6(ip) {
  const lower = ip.toLowerCase();
  if (lower === '::1') return false;                   // loopback
  if (lower === '::') return false;                    // unspecified
  if (lower.startsWith('fe80') || lower.startsWith('fe9') ||
      lower.startsWith('fea') || lower.startsWith('feb')) return false; // fe80::/10 link-local
  if (/^f[cd]/.test(lower)) return false;              // fc00::/7 unique-local
  if (lower.startsWith('ff')) return false;            // ff00::/8 multicast
  return true;
}

/**
 * Validate a remote import URL: https only, resolvable hostname, and EVERY
 * resolved address must be public. Returns the normalized URL string.
 */
async function validateImportUrl(source) {
  let parsed;
  try {
    parsed = new URL(source);
  } catch {
    throw new Error('invalid import URL');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('remote instinct imports require https URLs');
  }
  if (!parsed.hostname) {
    throw new Error('remote import URL is missing a hostname');
  }

  let addrs;
  try {
    addrs = await dns.lookup(parsed.hostname, { all: true });
  } catch {
    throw new Error(`remote import host could not be resolved: ${parsed.hostname}`);
  }
  if (!addrs.length) {
    throw new Error(`remote import host could not be resolved: ${parsed.hostname}`);
  }
  for (const { address } of addrs) {
    if (!isPublicAddress(address)) {
      throw new Error(`remote import host resolves to a non-public address: ${address}`);
    }
  }
  return parsed.toString();
}

/**
 * Fetch a validated remote instinct file with bounded size + timeout, an allowed
 * Content-Type, and NO redirect following (3xx is rejected). Resolves the body.
 */
async function fetchImportUrl(source, opts = {}) {
  const maxBytes = opts.maxBytes || DEFAULT_MAX_BYTES;
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  const url = await validateImportUrl(source);

  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'MindForge-instinct-import/1' } }, res => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400) {
        res.destroy();
        return reject(new Error(`remote import returned a ${status} redirect — refusing to follow (SSRF guard)`));
      }
      if (status !== 200) {
        res.destroy();
        return reject(new Error(`remote import failed with status ${status}`));
      }
      const ctype = (res.headers['content-type'] || '').toLowerCase();
      const allowed = ['text/', 'markdown', 'yaml', 'json', 'octet-stream'];
      if (ctype && !allowed.some(a => ctype.includes(a))) {
        res.destroy();
        return reject(new Error(`unsupported remote content type: ${ctype}`));
      }
      let bytes = 0;
      const chunks = [];
      res.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          res.destroy();
          return reject(new Error(`remote import exceeds ${maxBytes} bytes`));
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`remote import timed out after ${timeoutMs}ms`));
    });
    req.on('error', err => reject(new Error(`remote import failed: ${err.message}`)));
  });
}

/**
 * Resolve + validate a filesystem path, blocking system dirs (both import-from
 * and export-to). Returns the resolved absolute path.
 */
function validateFilePath(pathStr, { mustExist = false } = {}) {
  if (typeof pathStr !== 'string' || !pathStr) {
    throw new Error('path must be a non-empty string');
  }
  // expanduser
  const expanded = pathStr.startsWith('~')
    ? path.join(require('os').homedir(), pathStr.slice(1))
    : pathStr;
  const resolved = path.resolve(expanded);
  for (const prefix of BLOCKED_PREFIXES) {
    if (resolved === prefix || resolved.startsWith(prefix + path.sep)) {
      throw new Error(`path '${resolved}' targets a system directory`);
    }
  }
  if (mustExist && !fs.existsSync(resolved)) {
    throw new Error(`path does not exist: ${resolved}`);
  }
  return resolved;
}

/**
 * Validate an instinct id before using it anywhere id-sensitive.
 */
function validateInstinctId(id) {
  if (typeof id !== 'string' || !id || id.length > 128) return false;
  if (id.includes('/') || id.includes('\\')) return false;
  if (id.includes('..')) return false;
  if (id.startsWith('.')) return false;
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id);
}

module.exports = {
  DEFAULT_MAX_BYTES,
  DEFAULT_TIMEOUT_MS,
  BLOCKED_PREFIXES,
  isPublicAddress,
  validateImportUrl,
  fetchImportUrl,
  validateFilePath,
  validateInstinctId,
};
