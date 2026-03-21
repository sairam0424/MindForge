/**
 * MindForge — Changelog Fetcher
 * Downloads and parses CHANGELOG.md entries between two versions.
 * Used by /mindforge:update to show what changed.
 */
'use strict';

const { compareSemver } = require('./version-comparator');

const CHANGELOG_URL = 'https://raw.githubusercontent.com/mindforge-dev/mindforge/main/CHANGELOG.md';

/**
 * Fetch CHANGELOG.md and extract entries between fromVersion and toVersion.
 * Returns formatted markdown string, or null if unavailable.
 */
async function fetchChangelog(fromVersion, toVersion) {
  const raw = await fetchRaw();
  if (!raw) return null;
  return extractEntries(raw, fromVersion, toVersion);
}

async function fetchRaw() {
  const https = require('https');
  return new Promise(resolve => {
    const req = https.get(CHANGELOG_URL, { timeout: 8000 }, res => {
      if (res.statusCode !== 200) { resolve(null); return; }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(body));
    });
    req.on('error',   () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/**
 * Parse CHANGELOG.md and extract version sections in range (from, to].
 */
function extractEntries(changelog, fromVersion, toVersion) {
  const sections = [];
  let current = null;

  for (const line of changelog.split('\n')) {
    const vMatch = line.match(/^## \[?v?(\d+\.\d+\.\d+)/);
    if (vMatch) {
      if (current) sections.push(current);
      const v = vMatch[1];
      const inRange = compareSemver(v, fromVersion) > 0 && compareSemver(v, toVersion) <= 0;
      current = inRange ? { version: v, lines: [line] } : null;
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  return sections.length
    ? sections.map(s => s.lines.join('\n').trimEnd()).join('\n\n')
    : null;
}

module.exports = { fetchChangelog };
