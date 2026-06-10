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

console.log('install-manifests resolver tests defined');
