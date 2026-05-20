/**
 * MindForge — Task Dispatcher
 * Extracted from auto-runner.js — handles task parsing from HANDOFF.json,
 * task queue management, task prioritization, and dispatch logic.
 */
'use strict';

const crypto = require('crypto');

/**
 * Parses a HANDOFF.json file content into a normalized task list.
 * @param {object} handoffData — Parsed HANDOFF.json object (must have .handoffs array)
 * @returns {Array<{ id: string, name: string, plan: string|null, depends_on: string[], wave: number }>}
 */
function parseHandoff(handoffData) {
  if (!handoffData || !Array.isArray(handoffData.handoffs)) {
    throw new Error('Invalid handoff data — missing handoffs array');
  }

  return handoffData.handoffs.map(h => Object.freeze({
    id: h.id || h.task_id || `task_${crypto.randomBytes(4).toString('hex')}`,
    name: h.name || h.task || h.description || h.id || 'unnamed-task',
    plan: h.plan || null,
    depends_on: Array.isArray(h.depends_on) ? [...h.depends_on] : [],
    wave: typeof h.wave === 'number' ? h.wave : null,
  }));
}

/**
 * Prioritizes tasks based on dependency depth and wave ordering.
 * Tasks with fewer dependencies come first; within same depth, preserves original order.
 * @param {Array} tasks — Normalized task list from parseHandoff
 * @returns {Array} — New sorted array (input is not mutated)
 */
function prioritizeTasks(tasks) {
  // Build a dependency depth map
  const depthMap = new Map();

  function getDepth(task, visited = new Set()) {
    if (depthMap.has(task.id)) return depthMap.get(task.id);
    if (visited.has(task.id)) return 0; // circular — break cycle
    visited.add(task.id);

    if (task.depends_on.length === 0) {
      depthMap.set(task.id, 0);
      return 0;
    }

    const maxParentDepth = task.depends_on.reduce((max, depId) => {
      const parent = tasks.find(t => t.id === depId);
      if (!parent) return max;
      return Math.max(max, getDepth(parent, new Set(visited)));
    }, 0);

    const depth = maxParentDepth + 1;
    depthMap.set(task.id, depth);
    return depth;
  }

  // Compute depth for all tasks
  for (const task of tasks) {
    getDepth(task);
  }

  // Sort by wave first (if present), then by depth, then by original order
  const indexed = tasks.map((task, i) => ({ task, originalIndex: i }));

  const sorted = [...indexed].sort((a, b) => {
    // Wave ordering first
    const waveA = a.task.wave ?? Infinity;
    const waveB = b.task.wave ?? Infinity;
    if (waveA !== waveB) return waveA - waveB;

    // Then by dependency depth
    const depthA = depthMap.get(a.task.id) || 0;
    const depthB = depthMap.get(b.task.id) || 0;
    if (depthA !== depthB) return depthA - depthB;

    // Preserve original order as tiebreaker
    return a.originalIndex - b.originalIndex;
  });

  return sorted.map(item => item.task);
}

/**
 * Dispatches a single task to an executor function.
 * Returns the result wrapped in a status envelope.
 * @param {object} task — A normalized task object
 * @param {function} executor — async function(task) => result
 * @returns {Promise<{ task_id: string, status: string, result?: any, error?: string, duration_ms: number }>}
 */
async function dispatchTask(task, executor) {
  const start = Date.now();

  try {
    const result = await executor(task);
    return Object.freeze({
      task_id: task.id,
      status: 'completed',
      result,
      duration_ms: Date.now() - start,
    });
  } catch (err) {
    return Object.freeze({
      task_id: task.id,
      status: 'failed',
      error: err.message,
      duration_ms: Date.now() - start,
    });
  }
}

module.exports = { parseHandoff, prioritizeTasks, dispatchTask };
