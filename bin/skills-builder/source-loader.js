/**
 * MindForge v2 — Source Loader
 * Loads documentation from URLs, local files/dirs, npm packages,
 * and the current session (SUMMARY files + HANDOFF.json).
 *
 * All URL fetches have SSRF protection (Day 10 pattern).
 * Local reads use walkDir() to safely enumerate files.
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const dns  = require('dns').promises;

const PLANNING_DIR   = path.join(process.cwd(), '.planning');
const MINDFORGE_DIR  = path.join(process.cwd(), '.mindforge');

// ── SSRF protection (reused from research-engine.js, Day 10) ─────────────────
const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,  // AWS metadata
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

async function isSafeUrl(rawUrl) {
  let parsed;
  try { parsed = new URL(rawUrl); } catch { return false; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;

  try {
    const { address } = await dns.lookup(parsed.hostname);
    if (PRIVATE_RANGES.some(r => r.test(address))) {
      process.stderr.write(`[source-loader] SSRF blocked: ${rawUrl} → ${address}\n`);
      return false;
    }
  } catch {
    process.stderr.write(`[source-loader] DNS resolution failed for: ${parsed.hostname}\n`);
    return false;
  }
  return true;
}

// ── URL fetcher ───────────────────────────────────────────────────────────────
async function fetchUrl(rawUrl, maxChars = 400_000, _redirectCount = 0) {
  if (_redirectCount > 5) {
    throw new Error(`Too many redirects (>5) for URL: ${rawUrl}`);
  }

  if (!await isSafeUrl(rawUrl)) {
    throw new Error(`URL blocked by SSRF protection: ${rawUrl}`);
  }

  return new Promise((resolve, reject) => {
    const protocol = rawUrl.startsWith('https') ? require('https') : require('http');
    let settled = false;
    const settle = (fn, val) => { if (!settled) { settled = true; fn(val); } };

    const hardTimer = setTimeout(() => {
      settle(reject, new Error(`Fetch timeout (30s): ${rawUrl}`));
    }, 30_000);

    const req = protocol.get(rawUrl, { headers: { 'User-Agent': 'MindForge-Learn/2.0' } }, res => {
      // Follow redirects (up to 5)
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        clearTimeout(hardTimer);
        // Pass incremented redirect count — SSRF re-checked in recursive call
        // Comment: Each redirect hop calls isSafeUrl() — open redirect chains through private IPs are blocked
        fetchUrl(res.headers.location, maxChars, _redirectCount + 1).then(settle.bind(null, resolve), settle.bind(null, reject));
        return;
      }
      if (res.statusCode !== 200) {
        clearTimeout(hardTimer);
        settle(reject, new Error(`HTTP ${res.statusCode} for: ${rawUrl}`));
        return;
      }

      let body = '';
      res.on('data', chunk => { body += chunk; if (body.length > maxChars) res.destroy(); });
      res.on('end', () => { clearTimeout(hardTimer); settle(resolve, body.slice(0, maxChars)); });
      res.on('error', err => { clearTimeout(hardTimer); settle(reject, err); });
    });
    req.on('error', err => { clearTimeout(hardTimer); settle(reject, err); });
    req.end();
  });
}

// ── HTML → text (strip tags for cleaner model context) ───────────────────────
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')   // Remove scripts
    .replace(/<style[\s\S]*?<\/style>/gi, '')      // Remove styles
    .replace(/<[^>]+>/g, ' ')                      // Strip remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/\s{3,}/g, '\n\n')                   // Collapse excessive whitespace
    .trim();
}

// ── npm package loader ────────────────────────────────────────────────────────
async function loadNpmPackage(packageName) {
  // Sanitize package name (prevent path injection)
  if (!/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(packageName)) {
    throw new Error(`Invalid npm package name: ${packageName}`);
  }

  const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
  const raw         = await fetchUrl(registryUrl, 500_000);
  const data        = JSON.parse(raw);

  const latest  = data['dist-tags']?.latest || Object.keys(data.versions || {}).pop();
  const version = data.versions?.[latest];
  const readme  = data.readme || version?.readme || '';

  return {
    name:        packageName,
    version:     latest,
    description: data.description || '',
    homepage:    data.homepage || '',
    repository:  version?.repository?.url || '',
    readme:      readme.slice(0, 200_000),
    keywords:    data.keywords || [],
  };
}

// ── Local file/directory loader ───────────────────────────────────────────────
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.planning']);
const DOC_EXTENSIONS = new Set(['.md', '.mdx', '.txt', '.rst', '.html', '.json', '.yaml', '.yml']);
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java']);

function walkDir(dir, extensions, maxFiles = 50) {
  const results = [];
  function walk(d) {
    if (results.length >= maxFiles) return;
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (results.length >= maxFiles) break;
      if (SKIP_DIRS.has(e.name)) continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (extensions.has(path.extname(e.name).toLowerCase())) results.push(full);
    }
  }
  walk(dir);
  return results;
}

function loadLocal(localPath, maxCharsPerFile = 50_000) {
  const resolved = path.resolve(localPath);

  // Safety check: resolved path must be inside cwd or be absolute
  const stat = fs.statSync(resolved);
  let content = '';

  if (stat.isDirectory()) {
    const allExts = new Set([...DOC_EXTENSIONS, ...CODE_EXTENSIONS]);
    const files   = walkDir(resolved, allExts, 30);
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8').slice(0, maxCharsPerFile);
      content += `\n\n### ${path.relative(process.cwd(), f)}\n${text}`;
      if (content.length > 600_000) break;
    }
  } else {
    content = fs.readFileSync(resolved, 'utf8').slice(0, maxCharsPerFile);
  }

  return { path: resolved, content: content.slice(0, 800_000) };
}

// ── Session loader ────────────────────────────────────────────────────────────
function loadSession(phaseNum = null) {
  const phasesDir = path.join(PLANNING_DIR, 'phases');
  if (!fs.existsSync(phasesDir)) return { content: '', sources: [] };

  // Determine phase to analyse
  let targetPhase = phaseNum;
  if (!targetPhase) {
    // Find the most recent phase with SUMMARY files
    const phaseDirs = fs.readdirSync(phasesDir)
      .filter(d => /^\d+$/.test(d))
      .map(Number).sort((a, b) => b - a); // Descending
    targetPhase = phaseDirs[0];
  }

  if (!targetPhase) return { content: '', sources: [] };

  const phaseDir = path.join(phasesDir, String(targetPhase));
  const sources  = [];
  let content    = `# Session Analysis — Phase ${targetPhase}\n\n`;

  // SUMMARY files
  const summaryFiles = fs.existsSync(phaseDir)
    ? fs.readdirSync(phaseDir).filter(f => f.startsWith('SUMMARY-') && f.endsWith('.md'))
    : [];
  for (const f of summaryFiles) {
    const text = fs.readFileSync(path.join(phaseDir, f), 'utf8');
    content += `## ${f}\n${text.slice(0, 10_000)}\n\n`;
    sources.push(f);
  }

  // HANDOFF.json implicit_knowledge
  const handoffPath = path.join(PLANNING_DIR, 'HANDOFF.json');
  if (fs.existsSync(handoffPath)) {
    try {
      const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
      const implicit = handoff.implicit_knowledge || [];
      if (implicit.length > 0) {
        content += '## Implicit Knowledge (from HANDOFF.json)\n';
        implicit
          .filter(i => (i.confidence || 0) >= 0.65)
          .forEach(i => { content += `- ${i.topic || i.text}: ${i.content || i.text}\n`; });
        content += '\n';
        sources.push('HANDOFF.json:implicit_knowledge');
      }
    } catch { /* ignore malformed HANDOFF */ }
  }

  // ADR files from this phase
  const decisionsDir = path.join(PLANNING_DIR, 'decisions');
  if (fs.existsSync(decisionsDir)) {
    const recentAdrs = fs.readdirSync(decisionsDir)
      .filter(f => f.startsWith('ADR-') && f.endsWith('.md'))
      .slice(-5); // Last 5 ADRs
    for (const f of recentAdrs) {
      const text = fs.readFileSync(path.join(decisionsDir, f), 'utf8');
      content += `## ${f}\n${text.slice(0, 5_000)}\n\n`;
      sources.push(f);
    }
  }

  return { content: content.slice(0, 800_000), sources, phase: targetPhase };
}

// ── Main load function ────────────────────────────────────────────────────────
async function load(source) {
  if (source === '--session') {
    const result = loadSession();
    return { type: 'session', content: result.content, metadata: { sources: result.sources, phase: result.phase } };
  }

  if (source.startsWith('npm:')) {
    const pkg = source.slice(4);
    const result = await loadNpmPackage(pkg);
    const content = `# ${result.name} v${result.version}\n${result.description}\n\n${result.readme}`;
    return { type: 'npm', content, metadata: result };
  }

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const raw  = await fetchUrl(source);
    const text = raw.includes('<html') || raw.includes('<HTML') ? htmlToText(raw) : raw;
    return { type: 'url', content: text, metadata: { url: source, length: raw.length } };
  }

  // Local path
  const result = loadLocal(source);
  return { type: 'local', content: result.content, metadata: { path: result.path } };
}

module.exports = { load, fetchUrl, isSafeUrl, htmlToText, loadNpmPackage, loadLocal, loadSession };
