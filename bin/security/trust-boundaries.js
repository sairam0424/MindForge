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

// ${IFS} / $IFS are shell-internal field separators that expand to whitespace.
// Attackers use them to avoid literal spaces between a destructive token and
// its flags (rm${IFS}-rf${IFS}/). We normalize them back to a space so the
// existing rm/-rf patterns catch the de-obfuscated form (audit #8).
const IFS_TOKEN = /\$\{IFS\}|\$IFS/g;

/**
 * De-obfuscates shell metacharacter tricks WITHOUT emulating a real shell.
 * Strips quotes (' ") and backslash escapes, collapses ${IFS}/$IFS to a space,
 * removes bare `#` tokens, then collapses runs of whitespace. This turns r''m,
 * r"m, r\m, rm${IFS}-rf${IFS}/ and the quoted-hash evasion rm "#" -rf / back
 * into plain `rm -rf /` so the existing patterns fire.
 *
 * The `#` step closes a real bypass (audit, Wave 6): quote-stripping turns the
 * DESTRUCTIVE `rm "#" -rf /` (in bash, "#" is a literal arg, so rm -rf / runs)
 * into `rm # -rf /`, where the bare `#` sat between `rm` and its flags and broke
 * the regex. We drop standalone `#` tokens (a `#` delimited by whitespace/start/
 * end) so the de-obfuscated form collapses to `rm -rf /` and matches. We do NOT
 * strip `#`-to-end-of-line (that would swallow flags after a genuine comment and
 * could MASK a destructive prefix); only the lone token is removed.
 *
 * Intentionally conservative: it removes characters rather than interpreting
 * them, which can only make a string MORE likely to match (fail-toward-block).
 */
function normalizeShell(input) {
  return input
    .split(NUL).join('')          // shells ignore NUL; never let it split a token
    .replace(IFS_TOKEN, ' ')       // ${IFS}/$IFS -> space
    .replace(/[\\'"]/g, '')        // drop backslash escapes and quote chars
    .replace(/(^|\s)#(?=\s|$)/g, '$1') // drop bare `#` tokens (post-unquote evasion)
    .replace(/\s+/g, ' ')          // collapse whitespace runs
    .trim();
}

/**
 * Detects high-impact / destructive commands via case-insensitive pattern matching.
 * Returns true if the command matches known destructive patterns.
 *
 * The detector errs toward blocking by design: this feeds a PreToolUse gate
 * where approval friction is strictly preferable to a destructive bypass.
 */
function isHighImpact(command) {
  // Normalize first so metacharacter-obfuscated commands (audit #8) are matched
  // by the SAME pattern set as their plain-text equivalents.
  const sanitized = normalizeShell(String(command));
  const patterns = [
    // ── Original allowlist (unchanged) ──────────────────────────────────────
    /rm\s+(-\w*r\w*\s+-\w*f|(-\w*f\w*\s+-\w*r)|-\w*rf|-\w*fr)/i,
    /git\s+push\s+.*--force/i,
    /git\s+push\s+.*-f/i,
    /drop\s+(table|database)/i,
    /git\s+reset\s+--hard/i,
    /delete\s+from/i,
    /truncate\s+table/i,
    // Unix `truncate -s <size> <path>` zeroes/shrinks a file in place — a
    // destructive data-loss op the SQL-only `truncate table` pattern above
    // misses. Match the size flag (-s, -s0, --size) so `truncate -s 0 <path>`
    // is gated; benign words ("truncated output") and the SQL form are not.
    /\btruncate\s+(-{1,2}s\w*|--size)\b/i,
    /\bmkfs(\.\w+)?\s+\/dev\//i,
    // #11: any dd write target, not just /dev/ (dd if=... of=important.db).
    // Original /dev/-only check is a subset of this, so it stays covered.
    /\bdd\b.*\bof=/i,
    /\b(curl|wget)\b.*\|\s*(bash|sh|zsh)\b/i,
    /^\s*find\s+.*-delete\b/i,

    // ── #4 Command/process substitution RCE ─────────────────────────────────
    // `eval` anywhere is high-impact (dynamic code execution).
    /\beval\b/i,
    // Command substitution $(...) or backtick combined with a network fetch.
    /\$\(\s*(curl|wget)\b/i,
    new RegExp(String.fromCharCode(96) + '\\s*(curl|wget)\\b', 'i'),
    // Process substitution feeding an interpreter: bash <(...), sh <(...).
    /\b(bash|sh|zsh)\b.*<\(/i,
    // Curl/wget directly inside a process substitution.
    /<\(\s*(curl|wget)\b/i,

    // ── #5 Interpreter invocation of a script file ──────────────────────────
    // source <file> and `. <file>` are unambiguous script execution.
    /\bsource\s+\S+/i,
    /(^|[;&|]|\s)\.\s+\S+\.\w+/i,
    // bash/sh/zsh running a .sh script — clearly script execution. Kept broad
    // (any .sh) because shelling out to an arbitrary shell script is itself a
    // strong execution signal; this also covers untrusted paths like
    // `bash /tmp/x.sh`.
    /\b(bash|sh|zsh)\s+\S*\.sh\b/i,
    // node/python/etc. running a script — narrowed (UC-22). Running a project
    // file is THE default safe action in a Node/Python repo, so a blanket
    // `node <file>.js` match is a terrible signal-to-noise ratio and blocked
    // the project's OWN idiom (`node tests/run-all.js`). We now flag ONLY when
    // the script path looks UNTRUSTED — an absolute path (/...), a writable
    // temp dir (/tmp, /var/tmp, /dev/shm), or a home-relative path (~/...) —
    // i.e. the write-then-execute attack chain (drop payload in a writable
    // location, then run it). Project-relative paths (tests/run-all.js,
    // bin/foo.js, scripts/build.py, index.js) are NOT matched. Piped/
    // substituted execution (curl | bash, $(...), <(...), backticks) is
    // already covered by the #4 patterns above.
    /\b(node|python3?|ruby|perl)\s+(~\/|\/)\S*\.(js|mjs|cjs|ts|py|rb|pl)\b/i,

    // ── #7 Redirect-overwrite of critical files / devices ───────────────────
    // > or >> targeting an absolute sensitive path (/etc/, /dev/, /boot/, /sys/,
    // /proc/, /var/, /usr/, /bin/, /sbin/, /lib/). Project-local redirects
    // (> out.log) are NOT matched.
    />>?\s*\/(etc|dev|boot|sys|proc|var|usr|bin|sbin|lib|root|lib64)\//i,

    // ── #8 handled by normalizeShell() above (de-obfuscation), no pattern here.

    // ── #9 chmod dangerous modes ────────────────────────────────────────────
    // Canonical dangerous octal modes only: 000 (full lockout) and the
    // world-writable 666/777 family. Common safe modes (644/755/600/700/640)
    // and symbolic modes (chmod +x build.sh) are intentionally NOT matched.
    // ANY recursive chmod is also treated as high-impact regardless of mode.
    /\bchmod\b.*\b(000|0?666|0?777)\b/i,
    /\bchmod\s+-\w*[rR]/i,

    // ── #10 chown recursive ─────────────────────────────────────────────────
    /\bchown\s+-\w*[rR]/i,

    // ── #12 mv of root / into /dev/null ─────────────────────────────────────
    /\bmv\b.*\/dev\/null\b/i,
    /\bmv\s+(-\w+\s+)?\/\s/i,

    // ── #13 Process killers ─────────────────────────────────────────────────
    /\bkill\s+-9\s+-1\b/i,
    /\bkillall\b/i,
    /\bpkill\b/i,

    // ── #14 Power-state commands ────────────────────────────────────────────
    /\b(shutdown|reboot|halt|poweroff)\b/i,
  ];
  return patterns.some(pattern => pattern.test(sanitized));
}

module.exports = {
  pinManifest,
  verifyManifest,
  tagUntrusted,
  isHighImpact
};
