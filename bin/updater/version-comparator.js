/**
 * MindForge — Version Comparator
 * Pure functions for semver comparison.
 * No external dependencies — must work offline.
 */
'use strict';

/**
 * Compare two semver strings (strips leading 'v').
 * Returns: negative if a < b, 0 if a == b, positive if a > b
 */
function compareSemver(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Determine the upgrade type between two versions.
 * Returns 'major' | 'minor' | 'patch' | 'none'
 */
function upgradeType(current, latest) {
  const c = current.replace(/^v/, '').split('.').map(Number);
  const l = latest.replace(/^v/, '').split('.').map(Number);
  if (l[0] > c[0]) return 'major';
  if (l[1] > c[1]) return 'minor';
  if (l[2] > c[2]) return 'patch';
  return 'none';
}

/**
 * Fetch the latest published version from the npm registry.
 * Returns null on any error — callers must handle gracefully.
 * Timeout: 5 seconds (respects enterprise proxies that may be slow).
 */
async function fetchLatestVersion(packageName = 'mindforge-cc') {
  const https = require('https');
  return new Promise(resolve => {
    const options = {
      hostname: 'registry.npmjs.org',
      path:     `/${encodeURIComponent(packageName)}/latest`,
      method:   'GET',
      headers:  { 'Accept': 'application/json', 'User-Agent': `mindforge-cc/${require('../../package.json').version}` },
      timeout:  5000,
    };

    const req = https.request(options, res => {
      if (res.statusCode !== 200) { resolve(null); return; }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body).version || null); }
        catch { resolve(null); }
      });
    });

    req.on('error',   () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

module.exports = { compareSemver, upgradeType, fetchLatestVersion };
