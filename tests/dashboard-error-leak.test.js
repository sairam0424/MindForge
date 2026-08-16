// @timeout: 90000
/**
 * MindForge — LEAK-01 regression test.
 *
 * The dashboard must never put a filesystem path (or any raw error string) into an
 * HTTP response body. Two independent leak channels existed:
 *
 *   1. Route catch-blocks echoing `err.message` / `detail: err.message`. fs errors
 *      carry ABSOLUTE paths, so a 500 disclosed the operator's home directory and
 *      username. requireAuth exempts GET, so every read route was an
 *      UNAUTHENTICATED filesystem-layout oracle.
 *   2. No terminal express error handler, so express's default handler rendered
 *      `err.stack` into the body whenever NODE_ENV !== 'production'. A malformed-JSON
 *      POST (express.json() is mounted BEFORE requireAuth) returned the absolute
 *      paths of node_modules and the repo to any unauthenticated local caller.
 *
 * Both are asserted here, plus the auth posture is re-asserted so the fix cannot be
 * "achieved" by accidentally loosening or tightening the bearer gate.
 */
'use strict';

const assert = require('assert');
const fs     = require('fs');
const os     = require('os');
const net    = require('net');
const path   = require('path');
const http   = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');

// A path-shaped sentinel. If it ever reaches a response body, the leak is back.
const SENTINEL = '/Users/leak01-sentinel/private-home/.mindforge/metrics/token-usage.jsonl';
const fsError = () => new Error(`EACCES: permission denied, open '${SENTINEL}'`);

let failures = 0;
function check(label, fn) {
  try { fn(); console.log(`  ✅ ${label}`); }
  catch (err) { failures++; console.error(`  ❌ ${label}\n     ${err.message}`); }
}

/** A body is clean if it leaks neither the sentinel path nor the raw errno text. */
function assertClean(label, status, body) {
  assert.strictEqual(status, 500, `${label}: expected 500, got ${status}`);
  assert.ok(!body.includes(SENTINEL), `${label}: response leaked the sentinel path -> ${body}`);
  assert.ok(!body.includes('permission denied'), `${label}: response leaked the errno text -> ${body}`);
  assert.ok(!body.includes('EACCES'), `${label}: response leaked the errno code -> ${body}`);
  const parsed = JSON.parse(body);
  assert.ok(typeof parsed.error === 'string' && parsed.error.length, `${label}: missing generic error`);
  assert.ok(/^[0-9a-f]{16}$/.test(parsed.correlation_id || ''), `${label}: missing correlation_id -> ${body}`);
}

function request(port, method, urlPath, opts = {}) {
  const { bearer, body, contentType } = opts;
  return new Promise((resolve, reject) => {
    const headers = {};
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    if (body !== undefined) {
      headers['Content-Type'] = contentType || 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = http.request({ host: '127.0.0.1', port, method, path: urlPath, headers }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

// ── Part A — every route's 500 branch, driven in-process ─────────────────────
async function partA() {
  console.log('\n[A] Route catch-blocks must not echo err.message');

  let express;
  try { express = require('express'); }
  catch { console.log('  ○ express not installed — skipping Part A'); return; }

  // Same module object the routers captured at require time, so overriding the
  // exported functions is enough to drive every catch-block.
  const agg = require('../bin/dashboard/metrics-aggregator');
  for (const name of ['getStatus', 'getAuditEntries', 'getMetrics', 'getApprovals',
    'getTeamActivity', 'getMemory', 'getCosts', 'checkHeapHealth']) {
    agg[name] = () => { throw fsError(); };
  }

  const TemporalHub = require('../bin/engine/temporal-hub');
  TemporalHub.getHistory = () => { throw fsError(); };
  TemporalHub.getSnapshotFile = () => { throw fsError(); };

  const HindsightInjector = require('../bin/hindsight-injector');
  // The `result.success === false` branch: the injector returns its OWN err.message
  // (hindsight-injector.js), which the route used to forward verbatim.
  HindsightInjector.inject = async () => ({ success: false, error: fsError().message });

  const app = express();
  app.use(express.json());
  require('../bin/dashboard/api-router').register(app);
  app.use('/api/temporal', require('../bin/dashboard/temporal-api'));
  app.use('/api/revops', require('../bin/dashboard/revops-api'));

  const server = await new Promise(r => {
    const s = app.listen(0, '127.0.0.1', () => r(s));
  });
  const port = server.address().port;

  const cases = [
    ['GET',  '/api/revops/overview'],
    ['GET',  '/api/status'],
    ['GET',  '/api/audit'],
    ['GET',  '/api/metrics'],
    ['GET',  '/api/approvals'],
    ['GET',  '/api/team'],
    ['GET',  '/api/memory'],
    ['GET',  '/api/costs'],
    ['GET',  '/api/v1/system'],
    ['GET',  '/api/temporal/history'],
    ['GET',  '/api/temporal/snapshot/abcdef12/some-file.md'],
    ['POST', '/api/temporal/inject'],
  ];

  for (const [method, urlPath] of cases) {
    const res = await request(port, method, urlPath,
      method === 'POST' ? { body: JSON.stringify({ auditId: 'abcdef12', fixDescription: 'x' }) } : {});
    check(`${method} ${urlPath}`, () => assertClean(`${method} ${urlPath}`, res.status, res.body));
  }

  await new Promise(r => server.close(r));
}

// ── Part B — the real server: express default handler + auth posture ─────────
async function partB() {
  console.log('\n[B] Terminal error handler + auth posture (real server.js)');

  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-leak01-'));
  let child, port, log;
  try {
    // A free port can be taken between probe and bind, so retry a couple of times
    // rather than failing the suite on a port race.
    for (let attempt = 1; ; attempt++) {
      port = await freePort();
      log = '';
      child = spawn(process.execPath,
        [path.join(ROOT, 'bin', 'dashboard', 'server.js'), '--port', String(port)],
        { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.on('data', d => { log += d; });
      child.stderr.on('data', d => { log += d; });

      let up = false;
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        if (child.exitCode !== null) break;
        try { await request(port, 'GET', '/api/connections'); up = true; break; }
        catch { await new Promise(r => setTimeout(r, 250)); }
      }
      if (up) break;
      try { child.kill('SIGKILL'); } catch { /* already gone */ }
      if (attempt >= 3) throw new Error(`dashboard did not start after ${attempt} attempts\n${log}`);
    }

    // 1. Malformed JSON on an unauthenticated POST. express.json() runs before
    //    requireAuth, so this reaches the body parser with no credential at all.
    const bad = await request(port, 'POST', '/api/steer', { body: '{bad' });
    check('malformed JSON POST returns JSON, not a stack trace', () => {
      assert.ok(!/<pre>|<!DOCTYPE/i.test(bad.body), `HTML error page returned -> ${bad.body.slice(0, 200)}`);
      assert.ok(!bad.body.includes(ROOT), `response leaked the repo path -> ${bad.body.slice(0, 300)}`);
      assert.ok(!bad.body.includes('node_modules'), `response leaked node_modules paths -> ${bad.body.slice(0, 300)}`);
      assert.ok(!bad.body.includes(os.homedir()), `response leaked the home directory -> ${bad.body.slice(0, 300)}`);
      const parsed = JSON.parse(bad.body);
      assert.ok(/^[0-9a-f]{16}$/.test(parsed.correlation_id || ''), `missing correlation_id -> ${bad.body}`);
    });

    // 2. Auth must still gate mutations — unchanged by the LEAK-01 fix.
    const anon = await request(port, 'POST', '/api/steer', { body: JSON.stringify({ action: 'pause' }) });
    check('POST without a bearer credential is 401', () => {
      assert.strictEqual(anon.status, 401, `expected 401, got ${anon.status} ${anon.body}`);
    });

    const wrongCredential = 'f'.repeat(64);
    const wrong = await request(port, 'POST', '/api/steer',
      { bearer: wrongCredential, body: JSON.stringify({ action: 'pause' }) });
    check('POST with a wrong bearer credential is 401', () => {
      assert.strictEqual(wrong.status, 401, `expected 401, got ${wrong.status} ${wrong.body}`);
    });

    const issued = fs.readFileSync(path.join(cwd, '.mindforge', '.dashboard-token'), 'utf8').trim();
    const authed = await request(port, 'POST', '/api/steer',
      { bearer: issued, body: JSON.stringify({ action: 'pause' }) });
    check('POST with the issued credential passes auth (not 401)', () => {
      assert.notStrictEqual(authed.status, 401, `issued credential rejected -> ${authed.body}`);
    });

    // 3. The server-side log must still carry the full detail.
    check('server log retains the error detail behind a correlation id', () => {
      assert.ok(/\[cid=[0-9a-f]{16}\]/.test(log), `no correlation id in server log:\n${log}`);
    });
  } finally {
    if (child) { try { child.kill('SIGKILL'); } catch { /* already gone */ } }
    try { fs.rmSync(cwd, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

// ── Part C — static guard against reintroduction ─────────────────────────────
function partC() {
  console.log('\n[C] Static guard: no raw error strings in dashboard responses');

  const forbidden = [
    [/detail:\s*err\.message/, 'detail: err.message'],
    [/res\.status\(500\)\.json\(\{\s*error:\s*err\.message\s*\}\)/, 'res.status(500).json({ error: err.message })'],
    [/res\.status\(500\)\.json\(result\)/, 'res.status(500).json(result) — forwards HindsightInjector err.message'],
  ];

  for (const file of ['revops-api.js', 'api-router.js', 'temporal-api.js']) {
    const src = fs.readFileSync(path.join(ROOT, 'bin', 'dashboard', file), 'utf8');
    for (const [re, label] of forbidden) {
      check(`${file} has no "${label}"`, () => {
        assert.ok(!re.test(src), `${file} still contains ${label}`);
      });
    }
  }

  check('server.js registers a 4-arg terminal error handler', () => {
    const src = fs.readFileSync(path.join(ROOT, 'bin', 'dashboard', 'server.js'), 'utf8');
    assert.ok(/app\.use\(\(err, req, res, next\) =>/.test(src),
      'no (err, req, res, next) handler found in server.js');
  });
}

async function main() {
  console.log('--- LEAK-01: dashboard error-response path disclosure ---');
  await partA();
  await partB();
  partC();
  if (failures) {
    console.error(`\n❌ ${failures} LEAK-01 assertion(s) failed`);
    process.exit(1);
  }
  console.log('\n--- LEAK-01 regression suite passed ---');
}

if (require.main === module) {
  main().catch(err => { console.error('Test crashed:', err); process.exit(1); });
}

module.exports = { main };
