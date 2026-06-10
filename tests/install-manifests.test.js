'use strict';

/**
 * Tests for the manifest-driven install selection engine (bin/installer/install-manifests.js).
 *
 * Scope: the PURE resolver ALGORITHM — profile→module expansion, circular-dep
 * detection, target intersection, --with/--without component selection, and the
 * deferred-adapter-factory guard. Exercised against TEMP-DIR FIXTURE manifests so
 * this commit is self-contained and green BEFORE the real manifest JSON files land
 * (the real-tree integrity tests ride with those manifest commits).
 *
 * Also asserts the canonical-constant SYNC contract: the engine must IMPORT
 * SUPPORTED_INSTALL_TARGETS (from RUNTIMES) and the exclude lists from
 * installer-core.js, never re-declare them, so they cannot drift.
 */

const assert = require('node:assert');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const engine = require(path.join(ROOT, 'bin', 'installer', 'install-manifests'));
const installerCore = require(path.join(ROOT, 'bin', 'installer-core'));

// ── Fixture helpers ──────────────────────────────────────────────────────────

/** Write a fixture manifest set under a fresh temp repoRoot; return that root. */
function writeFixture({ modules, profiles = {}, components = [] }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-manifest-'));
  const dir = path.join(root, '.mindforge', 'manifests');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'install-modules.json'), JSON.stringify({ version: 1, modules }));
  fs.writeFileSync(path.join(dir, 'install-profiles.json'), JSON.stringify({ version: 1, profiles }));
  fs.writeFileSync(path.join(dir, 'install-components.json'), JSON.stringify({ version: 1, components }));
  return root;
}

const T = installerCore.RUNTIMES ? Object.keys(installerCore.RUNTIMES) : [];
const mod = (id, extra = {}) => ({
  id, kind: 'rules', description: id, paths: [`x/${id}`],
  targets: T, defaultInstall: true, dependencies: [], ...extra,
});

// ── Canonical-constant sync contract ─────────────────────────────────────────

test('SUPPORTED_INSTALL_TARGETS is derived from installer-core RUNTIMES (no drift)', () => {
  assert.deepStrictEqual(engine.SUPPORTED_INSTALL_TARGETS, Object.keys(installerCore.RUNTIMES));
});

test('exclude lists are the SAME object references imported from installer-core', () => {
  assert.strictEqual(engine.SENSITIVE_EXCLUDE, installerCore.SENSITIVE_EXCLUDE);
  assert.strictEqual(engine.MINDFORGE_DEV_EXCLUDE, installerCore.MINDFORGE_DEV_EXCLUDE);
});

// ── Deferred adapter-factory guard ───────────────────────────────────────────

test('resolveInstallPlan THROWS for any target (adapter factory deferred)', () => {
  const root = writeFixture({ modules: [mod('a')] });
  assert.throws(
    () => engine.resolveInstallPlan({ repoRoot: root, profileId: 'p', target: 'claude' }),
    /adapter factory|deferred/i
  );
});

// ── Profile expansion ────────────────────────────────────────────────────────

test('resolves a profile into its module set', () => {
  const root = writeFixture({
    modules: [mod('core'), mod('extra')],
    profiles: { minimal: { description: 'm', modules: ['core'] } },
  });
  const plan = engine.resolveInstallPlan({ repoRoot: root, profileId: 'minimal' });
  assert.deepStrictEqual(plan.selectedModuleIds, ['core']);
  assert.strictEqual(plan.profileId, 'minimal');
});

test('unknown profile throws', () => {
  const root = writeFixture({ modules: [mod('a')] });
  assert.throws(() => engine.resolveInstallPlan({ repoRoot: root, profileId: 'nope' }), /Unknown install profile/);
});

// ── Dependency resolution + cycle detection ──────────────────────────────────

test('pulls in transitive dependencies', () => {
  const root = writeFixture({
    modules: [mod('a', { dependencies: ['b'] }), mod('b', { dependencies: ['c'] }), mod('c')],
  });
  const plan = engine.resolveInstallPlan({ repoRoot: root, moduleIds: ['a'] });
  assert.deepStrictEqual(plan.selectedModuleIds.sort(), ['a', 'b', 'c']);
});

test('detects a circular dependency', () => {
  const root = writeFixture({
    modules: [mod('a', { dependencies: ['b'] }), mod('b', { dependencies: ['a'] })],
  });
  assert.throws(() => engine.resolveInstallPlan({ repoRoot: root, moduleIds: ['a'] }), /Circular install dependency/);
});

test('unknown module id throws', () => {
  const root = writeFixture({ modules: [mod('a')] });
  assert.throws(() => engine.resolveInstallPlan({ repoRoot: root, moduleIds: ['ghost'] }), /Unknown install module/);
});

// ── Component include / exclude (--with / --without) ─────────────────────────

test('include component expands to its modules', () => {
  const root = writeFixture({
    modules: [mod('a'), mod('b')],
    components: [{ id: 'pack', family: 'f', description: 'p', modules: ['a', 'b'] }],
  });
  const plan = engine.resolveInstallPlan({ repoRoot: root, includeComponentIds: ['pack'] });
  assert.deepStrictEqual(plan.selectedModuleIds.sort(), ['a', 'b']);
});

test('exclude component drops its modules from a profile', () => {
  const root = writeFixture({
    modules: [mod('a'), mod('b')],
    profiles: { full: { description: 'f', modules: ['a', 'b'] } },
    components: [{ id: 'drop', family: 'f', description: 'd', modules: ['b'] }],
  });
  const plan = engine.resolveInstallPlan({ repoRoot: root, profileId: 'full', excludeComponentIds: ['drop'] });
  assert.deepStrictEqual(plan.selectedModuleIds, ['a']);
  assert.deepStrictEqual(plan.excludedModuleIds, ['b']);
});

test('excluding a module that a selected module DEPENDS ON throws', () => {
  const root = writeFixture({
    modules: [mod('a', { dependencies: ['b'] }), mod('b')],
    profiles: { full: { description: 'f', modules: ['a'] } },
    components: [{ id: 'drop', family: 'f', description: 'd', modules: ['b'] }],
  });
  assert.throws(
    () => engine.resolveInstallPlan({ repoRoot: root, profileId: 'full', excludeComponentIds: ['drop'] }),
    /depends on excluded module/
  );
});

test('excluding everything throws (empty selection)', () => {
  const root = writeFixture({
    modules: [mod('a')],
    profiles: { full: { description: 'f', modules: ['a'] } },
    components: [{ id: 'all', family: 'f', description: 'a', modules: ['a'] }],
  });
  assert.throws(
    () => engine.resolveInstallPlan({ repoRoot: root, profileId: 'full', excludeComponentIds: ['all'] }),
    /excludes every requested/
  );
});

test('empty selection (no profile/modules/components) throws', () => {
  const root = writeFixture({ modules: [mod('a')] });
  assert.throws(() => engine.resolveInstallPlan({ repoRoot: root }), /No install profile/);
});

// ── Target intersection ──────────────────────────────────────────────────────

test('intersectTargets returns only targets common to ALL modules', () => {
  const [t0, t1] = engine.SUPPORTED_INSTALL_TARGETS;
  const result = engine.intersectTargets([
    { targets: [t0, t1] },
    { targets: [t0] },
  ]);
  assert.deepStrictEqual(result, [t0]);
});

test('a module with an unsupported target is rejected at load', () => {
  const root = writeFixture({ modules: [mod('a', { targets: ['not-a-runtime'] })] });
  assert.throws(() => engine.loadInstallManifests({ repoRoot: root }), /unsupported targets/);
});

// ── Missing manifests ────────────────────────────────────────────────────────

test('loadInstallManifests throws when manifests are absent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-empty-'));
  assert.throws(() => engine.loadInstallManifests({ repoRoot: root }), /not found/);
});

// ── Real-tree integrity (the shipped install-modules.json) ───────────────────
// These validate the ACTUAL manifest against the live repo, the schema, and the
// npm tarball — so a module can never name an asset path that doesn't exist or
// doesn't ship. Skips gracefully if the real modules manifest isn't present yet.

const REAL_MODULES_PATH = path.join(ROOT, '.mindforge', 'manifests', 'install-modules.json');
const hasRealModules = fs.existsSync(REAL_MODULES_PATH);
const realModules = hasRealModules
  ? JSON.parse(fs.readFileSync(REAL_MODULES_PATH, 'utf8')).modules
  : [];

test('every module path in the real manifest exists on disk', { skip: !hasRealModules }, () => {
  const missing = [];
  for (const m of realModules) {
    for (const p of m.paths) {
      if (!fs.existsSync(path.join(ROOT, p))) missing.push(`${m.id}:${p}`);
    }
  }
  assert.deepStrictEqual(missing, [], `module paths missing on disk: ${missing.join(', ')}`);
});

test('no module references a phantom .mindforge/dashboard path', { skip: !hasRealModules }, () => {
  const bogus = realModules.flatMap(m => m.paths).filter(p => /dashboard/i.test(p));
  assert.deepStrictEqual(bogus, [], `phantom dashboard paths: ${bogus.join(', ')}`);
});

test('real manifest dependency ids and targets all resolve', { skip: !hasRealModules }, () => {
  const ids = new Set(realModules.map(m => m.id));
  const targets = new Set(engine.SUPPORTED_INSTALL_TARGETS);
  for (const m of realModules) {
    for (const d of (m.dependencies || [])) {
      assert.ok(ids.has(d), `module ${m.id} depends on unknown module ${d}`);
    }
    for (const t of m.targets) {
      assert.ok(targets.has(t), `module ${m.id} names unsupported target ${t}`);
    }
  }
});

test('real manifest validates against the install-modules schema shape', { skip: !hasRealModules }, () => {
  // Lightweight structural check (no ajv dep): required fields + id pattern.
  const idPattern = /^[a-z0-9][a-z0-9-]*$/;
  for (const m of realModules) {
    for (const field of ['id', 'kind', 'description', 'paths', 'targets', 'defaultInstall']) {
      assert.ok(Object.prototype.hasOwnProperty.call(m, field), `module ${m.id} missing ${field}`);
    }
    assert.ok(idPattern.test(m.id), `module id ${m.id} violates id pattern`);
    assert.ok(Array.isArray(m.paths) && m.paths.length >= 1, `module ${m.id} needs >=1 path`);
    assert.ok(Array.isArray(m.targets) && m.targets.length >= 1, `module ${m.id} needs >=1 target`);
    assert.strictEqual(typeof m.defaultInstall, 'boolean', `module ${m.id} defaultInstall must be boolean`);
  }
});

// ── package.json files[] coverage (the v11.3.0 silent-drop regression) ───────
// Every module path must be covered by a package.json files[] entry, or the
// installer would copy nothing for that module from a published tarball.

test('every real module path is covered by a package.json files[] entry', { skip: !hasRealModules }, () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  // Positive allowlist entries only (drop "!negation" excludes).
  const allow = pkg.files.filter(f => !f.startsWith('!')).map(f => f.replace(/\/$/, ''));
  const covered = (p) => {
    const norm = p.replace(/\/$/, '');
    return allow.some(a => norm === a || norm.startsWith(a + '/') || a.startsWith(norm + '/') || a === norm);
  };
  const uncovered = [];
  for (const m of realModules) {
    for (const p of m.paths) {
      if (!covered(p)) uncovered.push(`${m.id}:${p}`);
    }
  }
  assert.deepStrictEqual(uncovered, [],
    `module paths not covered by package.json files[]: ${uncovered.join(', ')}`);
});

console.log('install-manifests resolver tests defined');
