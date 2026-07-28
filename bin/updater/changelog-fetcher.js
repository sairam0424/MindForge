/**
 * MindForge — Changelog Fetcher
 * Downloads and parses CHANGELOG.md entries between two versions.
 * Used by /mindforge:update to show what changed.
 */
'use strict';

const { compareSemver } = require('./version-comparator');

const REPO = 'sairam0424/MindForge';
const CHANGELOG_URL = `https://raw.githubusercontent.com/${REPO}/main/CHANGELOG.md`;
const CHANGELOGS_ARCHIVE_BASE = `https://raw.githubusercontent.com/${REPO}/main/changelogs`;

// Root CHANGELOG.md ships as a rolling-window aggregator (newest ~10 versions,
// full '## [x.y.z]' headers). Older versions live one-per-file under changelogs/.
// Cap the per-version fallback fetch loop so an ancient fromVersion can't trigger
// unbounded GitHub requests.
const MAX_ARCHIVE_FETCHES = 20;

/**
 * Fetch CHANGELOG.md and extract entries between fromVersion and toVersion.
 * Returns formatted markdown string, or null if unavailable.
 */
async function fetchChangelog(fromVersion, toVersion) {
  const raw = await fetchRaw();
  if (!raw) return null;

  const sections = extractSections(raw, fromVersion, toVersion);
  if (sections.length) {
    return sections.map(s => s.lines.join('\n').trimEnd()).join('\n\n');
  }

  // Empty result can mean either "nothing changed" or "fromVersion predates the
  // rolling window now kept in root CHANGELOG.md". Only fall back to the
  // per-version archive when fromVersion is genuinely older than the oldest
  // version still present in the fetched root file.
  const oldestInWindow = oldestVersionIn(raw);
  if (oldestInWindow && compareSemver(fromVersion, oldestInWindow) < 0) {
    return fetchFromArchive(fromVersion, toVersion);
  }

  return null;
}

async function fetchRaw() {
  return fetchUrl(CHANGELOG_URL);
}

async function fetchVersionFile(version) {
  return fetchUrl(`${CHANGELOGS_ARCHIVE_BASE}/v${version}.md`);
}

function fetchUrl(url) {
  const https = require('https');
  return new Promise(resolve => {
    const req = https.get(url, { timeout: 8000 }, res => {
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
 * Fallback path: fromVersion predates the rolling window kept in root
 * CHANGELOG.md. Fetch the archive's version index (the authoritative list of
 * every released version — avoids guessing nonexistent versions by walking
 * semver digits), select the versions in range, fetch each one's
 * changelogs/vX.Y.Z.md, and concatenate the ones that exist. Capped at
 * MAX_ARCHIVE_FETCHES, newest-first-trimmed (closest to toVersion kept).
 */
async function fetchFromArchive(fromVersion, toVersion) {
  const versions = await enumerateVersions(fromVersion, toVersion);
  if (!versions.length) return null;

  const results = await Promise.all(versions.map(v => fetchVersionFile(v)));
  const parts = results.filter(Boolean).map(body => body.replace(/^# Changelog\s*\n+/, '').trimEnd());
  return parts.length ? parts.join('\n\n') : null;
}

/**
 * Fetch changelogs/index.json (authoritative version list) and return every
 * version strictly after fromVersion and up to and including toVersion,
 * oldest-first, capped at MAX_ARCHIVE_FETCHES (keeping the versions nearest
 * toVersion when the range exceeds the cap, since those are most relevant to
 * the user's update).
 */
async function enumerateVersions(fromVersion, toVersion) {
  const indexRaw = await fetchUrl(`${CHANGELOGS_ARCHIVE_BASE}/index.json`);
  if (!indexRaw) return [];

  let versions;
  try { versions = JSON.parse(indexRaw).versions; } catch { return []; }
  if (!Array.isArray(versions)) return [];

  const inRange = versions.filter(
    v => compareSemver(v, fromVersion) > 0 && compareSemver(v, toVersion) <= 0
  );
  // index.json is newest-first; keep the newest MAX_ARCHIVE_FETCHES, then
  // restore oldest-first order for chronological concatenation.
  return inRange.slice(0, MAX_ARCHIVE_FETCHES).reverse();
}

function oldestVersionIn(changelog) {
  let oldest = null;
  for (const line of changelog.split('\n')) {
    const vMatch = line.match(/^## \[?v?(\d+\.\d+\.\d+)/);
    if (vMatch) {
      const v = vMatch[1];
      if (!oldest || compareSemver(v, oldest) < 0) oldest = v;
    }
  }
  return oldest;
}

/**
 * Parse CHANGELOG.md and extract version sections in range (from, to].
 */
function extractSections(changelog, fromVersion, toVersion) {
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

  return sections;
}

// Back-compat named export: some callers/tests may reference extractEntries
// directly with the original (string | null) return contract.
function extractEntries(changelog, fromVersion, toVersion) {
  const sections = extractSections(changelog, fromVersion, toVersion);
  return sections.length
    ? sections.map(s => s.lines.join('\n').trimEnd()).join('\n\n')
    : null;
}

module.exports = { fetchChangelog, extractEntries };
