/**
 * Closes the silent half of "Non-Bypassable Compliance Gates".
 *
 * THE DEFECT, measured by execution before this change:
 *
 *     Edit  tsconfig.json (exists)        -> exit 2  BLOCKED
 *     Bash  echo {} > tsconfig.json       -> exit 0  PERMITTED   (config-protection)
 *     Bash  echo {} > tsconfig.json       -> exit 0  PERMITTED   (trust-gate)
 *
 * The identical outcome — an agent weakening a protected config — was blocked through one tool
 * surface and silently permitted through another, with no warning on the permitted path. The gate was
 * not disabled; it was watching one entrance. `run()` read `tool_input.file_path`, and a Bash payload
 * carries `tool_input.command` instead, so it returned exit 0 before any protection logic ran.
 *
 * Two registration gaps compounded it, both fixed alongside:
 *   - config-protection was registered on `Write|Edit|MultiEdit` only, in BOTH the tracked
 *     .claude/settings.json and REG-01's HOOK_SPEC. Detection is unreachable without the matcher.
 *   - the tracked settings gave config-protection the profiles `standard,strict` while the other two
 *     deny-class hooks had `minimal,standard,strict`, so MINDFORGE_HOOK_PROFILE=minimal skipped it
 *     while they still fired. REG-01 already used the full set; the tracked file lagged.
 *
 * WHY THE DETECTION IS DELIBERATELY NARROW. This hook is deny-class: it fails closed, and a false
 * positive blocks the operator's real work. So only unambiguous write positions count — redirects,
 * `tee`, `sed -i`, `dd of=`, `truncate`, and `cp`/`mv` where the protected file is the LAST token. A
 * read of a protected file must pass: `cat tsconfig.json`, `grep x tsconfig.json`,
 * `cp tsconfig.json /tmp/backup`. A gate that blocked reading its own protected files would be worse
 * than the hole it closes.
 *
 * WHAT IS STILL BYPASSABLE, and named rather than hidden: MINDFORGE_DISABLED_HOOKS and
 * MINDFORGE_HOOK_PROFILE remain operator escape hatches. Both ANNOUNCE themselves —
 * run-with-flags.js writes "SECURITY GATE DISABLED" to stderr when a deny-class hook is switched off,
 * so exercising them leaves a record. The Bash path was the one that was silent, which is what made it
 * worth closing first.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const HOOK = path.join(REPO_ROOT, '.agent', 'hooks', 'mindforge-config-protection.js');
const DISPATCHER = path.join(REPO_ROOT, '.agent', 'hooks', 'run-with-flags.js');
const SETTINGS = path.join(REPO_ROOT, '.claude', 'settings.json');
const { run } = require(HOOK);

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function withProtected(fn) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-cfgprot-')));
  try {
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{"compilerOptions":{"strict":true}}\n');
    fs.writeFileSync(path.join(dir, 'eslint.config.mjs'), 'export default [];\n');
    return fn(dir);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function bashVerdict(command) {
  const r = run({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } });
  return r.exitCode === 2 ? 'BLOCK' : 'ALLOW';
}

// ── write intent through Bash is now caught ──────────────────────────────────

test('every unambiguous Bash write to a protected file is blocked', () => {
  withProtected((d) => {
    const t = `${d}/tsconfig.json`;
    const writes = [
      `echo {} > ${t}`,
      `echo {} >> ${t}`,
      `echo {} >| ${t}`,                       // bash noclobber override
      `echo {} |  tee ${t}`,
      `sed -i.bak s/true/false/ ${t}`,
      `dd if=/dev/null of=${t}`,
      `truncate -s 0 ${t}`,
      `cp /tmp/weak.json ${t}`,
      `mv /tmp/weak.json ${d}/eslint.config.mjs`,
      `ls && echo {} > ${t}`,                  // later in a compound command
      `cat /tmp/x | tee ${t}`,                 // after a pipe
    ];
    const permitted = writes.filter((c) => bashVerdict(c) === 'ALLOW');
    assert.deepStrictEqual(permitted.map((c) => c.replace(d, '<T>')), [],
      `${permitted.length} protected-file write(s) were PERMITTED through Bash`);
  });
});

test('reads of a protected file are NOT blocked', () => {
  // Non-vacuity, and the guard against over-correction. This hook fails closed, so a false positive
  // is an outage. If this test ever fails, the detection has become a substring match.
  withProtected((d) => {
    const t = `${d}/tsconfig.json`;
    const reads = [
      `cat ${t}`,
      `grep strict ${t}`,
      `git diff ${t}`,
      `cp ${t} /tmp/backup.json`,              // protected file is the SOURCE
      `cat ${t} | grep strict`,
      `cat ${t} || true`,
      `node -e "require('${t}')"`,
      'echo hi > /tmp/harmless.txt',           // unprotected target
      `echo x > ${d}/my-tsconfig.json`,        // basename must match at a word boundary
      'echo 2>&1 hi',                          // a dup, not a file write
    ];
    const blocked = reads.filter((c) => bashVerdict(c) === 'BLOCK');
    assert.deepStrictEqual(blocked.map((c) => c.replace(d, '<T>')), [],
      `${blocked.length} harmless command(s) were BLOCKED — a deny-class false positive is an outage`);
  });
});

test('first-time creation through Bash is still allowed', () => {
  // Consistent with the Edit path, whose ENOENT branch permits creating a config that does not exist
  // yet. Blocking creation would stop a legitimate `npm init`-style flow.
  withProtected((d) => {
    assert.strictEqual(bashVerdict(`echo {} > ${d}/nested/tsconfig.json`), 'ALLOW',
      'a protected basename that does not exist yet must be creatable');
  });
});

test('the pipeline split does not tear the >| operator', () => {
  // Regression guard for a bug in this very detection: segments were split on a bare `|`, which cut
  // `>|` in half, so `echo {} >| tsconfig.json` became `echo {} >` and ` tsconfig.json` and the
  // redirect pattern matched nothing. The segmentation was defeating the operator match it exists to
  // support. `>|` is normalised to `>` before splitting.
  withProtected((d) => {
    assert.strictEqual(bashVerdict(`echo {} >| ${d}/tsconfig.json`), 'BLOCK');
    assert.strictEqual(bashVerdict(`echo {} > | ${d}/tsconfig.json`), 'BLOCK', 'with a space too');
  });
});

// ── the detection is reachable, end to end ───────────────────────────────────

test('the dispatcher returns exit 2 for a Bash write and 0 for a Bash read', () => {
  withProtected((d) => {
    const drive = (command) => {
      const r = spawnSync(process.execPath,
        [DISPATCHER, 'mindforge-config-protection', '.agent/hooks/mindforge-config-protection.js', 'standard'],
        {
          cwd: REPO_ROOT, encoding: 'utf8',
          input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } }),
        });
      return r.status;
    };
    assert.strictEqual(drive(`echo {} > ${d}/tsconfig.json`), 2,
      'the whole point: driven as a real hook, a Bash write must DENY');
    assert.strictEqual(drive(`cat ${d}/tsconfig.json`), 0,
      'and a Bash read must be permitted');
  });
});

test('config-protection is REGISTERED on Bash in both the tracked settings and REG-01', () => {
  // Detection without registration changes nothing. Both had `Write|Edit|MultiEdit` only.
  const tracked = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
  const groups = Object.values(tracked.hooks).flat()
    .filter((g) => (g.hooks || []).some((h) => /mindforge-config-protection/.test(h.command)));
  assert.strictEqual(groups.length, 1, `expected 1 config-protection group, found ${groups.length}`);
  assert.match(groups[0].matcher, /\bBash\b/,
    `the tracked matcher must include Bash, got "${groups[0].matcher}" — otherwise the Bash detection ` +
    'above is unreachable in the repo the maintainers actually work in');

  const reg = require(path.join(REPO_ROOT, 'bin', 'installer', 'hook-registration.js'));
  const row = reg.HOOK_SPEC.find((r) => r.hookId === 'mindforge-config-protection');
  assert.ok(row, 'REG-01 must still register config-protection');
  assert.match(row.matcher, /\bBash\b/,
    `REG-01's matcher must include Bash, got "${row.matcher}" — otherwise a fresh install has the hole`);
});

test('all three deny-class hooks carry the minimal profile in the tracked settings', () => {
  // Measured gap: config-protection had `standard,strict` while trust-gate and block-no-verify had
  // `minimal,standard,strict`, so MINDFORGE_HOOK_PROFILE=minimal skipped config-protection alone.
  // A deny-class hook that a profile can silently drop is not deny-class.
  const tracked = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
  const reg = require(path.join(REPO_ROOT, 'bin', 'installer', 'hook-registration.js'));
  const missing = [];
  for (const g of Object.values(tracked.hooks).flat()) {
    for (const h of g.hooks || []) {
      const parts = String(h.command).trim().split(/\s+/);
      const id = parts[2];
      const profiles = parts[parts.length - 1];
      if (reg.DENY_CLASS.has(id) && !/\bminimal\b/.test(profiles)) missing.push(`${id} -> ${profiles}`);
    }
  }
  assert.deepStrictEqual(missing, [],
    `deny-class hook(s) omit the minimal profile and are skipped under MINDFORGE_HOOK_PROFILE=minimal: ${missing.join(', ')}`);
});

// ── the claims match what is enforced ────────────────────────────────────────

test('MINDFORGE.md does not present unread parameters as unconditional guarantees', () => {
  // Three keys were described as guarantees — "cannot be disabled", "always required", "cannot be
  // bypassed" — while `git grep -l <KEY> -- bin/` returns nothing for each. A switch wired to nothing
  // cannot guarantee anything.
  const md = fs.readFileSync(path.join(REPO_ROOT, 'MINDFORGE.md'), 'utf8');
  for (const key of ['BLOCK_ON_SECURITY', 'SOVEREIGN_IDENTITY', 'ENABLE_ZTAI']) {
    const r = spawnSync('git', ['grep', '-l', key, '--', 'bin/'], { cwd: REPO_ROOT, encoding: 'utf8' });
    const readers = (r.stdout || '').split('\n').filter(Boolean);
    const bullet = md.split('\n').find((l) => l.includes(`[${key}]`) && /^\s*-\s/.test(l)) || '';
    if (readers.length === 0) {
      assert.match(bullet, /DECLARED, UNREAD/,
        `${key} has no reader in bin/, so its MINDFORGE.md bullet must say so. Got: ${bullet.trim().slice(0, 90)}`);
    } else {
      assert.ok(!/DECLARED, UNREAD/.test(bullet),
        `${key} now HAS readers (${readers.join(', ')}) — remove the "declared, unread" annotation`);
    }
  }
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nConfig Protection (Bash): ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
