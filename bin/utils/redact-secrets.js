'use strict';
/**
 * Redact credential-shaped substrings from text that is about to be persisted.
 *
 * WHY THIS EXISTS. `bin/hooks/instinct-capture-hook.js` writes the first 200 characters of a raw
 * Bash command — and of a raw Task description — into BOTH an `observation` and a `behavior` field
 * of `.mindforge/engine/instincts/instinct-store.jsonl`. Measured on real store files left by
 * probes: an entry whose `observation` begins `Bash command succeeded: AWS_SE...`, i.e. an
 * `AWS_SECRET_ACCESS_KEY=<value>` assignment captured verbatim. The store path is not gitignored,
 * `.mindforge/engine/` is inside `package.json` files[] with no negation for instincts, and the
 * promotion path (`.mindforge/engine/instincts/promotion-engine.md:33,41,46`) copies these fields
 * into a generated, tracked, PUBLISHED `SKILL.md`. So a captured secret is amplified from a
 * data file into committed source.
 *
 * WHY REDACT RATHER THAN HASH. Measured, not assumed: three consumers read this text and all three
 * need it readable.
 *
 *   bin/learning/instinct-cli.js:114  `list` prints observation AND behavior verbatim to a human
 *   bin/learning/instinct-cli.js:241  `promote` prints behavior verbatim as the suggestion
 *   .mindforge/skills/instinct-clustering/SKILL.md:57-63  word-overlap Jaccard on observation
 *
 * And nothing in code dedups on the text — `cmdImport` keys on `e.id` and the hook stamps a fresh
 * randomUUID per event — so a hash would preserve no collision that anything relies on. Hashing
 * would break three consumers to buy nothing.
 *
 * WHY NOT "KEEP argv[0], REDACT THE REST". Because of the env-assignment form: in
 * `SECRET=value cmd ...` the secret precedes the program, so the first retained token IS the
 * secret. That is not hypothetical — it is the shape of the measured on-disk entry above.
 *
 * FAIL CLOSED. If redaction throws, this returns a placeholder rather than the input. A redactor
 * that fails open is not a redactor. Note this does NOT make the calling hook fail closed: the hook
 * stays advisory and still exits 0. "Do not block the tool call" and "do not write the secret
 * anyway" are different promises, and both are kept.
 */

const PLACEHOLDER = (kind) => `<redacted:${kind}>`;

/**
 * Ordered most-specific first. Each entry replaces only the SECRET portion where a prefix carries
 * meaning worth keeping (a scheme, a key name), so the redacted text still reads as the same shape
 * of command — which is what the human-facing and Jaccard consumers need.
 */
const RULES = [
  // PEM private key blocks, header through footer.
  { kind: 'pem', re: /-----BEGIN[^-]{0,40}(?:PRIVATE )?KEY-----[\s\S]*?-----END[^-]{0,40}KEY-----/g,
    replace: () => PLACEHOLDER('pem') },

  // Vendor tokens with recognisable prefixes. Keep the prefix: it says WHICH credential leaked,
  // which is exactly what an operator needs in order to rotate the right one.
  { kind: 'vendor-token',
    re: /\b(sk-(?:proj-|ant-)?|ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|glpat-|npm_|xox[baprse]-|AKIA|ASIA|AIza|hf_|dop_v1_)[A-Za-z0-9_-]{16,}/g,
    replace: (m, prefix) => `${prefix}${PLACEHOLDER('token')}` },

  // Authorization headers. Keep the scheme, drop the credential.
  { kind: 'auth-header', re: /\b(Bearer|Basic|Token)\s+[A-Za-z0-9+/=._~-]{8,}/gi,
    replace: (m, scheme) => `${scheme} ${PLACEHOLDER('auth')}` },

  // Credentials embedded in a URL: scheme://user:pass@host
  { kind: 'url-credential', re: /\b([a-z][a-z0-9+.-]*:\/\/[^\s:/@]+):[^\s@/]+@/gi,
    replace: (m, upToUser) => `${upToUser}:${PLACEHOLDER('url-password')}@` },

  // Environment-assignment form, keyed on the NAME looking secret-bearing. This is the case that
  // defeats prefix-preserving designs, because the assignment can precede the program name.
  { kind: 'assignment',
    re: /\b([A-Za-z_][A-Za-z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|APIKEY|API_KEY|ACCESS_KEY|PRIVATE_KEY|CREDENTIAL|AUTH)[A-Za-z0-9_]*)\s*=\s*("[^"]*"|'[^']*'|[^\s;|&]+)/gi,
    replace: (m, name) => `${name}=${PLACEHOLDER('assignment')}` },

  // Flag form: --password X, --token=X, -p X. Keep the flag so the command still parses visually.
  { kind: 'flag',
    re: /(--?(?:password|passwd|token|secret|api[-_]?key|access[-_]?key|auth|credential)(?:[=\s]))(?:"[^"]*"|'[^']*'|[^\s;|&]+)/gi,
    replace: (m, flag) => `${flag}${PLACEHOLDER('flag-value')}` },

  // Generic high-entropy run, last resort for credentials with no recognisable prefix. Requires
  // BOTH a letter and a digit and >= 28 characters, so English words, long flag names and ordinary
  // identifiers are left alone. `/` is excluded so a long path is examined segment by segment.
  { kind: 'opaque', re: /\b(?=[A-Za-z0-9+=_-]{28,}\b)(?=[^\s]*[A-Za-z])(?=[^\s]*\d)[A-Za-z0-9+=_-]{28,}\b/g,
    replace: () => PLACEHOLDER('opaque') },
];

/**
 * @param {string} text
 * @returns {string} the text with credential-shaped substrings replaced
 */
function redactSecrets(text) {
  if (typeof text !== 'string' || text === '') return text;
  try {
    let out = text;
    for (const rule of RULES) out = out.replace(rule.re, rule.replace);
    return out;
  } catch {
    // Fail closed. Withholding telemetry is always cheaper than persisting a credential.
    return PLACEHOLDER('redaction-failed');
  }
}

/**
 * True when redactSecrets would change the text. Useful for asserting a fixture is actually
 * secret-shaped before relying on it, so a test cannot pass because its fixture was inert.
 * @param {string} text
 * @returns {boolean}
 */
function containsSecretShape(text) {
  return typeof text === 'string' && text !== '' && redactSecrets(text) !== text;
}

module.exports = { redactSecrets, containsSecretShape, RULES };
