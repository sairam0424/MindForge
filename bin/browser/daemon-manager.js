/**
 * MindForge v2 — Browser Daemon Manager
 * Starts and stops the browser-daemon.js process.
 */
'use strict';

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const http = require('http');

const PORT = process.env.BROWSER_PORT || 7338;
const DAEMON_SCRIPT = path.join(__dirname, 'browser-daemon.js');

async function isRunning() {
  return new Promise(resolve => {
    const req = http.get(`http://127.0.0.1:${PORT}/status`, res => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function start() {
  if (await isRunning()) return;

  const out = fs.openSync(path.join(process.cwd(), '.planning/browser-daemon.log'), 'a');
  const err = fs.openSync(path.join(process.cwd(), '.planning/browser-daemon.log'), 'a');

  const child = spawn(process.execPath, [DAEMON_SCRIPT], {
    detached: true,
    stdio: ['ignore', out, err],
    env: { ...process.env, BROWSER_HEADLESS: 'true' }
  });

  child.unref();
  console.log('[manager] Starting browser daemon...');

  // Wait for it to wake up
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 500));
    if (await isRunning()) {
      console.log('[manager] Browser daemon ready.');
      return;
    }
  }
  throw new Error('Timeout waiting for browser daemon to start');
}

async function stop() {
  if (!(await isRunning())) return;
  // Simple way to kill on localhost
  try {
    if (process.platform === 'win32') {
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| find ":${PORT}" ^| find "LISTENING"') do taskkill /f /pid %a`);
    } else {
      execSync(`lsof -t -i:${PORT} | xargs kill -9`);
    }
    console.log('[manager] Browser daemon stopped.');
  } catch (err) {
    console.error('[manager] Failed to stop daemon:', err.message);
  }
}

async function ensureRunning(opts = {}) {
  if (!(await isRunning())) await start();
}

async function request(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: endpoint,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({ success: false, error: 'Invalid JSON response' }); }
      });
    });
    req.on('error', err => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

module.exports = { start, stop, isRunning, ensureRunning, request };
