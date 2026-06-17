/**
 * MindForge — Wave Executor
 * Extracted from auto-runner.js — handles wave orchestration: grouping tasks
 * into waves, executing waves in sequence, and managing wave dependencies.
 */
'use strict';

const crypto = require('crypto');
const { buildGraph, groupIntoWaves } = require('./dependency-dag');

/**
 * Semaphore for bounding concurrency within a wave.
 * Tasks within a wave are independent — this limits how many run simultaneously.
 */
class Semaphore {
  constructor(max) {
    this.max = max;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    await new Promise(resolve => this.queue.push(resolve));
    this.current++;
  }

  release() {
    this.current--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    }
  }
}

/**
 * Creates a wave executor with the given configuration.
 * @param {object} config
 * @param {function} [config.onTaskStart] — Called when a task begins
 * @param {function} [config.onTaskComplete] — Called when a task finishes
 * @param {function} [config.onTaskFail] — Called when a task fails
 * @param {function} [config.onWaveStart] — Called when a wave begins
 * @param {function} [config.onWaveComplete] — Called when a wave finishes
 * @returns {{ planWaves, executeWave, getWaveStatus }}
 */
function createWaveExecutor(config = {}) {
  const {
    onTaskStart = () => {},
    onTaskComplete = () => {},
    onTaskFail = () => {},
    onWaveStart = () => {},
    onWaveComplete = () => {},
  } = config;

  // Internal state — immutable snapshots exposed via getWaveStatus
  let waves = [];
  let currentWaveIndex = 0;
  let completedTasks = new Set();
  let status = 'idle'; // idle | running | paused | completed

  /**
   * Groups handoff tasks into sequential waves based on wave field or dependency topology.
   * Returns a new array of wave objects — does not mutate input.
   *
   * Resolution order (UC-03):
   *   1. Explicit numeric `.wave` field ALWAYS wins (legacy behavior, unchanged).
   *   2. Else if `options.useDag === true` (OPT-IN), order by `depends_on` via Kahn
   *      topological sort. Halts loud (throws) on cycles or unknown dependencies.
   *   3. Else (legacy default), all tasks in a single parallel wave (unchanged).
   *
   * DAG ordering is OPT-IN to avoid silently reordering existing PLAN files.
   * @param {Array} handoffs — Raw handoffs array from HANDOFF.json
   * @param {object} [options] — { useDag?: boolean }
   * @returns {Array<{ wave: number, tasks: Array }>}
   */
  function planWaves(handoffs, options = {}) {
    if (!Array.isArray(handoffs) || handoffs.length === 0) {
      waves = [];
      return [];
    }

    const hasWaveField = handoffs.some(h => typeof h.wave === 'number');

    if (hasWaveField) {
      const byWave = new Map();
      for (const h of handoffs) {
        const w = h.wave ?? 0;
        if (!byWave.has(w)) byWave.set(w, []);
        byWave.get(w).push(normalizeTask(h));
      }

      waves = Array.from(byWave.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([waveNum, tasks]) => Object.freeze({ wave: waveNum, tasks: Object.freeze(tasks) }));
    } else if (options.useDag === true) {
      const normalized = handoffs.map(normalizeTask);
      const graph = buildGraph(normalized);
      const waveIds = groupIntoWaves(graph);
      const byId = new Map(normalized.map(t => [t.id, t]));
      waves = waveIds.map((ids, i) => Object.freeze({
        wave: i,
        tasks: Object.freeze(ids.map(id => byId.get(id))),
      }));
    } else {
      // Single wave with all tasks
      waves = [Object.freeze({
        wave: 0,
        tasks: Object.freeze(handoffs.map(normalizeTask)),
      })];
    }

    currentWaveIndex = 0;
    completedTasks = new Set();
    status = 'idle';

    return waves;
  }

  /**
   * Executes a single wave — runs tasks in parallel (bounded by maxConcurrency),
   * skipping already-completed ones.
   * @param {object} wave — A wave object from planWaves
   * @param {object} context — Execution context passed to callbacks
   * @param {function} context.executor — async function(task) => result (performs actual work)
   * @param {number} [context.maxConcurrency=3] — Max parallel tasks within this wave
   * @returns {Promise<{ completed: string[], failed: string[], skipped: string[] }>}
   */
  async function executeWave(wave, context = {}) {
    const { executor = async () => {}, maxConcurrency = 3 } = context;
    status = 'running';

    const pending = wave.tasks.filter(t => !completedTasks.has(t.id));
    const result = { completed: [], failed: [], skipped: [] };
    const semaphore = new Semaphore(maxConcurrency);

    onWaveStart({ wave: wave.wave, taskCount: pending.length });

    const settled = await Promise.allSettled(
      pending.map(async (task) => {
        await semaphore.acquire();
        const taskStart = Date.now();
        try {
          onTaskStart({ task, wave: wave.wave });
          await executor(task);

          const duration = Date.now() - taskStart;
          completedTasks = new Set([...completedTasks, task.id]);
          result.completed.push(task.id);

          onTaskComplete({ task, wave: wave.wave, duration_ms: duration });
          return { task, status: 'fulfilled' };
        } catch (err) {
          const duration = Date.now() - taskStart;
          result.failed.push(task.id);

          onTaskFail({ task, wave: wave.wave, error: err, duration_ms: duration });
          throw err;
        } finally {
          semaphore.release();
        }
      })
    );

    const failures = settled.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      const failMsg = failures.map(f => f.reason?.message || 'unknown').join(', ');
      throw new Error(`${failures.length} task(s) failed in wave: ${failMsg}`);
    }

    currentWaveIndex++;
    onWaveComplete({ wave: wave.wave, result });

    if (currentWaveIndex >= waves.length) {
      status = 'completed';
    }

    return Object.freeze(result);
  }

  /**
   * Returns a snapshot of the current wave execution status.
   */
  function getWaveStatus() {
    return Object.freeze({
      status,
      currentWaveIndex,
      totalWaves: waves.length,
      completedTasks: Array.from(completedTasks),
      waves: waves.map(w => Object.freeze({
        wave: w.wave,
        taskCount: w.tasks.length,
        completedCount: w.tasks.filter(t => completedTasks.has(t.id)).length,
      })),
    });
  }

  /**
   * Restores progress from a previously saved state.
   * @param {{ currentWaveIndex: number, completedTasks: string[] }} savedState
   */
  function restore(savedState) {
    if (savedState && typeof savedState.currentWaveIndex === 'number') {
      currentWaveIndex = savedState.currentWaveIndex;
    }
    if (savedState && Array.isArray(savedState.completedTasks)) {
      completedTasks = new Set(savedState.completedTasks);
    }
  }

  return Object.freeze({ planWaves, executeWave, getWaveStatus, restore });
}

/**
 * Normalizes a raw handoff entry into a clean task object.
 */
function normalizeTask(h) {
  return Object.freeze({
    id: h.id || h.task_id || `task_${crypto.randomBytes(4).toString('hex')}`,
    name: h.name || h.task || h.description || h.id || 'unnamed-task',
    plan: h.plan || null,
    depends_on: Array.isArray(h.depends_on) ? [...h.depends_on] : [],
  });
}

module.exports = { createWaveExecutor, Semaphore };
