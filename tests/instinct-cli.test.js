'use strict';

/**
 * Tests for the deterministic instinct CLI (bin/learning/instinct-cli.js) and
 * its SSRF/path-traversal/id guards (bin/learning/lib/ssrf-guard.js).
 *
 * The CLI resolves config + store from process.cwd(), so each test runs the
 * binary via execFileSync with cwd = a tmp dir containing .mindforge/config.json
 * and a seeded store. Mirrors learning-engine.test.js cleanup discipline.
 */

const assert = require('node:assert');
const { test } = require('node:test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'learning', 'instinct-cli.js');
const guard = require(path.join(ROOT, 'bin', 'learning', 'lib', 'ssrf-guard'));

const STORE_REL = '.mindforge/engine/instincts/instinct-store.jsonl';

function mkWorkspace(entries = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-instinct-'));
  fs.mkdirSync(path.join(dir, '.mindforge'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.mindforge', 'config.json'), JSON.stringify({
    instincts: {
      store_path: STORE_REL,
      promotion_confidence_threshold: 0.85,
      promotion_min_applications: 5,
      prune_below_confidence: 0.2,
      prune_after_days_inactive: 30,
    },
  }));
  const storeAbs = path.join(dir, STORE_REL);
  fs.mkdirSync(path.dirname(storeAbs), { recursive: true });
  fs.writeFileSync(storeAbs, entries.map(e => JSON.stringify(e)).join('\n') + (entries.length ? '\n' : ''));
  return { dir, storeAbs };
}

function run(dir, argv) {
  try {
    const stdout = execFileSync('node', [CLI, ...argv], { cwd: dir, encoding: 'utf8' });
    return { code: 0, stdout };
  } catch (err) {
    return { code: err.status, stdout: (err.stdout || '') + (err.stderr || '') };
  }
}

function inst(over = {}) {
  return Object.assign({
    id: 'inst-' + Math.random().toString(36).slice(2, 10),
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    observation: 'obs', behavior: 'do', confidence: 0.5,
    times_applied: 0, times_succeeded: 0, times_failed: 0,
    project: 'global', project_id: 'global', tags: [], status: 'active',
    promoted_to_skill: null, last_applied_at: null, source: 'auto-capture',
  }, over);
}

// ── SSRF / path / id guards (unit) ───────────────────────────────────────────

test('isPublicAddress blocks private/loopback/link-local incl IPv4-mapped IPv6', () => {
  for (const ip of ['10.0.0.1', '172.16.5.5', '192.168.1.1', '127.0.0.1', '169.254.1.1',
    '0.0.0.0', '::1', '::', 'fe80::1', 'fc00::1', 'fd12::1', 'ff02::1', '::ffff:127.0.0.1']) {
    assert.strictEqual(guard.isPublicAddress(ip), false, `${ip} must be non-public`);
  }
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700::1111']) {
    assert.strictEqual(guard.isPublicAddress(ip), true, `${ip} must be public`);
  }
});

// Regression: the original prefix check (startsWith fe80/fe9/fea/feb) left the
// fe81-fe8f block reachable as "public" — an SSRF hole into link-local services.
// fe80::/10 spans the FULL fe80-febf first-hextet range; assert every step blocked.
test('isPublicAddress blocks the entire fe80::/10 link-local range (no fe8x gap)', () => {
  for (const hextet of ['fe80', 'fe81', 'fe85', 'fe8a', 'fe8f', 'fe90', 'fe9f',
    'fea0', 'feaf', 'feb0', 'febf']) {
    assert.strictEqual(guard.isPublicAddress(`${hextet}::1`), false,
      `${hextet}:: is link-local (fe80::/10) and must be non-public`);
  }
  // fec0::/10 site-local (deprecated) is likewise non-routable.
  assert.strictEqual(guard.isPublicAddress('fec0::1'), false);
  // ULA fc00::/7 boundaries and a global-unicast sanity check.
  assert.strictEqual(guard.isPublicAddress('fdff::1'), false, 'fdff is ULA');
  assert.strictEqual(guard.isPublicAddress('2001:4860:4860::8888'), true, 'global unicast stays public');
});

// Regression: path.resolve() does not follow symlinks, so a symlink planted in a
// writable dir pointing at a blocked system dir would pass the prefix check while
// fs.read/writeFileSync followed it into the system dir. validateFilePath must
// canonicalize (realpath) before the BLOCKED_PREFIXES check.
test('validateFilePath follows symlinks into blocked dirs and rejects them', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-symlink-'));
  try {
    fs.mkdirSync(path.join(tmp, 'safe'));
    fs.symlinkSync('/etc', path.join(tmp, 'link-to-etc'));
    // Symlinked ancestor resolving into /etc must be caught.
    assert.throws(() => guard.validateFilePath(path.join(tmp, 'link-to-etc', 'passwd')),
      /system directory/, 'symlink -> /etc must be rejected');
    // A genuinely safe, not-yet-created export target stays allowed.
    const safe = guard.validateFilePath(path.join(tmp, 'safe', 'export.jsonl'));
    assert.ok(safe.includes('safe'), 'safe new-file path allowed');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('validateImportUrl rejects http and non-public hosts', async () => {
  await assert.rejects(() => guard.validateImportUrl('http://example.com/x'), /https/);
  await assert.rejects(() => guard.validateImportUrl('https://127.0.0.1/x'), /non-public/);
  await assert.rejects(() => guard.validateImportUrl('not a url'), /invalid import URL/);
});

test('validateFilePath blocks system dirs; validateInstinctId rejects traversal', () => {
  assert.throws(() => guard.validateFilePath('/etc/passwd'), /system directory/);
  assert.strictEqual(guard.validateInstinctId('../x'), false);
  assert.strictEqual(guard.validateInstinctId('a/b'), false);
  assert.strictEqual(guard.validateInstinctId('.hidden'), false);
  assert.strictEqual(guard.validateInstinctId('x'.repeat(129)), false);
  assert.strictEqual(guard.validateInstinctId('inst-abc_1.2'), true);
});

// ── CLI behavior ──────────────────────────────────────────────────────────────

test('list scopes to current project_id + global only', () => {
  const { dir } = mkWorkspace([
    inst({ id: 'inst-global', project_id: 'global' }),
    inst({ id: 'inst-other', project_id: 'deadbeefcafe' }),
  ]);
  try {
    const r = run(dir, ['list', '--json']);
    assert.strictEqual(r.code, 0);
    const ids = JSON.parse(r.stdout).map(e => e.id);
    assert.ok(ids.includes('inst-global'), 'global instinct in scope');
    assert.ok(!ids.includes('inst-other'), 'other-project instinct filtered out');
    // --all shows everything
    const all = JSON.parse(run(dir, ['list', '--all', '--json']).stdout).map(e => e.id);
    assert.ok(all.includes('inst-other'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('export -> import JSONL round-trip with dedup keeping higher confidence', () => {
  const { dir, storeAbs } = mkWorkspace([
    inst({ id: 'inst-keep', confidence: 0.4, project_id: 'global' }),
  ]);
  try {
    const exportFile = path.join(dir, 'out.jsonl');
    run(dir, ['export', '--all', '-o', exportFile]);
    assert.ok(fs.existsSync(exportFile));
    // Hand-craft a higher-confidence dup + a new one, import with --force
    fs.writeFileSync(exportFile,
      JSON.stringify(inst({ id: 'inst-keep', confidence: 0.9 })) + '\n' +
      JSON.stringify(inst({ id: 'inst-new', confidence: 0.6 })) + '\n');
    const r = run(dir, ['import', exportFile, '--scope', 'global', '--force']);
    assert.strictEqual(r.code, 0);
    const store = fs.readFileSync(storeAbs, 'utf8').trim().split('\n').map(l => JSON.parse(l));
    const keep = store.find(e => e.id === 'inst-keep');
    assert.strictEqual(keep.confidence, 0.9, 'dedup keeps higher confidence');
    assert.ok(store.find(e => e.id === 'inst-new'), 'new instinct imported');
    assert.strictEqual(keep.source, 'imported', 'imported source stamped');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('import --dry-run mutates nothing', () => {
  const { dir, storeAbs } = mkWorkspace([inst({ id: 'inst-a' })]);
  try {
    const f = path.join(dir, 'in.jsonl');
    fs.writeFileSync(f, JSON.stringify(inst({ id: 'inst-b' })) + '\n');
    const before = fs.readFileSync(storeAbs, 'utf8');
    run(dir, ['import', f, '--dry-run']);
    assert.strictEqual(fs.readFileSync(storeAbs, 'utf8'), before, 'store unchanged on dry-run');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('import rejects an http URL (SSRF) with non-zero exit', () => {
  const { dir } = mkWorkspace([]);
  try {
    const r = run(dir, ['import', 'http://example.com/x.jsonl', '--force']);
    assert.notStrictEqual(r.code, 0);
    assert.match(r.stdout, /https/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('prune flags low-confidence high-applied as pruned; --dry-run no-op', () => {
  const { dir, storeAbs } = mkWorkspace([
    inst({ id: 'inst-bad', confidence: 0.1, times_applied: 12 }),
    inst({ id: 'inst-good', confidence: 0.9, times_applied: 12 }),
  ]);
  try {
    const before = fs.readFileSync(storeAbs, 'utf8');
    run(dir, ['prune', '--dry-run']);
    assert.strictEqual(fs.readFileSync(storeAbs, 'utf8'), before, 'dry-run no-op');
    run(dir, ['prune', '--force']);
    const store = fs.readFileSync(storeAbs, 'utf8').trim().split('\n').map(l => JSON.parse(l));
    assert.strictEqual(store.find(e => e.id === 'inst-bad').status, 'pruned');
    assert.strictEqual(store.find(e => e.id === 'inst-good').status, 'active');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('malformed JSONL line is skipped, not fatal', () => {
  const { dir, storeAbs } = mkWorkspace([inst({ id: 'inst-ok' })]);
  try {
    fs.appendFileSync(storeAbs, 'this is not json\n');
    const r = run(dir, ['list', '--all', '--json']);
    assert.strictEqual(r.code, 0);
    assert.ok(JSON.parse(r.stdout).some(e => e.id === 'inst-ok'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('projects aggregates counts and avg confidence deterministically', () => {
  const { dir } = mkWorkspace([
    inst({ project_id: 'p1', confidence: 0.4 }),
    inst({ project_id: 'p1', confidence: 0.6 }),
  ]);
  try {
    const rows = JSON.parse(run(dir, ['projects', '--json']).stdout);
    const p1 = rows.find(r => r.project_id === 'p1');
    assert.strictEqual(p1.count, 2);
    assert.strictEqual(p1.avg_confidence, 0.5);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
