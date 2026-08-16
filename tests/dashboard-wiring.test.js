/**
 * MindForge — Dashboard Wiring & ASYNC-01 Regression Suite
 *
 * Regression coverage for the four ASYNC-01 fixes. Every one of these was shipped
 * with ZERO tests; each assertion below fails on the pre-fix code.
 *
 *   1. Router mounting contract — every router module required by
 *      bin/dashboard/server.js must actually be wired into the app. The expected
 *      set is DERIVED FROM THE SOURCE, so adding a `require` and forgetting the
 *      `app.use` fails this test without anyone editing it.
 *   2. getAuditEntries() returns a WRAPPER ({entries,total,limit,offset}), not an
 *      array — revops-api must hand its consumers `.entries`.
 *   3. A FAILED hindsight injection must write no audit entry and must not flip
 *      auto-state (the un-awaited rollback did both).
 *   4. _verifyMetadata must reject tampered/truncated/oversized/non-string
 *      integrity values by RETURNING FALSE, never by throwing.
 *   5. The dashboard must exit on SIGTERM even when the token unlink throws.
 *
 * Isolation: this file NEVER touches the repository's .planning/, .mindforge/ or
 * celestial.db. It chdir()s into an os.tmpdir() fixture BEFORE requiring any bin/
 * module, because temporal-hub.js binds PLANNING_DIR from process.cwd() at module
 * load time. cwd is restored in the summary block.
 *
 * Run: node tests/dashboard-wiring.test.js
 */
'use strict';

const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const assert = require('assert');
const { spawn } = require('child_process');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); console.log(`  ✅  ${name}`); passed++; }
  catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

async function testAsync(name, fn) {
  try { await fn(); console.log(`  ✅  ${name}`); passed++; }
  catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

// ── Repo-relative source paths (resolved from __dirname, NOT cwd) ─────────────
const REPO_ROOT  = path.join(__dirname, '..');
const SERVER_JS  = path.join(REPO_ROOT, 'bin', 'dashboard', 'server.js');

// ── Sandbox: chdir into a tmp project BEFORE any bin/ require ─────────────────
// temporal-hub.js computes PLANNING_DIR at require time from process.cwd(), so the
// chdir has to happen first or the test would read/write the real .planning/.
const ORIGINAL_CWD = process.cwd();
// realpathSync: on macOS os.tmpdir() is a /var symlink to /private/var, and
// process.cwd() after chdir reports the resolved path — the sandbox self-check below
// compares the two.
const FIXTURE = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-dash-wiring-')));
fs.mkdirSync(path.join(FIXTURE, '.planning'), { recursive: true });
fs.mkdirSync(path.join(FIXTURE, '.mindforge'), { recursive: true });

// Fingerprint the real project state BEFORE the chdir. The isolation self-check at
// the bottom re-reads these and fails if this file leaked a single byte into the
// repository — the hash-chained AUDIT.jsonl and the live bearer token are the two
// things a cwd bug here would corrupt. (Assumes nothing else is appending to
// .planning/AUDIT.jsonl concurrently, which the sequential runner guarantees.)
function fingerprint(p) {
  try { const s = fs.statSync(p); return `${s.size}:${s.mtimeMs}`; } catch { return 'absent'; }
}
const GUARDED = [
  path.join(REPO_ROOT, '.planning', 'AUDIT.jsonl'),
  path.join(REPO_ROOT, '.planning', 'auto-state.json'),
  path.join(REPO_ROOT, '.mindforge', '.dashboard-token'),
  path.join(REPO_ROOT, '.planning', 'dashboard-server.pid'),
  // A directory's own mtime changes when an entry is added or removed inside it, so
  // this catches a stray snapshot being written into the real history.
  path.join(REPO_ROOT, '.planning', 'history'),
];
const BEFORE_FP = GUARDED.map(fingerprint);

process.chdir(FIXTURE);

// A failed injection on the pre-fix code produced an ESCAPED promise rejection.
// Capture it instead of letting Node kill this process, so the real diagnosis
// (audit entry written for a rollback that never happened) is reported.
const escapedRejections = [];
process.on('unhandledRejection', (reason) => {
  escapedRejections.push(reason instanceof Error ? reason.message : String(reason));
});

console.log('\n🔌  Dashboard Wiring & ASYNC-01 Regressions\n');
console.log(`  (sandbox cwd: ${FIXTURE})\n`);

// This is the only suite member that needs the `express` dependency (the dashboard
// routers ARE express Routers). Fail with one legible line instead of a cryptic
// MODULE_NOT_FOUND stack if the tree was never installed.
try {
  require('express');
} catch {
  console.error('  ❌  express is not installed — run `npm install` before this suite');
  process.chdir(ORIGINAL_CWD);
  process.exit(1);
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. ROUTER MOUNTING CONTRACT (derived from source — cannot rot)
// ═════════════════════════════════════════════════════════════════════════════
// server.js calls app.listen() at module load, so it is NEVER require()d here:
// requiring it would bind a real TCP port and write a PID + bearer-token file into
// the cwd. The contract is asserted by static analysis of the source text plus a
// runtime shape check of each router module in isolation. No port is bound.

console.log('  ── 1. router mounting contract ──');

const serverSrc = fs.readFileSync(SERVER_JS, 'utf8');

/** Every `const X = require('./local')` in server.js → { ident, rel, abs }. */
function localRequires(src, fromFile) {
  const re = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  const out = [];
  for (const m of src.matchAll(re)) {
    let abs = path.resolve(path.dirname(fromFile), m[2]);
    if (!fs.existsSync(abs) && fs.existsSync(`${abs}.js`)) abs = `${abs}.js`;
    out.push({ ident: m[1], rel: m[2], abs });
  }
  return out;
}

/** Classify a required module by what it exports, reading its source only. */
function classify(abs) {
  if (!fs.existsSync(abs)) return 'missing';
  const src = fs.readFileSync(abs, 'utf8');
  if (/=\s*express\.Router\(\s*\)/.test(src)) return 'router';
  const exp = src.match(/module\.exports\s*=\s*\{([^}]*)\}/);
  if (exp && /\bregister\b/.test(exp[1])) return 'registrar';
  return 'other';
}

const required   = localRequires(serverSrc, SERVER_JS);
const routers    = required.filter(r => classify(r.abs) === 'router');
const registrars = required.filter(r => classify(r.abs) === 'registrar');

test('derivation produced a non-empty expected set (guards against regex rot)', () => {
  assert.ok(required.length >= 3,
    `expected >=3 local requires in server.js, derived ${required.length} — the ` +
    'require-extraction regex has rotted and this whole section would pass vacuously');
  assert.ok(routers.length >= 2,
    'expected >=2 express.Router modules required by server.js, derived ' +
    `${routers.length} (${routers.map(r => r.rel).join(', ')})`);
  assert.ok(registrars.length >= 1,
    `expected >=1 register(app) module required by server.js, derived ${registrars.length}`);
  assert.ok(required.every(r => fs.existsSync(r.abs)),
    'server.js requires a path that does not exist: ' +
    required.filter(r => !fs.existsSync(r.abs)).map(r => r.rel).join(', '));
});

const mountedPaths = [];

test('EVERY express.Router required by server.js is mounted with app.use()', () => {
  const unmounted = [];
  for (const r of routers) {
    // app.use('/path', Ident)  — the normal form
    const withPath = serverSrc.match(new RegExp(
      `app\\.use\\(\\s*['"\`](/[^'"\`]*)['"\`]\\s*,\\s*${r.ident}\\s*\\)`));
    // app.use(Ident)           — pathless mount at the root
    const pathless = serverSrc.match(new RegExp(`app\\.use\\(\\s*${r.ident}\\s*\\)`));
    if (withPath) mountedPaths.push({ ident: r.ident, rel: r.rel, mount: withPath[1] });
    else if (pathless) mountedPaths.push({ ident: r.ident, rel: r.rel, mount: '/' });
    else unmounted.push(`${r.ident} (${r.rel})`);
  }
  assert.deepStrictEqual(unmounted, [],
    'router module(s) required at the top of bin/dashboard/server.js but never ' +
    `mounted: ${unmounted.join(', ')}. A required-but-unmounted router serves 404 ` +
    'on every one of its endpoints while the UI and docs describe it as live.');
});

test('EVERY register(app) module required by server.js is registered', () => {
  const unregistered = registrars
    .filter(r => !new RegExp(`\\b${r.ident}\\.register\\(\\s*app\\s*\\)`).test(serverSrc))
    .map(r => `${r.ident} (${r.rel})`);
  assert.deepStrictEqual(unregistered, [],
    `module(s) exporting register(app) but never registered: ${unregistered.join(', ')}`);
});

test('every mounted router module really is an express Router at runtime', () => {
  for (const m of mountedPaths) {
    const mod = require(path.join(path.dirname(SERVER_JS), m.rel));
    assert.strictEqual(typeof mod, 'function',
      `${m.rel} is mounted at ${m.mount} but does not export a function`);
    assert.ok(Array.isArray(mod.stack),
      `${m.rel} is mounted at ${m.mount} but is not an express Router (no .stack)`);
    assert.ok(mod.stack.length > 0,
      `${m.rel} is an empty Router — mounted at ${m.mount} but declares no routes`);
  }
});

test('/api/revops is mounted (ASYNC-01: RevOpsAPI was required but never used)', () => {
  const paths = mountedPaths.map(m => m.mount);
  assert.ok(paths.includes('/api/revops'),
    `/api/revops is not mounted. Mounted router paths: ${paths.join(', ') || '(none)'}`);
  const revops = mountedPaths.find(m => m.mount === '/api/revops');
  assert.match(revops.rel, /revops-api$/,
    `/api/revops is mounted from ${revops.rel}, expected ./revops-api`);
});

test('/api/temporal is still mounted (no regression from the revops fix)', () => {
  assert.ok(mountedPaths.some(m => m.mount === '/api/temporal'),
    '/api/temporal must remain mounted');
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. getAuditEntries() WRAPPER CONTRACT AT THE REVOPS SEAM
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n  ── 2. getAuditEntries wrapper contract ──');

const Metrics  = require(path.join(REPO_ROOT, 'bin', 'dashboard', 'metrics-aggregator'));
const RevOps   = require(path.join(REPO_ROOT, 'bin', 'dashboard', 'revops-api'));
const roiEngine = require(path.join(REPO_ROOT, 'bin', 'revops', 'roi-engine'));

test('getAuditEntries() returns a wrapper object, NOT an array', () => {
  const res = Metrics.getAuditEntries(5);
  assert.ok(!Array.isArray(res),
    'getAuditEntries() must return {entries,total,limit,offset}, not a bare array — ' +
    'callers that treat it as an array are the ASYNC-01 bug');
  assert.ok(res && typeof res === 'object', 'getAuditEntries() must return an object');
  assert.ok(Array.isArray(res.entries), '.entries must be an array');
  for (const k of ['total', 'limit', 'offset']) {
    assert.strictEqual(typeof res[k], 'number', `.${k} must be a number`);
  }
  assert.strictEqual(res.limit, 5, '.limit must echo the requested limit');
});

/** Pull the '/overview' handler out of the Router without binding a port. */
function overviewHandler() {
  for (const layer of RevOps.stack) {
    if (layer.route && layer.route.path === '/overview') {
      return layer.route.stack[0].handle;
    }
  }
  return null;
}

test('revops /overview route exists on the Router', () => {
  assert.ok(typeof overviewHandler() === 'function',
    'revops-api must expose GET /overview');
});

test('revops passes an ARRAY (.entries) to roi/velocity/debt — not the wrapper', () => {
  const WRAPPER = {
    entries: [
      { event: 'task_completed', timestamp: '2026-03-28T10:00:00Z' },
      { event: 'task_completed', timestamp: '2026-03-28T10:05:00Z' },
      { event: 'policy_bypass',  timestamp: '2026-03-28T10:12:00Z' },
    ],
    total: 3, limit: 500, offset: 0,
  };

  const origGet = Metrics.getAuditEntries;
  const origCalc = roiEngine.calculate;
  let seen = { called: false, value: undefined };

  Metrics.getAuditEntries = () => WRAPPER;
  // Non-arrow so `this` stays bound to the roiEngine instance when the route calls it.
  roiEngine.calculate = function (m) {
    seen = { called: true, value: m && m.auditEntries };
    return origCalc.apply(this, arguments);
  };

  let status = 200, body = null;
  const res = {
    json(b) { body = b; return this; },
    status(c) { status = c; return this; },
  };

  try {
    overviewHandler()({ query: {} }, res);
  } finally {
    Metrics.getAuditEntries = origGet;
    roiEngine.calculate = origCalc;
  }

  assert.ok(seen.called, 'roi-engine.calculate was never reached');
  assert.ok(Array.isArray(seen.value),
    'revops handed the raw getAuditEntries() wrapper to roi-engine — ' +
    `received ${Object.prototype.toString.call(seen.value)}. roi-engine, ` +
    'velocity-forecaster and debt-monitor all call .filter() on it, so the wrapper ' +
    'becomes a TypeError that the route turns into an opaque 500.');
  assert.strictEqual(seen.value.length, 3,
    'the array handed downstream must be exactly WRAPPER.entries');
  assert.strictEqual(status, 200,
    `GET /api/revops/overview returned ${status}` +
    (body && body.detail ? ` — ${body.detail}` : ''));
  assert.strictEqual(body && body.success, true, 'overview must report success');
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. FAILED HINDSIGHT INJECTION MUST NOT COMMIT ANYTHING
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n  ── 3. awaited rollback (failed injection commits nothing) ──');

const HindsightInjector = require(path.join(REPO_ROOT, 'bin', 'hindsight-injector'));

const AUDIT_FIXTURE = path.join(FIXTURE, '.planning', 'AUDIT.jsonl');
const STATE_FIXTURE = path.join(FIXTURE, '.planning', 'auto-state.json');

const main = (async () => {
  await testAsync('failed injection writes NO audit entry and does NOT flip auto-state', async () => {
    // Seed a one-line chain and a running state in the tmp fixture.
    fs.writeFileSync(AUDIT_FIXTURE,
      JSON.stringify({ id: 'seed0000', event: 'seed', timestamp: '2026-01-01T00:00:00Z' }) + '\n');
    fs.writeFileSync(STATE_FIXTURE,
      JSON.stringify({ schema_version: '2.0.0', status: 'running', tasks_completed: 1 }, null, 2));

    const before = {
      lines: fs.readFileSync(AUDIT_FIXTURE, 'utf8').split('\n').filter(Boolean).length,
      state: JSON.parse(fs.readFileSync(STATE_FIXTURE, 'utf8')).status,
      historyExists: fs.existsSync(path.join(FIXTURE, '.planning', 'history')),
    };

    // No snapshot exists for this id, so rollbackTo() rejects.
    const result = await HindsightInjector.inject('deadbeefcafe1234', 'regression probe');

    const after = {
      lines: fs.readFileSync(AUDIT_FIXTURE, 'utf8').split('\n').filter(Boolean).length,
      state: JSON.parse(fs.readFileSync(STATE_FIXTURE, 'utf8')).status,
    };

    assert.strictEqual(result.success, false,
      'inject() must report failure when the rollback fails; it returned ' +
      JSON.stringify(result));
    assert.match(String(result.error), /not found in history/,
      `error must surface the rollback failure, got: ${result.error}`);
    assert.strictEqual(after.lines, before.lines,
      `a FAILED injection appended ${after.lines - before.lines} audit entr(y|ies). ` +
      'The chain would then verify as valid while recording a hindsight_injected ' +
      'event for a rollback that never happened.');
    assert.strictEqual(after.state, 'running',
      `auto-state.json was flipped to "${after.state}" by a failed injection ` +
      `(was "${before.state}")`);
    assert.strictEqual(before.historyExists, false,
      'fixture sanity: no history dir should exist before the probe');
  });

  await testAsync('the failed rollback rejection does not escape inject()', async () => {
    // Give any escaped rejection a turn of the loop to surface.
    await new Promise(r => setImmediate(r));
    assert.deepStrictEqual(escapedRejections, [],
      'an unhandled promise rejection escaped HindsightInjector.inject() — ' +
      'rollbackTo() is async and must be awaited inside its try/catch. Under ' +
      `Node >=15 this kills the dashboard process. Escaped: ${escapedRejections.join('; ')}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. _verifyMetadata: FAIL CLOSED, NEVER THROW
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n  ── 4. _verifyMetadata fails closed without throwing ──');

  const TemporalHub = require(path.join(REPO_ROOT, 'bin', 'engine', 'temporal-hub'));
  const BASE = { audit_id: 'aaaabbbbccccdddd', task_name: 'probe', captured_at: '2026-01-01T00:00:00Z' };
  const signed = TemporalHub._signMetadata(BASE);

  test('a correctly signed snapshot verifies', () => {
    assert.strictEqual(typeof signed.integrity, 'string', '_signMetadata must add integrity');
    assert.strictEqual(TemporalHub._verifyMetadata(signed), true,
      'a freshly signed metadata object must verify');
  });

  test('a tampered field fails verification', () => {
    const tampered = { ...signed, task_name: 'attacker-controlled' };
    assert.strictEqual(TemporalHub._verifyMetadata(tampered), false,
      'mutating a signed field must fail verification');
  });

  // The pre-fix code passed `integrity` straight into crypto.timingSafeEqual, which
  // throws RangeError on unequal buffer lengths — so malformed metadata CRASHED the
  // caller (a throw, not a false) instead of failing verification.
  const malformed = [
    ['truncated integrity',        { ...signed, integrity: signed.integrity.slice(0, 32) }],
    ['single-char integrity',      { ...signed, integrity: 'a' }],
    ['oversized integrity',        { ...signed, integrity: signed.integrity + 'deadbeef' }],
    ['empty-string integrity',     { ...signed, integrity: '' }],
    ['numeric integrity',          { ...signed, integrity: 1234567890 }],
    ['array integrity',            { ...signed, integrity: [signed.integrity] }],
    ['object integrity',           { ...signed, integrity: { hex: signed.integrity } }],
    ['missing integrity',          { ...BASE }],
  ];

  for (const [label, meta] of malformed) {
    test(`${label} returns false without throwing`, () => {
      let out;
      assert.doesNotThrow(() => { out = TemporalHub._verifyMetadata(meta); },
        `_verifyMetadata threw on ${label} — a malformed SNAPSHOT-META.json must fail ` +
        'verification, not crash the rollback caller');
      assert.strictEqual(out, false, `${label} must verify as false`);
    });
  }

  test('same-length-but-wrong integrity fails (guard did not weaken the check)', () => {
    const flipped = signed.integrity[0] === '0' ? '1' : '0';
    const wrong = { ...signed, integrity: flipped + signed.integrity.slice(1) };
    assert.strictEqual(wrong.integrity.length, signed.integrity.length, 'fixture sanity');
    assert.strictEqual(TemporalHub._verifyMetadata(wrong), false,
      'a same-length wrong digest must still fail — the length guard must not ' +
      'short-circuit into a pass');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. SIGTERM EXITS EVEN WHEN THE TOKEN UNLINK THROWS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n  ── 5. shutdown exits on SIGTERM when token removal throws ──');

  await testAsync('SIGTERM exits the dashboard even when token removal throws', async () => {
    const wsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-dash-sigterm-'));
    const tokenPath = path.join(wsDir, '.mindforge', '.dashboard-token');
    const pidPath   = path.join(wsDir, '.planning', 'dashboard-server.pid');
    let child = null;
    try {
      // --port 0 → the OS picks a free ephemeral port, so this can never collide
      // with a running dashboard or another CI job. cwd is the tmp workspace, so the
      // PID file and bearer token land there and not in the repository.
      child = spawn(process.execPath, [SERVER_JS, '--port', '0'], {
        cwd: wsDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' },
      });

      let out = '', errOut = '';
      child.stderr.on('data', d => { errOut += d.toString(); });
      const exited = new Promise(res => child.once('exit', (code, sig) => res({ code, sig })));
      const ready = new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error(`server never became ready. stdout:\n${out}`)), 15000);
        child.stdout.on('data', d => {
          out += d.toString();
          if (out.includes('Press CTRL+C to stop')) { clearTimeout(t); res(); }
        });
        child.once('exit', c => { clearTimeout(t); rej(new Error(`server exited early (code ${c}). stdout:\n${out}\n${errOut}`)); });
      });
      await ready;
      assert.ok(fs.existsSync(pidPath), 'fixture sanity: server should have written its PID file');

      // Make the token unlink throw: rmSync(dir, {force:true}) without `recursive`
      // raises ERR_FS_EISDIR. This is the shape of the real failure (permission /
      // path drift on .mindforge) that previously swallowed the whole shutdown.
      fs.rmSync(tokenPath, { force: true });
      fs.mkdirSync(tokenPath, { recursive: true });
      fs.writeFileSync(path.join(tokenPath, 'blocker'), 'x');

      child.kill('SIGTERM');
      // The deadline timer must be cleared, otherwise a pending 10s setTimeout keeps
      // this test process alive long after the last assertion.
      let deadline;
      const res = await Promise.race([
        exited,
        new Promise(r => { deadline = setTimeout(() => r({ code: null, sig: null, timedOut: true }), 10000); }),
      ]);
      clearTimeout(deadline);

      assert.ok(!res.timedOut,
        'dashboard did not exit within 10s of SIGTERM while the token unlink threw — ' +
        'the forced-exit timer must be armed BEFORE any step that can throw');
      assert.match(out, /shutting down/,
        `shutdown handler did not run. stdout:\n${out}`);
      assert.strictEqual(res.code, 0,
        'SIGTERM shutdown must complete GRACEFULLY (exit 0) with the token removal ' +
        `failure handled; got exit code ${res.code}. stderr:\n${errOut.slice(0, 600)}`);
      assert.doesNotMatch(errOut, /^Error:/m,
        'the token-removal failure escaped as an uncaught exception instead of being ' +
        `handled. stderr:\n${errOut.slice(0, 600)}`);
      // The PID file is only removed inside server.close()'s callback, so its absence
      // proves shutdown ran to completion instead of dying half-way through.
      await new Promise(r => setTimeout(r, 150));
      assert.strictEqual(fs.existsSync(pidPath), false,
        'the PID file survived shutdown — server.close() never completed, so the ' +
        'shutdown sequence aborted before finishing (stale PID file makes ' +
        '`--stop` target a dead process)');
    } finally {
      if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      try { fs.rmSync(wsDir, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  });

  // ── Isolation self-check ───────────────────────────────────────────────────
  test('the repository working tree was not written to', () => {
    const changed = GUARDED
      .map((p, i) => ({ p, before: BEFORE_FP[i], after: fingerprint(p) }))
      .filter(x => x.before !== x.after)
      .map(x => `${path.relative(REPO_ROOT, x.p)} (${x.before} -> ${x.after})`);
    assert.deepStrictEqual(changed, [],
      `this test mutated real project state: ${changed.join(', ')}. Every fixture must ` +
      'live under os.tmpdir(); a bin/ module that resolves paths from process.cwd() at ' +
      'REQUIRE time must be required only after the chdir.');
    assert.strictEqual(process.cwd(), FIXTURE, 'test drifted out of its sandbox cwd');
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  process.chdir(ORIGINAL_CWD);
  try { fs.rmSync(FIXTURE, { recursive: true, force: true }); } catch { /* best effort */ }

  console.log(`\nTests finished: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();

main.catch(err => {
  process.chdir(ORIGINAL_CWD);
  console.error('Test harness crashed:', err && err.stack ? err.stack : err);
  process.exit(1);
});
