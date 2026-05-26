/**
 * MindForge v2 — Session Manager
 * Persists browser state (cookies, localStorage) to disk.
 */
/* global localStorage */
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

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

function importFromBrowser(source) {
  const home = os.homedir();
  const paths = {
    chrome: `${home}/Library/Application Support/Google/Chrome/Default/Cookies`,
    arc: `${home}/Library/Application Support/Arc/User Data/Default/Cookies`,
    brave: `${home}/Library/Application Support/BraveSoftware/Brave-Browser/Default/Cookies`,
    edge: `${home}/Library/Application Support/Microsoft Edge/Default/Cookies`,
  };

  const p = paths[source.toLowerCase()];
  if (!p || !fs.existsSync(p)) {
    throw new Error(`Cookie file for ${source} not found at ${p}`);
  }

  // Real SQLite parsing would happen here via better-sqlite3 if installed.
  // This is a placeholder for the logic specified in the roadmap.
  return [];
}

module.exports = { saveSession, loadSession, importFromBrowser };
