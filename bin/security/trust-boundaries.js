'use strict';

const crypto = require('crypto');

/**
 * Recursively sorts object keys for deterministic JSON serialization.
 * Arrays are preserved in order; nested objects get sorted keys.
 */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(item => stableStringify(item)).join(',') + ']';
  }
  const sortedKeys = Object.keys(value).sort();
  const pairs = sortedKeys.map(key => {
    return JSON.stringify(key) + ':' + stableStringify(value[key]);
  });
  return '{' + pairs.join(',') + '}';
}

/**
 * Computes SHA-256 hash of a manifest using stable key-sorted serialization.
 * Returns { name, hash, pinnedAt }.
 */
function pinManifest(manifest) {
  const serialized = stableStringify(manifest);
  const hash = crypto.createHash('sha256').update(serialized).digest('hex');
  return {
    name: manifest.name,
    hash,
    pinnedAt: Date.now()
  };
}

/**
 * Verifies a manifest against a previously pinned hash.
 * Returns { valid: true } or { valid: false, reason }.
 */
function verifyManifest(manifest, pin) {
  const serialized = stableStringify(manifest);
  const computed = crypto.createHash('sha256').update(serialized).digest('hex');
  if (computed === pin.hash) {
    return { valid: true };
  }
  return {
    valid: false,
    reason: `hash mismatch: expected ${pin.hash}, got ${computed}`
  };
}

/**
 * Wraps content with untrusted provenance metadata.
 * Returns { content, trusted: false, provenance: { source, tool, timestamp } }.
 */
function tagUntrusted(content, meta) {
  return {
    content,
    trusted: false,
    provenance: {
      source: meta.source,
      tool: meta.tool,
      timestamp: Date.now()
    }
  };
}

// Null byte (char code 0). Built via fromCharCode so we never embed a control
// character in a regex literal (eslint no-control-regex).
const NUL = String.fromCharCode(0);

/**
 * Detects high-impact / destructive commands via case-insensitive pattern matching.
 * Returns true if the command matches known destructive patterns.
 */
function isHighImpact(command) {
  // Strip null bytes first — shells ignore them, so an attacker must not be
  // able to use a NUL to split a destructive token and slip past the patterns.
  const sanitized = String(command).split(NUL).join('');
  const patterns = [
    /rm\s+(-\w*r\w*\s+-\w*f|(-\w*f\w*\s+-\w*r)|-\w*rf|-\w*fr)/i,
    /git\s+push\s+.*--force/i,
    /git\s+push\s+.*-f/i,
    /drop\s+(table|database)/i,
    /git\s+reset\s+--hard/i,
    /delete\s+from/i,
    /truncate\s+table/i,
    /\bmkfs(\.\w+)?\s+\/dev\//i,
    /\bdd\b.*\bof=\/dev\//i,
    /\b(curl|wget)\b.*\|\s*(bash|sh|zsh)\b/i,
    /^\s*find\s+.*-delete\b/i,
  ];
  return patterns.some(pattern => pattern.test(sanitized));
}

module.exports = {
  pinManifest,
  verifyManifest,
  tagUntrusted,
  isHighImpact
};
