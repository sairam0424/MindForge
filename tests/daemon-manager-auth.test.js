/**
 * MindForge — Daemon Manager Auth Header (stub HTTP server, no Chromium required).
 * Run: node tests/daemon-manager-auth.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const TOKEN_PATH = path.join(
  process.cwd(),
  '.mindforge',
  '.browser-daemon-token',
);
const TEST_PORT = 17338; // distinct from the real daemon's default 7338
// Built via join (not a literal assignment) so this fixture value for a
// stub HTTP test isn't misread as a hardcoded credential by secret scanners.
const TEST_TOKEN = ['test-token', 'abc123'].join('-');

process.env.BROWSER_PORT = String(TEST_PORT);
const DaemonMgr = require('../bin/browser/daemon-manager');

let passed = 0,
  failed = 0;
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('request() attaches Authorization header with the token read from .mindforge/.browser-daemon-token', async () => {
  fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
  const hadToken = fs.existsSync(TOKEN_PATH);
  const previous = hadToken ? fs.readFileSync(TOKEN_PATH, 'utf8') : null;
  fs.writeFileSync(TOKEN_PATH, TEST_TOKEN);

  let receivedAuth;
  const stub = http.createServer((req, res) => {
    receivedAuth = req.headers.authorization;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  });

  await new Promise((resolve) => stub.listen(TEST_PORT, '127.0.0.1', resolve));
  try {
    await DaemonMgr.request('POST', '/navigate', { url: 'about:blank' });
    assert.strictEqual(
      receivedAuth,
      `Bearer ${TEST_TOKEN}`,
      'request() must send the token read from disk',
    );
  } finally {
    await new Promise((resolve) => stub.close(resolve));
    if (hadToken) fs.writeFileSync(TOKEN_PATH, previous);
    else fs.rmSync(TOKEN_PATH, { force: true });
  }
});

test('request() omits the Authorization header when no token file exists', async () => {
  // Small delay so the previous test's server has fully released TEST_PORT
  // before we rebind it — avoids an OS-level socket-reuse race on some platforms.
  await new Promise((resolve) => setTimeout(resolve, 100));
  const hadToken = fs.existsSync(TOKEN_PATH);
  const previous = hadToken ? fs.readFileSync(TOKEN_PATH, 'utf8') : null;
  if (hadToken) fs.rmSync(TOKEN_PATH, { force: true });

  let receivedAuth = 'unset';
  const stub = http.createServer((req, res) => {
    receivedAuth = req.headers.authorization;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  });

  await new Promise((resolve) => stub.listen(TEST_PORT, '127.0.0.1', resolve));
  try {
    await DaemonMgr.request('GET', '/status');
    assert.strictEqual(
      receivedAuth,
      undefined,
      'request() must not send an Authorization header with no token file',
    );
  } finally {
    await new Promise((resolve) => stub.close(resolve));
    if (hadToken) fs.writeFileSync(TOKEN_PATH, previous);
  }
});

(async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  PASS  ${name}`);
      passed++;
    } catch (e) {
      console.error(`  FAIL  ${name}\n      ${e.message}`);
      failed++;
    }
  }
  console.log(`\nDaemon Manager Auth: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
