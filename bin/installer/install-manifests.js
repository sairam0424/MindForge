'use strict';

/**
 * MindForge — Manifest-driven install selection engine (INERT / additive).
 *
 * Ports the PURE resolver core from ECC's install-manifests.js: profile→module
 * expansion, circular-dependency detection, target intersection, --with/--without
 * component selection, and per-target default exclusion. Replaces the
 * two-boolean (--minimal/--with-utils) selectivity ONCE WIRED.
 *
 * Scope guard: this engine does NOT touch bin/installer-core.js's live install()
 * path. The adapter-factory that would consume a resolved plan
 * (planInstallTargetScaffold) is DEFERRED to a future, separately-reviewed PR —
 * so `resolveInstallPlan({ target })` THROWS for any target rather than silently
 * returning a partial/empty plan a future wiring commit could blindly drive.
 *
 * Canonical constants (SUPPORTED_INSTALL_TARGETS from RUNTIMES, the exclude
 * lists) are IMPORTED from installer-core.js — never re-declared — so they can't
 * drift. A sync test asserts this.
 */

const fs = require('fs');
const path = require('path');
const installerCore = require('../installer-core');

const DEFAULT_REPO_ROOT = path.join(__dirname, '..', '..');
// Derive supported targets from the canonical RUNTIMES map (single source of truth).
const SUPPORTED_INSTALL_TARGETS = Object.keys(installerCore.RUNTIMES);
const { SENSITIVE_EXCLUDE, MINDFORGE_DEV_EXCLUDE } = installerCore;

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read ${label}: ${error.message}`);
  }
}

function dedupe(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(v => String(v).trim()).filter(Boolean))];
}

function getManifestPaths(repoRoot = DEFAULT_REPO_ROOT) {
  return {
    modulesPath: path.join(repoRoot, '.mindforge', 'manifests', 'install-modules.json'),
    profilesPath: path.join(repoRoot, '.mindforge', 'manifests', 'install-profiles.json'),
    componentsPath: path.join(repoRoot, '.mindforge', 'manifests', 'install-components.json'),
  };
}

function loadInstallManifests(options = {}) {
  const repoRoot = options.repoRoot || DEFAULT_REPO_ROOT;
  const { modulesPath, profilesPath, componentsPath } = getManifestPaths(repoRoot);
  if (!fs.existsSync(modulesPath) || !fs.existsSync(profilesPath)) {
    throw new Error(`Install manifests not found under ${repoRoot}/.mindforge/manifests`);
  }
  const modulesData = readJson(modulesPath, 'install-modules.json');
  const profilesData = readJson(profilesPath, 'install-profiles.json');
  const componentsData = fs.existsSync(componentsPath)
    ? readJson(componentsPath, 'install-components.json')
    : { version: null, components: [] };

  const modules = Array.isArray(modulesData.modules) ? modulesData.modules.slice() : [];
  const profiles = (profilesData && typeof profilesData.profiles === 'object') ? profilesData.profiles : {};
  const components = Array.isArray(componentsData.components) ? componentsData.components.slice() : [];

  for (const m of modules) validateModuleTargets(m);

  return {
    repoRoot, modules, profiles, components,
    modulesById: new Map(modules.map(m => [m.id, m])),
    componentsById: new Map(components.map(c => [c.id, c])),
    modulesVersion: modulesData.version,
    profilesVersion: profilesData.version,
    componentsVersion: componentsData.version,
  };
}

function validateModuleTargets(module) {
  const id = (module && module.id) || '<unknown>';
  if (!Array.isArray(module.targets)) {
    throw new Error(`Install module ${id} has invalid targets; expected an array`);
  }
  const unsupported = module.targets.filter(t => !SUPPORTED_INSTALL_TARGETS.includes(t));
  if (unsupported.length) {
    throw new Error(`Install module ${id} has unsupported targets: ${unsupported.join(', ')}`);
  }
}

/** Targets common to every module in the set (intersection). */
function intersectTargets(modules) {
  if (!Array.isArray(modules) || !modules.length) return [];
  return SUPPORTED_INSTALL_TARGETS.filter(t => modules.every(m => Array.isArray(m.targets) && m.targets.includes(t)));
}

function expandComponentsToModuleIds(componentIds, manifests) {
  const out = [];
  for (const cid of dedupe(componentIds)) {
    const c = manifests.componentsById.get(cid);
    if (!c) throw new Error(`Unknown install component: ${cid}`);
    out.push(...(c.modules || []));
  }
  return dedupe(out);
}

function listInstallProfiles(options = {}) {
  const m = loadInstallManifests(options);
  return Object.entries(m.profiles).map(([id, p]) => ({ id, description: p.description, moduleCount: (p.modules || []).length }));
}

function listInstallModules(options = {}) {
  const m = loadInstallManifests(options);
  return m.modules.map(mod => ({ id: mod.id, kind: mod.kind, description: mod.description, targets: mod.targets, defaultInstall: mod.defaultInstall }));
}

function listInstallComponents(options = {}) {
  const m = loadInstallManifests(options);
  return m.components.map(c => {
    const modules = dedupe(c.modules).map(id => m.modulesById.get(id)).filter(Boolean);
    return { id: c.id, family: c.family, description: c.description, moduleIds: modules.map(x => x.id), targets: intersectTargets(modules) };
  });
}

/**
 * Resolve a selection (profile + explicit modules + included/excluded components)
 * into a concrete, dependency-complete, cycle-free module list.
 *
 * NOTE: passing `target` THROWS — target scaffolding requires the deferred
 * adapter factory. Until that lands, this engine resolves target-agnostic plans.
 */
function resolveInstallPlan(options = {}) {
  if (options.target) {
    throw new Error(
      `target-scoped install planning requires the install-target adapter factory, ` +
      `which is deferred to a future PR. Resolve without a target for now.`
    );
  }

  const manifests = loadInstallManifests(options);
  const requested = [];

  if (options.profileId) {
    const profile = manifests.profiles[options.profileId];
    if (!profile) throw new Error(`Unknown install profile: ${options.profileId}`);
    requested.push(...(profile.modules || []));
  }
  requested.push(...dedupe(options.moduleIds));
  requested.push(...expandComponentsToModuleIds(options.includeComponentIds, manifests));

  const excludedIds = new Set(expandComponentsToModuleIds(options.excludeComponentIds, manifests));
  const effective = dedupe(requested).filter(id => !excludedIds.has(id));

  if (!requested.length) throw new Error('No install profile, module IDs, or included component IDs were provided');
  if (!effective.length) throw new Error('Selection excludes every requested install module');

  const selected = new Set();
  const visiting = new Set();
  const resolved = new Set();

  function resolveModule(moduleId, dependencyOf) {
    const module = manifests.modulesById.get(moduleId);
    if (!module) throw new Error(`Unknown install module: ${moduleId}`);
    if (excludedIds.has(moduleId)) {
      if (dependencyOf) throw new Error(`Module ${dependencyOf} depends on excluded module ${moduleId}`);
      return;
    }
    if (resolved.has(moduleId)) return;
    if (visiting.has(moduleId)) throw new Error(`Circular install dependency detected at ${moduleId}`);
    visiting.add(moduleId);
    for (const dep of (module.dependencies || [])) resolveModule(dep, moduleId);
    visiting.delete(moduleId);
    resolved.add(moduleId);
    selected.add(moduleId);
  }
  for (const id of effective) resolveModule(id, null);

  const selectedModules = manifests.modules.filter(m => selected.has(m.id));
  return {
    repoRoot: manifests.repoRoot,
    profileId: options.profileId || null,
    requestedModuleIds: effective,
    selectedModuleIds: selectedModules.map(m => m.id),
    excludedModuleIds: [...excludedIds],
    selectedModules,
  };
}

module.exports = {
  DEFAULT_REPO_ROOT,
  SUPPORTED_INSTALL_TARGETS,
  SENSITIVE_EXCLUDE,
  MINDFORGE_DEV_EXCLUDE,
  getManifestPaths,
  loadInstallManifests,
  listInstallProfiles,
  listInstallModules,
  listInstallComponents,
  intersectTargets,
  resolveInstallPlan,
};
