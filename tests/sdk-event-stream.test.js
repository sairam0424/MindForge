/**
 * The SDK's WebSocket event stream must not take the caller's process down.
 *
 * THE DEFECT, reproduced against the compiled module before the fix. `WebSocketEventStream.connect()`
 * returns a Promise that rejects via `onerror`. The reconnect scheduled in `onclose` was:
 *
 *     setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
 *
 * Nothing awaits that promise, so a reconnect failure is an unhandled rejection — and under Node's
 * default mode that is fatal. Measured with a stub socket whose second instantiation calls `onerror`:
 * the child exited 1 and the statement after the wait never ran. A consumer whose dashboard restarts
 * loses their process, with a stack trace pointing into the SDK.
 *
 * README.md:3 sells this as a "streaming SDK". Two further measured facts about that claim, neither
 * of which this file asserts because neither is a behaviour a test can pin honestly:
 *   - `sdk/package.json` has NO dependencies and `engines.node` is >=18.0.0, while `WebSocket` is
 *     `declare`d, not imported. On Node 18 or 20 the constructor is a bare ReferenceError. This file
 *     DOES pin the legible-failure guard added for that case.
 *   - `grep -rn "'/ws'|upgrade|WebSocketServer" bin/dashboard/*.js` returns nothing: there is no
 *     WebSocket server in the product, so the documented client has nothing to connect to. That is a
 *     prose problem, fixed in the README, deliberately with no gate — a check whose fix supplies the
 *     prose it scans for is theatre.
 *
 * WHY THIS BUILDS THE SDK RATHER THAN SKIPPING. `sdk/dist/` is gitignored (sdk/.gitignore:1), and the
 * workflows that run root `npm test` do not all build it first: `.github/workflows/execution-plane.yml`
 * does, `.github/workflows/mindforge-release.yml:31` does NOT. A test that skips when the artifact is
 * missing would skip in the release workflow — the one run that most needs it. Root has typescript, so
 * this compiles on demand and fails loudly if it cannot.
 */
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..'));
const DIST = path.join(REPO_ROOT, 'sdk', 'dist', 'events.js');

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

function ensureBuilt() {
  if (fs.existsSync(DIST)) return;
  const r = spawnSync('npx', ['--no-install', 'tsc', '-p', 'sdk/tsconfig.json'],
    { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.ok(fs.existsSync(DIST),
    'could not produce sdk/dist/events.js. This test compiles the SDK rather than skipping, because '
    + 'skipping would make it inert in mindforge-release.yml, which runs `npm test` without building '
    + `the SDK. tsc said: ${(r.stderr || r.stdout || '(no output)').slice(-500)}`);
}

/**
 * Run a driver script in a CHILD process. The process-death question cannot be answered in-process:
 * an unhandled rejection kills the runner itself, which would look like a crashed test suite rather
 * than a failed assertion.
 */
function runDriver(body) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-ws-')), 'driver.js');
  fs.writeFileSync(file, `const { WebSocketEventStream } = require(${JSON.stringify(DIST)});\n${body}`);
  try {
    const r = spawnSync(process.execPath, [file], {
      encoding: 'utf8', env: { PATH: process.env.PATH }, timeout: 20000,
    });
    return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
  } finally {
    fs.rmSync(path.dirname(file), { recursive: true, force: true });
  }
}

// A stub socket: first instance opens then closes (provoking a reconnect); the second calls onerror,
// so the reconnect's promise rejects. Reports how many sockets were constructed, which is what makes
// the assertions below non-vacuous.
const STUB = `
let made = 0;
globalThis.WebSocket = class {
  constructor() {
    made++;
    const mine = made;
    setTimeout(() => {
      if (mine === 1) {
        this.onopen && this.onopen();
        setTimeout(() => this.onclose && this.onclose(), 10);
      } else {
        this.onerror && this.onerror(new Error('reconnect refused'));
      }
    }, 5);
  }
  send() {}
  close() {}
};
const socketsMade = () => made;
`;

test('a failed reconnect does NOT terminate the caller\'s process', () => {
  ensureBuilt();
  const r = runDriver(`${STUB}
(async () => {
  const s = new WebSocketEventStream('ws://127.0.0.1:7337/ws');
  const errors = [];
  s.on('error', (e) => errors.push(e && e.message ? e.message : String(e)));
  await s.connect();
  await new Promise((res) => setTimeout(res, 2500));
  process.stdout.write(JSON.stringify({ alive: true, errors, sockets: socketsMade() }) + '\\n');
})();
`);

  assert.strictEqual(r.status, 0,
    `the driver exited ${r.status}. Before the .catch() on the scheduled reconnect this was 1: the `
    + `rejection was unhandled and Node terminated the process. stderr: ${r.stderr.slice(0, 400)}`);

  const line = r.stdout.trim().split('\n').filter(Boolean).pop();
  assert.ok(line, `the driver printed nothing, so it died before completing. stderr: ${r.stderr.slice(0, 400)}`);
  const out = JSON.parse(line);

  // NON-VACUITY: if the reconnect never happened, nothing above was exercised and `alive: true`
  // means only that a socket opened once. Assert the second socket was actually constructed.
  assert.strictEqual(out.sockets, 2,
    `${out.sockets} socket(s) were constructed, expected 2. A reconnect was never attempted, so this `
    + 'test proves nothing about reconnect failure. The stub or the onclose branch changed.');

  assert.deepStrictEqual(out.errors, ['reconnect refused'],
    `the reconnect failure must surface on an 'error' listener, got ${JSON.stringify(out.errors)}. `
    + 'Swallowing it silently would trade a crash for a stream the consumer believes is live.');
});

test('with no error listener the failure is reported, not swallowed', () => {
  ensureBuilt();
  const r = runDriver(`${STUB}
(async () => {
  const s = new WebSocketEventStream();
  await s.connect();
  await new Promise((res) => setTimeout(res, 2500));
  process.stdout.write('SURVIVED\\n');
})();
`);
  assert.strictEqual(r.status, 0, `exited ${r.status}: ${r.stderr.slice(0, 300)}`);
  assert.match(r.stdout, /SURVIVED/, 'the process must survive even with no error listener registered');
  assert.match(r.stderr, /\[MindForge SDK\] event stream error: reconnect refused/,
    `an unlistened error must still be reported. stderr was: ${JSON.stringify(r.stderr.slice(0, 300))}`);
});

test('exhausting the reconnect attempts emits `close`, so a dead stream is observable', () => {
  ensureBuilt();
  // The default backoff is 1s+2s+3s+4s+5s = 15s, which is 15 seconds added to every CI run forever
  // for one branch. `maxReconnectAttempts` is `private` in TypeScript but an ordinary property at
  // runtime, so the driver lowers it to 2 and the same branch is reached in ~3s.
  //
  // Lowering it could hide a change to the DEFAULT, so the driver also reports the default read from
  // a fresh instance and this test asserts it is still 5. Cheaper AND covering one thing more.
  const r = runDriver(`
let made = 0;
globalThis.WebSocket = class {
  constructor() {
    made++;
    const mine = made;
    setTimeout(() => {
      if (mine === 1) {
        this.onopen && this.onopen();
        setTimeout(() => this.onclose && this.onclose(), 10);
      } else {
        // Every reconnect fails, and each failure also closes, driving the next attempt.
        this.onerror && this.onerror(new Error('refused'));
        setTimeout(() => this.onclose && this.onclose(), 5);
      }
    }, 5);
  }
  send() {}
  close() {}
};
(async () => {
  const defaultMax = new WebSocketEventStream().maxReconnectAttempts;
  const s = new WebSocketEventStream();
  s.maxReconnectAttempts = 2;     // TS-private, plain property at runtime: 1s + 2s instead of 15s
  const closes = [];
  s.on('error', () => {});
  s.on('close', (d) => closes.push(d));
  await s.connect();
  await new Promise((res) => setTimeout(res, 4500));
  process.stdout.write(JSON.stringify({ closes, sockets: made, defaultMax }) + '\\n');
})();
`);
  assert.strictEqual(r.status, 0, `exited ${r.status}: ${r.stderr.slice(0, 300)}`);
  const out = JSON.parse(r.stdout.trim().split('\n').filter(Boolean).pop());

  // The default must not drift unnoticed just because the driver lowers it.
  assert.strictEqual(out.defaultMax, 5,
    `maxReconnectAttempts defaults to ${out.defaultMax}, expected 5. sdk/README.md states "5 attempts".`);

  // Non-vacuity: 1 initial + 2 reconnects. If fewer, the backoff never ran to exhaustion and the
  // absence of a close event would prove nothing.
  assert.strictEqual(out.sockets, 3,
    `${out.sockets} sockets constructed, expected 3 (1 initial + 2 reconnects). The attempts did not `
    + 'run to exhaustion, so this test cannot say anything about the exhausted branch.');

  assert.strictEqual(out.closes.length, 1,
    `expected exactly one 'close' event once attempts were exhausted, got ${out.closes.length}. `
    + 'sdk/README.md promises this; without it a dead stream is silent.');
  assert.strictEqual(out.closes[0].reason, 'reconnect attempts exhausted');
  assert.strictEqual(out.closes[0].attempts, 2);
});

test('a deliberate disconnect() does NOT report itself as exhausted attempts', () => {
  ensureBuilt();
  // disconnect() sets maxReconnectAttempts to 0, which lands in the same else-branch as exhaustion.
  // Without a guard the caller would be told their stream died when they closed it themselves.
  const r = runDriver(`
globalThis.WebSocket = class {
  constructor() { setTimeout(() => this.onopen && this.onopen(), 5); }
  send() {}
  close() { setTimeout(() => this.onclose && this.onclose(), 5); }
};
(async () => {
  const s = new WebSocketEventStream();
  const closes = [];
  s.on('close', (d) => closes.push(d));
  await s.connect();
  const ws = s.ws;               // keep a handle: disconnect() nulls the field
  s.disconnect();
  ws.close();                    // a real socket fires onclose after close()
  await new Promise((res) => setTimeout(res, 300));
  process.stdout.write(JSON.stringify({ closes }) + '\\n');
})();
`);
  assert.strictEqual(r.status, 0, `exited ${r.status}: ${r.stderr.slice(0, 300)}`);
  const out = JSON.parse(r.stdout.trim().split('\n').filter(Boolean).pop());
  assert.deepStrictEqual(out.closes, [],
    `a caller-initiated disconnect emitted ${JSON.stringify(out.closes)}. It must stay silent — the `
    + 'caller already knows, and "reconnect attempts exhausted" would be a false explanation.');
});

test('a missing global WebSocket fails legibly, not as a bare ReferenceError', () => {
  ensureBuilt();
  const r = runDriver(`
delete globalThis.WebSocket;
(async () => {
  const s = new WebSocketEventStream();
  try {
    await s.connect();
    process.stdout.write('NO_ERROR\\n');
  } catch (e) {
    process.stdout.write(JSON.stringify({ name: e.name, message: e.message }) + '\\n');
  }
})();
`);
  assert.strictEqual(r.status, 0, `exited ${r.status}: ${r.stderr.slice(0, 300)}`);
  const out = JSON.parse(r.stdout.trim().split('\n').filter(Boolean).pop());
  assert.notStrictEqual(out.name, 'ReferenceError',
    'a bare `ReferenceError: WebSocket is not defined` tells the caller nothing about why. '
    + 'sdk/package.json declares no dependencies while engines.node is >=18, so this is the '
    + 'expected state on Node 18 and 20.');
  assert.match(out.message, /Node 22|'ws'/,
    `the message must name what is required, got ${JSON.stringify(out.message)}`);
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nSDK Event Stream: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
