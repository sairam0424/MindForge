/**
 * MindForge v2 — QA Engine
 * Diff-aware systematic UI testing.
 */
'use strict';

const { execSync } = require('child_process');
const DaemonMgr    = require('./daemon-manager');
const ScreenStore  = require('./screenshot-store');

const DEV_SERVER = process.env.DEV_SERVER_URL || 'http://localhost:3000';

function extractSurfaces() {
  const files = execSync('git diff --name-only HEAD~1', { encoding: 'utf8' }).split('\n').filter(Boolean);
  const surfaces = [];
  for (const file of files) {
    if (file.includes('pages/') || file.includes('app/')) {
      const route = file.replace(/.*(pages|app)/, '').replace(/\.(tsx|jsx|ts|js)$/, '').replace(/\/page$/, '').replace(/\/index$/, '') || '/';
      surfaces.push({ file, route });
    }
  }
  return surfaces;
}

async function runQA(phaseNum) {
  await DaemonMgr.ensureRunning();
  const surfaces = extractSurfaces();
  const results = [];
  const bugs = [];

  for (const surface of surfaces) {
    const route = surface.route;
    const r = await DaemonMgr.request('POST', '/navigate', { url: `${DEV_SERVER}${route}`, session: 'default' });
    const passed = r.success && r.status_code < 400;
    
    if (!passed) {
      const snap = await DaemonMgr.request('POST', '/screenshot', { session: 'default' });
      const shot = snap.success ? ScreenStore.save(snap.screenshot_b64, phaseNum, 'qa', `fail-${route.replace(/\//g, '-')}.png`) : null;
      bugs.push({ surface: route, error: r.error || `Status ${r.status_code}`, screenshot: shot });
    }
    results.push({ surface: route, passed });
  }

  return { surfaces: surfaces.length, passed: results.filter(r => r.passed).length, failed: bugs.length, results, bugs };
}

module.exports = { runQA };
