'use strict';
/**
 * MindForge — Dependency DAG (UC-03).
 * Kahn topological sort + cycle detection + file-conflict detection.
 * Ported from the previously test-only implementation into the real engine.
 */
function groupIntoWaves(graph) {
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
function findFileConflicts(plans) {
  const fileMap = {};
  const conflicts = [];
  for (const { id, files } of plans) {
    for (const file of (files || [])) {
      if (fileMap[file]) conflicts.push({ file, plans: [fileMap[file], id] });
      else fileMap[file] = id;
    }
  }
  return conflicts;
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
module.exports = { groupIntoWaves, hasCircularDependency, findFileConflicts, buildGraph };
