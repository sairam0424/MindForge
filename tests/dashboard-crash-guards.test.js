/**
 * MindForge — Dashboard Crash-Guard Policy Tests
 *
 * Locks the process-level crash policy of bin/dashboard/server.js.
 *
 * Why this file exists: ASYNC-01 was an un-awaited async rollback whose rejection
 * escaped after a 200 had already been sent. The rejection was the ONLY signal that
 * the audit chain had recorded an event that never happened. A log-and-continue
 * `unhandledRejection` handler deletes that signal, and on express 4 (which does not
 * catch async handler rejections) it also leaves the client socket open until the
 * client's own timeout. Both crash guards must therefore log and exit non-zero.
 *
 * Every child process is spawned with cwd = a fresh temp dir, because server.js
 * writes .mindforge/.dashboard-token and .planning/dashboard-server.pid relative to
 * process.cwd(). Never let it run with the repo as cwd.
 *
 * Run: node tests/dashboard-crash-guards.test.js
 */
'use strict';

const fs      = require('fs');
const os      = require('os');
const net     = require('net');
const http    = require('http');
const path    = require('path');
const assert  = require('assert');
const { spawnSync, spawn } = require('child_process');

const SERVER = path.join(__dirname, '..', 'bin', 'dashboard', 'server.js');

let passed = 0, failed = 0;

async function testAsync(name, fn) {
  try { await fn(); console.log(`  ✅  ${name}`); passed++; }
  catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
}

function mkTmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mf-crash-guard-')); }

/** Poll GET /api/status until it answers, or give up after timeoutMs. */
async function waitForUp(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const code = await new Promise(resolve => {
      const req = http.get({ host: '127.0.0.1', port, path: '/api/status', timeout: 1000 },
        res => { res.resume(); resolve(res.statusCode); });
      req.on('timeout', () => { req.destroy(); resolve(null); });
      req.on('error', () => resolve(null));
    });
    if (code) return code;
    await new Promise(r => setTimeout(r, 100));
  }
  return null;
}

// An ephemeral port the OS just handed back. listen(0) resolves asynchronously, so
// address() must be read from the 'listening' event, not straight after listen().
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/**
 * Boot server.js in a child, then run `trigger` (source text) once it is listening.
 * If the process is still alive 1.5s after the fault it prints STILL_ALIVE and exits
 * 42 — that is how "the guard logged and kept serving" is distinguished from
 * "the guard exited", instead of inferring it from a test-runner timeout.
 */
async function bootAndFault(trigger) {
  const dir  = mkTmp();
  const port = await freePort();
  const harness = path.join(dir, 'harness.js');
  fs.writeFileSync(harness, `
'use strict';
process.argv = [process.argv[0], ${JSON.stringify(SERVER)}, '--port', '${port}'];
require(${JSON.stringify(SERVER)});
setTimeout(() => {
  ${trigger}
  setTimeout(() => { console.log('STILL_ALIVE'); process.exit(42); }, 1500);
}, 600);
`);
  // cwd = the temp dir, never the repo: server.js resolves its token and pid paths
  // from process.cwd() and a fatal exit leaves both files behind.
  const r = spawnSync(process.execPath, [harness], { cwd: dir, encoding: 'utf8', timeout: 20000 });
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  return { status: r.status, signal: r.signal, out: `${r.stdout || ''}${r.stderr || ''}` };
}

console.log('\n🧪  Dashboard crash-guard policy\n');

(async () => {

  // ── 1. unhandledRejection must be fatal ────────────────────────────────────
  await testAsync('unhandledRejection logs and exits 1 (does not keep serving)', async () => {
    const r = await bootAndFault('Promise.reject(new Error("MF_PROBE_REJECTION"));');
    assert.ok(!/STILL_ALIVE/.test(r.out),
      'process survived an unhandled rejection — log-and-continue deletes the only detector for the un-awaited-async class (ASYNC-01)');
    assert.strictEqual(r.status, 1, `expected exit 1, got ${r.status} (signal ${r.signal})`);
    assert.match(r.out, /Unhandled rejection/,
      'the reason must still be logged before exiting — a silent exit is not diagnosable');
    assert.match(r.out, /MF_PROBE_REJECTION/, 'the rejection reason itself must reach the log');
  });

  // ── 2. uncaughtException must stay fatal (sibling policy, do not regress) ──
  await testAsync('uncaughtException logs and exits 1', async () => {
    const r = await bootAndFault('setTimeout(() => { throw new Error("MF_PROBE_THROW"); }, 0);');
    assert.ok(!/STILL_ALIVE/.test(r.out),
      'process survived an uncaught exception — log-and-continue here previously made shutdown() ignore SIGTERM');
    assert.strictEqual(r.status, 1, `expected exit 1, got ${r.status} (signal ${r.signal})`);
    assert.match(r.out, /Uncaught exception/, 'the stack must be logged before exiting');
  });

  // ── 3. An escaped route rejection must not hold the client socket ──────────
  // express 4.22.1 does not catch async handler rejections and its error-handling
  // middleware never sees them, so the socket is released only when the process
  // goes away. Measured: log-and-continue held it for the full client timeout.
  await testAsync('escaped async route rejection releases the client socket fast (no silent hang)', async () => {
    const dir  = mkTmp();
    const port = await freePort();
    const harness = path.join(dir, 'harness.js');
    fs.writeFileSync(harness, `
'use strict';
// Add ONE route whose async handler rejects, by intercepting the express factory
// before server.js calls it. Nothing else about the app changes.
const expressPath = require.resolve('express', { paths: [${JSON.stringify(path.dirname(SERVER))}] });
const real = require(expressPath);
const patched = function (...a) {
  const app = real(...a);
  app.get('/__reject', async () => {
    await new Promise((_, rej) => setTimeout(() => rej(new Error('MF_ROUTE_REJECTION')), 10));
  });
  return app;
};
Object.assign(patched, real);
require.cache[expressPath].exports = patched;
process.argv = [process.argv[0], ${JSON.stringify(SERVER)}, '--port', '${port}'];
require(${JSON.stringify(SERVER)});
`);
    const child = spawn(process.execPath, [harness], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });

    const CLIENT_TIMEOUT_MS = 4000;
    try {
      // Poll until it is listening rather than sleeping a fixed interval, so a slow
      // CI box does not turn a policy assertion into a flake.
      const ok = await waitForUp(port, 8000);
      assert.strictEqual(ok, 200, 'server did not come up');

      const started = Date.now();
      const outcome = await new Promise(resolve => {
        const req = http.get({ host: '127.0.0.1', port, path: '/__reject', timeout: CLIENT_TIMEOUT_MS },
          res => { res.resume(); res.on('end', () => resolve({ kind: 'response', code: res.statusCode })); });
        req.on('timeout', () => { req.destroy(); resolve({ kind: 'client-timeout' }); });
        req.on('error', err => resolve({ kind: 'socket-error', code: err.code || err.message }));
      });
      const elapsed = Date.now() - started;

      assert.notStrictEqual(outcome.kind, 'client-timeout',
        `client hung for the full ${CLIENT_TIMEOUT_MS}ms with no answer — a held socket is the worst outcome. Child said: ${out.trim().split('\n').pop()}`);
      assert.ok(elapsed < 2000,
        `client waited ${elapsed}ms; the socket must be released promptly (measured ~15ms when the guard exits)`);
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  });

  console.log(`\nTests finished: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
