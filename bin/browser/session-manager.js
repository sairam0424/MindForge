/**
 * MindForge v2 — Session Manager
 * Persists browser state (cookies, localStorage) to disk.
 */
/* global localStorage */
'use strict';

const fs   = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(process.cwd(), '.mindforge', 'browser', 'sessions');
const ensureDir = () => fs.mkdirSync(SESSIONS_DIR, { recursive: true });

async function saveSession(name, context) {
  const safeName = name.replace(/[^a-z0-9_-]/gi, '_');
  const filePath = path.join(SESSIONS_DIR, `${safeName}.json`);
  ensureDir();
  const cookies = await context.cookies();
  const storageByOrigin = {};

  for (const page of context.pages()) {
    try {
      const origin = new URL(page.url()).origin;
      if (origin.startsWith('http')) {
        const ls = await page.evaluate(() => {
          const items = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            items[key] = localStorage.getItem(key);
          }
          return items;
        }).catch(() => ({}));
        if (Object.keys(ls).length) storageByOrigin[origin] = { localStorage: ls };
      }
    } catch (err) {
      // Ignore navigation or evaluation errors for individual pages during session save
    }
  }

  const data = {
    name,
    saved_at: new Date().toISOString(),
    url: context.pages()[0]?.url() ?? '',
    cookies,
    storage: storageByOrigin,
    _warning: 'Contains authentication cookies. NEVER commit this file.',
  };

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function loadSession(name, context) {
  const safeName = name.replace(/[^a-z0-9_-]/gi, '_');
  const filePath = path.join(SESSIONS_DIR, `${safeName}.json`);
  if (!fs.existsSync(filePath)) throw new Error(`Session file not found: ${filePath}`);

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let cookiesLoaded = 0;

  if (data.cookies?.length) {
    const now = Date.now() / 1000;
    const valid = data.cookies.filter(c => !c.expires || c.expires === -1 || c.expires > now);
    if (valid.length) {
      await context.addCookies(valid);
      cookiesLoaded = valid.length;
    }
  }

  return { cookiesLoaded };
}

/**
 * Import cookies/sessions directly from a native browser profile.
 *
 * NOT IMPLEMENTED: native browser cookie DB import was removed together with
 * the `better-sqlite3` dependency (the project now uses sql.js / WASM). Browser
 * cookie stores are SQLite databases, and decoding them required that native
 * backend. Rather than silently returning an empty array — which would lie about
 * capability and let callers mistake "no cookies imported" for success — this
 * method throws so the missing capability is explicit.
 *
 * To populate a session, capture cookies live via a browser context and use
 * `saveSession` / `loadSession` instead.
 *
 * @param {string} source - Browser identifier (chrome, arc, brave, edge).
 * @throws {Error} Always — native browser cookie import is not implemented.
 */
function importFromBrowser(source) {
  throw new Error(
    `importFromBrowser not implemented for "${source}": the native browser ` +
    'cookie-DB backend (better-sqlite3) was removed project-wide. ' +
    'Capture cookies live via a browser context and use saveSession/loadSession instead.'
  );
}

module.exports = { saveSession, loadSession, importFromBrowser };
