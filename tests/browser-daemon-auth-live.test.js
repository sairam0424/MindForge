// @skip: requires Chromium daemon and display environment
/**
 * MindForge — Browser Daemon Auth Enforcement (live, requires Chromium).
 * Confirms /navigate is rejected without a bearer token and accepted with one,
 * closing the gap where only /evaluate previously required auth.
 * Run manually: node tests/browser-daemon-auth-live.test.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const DaemonMgr = require('../bin/browser/daemon-manager');

const TOKEN_PATH = path.join(
  process.cwd(),
  '.mindforge',
  '.browser-daemon-token',
);
const PORT = process.env.BROWSER_PORT || 7338;

function rawRequest(method, endpoint, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path: endpoint,
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () =>
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : {},
          }),
        );
      },
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  await DaemonMgr.start();
  try {
    const token = fs.readFileSync(TOKEN_PATH, 'utf8').trim();

    const unauthed = await rawRequest('POST', '/navigate', {
      url: 'about:blank',
      session: 'auth-test',
    });
    assert.strictEqual(
      unauthed.statusCode,
      401,
      '/navigate without a token must be rejected',
    );
    console.log('  PASS  /navigate rejects a missing bearer token');

    const wrongToken = await rawRequest(
      'POST',
      '/navigate',
      { url: 'about:blank', session: 'auth-test' },
      { Authorization: 'Bearer not-the-real-token' },
    );
    assert.strictEqual(
      wrongToken.statusCode,
      401,
      '/navigate with a wrong token must be rejected',
    );
    console.log('  PASS  /navigate rejects an incorrect bearer token');

    const authed = await rawRequest(
      'POST',
      '/navigate',
      { url: 'about:blank', session: 'auth-test' },
      { Authorization: `Bearer ${token}` },
    );
    assert.strictEqual(
      authed.statusCode,
      200,
      '/navigate with the real token must succeed',
    );
    assert.strictEqual(authed.body.success, true);
    console.log('  PASS  /navigate accepts the real bearer token');

    const status = await rawRequest('GET', '/status');
    assert.strictEqual(
      status.statusCode,
      200,
      '/status must stay unauthenticated (liveness probe)',
    );
    console.log('  PASS  /status remains unauthenticated');

    console.log('\nBrowser Daemon Auth (live): all checks passed');
  } finally {
    await DaemonMgr.stop();
  }
}

run().catch((err) => {
  console.error('\nFAIL', err);
  process.exit(1);
});
