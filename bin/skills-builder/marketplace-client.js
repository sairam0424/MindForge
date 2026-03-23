/**
 * MindForge v2 — Marketplace Client
 * Interface to the MindForge Community Skills Marketplace.
 *
 * The marketplace is a curated layer on top of the npm registry.
 * Skills are npm packages with the `mindforge-skill-` prefix.
 *
 * For this implementation: uses npm registry API directly.
 * A dedicated marketplace API (registry.mindforge.dev) would be used
 * when it becomes available.
 */
'use strict';

const https  = require('https');
const path   = require('path');
const fs     = require('fs');

const SKILL_PREFIX       = 'mindforge-skill-';
const NPM_REGISTRY       = 'https://registry.npmjs.org';
const NPM_SEARCH_API     = 'https://registry.npmjs.org/-/v1/search';
const MINDFORGEMD_PATH   = path.join(process.cwd(), 'MINDFORGE.md');

// ── Config reader ─────────────────────────────────────────────────────────────
function getConfig() {
  const defaults = {
    MARKETPLACE_REGISTRY: NPM_SEARCH_API,
    MARKETPLACE_DAILY_FETCH_LIMIT: 50,
  };
  if (!fs.existsSync(MINDFORGEMD_PATH)) return defaults;
  const content = fs.readFileSync(MINDFORGEMD_PATH, 'utf8');
  for (const [key, defaultVal] of Object.entries(defaults)) {
    const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
    if (match) defaults[key] = match[1].trim();
  }
  return defaults;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'MindForge-Marketplace/2.0', 'Accept': 'application/json' },
      timeout: 15_000,
    }, res => {
      let body = '';
      res.on('data', c => (body += c));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error(`Invalid JSON from ${url.slice(0, 80)}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

// ── Search ────────────────────────────────────────────────────────────────────
async function search(query, limit = 10) {
  const encoded = encodeURIComponent(`${SKILL_PREFIX} ${query}`);
  const url     = `${NPM_SEARCH_API}?text=${encoded}&size=${Math.min(limit, 50)}`;

  const data = await httpsGet(url);
  const objects = data.objects || [];

  return objects
    .filter(o => o.package?.name?.startsWith(SKILL_PREFIX))
    .map(o => ({
      name:         o.package.name,
      display_name: o.package.name.replace(SKILL_PREFIX, '').replace(/-/g, ' '),
      description:  o.package.description || '',
      version:      o.package.version,
      author:       o.package.publisher?.username || o.package.author?.name || 'unknown',
      date:         o.package.date,
      keywords:     o.package.keywords || [],
      links:        o.package.links || {},
      // Quality signals from npm (proxy until dedicated marketplace)
      download_count: o.downloads?.weekly || null,
    }));
}

// ── Featured skills ───────────────────────────────────────────────────────────
const FEATURED_SKILLS = [
  { name: `${SKILL_PREFIX}db-postgres-advanced`,    category: 'Database',   description: 'Advanced PostgreSQL patterns, indexes, partitioning, and query optimisation' },
  { name: `${SKILL_PREFIX}api-graphql`,             category: 'API',        description: 'GraphQL schema design, N+1 prevention, pagination, and subscriptions' },
  { name: `${SKILL_PREFIX}frontend-react-patterns`, category: 'Frontend',   description: 'React composition patterns, memo/callback, Suspense, and Server Components' },
  { name: `${SKILL_PREFIX}infra-terraform`,         category: 'Infra',      description: 'Terraform module structure, state management, and production best practices' },
  { name: `${SKILL_PREFIX}fintech-pci-compliance`,  category: 'Compliance', description: 'PCI DSS Level 1 implementation requirements for payment processing' },
  { name: `${SKILL_PREFIX}healthtech-hipaa`,        category: 'Compliance', description: 'HIPAA Security Rule technical safeguards for PHI handling' },
  { name: `${SKILL_PREFIX}ecommerce-stripe`,        category: 'Payments',   description: 'Stripe Elements, webhooks, idempotency, and subscription lifecycle' },
];

async function getFeatured() {
  // Try to fetch actual data for each featured skill
  const results = [];
  for (const skill of FEATURED_SKILLS) {
    try {
      const url  = `${NPM_REGISTRY}/${encodeURIComponent(skill.name)}`;
      const data = await httpsGet(url);
      results.push({
        ...skill,
        version:     data['dist-tags']?.latest || '1.0.0',
        date:        data.time?.modified,
        exists:      true,
      });
    } catch {
      // Skill not yet published — show as coming soon
      results.push({ ...skill, exists: false, version: 'coming soon' });
    }
  }
  return results;
}

// ── Trending ──────────────────────────────────────────────────────────────────
async function getTrending(limit = 10) {
  // Use npm search sorted by popularity
  const url  = `${NPM_SEARCH_API}?text=${encodeURIComponent(SKILL_PREFIX)}&size=${limit}&ranking=popularity`;
  const data = await httpsGet(url);
  return (data.objects || [])
    .filter(o => o.package?.name?.startsWith(SKILL_PREFIX))
    .map(o => ({
      name:        o.package.name,
      description: o.package.description || '',
      version:     o.package.version,
      date:        o.package.date,
      score:       o.score?.final || 0,
    }))
    .sort((a, b) => b.score - a.score);
}

// ── Install from marketplace ──────────────────────────────────────────────────
async function install(skillName, tier = 'project') {
  // Ensure the package name has the skill prefix
  const packageName = skillName.startsWith(SKILL_PREFIX)
    ? skillName
    : `${SKILL_PREFIX}${skillName}`;

  // Verify package exists on npm first
  try {
    const url  = `${NPM_REGISTRY}/${encodeURIComponent(packageName)}`;
    await httpsGet(url);
  } catch {
    throw new Error(`Skill not found on marketplace: ${packageName}`);
  }

  // Use MindForge's existing install-skill command machinery
  return {
    install_command: `/mindforge:install-skill ${packageName} --tier ${tier}`,
    package_name:    packageName,
    message:         `Run the install command above, or execute: npm install ${packageName}`,
  };
}

// ── Format results for display ────────────────────────────────────────────────
function formatSearchResults(results, query) {
  if (results.length === 0) {
    return `🔍 No marketplace skills found for "${query}"\n\n` +
      `Try broader terms, or create your own with:\n  /mindforge:learn [url|path]`;
  }

  const lines = [`🏪 Marketplace results for "${query}" (${results.length} found)\n`];
  results.forEach((r, i) => {
    const name = r.display_name || r.name.replace(SKILL_PREFIX, '').replace(/-/g, ' ');
    lines.push(`  ${i + 1}. ${name} (${r.version})`);
    lines.push(`     ${r.description.slice(0, 100)}`);
    if (r.download_count) lines.push(`     ${r.download_count} downloads/week`);
    lines.push('');
  });
  lines.push(`Install: /mindforge:marketplace install [name] [--tier project|org]`);
  return lines.join('\n');
}

function formatFeatured(featured) {
  const lines = ['🏪 MindForge Community Skills Marketplace\n  Featured Skills\n'];

  const byCategory = {};
  featured.forEach(s => {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s);
  });

  for (const [cat, skills] of Object.entries(byCategory)) {
    lines.push(`  ${cat}:`);
    skills.forEach(s => {
      const status = s.exists ? `v${s.version}` : '(coming soon)';
      lines.push(`    ${s.name.replace(SKILL_PREFIX, '')} ${status}`);
      lines.push(`      ${s.description.slice(0, 90)}`);
    });
    lines.push('');
  }

  lines.push('Commands:');
  lines.push('  /mindforge:marketplace search [query]');
  lines.push('  /mindforge:marketplace trending');
  lines.push('  /mindforge:marketplace install [name]');
  return lines.join('\n');
}

module.exports = { search, getFeatured, getTrending, install, formatSearchResults, formatFeatured };
