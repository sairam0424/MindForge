'use strict';
/**
 * MindForge — Dependency DAG (UC-03).
 * Kahn topological sort + cycle detection.
 * Ported from the previously test-only implementation into the real engine.
 *
 * TODO(UC-xx): same-wave file-conflict detection — deferred until handoff schema carries per-task file lists. See docs/architecture/ for scope.
 *   Handoff tasks (see normalizeTask in wave-executor.js and validateHandoff in
 *   state-manager.js) currently expose only id/name/plan/depends_on — there is
 *   no `files` field to compare. A `findFileConflicts(plans)` check (two tasks
 *   in the SAME wave writing the same file -> warn) cannot be wired meaningfully
 *   until the handoff schema captures per-task file lists, so it is intentionally
 *   not implemented here rather than left as dead exported surface.
 */
function groupIntoWaves(graph) {
  // Self-defense: every dependency target must be a known graph node. Throw a
  // DISTINCT "unknown dependency" error (not the misleading "Circular" message)
  // so callers that invoke groupIntoWaves standalone still fail descriptively.
  for (const id of Object.keys(graph)) {
    const deps = graph[id].dependsOn || [];
    for (const d of deps) {
      if (!(d in graph)) {
        throw new Error(`Unknown dependency "${d}" referenced by "${id}"`);
      }
    }
  }
  const remaining = new Set(Object.keys(graph));
  const completed = new Set();
  const waves = [];
  while (remaining.size > 0) {
    const wave = [];
    for (const id of remaining) {
      const deps = graph[id].dependsOn || [];
      if (deps.every(d => completed.has(d))) wave.push(id);
    }
    if (wave.length === 0 && remaining.size > 0) {
      throw new Error(`Circular dependency detected among: ${[...remaining].join(', ')}`);
    }
    waves.push(wave.sort());
    wave.forEach(id => { completed.add(id); remaining.delete(id); });
  }
  return waves;
}
function hasCircularDependency(graph) {
  try { groupIntoWaves(graph); return false; } catch { return true; }
}
function buildGraph(tasks) {
  const ids = new Set(tasks.map(t => t.id));
  const graph = {};
  for (const t of tasks) {
    const deps = Array.isArray(t.depends_on) ? t.depends_on : [];
    for (const d of deps) {
      if (!ids.has(d)) throw new Error(`Task "${t.id}" depends on unknown task "${d}"`);
    }
    graph[t.id] = { dependsOn: deps };
  }
  return graph;
}
module.exports = { groupIntoWaves, hasCircularDependency, buildGraph };
