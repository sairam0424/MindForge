#!/usr/bin/env node
'use strict';

/**
 * MindForge — Instinct CLI (deterministic, no LLM spawn).
 *
 * Manages the single JSONL instinct store the Wave-2 capture hook writes:
 *   list | projects | export | import | promote | prune
 *
 * Adapted from ECC's instinct-cli.py: keeps the security hardening (SSRF /
 * path-traversal / id validation via lib/ssrf-guard.js, advisory file lock,
 * atomic temp-rename writes) but operates over MindForge's flat JSONL store
 * (NOT ECC's per-file YAML/homunculus model), keeps MindForge confidence math,
 * and does NOT duplicate skill evolution (promote only LISTS/flags candidates;
 * /mindforge:evolve-skills + cluster-instincts own actual promotion).
 *
 * Mutating subcommands (import/promote/prune) default to confirm/list-only and
 * require --force to write; --dry-run everywhere. Project scoping uses the same
 * detectProject() as the writer, so reads/writes scope identically.
 */

const fs = require('fs');
const path = require('path');

const guard = require('./lib/ssrf-guard');
const { detectProject } = require('../hooks/lib/detect-project');

const CONFIG_PATH = path.join(process.cwd(), '.mindforge', 'config.json');

// ── config + store I/O ────────────────────────────────────────────────────────

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')).instincts || {};
  } catch {
    return {};
  }
}

function storePath(cfg) {
  const rel = cfg.store_path || '.mindforge/engine/instincts/instinct-store.jsonl';
  return path.resolve(process.cwd(), rel);
}

function readStore(p) {
  let raw;
  try { raw = fs.readFileSync(p, 'utf8'); } catch { return []; }
  const out = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); }
    catch { process.stderr.write('[instinct-cli] skipping malformed JSONL line\n'); }
  }
  return out;
}

/** Atomic write: temp file + fsync + rename over the real store. */
function writeStoreAtomic(p, entries) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.tmp.${process.pid}`;
  const body = entries.map(e => JSON.stringify(e)).join('\n') + (entries.length ? '\n' : '');
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(fd, body);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, p);
}

/**
 * Advisory lock (Node has no fcntl): exclusive lockfile create, spin-with-timeout,
 * stale-break after 10s by mtime. Runs fn() while held, releases in finally.
 * Read the store INSIDE this so a prune/import rewrite can't race a hook append.
 */
function withStoreLock(p, fn) {
  const lock = `${p}.lock`;
  const maxTries = 50, waitMs = 20, staleMs = 10000;
  let held = false;
  for (let i = 0; i < maxTries && !held; i++) {
    try {
      const fd = fs.openSync(lock, 'wx');
      fs.closeSync(fd);
      held = true;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
      // stale-break: if the lockfile is older than staleMs, remove it.
      try {
        const age = Date.now() - fs.statSync(lock).mtimeMs;
        if (age > staleMs) { fs.unlinkSync(lock); continue; }
      } catch { /* lock vanished — retry */ }
      const until = Date.now() + waitMs;
      while (Date.now() < until) { /* busy-wait (short) */ }
    }
  }
  if (!held) throw new Error(`could not acquire instinct-store lock: ${lock}`);
  try { return fn(); }
  finally { try { fs.unlinkSync(lock); } catch { /* already gone */ } }
}

function currentProjectId() {
  try { return detectProject(process.cwd()).id; } catch { return 'global'; }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function confidenceBar(c) {
  const n = Math.max(0, Math.min(10, Math.round((Number(c) || 0) * 10)));
  return '█'.repeat(n) + '░'.repeat(10 - n);
}

function inScope(entry, scopeId, all) {
  if (all) return true;
  const pid = entry.project_id || 'global';
  return pid === scopeId || pid === 'global';
}

// ── subcommands ─────────────────────────────────────────────────────────────

function cmdList(args, cfg) {
  const store = readStore(storePath(cfg));
  const scopeId = args.project || currentProjectId();
  const filtered = store.filter(e =>
    inScope(e, scopeId, args.all) &&
    (!args.status || e.status === args.status));
  if (args.json) { process.stdout.write(JSON.stringify(filtered, null, 2) + '\n'); return 0; }
  if (!filtered.length) { process.stdout.write('No instincts in scope.\n'); return 0; }
  for (const e of filtered) {
    process.stdout.write(`${confidenceBar(e.confidence)} ${(e.confidence ?? 0).toFixed(2)} [${e.status}] ${e.id}\n  obs: ${e.observation}\n  do:  ${e.behavior}\n  applied ${e.times_applied || 0} (✓${e.times_succeeded || 0}/✗${e.times_failed || 0})\n`);
  }
  return 0;
}

function cmdProjects(args, cfg) {
  const store = readStore(storePath(cfg));
  const groups = new Map();
  for (const e of store) {
    const pid = e.project_id || 'global';
    if (!groups.has(pid)) groups.set(pid, { project_id: pid, project: e.project || pid, count: 0, active: 0, sumConf: 0, lastApplied: null });
    const g = groups.get(pid);
    g.count++;
    if (e.status === 'active') g.active++;
    g.sumConf += Number(e.confidence) || 0;
    if (e.last_applied_at && (!g.lastApplied || e.last_applied_at > g.lastApplied)) g.lastApplied = e.last_applied_at;
  }
  const rows = [...groups.values()].map(g => ({
    project_id: g.project_id, project: g.project, count: g.count, active: g.active,
    avg_confidence: g.count ? +(g.sumConf / g.count).toFixed(3) : 0, last_applied: g.lastApplied,
  }));
  if (args.json) { process.stdout.write(JSON.stringify(rows, null, 2) + '\n'); return 0; }
  for (const r of rows) {
    process.stdout.write(`${r.project} [${r.project_id}] — ${r.count} instincts (${r.active} active), avg ${r.avg_confidence}, last ${r.last_applied || 'never'}\n`);
  }
  return 0;
}

function cmdExport(args, cfg) {
  const store = readStore(storePath(cfg));
  const scopeId = args.project || currentProjectId();
  const minC = args.minConfidence != null ? Number(args.minConfidence) : -1;
  const subset = store.filter(e =>
    inScope(e, scopeId, args.all) &&
    (!args.status || e.status === args.status) &&
    (Number(e.confidence) || 0) >= minC);
  const body = subset.map(e => JSON.stringify(e)).join('\n') + (subset.length ? '\n' : '');
  if (args.output) {
    const out = guard.validateFilePath(args.output);
    fs.writeFileSync(out, body);
    process.stderr.write(`Exported ${subset.length} instinct(s) to ${out}\n`);
  } else {
    process.stdout.write(body);
  }
  return 0;
}

function parseImportPayload(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('[')) {
    const arr = JSON.parse(trimmed);
    if (!Array.isArray(arr)) throw new Error('import JSON must be an array');
    return arr;
  }
  // JSONL
  const out = [];
  for (const line of trimmed.split('\n')) {
    const t = line.trim();
    if (t) out.push(JSON.parse(t));
  }
  return out;
}

async function cmdImport(args, cfg) {
  if (!args._[0]) { process.stderr.write('import requires a <file|https-url>\n'); return 1; }
  const source = args._[0];
  let text;
  if (/^https?:\/\//i.test(source)) {
    text = await guard.fetchImportUrl(source);
  } else {
    text = fs.readFileSync(guard.validateFilePath(source, { mustExist: true }), 'utf8');
  }

  let incoming;
  try { incoming = parseImportPayload(text); }
  catch (e) { process.stderr.write(`malformed import payload: ${e.message}\n`); return 2; }

  const minC = args.minConfidence != null ? Number(args.minConfidence) : -1;
  const scopeId = args.scope === 'global' ? 'global' : currentProjectId();
  const projectName = args.scope === 'global' ? 'global' : (() => { try { return detectProject(process.cwd()).name; } catch { return 'global'; } })();
  const now = new Date().toISOString();

  const valid = [];
  for (const e of incoming) {
    if (!e || !guard.validateInstinctId(e.id || '')) { process.stderr.write(`skipping entry with invalid id: ${e && e.id}\n`); continue; }
    if ((Number(e.confidence) || 0) < minC) continue;
    valid.push(Object.assign({}, e, {
      project: projectName, project_id: scopeId, source: 'imported',
      imported_from: source, created_at: now, updated_at: now,
    }));
  }

  if (args.dryRun || !args.force) {
    process.stdout.write(`${args.dryRun ? '[dry-run] ' : ''}${valid.length} instinct(s) would be imported into ${scopeId}. Re-run with --force to write.\n`);
    return 0;
  }

  const p = storePath(cfg);
  withStoreLock(p, () => {
    const store = readStore(p); // read INSIDE the lock (race-safe)
    const byId = new Map(store.map(e => [e.id, e]));
    for (const e of valid) {
      const existing = byId.get(e.id);
      // dedup: keep the higher-confidence entry (immutable — new object)
      if (!existing || (Number(e.confidence) || 0) > (Number(existing.confidence) || 0)) byId.set(e.id, e);
    }
    writeStoreAtomic(p, [...byId.values()]);
  });
  process.stdout.write(`Imported ${valid.length} instinct(s) into ${scopeId}.\n`);
  return 0;
}

function cmdPromote(args, cfg) {
  const store = readStore(storePath(cfg));
  const threshold = cfg.promotion_confidence_threshold ?? 0.85;
  const minApplied = cfg.promotion_min_applications ?? 5;
  const scopeId = args.project || currentProjectId();
  const candidates = store.filter(e =>
    inScope(e, scopeId, args.all) && e.status === 'active' &&
    (Number(e.confidence) || 0) >= threshold && (e.times_applied || 0) >= minApplied &&
    (!args._[0] || e.id === args._[0]));

  if (!candidates.length) { process.stdout.write('No promotion candidates (need confidence ≥ ' + threshold + ' AND applied ≥ ' + minApplied + ').\n'); return 0; }

  // Default: LIST candidates only. Actual SKILL.md creation is owned by
  // /mindforge:evolve-skills + /mindforge:cluster-instincts — do NOT duplicate.
  process.stdout.write('Promotion candidate(s) — run /mindforge:evolve-skills to create skills:\n');
  for (const e of candidates) process.stdout.write(`  ${e.id}  conf ${(e.confidence).toFixed(2)}  applied ${e.times_applied}\n  ${e.behavior}\n`);

  if (args.force && !args.dryRun) {
    const ids = new Set(candidates.map(e => e.id));
    const p = storePath(cfg);
    withStoreLock(p, () => {
      const fresh = readStore(p);
      const updated = fresh.map(e => ids.has(e.id) ? Object.assign({}, e, { status: 'active', promotion_candidate: true, updated_at: new Date().toISOString() }) : e);
      writeStoreAtomic(p, updated);
    });
    process.stdout.write(`Flagged ${ids.size} instinct(s) as promotion_candidate (skill creation still via evolve-skills).\n`);
  }
  return 0;
}

function cmdPrune(args, cfg) {
  const pruneBelow = cfg.prune_below_confidence ?? 0.2;
  const maxAgeDays = args.maxAge != null ? Number(args.maxAge) : (cfg.prune_after_days_inactive ?? 30);
  const cutoff = Date.now() - maxAgeDays * 86400000;

  const p = storePath(cfg);
  const store = readStore(p);
  const isStale = e => {
    if ((Number(e.confidence) || 0) < pruneBelow && (e.times_applied || 0) >= 10) return true;
    if (e.last_applied_at && Date.parse(e.last_applied_at) < cutoff) return true;
    return false;
  };
  const doomed = store.filter(e => e.status === 'active' && isStale(e));

  if (!doomed.length) { process.stdout.write('Nothing to prune.\n'); return 0; }
  if (args.dryRun || !args.force) {
    process.stdout.write(`${args.dryRun ? '[dry-run] ' : ''}${doomed.length} instinct(s) would be pruned. Re-run with --force.\n`);
    for (const e of doomed) process.stdout.write(`  ${e.id}  conf ${(e.confidence ?? 0).toFixed(2)}\n`);
    return 0;
  }

  const doomedIds = new Set(doomed.map(e => e.id));
  withStoreLock(p, () => {
    const fresh = readStore(p); // read INSIDE the lock
    const updated = fresh.map(e => doomedIds.has(e.id) ? Object.assign({}, e, { status: 'pruned', updated_at: new Date().toISOString() }) : e);
    writeStoreAtomic(p, updated);
  });
  process.stdout.write(`Pruned ${doomedIds.size} instinct(s).\n`);
  return 0;
}

// ── arg parsing + main ──────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--json') args.json = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a === '--project') args.project = argv[++i];
    else if (a === '--status') args.status = argv[++i];
    else if (a === '--scope') args.scope = argv[++i];
    else if (a === '--min-confidence') args.minConfidence = argv[++i];
    else if (a === '--max-age') args.maxAge = argv[++i];
    else if (a === '-o' || a === '--output') args.output = argv[++i];
    else if (!a.startsWith('-')) args._.push(a);
  }
  return args;
}

const USAGE = `Usage: instinct-cli <command> [options]
Commands:
  list      [--project <id>|--all] [--status active|promoted|deprecated|pruned] [--json]
  projects  [--json]
  export    [--project <id>|--all] [--status <s>] [--min-confidence N] [-o file]
  import    <file|https-url> [--scope project|global] [--min-confidence N] [--dry-run] [--force]
  promote   [<id>] [--project <id>|--all] [--dry-run] [--force]   (lists candidates; skills via /mindforge:evolve-skills)
  prune     [--max-age <days>] [--dry-run] [--force]`;

async function main() {
  const [, , sub, ...rest] = process.argv;
  if (!sub || sub === '--help' || sub === '-h') { process.stdout.write(USAGE + '\n'); return 0; }
  const args = parseArgs(rest);
  const cfg = loadConfig();
  switch (sub) {
    case 'list': return cmdList(args, cfg);
    case 'projects': return cmdProjects(args, cfg);
    case 'export': return cmdExport(args, cfg);
    case 'import': return cmdImport(args, cfg);
    case 'promote': return cmdPromote(args, cfg);
    case 'prune': return cmdPrune(args, cfg);
    default:
      process.stderr.write(`Unknown command: ${sub}\n${USAGE}\n`);
      return 1;
  }
}

if (require.main === module) {
  main().then(code => process.exit(code)).catch(err => {
    process.stderr.write(`[instinct-cli] ${err.message}\n`);
    process.exit(2);
  });
}

module.exports = { loadConfig, storePath, readStore, writeStoreAtomic, withStoreLock, parseArgs };
