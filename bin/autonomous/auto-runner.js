/**
 * MindForge — Auto-Runner Engine
 * The main entry point for /mindforge:auto.
 *
 * Thin orchestrator that delegates to extracted modules:
 *   - task-dispatcher.js  (task parsing, prioritization, dispatch)
 *   - wave-executor.js    (wave grouping and sequential execution)
 *   - state-manager.js    (state transitions, HANDOFF/auto-state persistence)
 *   - audit-writer.js     (async buffered JSONL audit logging)
 */
'use strict';

const path = require('path');
const fs = require('fs');
const repairOperator = require('./repair-operator');
const stuckMonitor = require('./stuck-monitor');
const headlessAdapter = require('./headless');
const progressStream = require('./progress-stream');
const ContextRefactorer = require('./context-refactorer');

// Extracted modules (lightweight, always needed)
const { appendAuditEntrySync } = require('./audit-writer');
const { createStateManager } = require('./state-manager');
const { createWaveExecutor, Semaphore } = require('./wave-executor');

// ── Lazy-loaded heavy modules ────────────────────────────────────────────────
// These are only required at the point of first use to reduce startup cost.
let _KnowledgeCapture;
let _TemporalHub;
let _MeshSelfHealer;
let _IntelligenceInterlock;
let _ReasonSourceAligner;
let _SelfCorrectiveSynthesizer;
let _Sentinel;
let _ShadowMirror;
let _AdversarialSRE;
let _SLIVerifier;
let _PolicyEngine;
let _ZTAIManager;
let _HandoverManager;

function lazyRequire(cached, modulePath) {
  if (!cached) return require(modulePath);
  return cached;
}

/**
 * UC-14: Pure timeout predicate evaluated at wave boundaries.
 *
 * Three cases:
 *   1. falsy `timeoutAt` (null / undefined / '') → NO timeout is configured →
 *      false. Autonomous mode never times out in that case.
 *   2. truthy but UNPARSEABLE deadline (`Date.parse` → NaN, e.g. 'garbage') → a
 *      MALFORMED deadline. We FAIL CLOSED: warn to stderr AND return true (treat
 *      as expired). For a stability/bounding feature, a broken deadline silently
 *      never firing would let a run proceed UNBOUNDED — the wrong direction. A
 *      malformed deadline must be VISIBLE and must HALT, not silently fail open.
 *   3. valid date → `now > parsed` (timed out once `now` strictly exceeds it).
 *
 * `Date.now()` is the sane default for a RUNTIME comparison (unlike the council
 * UC, which avoided `Date.now()` only for deterministic/resumable FILENAMES — a
 * wall-clock read here is exactly what a timeout check wants). Callers inside the
 * run-loop should still pass an explicit `now` for testability/consistency within
 * a single iteration.
 *
 * NOTE: this is otherwise a PURE function (used directly in tests). The only
 * side-effect is the diagnostic stderr write on the malformed branch — never on
 * the falsy or valid-date paths — so existing pure assertions are unaffected.
 *
 * @param {string|null|undefined} timeoutAt — ISO-8601 deadline, or falsy for "no timeout"
 * @param {number} [now=Date.now()] — Epoch ms to compare against
 * @returns {boolean} true iff a deadline is set AND it has passed (or is malformed)
 */
function isTimedOut(timeoutAt, now = Date.now()) {
  if (!timeoutAt) return false;
  const parsed = Date.parse(timeoutAt);
  if (Number.isNaN(parsed)) {
    // Malformed deadline → fail CLOSED (visible + halt), never silently fail open.
    process.stderr.write(`[auto-runner] malformed timeout_at "${timeoutAt}" — treating as expired to fail closed\n`);
    return true;
  }
  return now > parsed;
}

/**
 * UC-14: Pure decision for the opt-in terminal-ESCALATE rollback hook.
 *
 * SAFE BY DEFAULT: rollback-on-escalate is opt-in via
 * `wave_execution.rollback_on_escalate` (default false). Even when enabled, an
 * actual destructive `git reset` is gated on the runner tracking per-wave commit
 * SHAs — which it does NOT today. So `gitReset` is always false until commit
 * tracking exists; we only ever RECORD the rollback point.
 *
 * @param {object} config — Parsed .mindforge/config.json (or {})
 * @param {boolean} [hasCommitTracking=false] — Whether per-wave commit SHAs are tracked
 * @returns {{ record: boolean, gitReset: boolean, reason: string }}
 */
function decideRollback(config, hasCommitTracking = false) {
  const enabled = config?.wave_execution?.rollback_on_escalate === true;
  if (!enabled) {
    return { record: true, gitReset: false, reason: 'rollback_on_escalate disabled (default) — recording intent only' };
  }
  if (!hasCommitTracking) {
    return { record: true, gitReset: false, reason: 'rollback_on_escalate enabled but per-wave commit tracking unavailable — recording intent only, actual git reset deferred' };
  }
  return { record: true, gitReset: true, reason: 'rollback_on_escalate enabled and commit tracking available' };
}

class AutoRunner {
  constructor(options = {}) {
    if (options.phase === null || options.phase === undefined) {
      throw new TypeError('AutoRunner: phase must be a non-null string or number');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(String(options.phase))) {
      throw new Error('Invalid phase identifier — must be alphanumeric, hyphens, or underscores');
    }
    this.phase = String(options.phase);
    this.isHeadless = options.headless || false;
    this.isPaused = false;

    // Paths
    const planningDir = path.join(process.cwd(), '.planning');
    this.auditPath = path.join(planningDir, 'AUDIT.jsonl');
    this.statePath = path.join(planningDir, 'auto-state.json');
    this.handoffPath = path.join(planningDir, 'HANDOFF.json');

    // Extracted module instances
    this.stateManager = createStateManager(planningDir);
    this.waveExecutor = createWaveExecutor({
      onTaskStart: ({ task, wave }) => this.writeAudit({ event: 'task_started', phase: this.phase, wave: wave + 1, task_id: task.id, task_name: task.name }),
      onTaskComplete: ({ task, wave, duration_ms }) => this.writeAudit({ event: 'task_completed', phase: this.phase, wave: wave + 1, task_id: task.id, task_name: task.name, duration_ms }),
      onWaveStart: ({ wave, taskCount }) => this.writeAudit({ event: 'wave_started', phase: this.phase, wave: wave + 1, task_count: taskCount }),
      onWaveComplete: ({ wave }) => this.writeAudit({ event: 'wave_completed', phase: this.phase, wave: wave + 1 }),
    });

    // Infrastructure (lightweight — always loaded)
    this.monitor = new stuckMonitor(this.auditPath);
    this.refactorer = new ContextRefactorer();
    this.c2cThreshold = 0.65;
    this._sessionId = options.sessionId;

    // Heavy modules are lazily initialized on first access
    this._handoverManager = null;
    this._policyEngine = null;
    this._interlock = null;
    this._aligner = null;
    this._synthesizer = null;
    this._sentinel = null;
    this._mirror = null;
    this._adversary = null;
    this._verifier = null;

    // Legacy compat: wave state exposed for direct access in tests
    this.currentWaveIndex = 0;
    this.waves = [];
    this.completedTasks = new Set();
  }

  // ── Lazy accessors for heavy modules ──────────────────────────────────────
  get handoverManager() {
    if (!this._handoverManager) {
      _HandoverManager = lazyRequire(_HandoverManager, '../engine/handover-manager');
      this._handoverManager = new _HandoverManager();
    }
    return this._handoverManager;
  }

  get policyEngine() {
    if (!this._policyEngine) {
      _PolicyEngine = lazyRequire(_PolicyEngine, '../governance/policy-engine');
      this._policyEngine = new _PolicyEngine();
    }
    return this._policyEngine;
  }

  get interlock() {
    if (!this._interlock) {
      _IntelligenceInterlock = lazyRequire(_IntelligenceInterlock, '../engine/intelligence-interlock');
      this._interlock = _IntelligenceInterlock;
    }
    return this._interlock;
  }

  get aligner() {
    if (!this._aligner) {
      _ReasonSourceAligner = lazyRequire(_ReasonSourceAligner, '../engine/reason-source-aligner');
      this._aligner = _ReasonSourceAligner;
    }
    return this._aligner;
  }

  get synthesizer() {
    if (!this._synthesizer) {
      _SelfCorrectiveSynthesizer = lazyRequire(_SelfCorrectiveSynthesizer, '../engine/self-corrective-synthesizer');
      this._synthesizer = _SelfCorrectiveSynthesizer;
    }
    return this._synthesizer;
  }

  get sentinel() {
    if (!this._sentinel) {
      _Sentinel = lazyRequire(_Sentinel, '../sre/sentinel');
      this._sentinel = new _Sentinel();
    }
    return this._sentinel;
  }

  get mirror() {
    if (!this._mirror) {
      _ShadowMirror = lazyRequire(_ShadowMirror, '../sre/shadow-mirror');
      this._mirror = new _ShadowMirror();
    }
    return this._mirror;
  }

  get adversary() {
    if (!this._adversary) {
      _AdversarialSRE = lazyRequire(_AdversarialSRE, '../sre/adversarial-sre');
      this._adversary = new _AdversarialSRE({ sessionId: this._sessionId });
    }
    return this._adversary;
  }

  get verifier() {
    if (!this._verifier) {
      _SLIVerifier = lazyRequire(_SLIVerifier, '../sre/sli-verifier');
      this._verifier = new _SLIVerifier();
    }
    return this._verifier;
  }

  async run() {
    console.log(`🚀 Starting MindForge Autonomous Engine [Phase ${this.phase}]`);
    if (this.isHeadless) headlessAdapter.setupHeadlessMode(this);

    this.runPreFlight();

    while (await this.hasNextWave()) {
      if (this.isPaused) break;
      // UC-14: enforce the wave-boundary timeout BEFORE dispatching this wave.
      // Re-read auto-state each iteration so an externally-updated timeout_at is
      // honored; stop cleanly (status 'timeout' + resumable state) when passed.
      if (this._enforceWaveTimeout()) return;
      const permit = await this.evaluateWavePolicy();
      if (!permit) { this.writeAudit({ event: 'auto_mode_denied', reason: 'Policy violation detected' }); break; }
      const isReliable = await this.checkArbitrage();
      if (!isReliable) { this.writeAudit({ event: 'auto_mode_escalated', reason: 'Low C2C ratio' }); break; }
      await this.checkContextDensity();
      await this.checkHumanSteering(isReliable);
      const idcStatus = await this.checkIntelligenceDrift();
      await this.checkMissionFidelity();
      await this.checkSRESignals();
      await this.executeWave(idcStatus);
    }

    await this.complete();
  }

  /**
   * UC-14: Wave-boundary timeout enforcement.
   *
   * Re-reads the current `timeout_at` from auto-state.json (V9 design field) and,
   * if the deadline has passed, stops the run CLEANLY:
   *   1. persists resumable state (currentWaveIndex + completedTasks) so a later
   *      `/mindforge:auto` resumes exactly where it left off,
   *   2. sets status to 'timeout' (a VALID_STATUS), keeping the resumable fields,
   *   3. writes an `auto_mode_timeout` audit event,
   *   4. logs the resume command and returns true so the caller stops the loop.
   *
   * Returns false (no-op) when no timeout is set or the deadline hasn't passed.
   * @returns {boolean} true iff the run timed out and the loop should stop
   */
  _enforceWaveTimeout() {
    const autoState = this.stateManager.getState();
    if (!isTimedOut(autoState.timeout_at)) return false;

    const waveNum = this.currentWaveIndex + 1;

    // 1 + 2: persist resumable progress AND flip status to 'timeout' in one write.
    this.updateState({
      status: 'timeout',
      currentWaveIndex: this.currentWaveIndex,
      completedTasks: Array.from(this.completedTasks),
      timedOutAt: new Date().toISOString(),
    });

    // 3: audit the clean stop.
    this.writeAudit({
      event: 'auto_mode_timeout',
      phase: this.phase,
      wave: waveNum,
      timeout_at: autoState.timeout_at,
      completed_tasks: this.completedTasks.size,
      timestamp: new Date().toISOString(),
    });

    // 4: clear operator-facing message including the resume command.
    console.warn(
      `\n⏲️  TIMEOUT at wave boundary ${waveNum}/${this.waves.length} ` +
      `(deadline ${autoState.timeout_at}). Stopped cleanly with ${this.completedTasks.size} task(s) completed.\n` +
      `   Resume with: /mindforge:auto --phase ${this.phase}`
    );
    return true;
  }

  runPreFlight() {
    console.log('🔍 Running pre-flight checks...');

    // UC-01: fail closed on version drift before any wave executes
    try {
      const { assertVersionConsistency } = require('../utils/version-check');
      assertVersionConsistency(process.cwd());
    } catch (e) {
      throw new Error(`[pre-flight] ${e.message}`);
    }

    const handoff = this.stateManager.readHandoff();

    // FIX 3.2: read config ONCE for the whole pre-flight path and thread the
    // resolved useDag boolean into both _assertNoCycles and _buildWaves, instead
    // of each method re-reading + re-parsing .mindforge/config.json.
    const useDag = this._useDagMode();

    // UC-03: when DAG ordering is enabled (opt-in via config), detect cycles
    // BEFORE any wave executes and HALT LOUD. Default OFF — legacy behavior
    // (single-wave / explicit .wave grouping) is untouched.
    this._assertNoCycles(handoff.handoffs, useDag);

    this.waves = this._buildWaves(handoff.handoffs, useDag);
    this.currentWaveIndex = 0;

    const savedState = this.stateManager.getState();
    if (savedState.completedTasks) {
      savedState.completedTasks.forEach(t => this.completedTasks.add(t));
      console.log(`  Resuming: ${this.completedTasks.size} tasks already completed`);
    }
    if (typeof savedState.currentWaveIndex === 'number') {
      this.currentWaveIndex = savedState.currentWaveIndex;
    }

    this.updateState({ status: 'running', phase: this.phase, totalWaves: this.waves.length, startedAt: new Date().toISOString() });
    this.writeAudit({ event: 'auto_mode_started', phase: this.phase, total_waves: this.waves.length, total_tasks: this.waves.reduce((sum, w) => sum + w.tasks.length, 0), timestamp: new Date().toISOString() });
    console.log(`  Phase ${this.phase}: ${this.waves.length} waves, ${this.waves.reduce((s, w) => s + w.tasks.length, 0)} tasks`);
  }

  async hasNextWave() {
    if (this.currentWaveIndex >= this.waves.length) return false;
    const wave = this.waves[this.currentWaveIndex];
    return wave.tasks.filter(t => !this.completedTasks.has(t.id)).length > 0;
  }

  async executeWave(idcStatus = {}) {
    const wave = this.waves[this.currentWaveIndex];
    const waveNum = this.currentWaveIndex + 1;
    const pending = wave.tasks.filter(t => !this.completedTasks.has(t.id));
    const maxConcurrency = this._getWaveConcurrency();

    console.log(`\n⚡ Wave ${waveNum}/${this.waves.length}: ${pending.length} tasks (concurrency: ${maxConcurrency})`);
    if (idcStatus.action === 'UPGRADE_MIR') console.log(`  [IDC-ACTIVE] MIR Override: ${idcStatus.new_mir}`);
    this.writeAudit({ event: 'wave_started', phase: this.phase, wave: waveNum, task_count: pending.length });

    const semaphore = new Semaphore(maxConcurrency);

    const settled = await Promise.allSettled(
      pending.map(async (task) => {
        await semaphore.acquire();
        const taskStart = Date.now();
        console.log(`  → Task: ${task.name || task.id}`);
        try {
          this.writeAudit({ event: 'task_started', phase: this.phase, wave: waveNum, task_id: task.id, task_name: task.name || task.id });
          this.writeAudit({ event: 'task_completed', phase: this.phase, wave: waveNum, task_id: task.id, task_name: task.name || task.id, duration_ms: Date.now() - taskStart });
          this.completedTasks.add(task.id);
          return { taskId: task.id, status: 'fulfilled' };
        } catch (err) {
          console.error(`  Task failed: ${task.id} — ${err.message}`);
          this.writeAudit({ event: 'task_failed', phase: this.phase, wave: waveNum, task_id: task.id, error: err.message, duration_ms: Date.now() - taskStart });
          throw { taskId: task.id, error: err, task };
        } finally {
          semaphore.release();
        }
      })
    );

    const failures = settled.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      for (const failure of failures) {
        const { taskId, error, task } = failure.reason;
        const strategy = repairOperator.determineRepairStrategy({ planId: task.plan || taskId, phase: this.phase, attemptNumber: 1, errorOutput: error.message, isTier3Change: false, isOnCriticalPath: (task.depends_on || []).length > 0 });
        if (strategy === 'ESCALATE') {
          this.writeAudit({ event: 'auto_mode_escalated', reason: `Task ${taskId} unrecoverable` });
          // UC-14: opt-in rollback hook on terminal ESCALATE. SAFE DEFAULT —
          // records the rollback point only; never mutates git (see decideRollback).
          this._recordRollbackPoint(waveNum, taskId);
          this.isPaused = true;
          return;
        }
      }
    }

    this.updateState({ currentWaveIndex: this.currentWaveIndex, completedTasks: Array.from(this.completedTasks), lastWaveCompletedAt: new Date().toISOString() });
    this.writeAudit({ event: 'wave_completed', phase: this.phase, wave: waveNum });
    this.currentWaveIndex++;
  }

  _getWaveConcurrency() {
    try {
      const configPath = path.join(process.cwd(), '.mindforge', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (typeof config.wave_concurrency === 'number' && config.wave_concurrency > 0) {
          return config.wave_concurrency;
        }
      }
    } catch (e) { /* Fall through to default */ }
    return 3;
  }

  /**
   * UC-14: Rollback-on-escalate is OPT-IN. Reads
   * `wave_execution.rollback_on_escalate` from config; defaults to false so the
   * SAFE behavior (record rollback intent only — NO git mutation) is the default.
   * Even when true, an actual git reset is further gated on per-wave commit
   * tracking, which the runner does not yet have (see decideRollback).
   * @returns {boolean}
   */
  _rollbackOnEscalate() {
    try {
      const configPath = path.join(process.cwd(), '.mindforge', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.wave_execution?.rollback_on_escalate === true;
      }
    } catch (e) { /* Fall through to default */ }
    return false;
  }

  /**
   * UC-14: Records the rollback point on terminal ESCALATE WITHOUT mutating git.
   *
   * The runner does NOT track per-wave commit SHAs, so even with
   * `rollback_on_escalate` enabled the actual `git reset --hard` is deferred —
   * we never run a destructive reset against untracked commit boundaries. We
   * emit a `rollback_point_recorded` audit event (and a clear log) recording the
   * intended rollback wave so a human can act on it.
   *
   * @param {number} waveNum — 1-based wave number that hit terminal escalation
   * @param {string} taskId — The task id whose repair was exhausted
   */
  _recordRollbackPoint(waveNum, taskId) {
    const config = (() => {
      try {
        const configPath = path.join(process.cwd(), '.mindforge', 'config.json');
        if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } catch (e) { /* ignore — treat as no config */ }
      return {};
    })();

    // hasCommitTracking is hard-false: no per-wave SHA tracking exists yet.
    const decision = decideRollback(config, /* hasCommitTracking */ false);

    // DRY: derive the flag from the `config` we ALREADY read above instead of
    // calling _rollbackOnEscalate(), which would re-read + re-parse the SAME
    // config.json a second time within this single escalation path.
    const rollbackEnabled = config?.wave_execution?.rollback_on_escalate === true;

    this.writeAudit({
      event: 'rollback_point_recorded',
      phase: this.phase,
      wave: waveNum,
      task_id: taskId,
      commits: [], // none tracked yet — rollback target is the prior wave boundary
      git_reset_performed: decision.gitReset,
      reason: decision.reason,
      timestamp: new Date().toISOString(),
    });
    console.warn(`↩️  ROLLBACK POINT recorded at wave ${waveNum} (task ${taskId}): ${decision.reason}`);
    if (rollbackEnabled && !decision.gitReset) {
      console.warn('   (rollback_on_escalate is ON, but actual git reset is deferred until per-wave commit tracking exists.)');
    }
    return decision;
  }

  /**
   * UC-03: DAG wave ordering is OPT-IN. Reads `wave_execution.use_dag` from
   * config; defaults to false so legacy single-wave / explicit-.wave behavior
   * is untouched. Enabling this reorders tasks by `depends_on` topology.
   * @returns {boolean}
   */
  _useDagMode() {
    try {
      const configPath = path.join(process.cwd(), '.mindforge', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return config.wave_execution?.use_dag === true;
      }
    } catch (e) { /* Fall through to default */ }
    return false;
  }

  /**
   * UC-03: Pre-flight cycle detection. ONLY active when DAG mode is enabled
   * (opt-in) AND no explicit numeric `.wave` field is present (DAG would be the
   * active strategy). Throws `[pre-flight] Circular dependency...` to HALT LOUD
   * before any wave executes — never warn-and-continue. No-op when DAG is off.
   *
   * FIX 1: the pre-flight graph must NOT differ from the graph planWaves
   * actually executes. planWaves builds its graph from normalizeTask, which
   * SYNTHESIZES a random id (`task_<rand>`) for any handoff lacking both id and
   * task_id. A random id can't be matched between two separate calls, AND a task
   * with no stable id can never be a `depends_on` TARGET (nothing can reference
   * an id that doesn't exist until it's randomly minted). So we cycle-check the
   * SUBSET of handoffs that carry a real, stable id (id || task_id) — a subset
   * guaranteed consistent with execution — and log a warning for any id-less
   * handoff excluded from the check.
   *
   * @param {Array} handoffs — Raw handoffs array from HANDOFF.json
   * @param {boolean} [useDag] — Resolved DAG mode (threaded from runPreFlight to
   *   avoid re-reading config). Falls back to _useDagMode() for direct callers.
   */
  _assertNoCycles(handoffs, useDag = this._useDagMode()) {
    if (!Array.isArray(handoffs) || handoffs.length === 0) return;
    if (!useDag) return;

    // Explicit .wave field wins over DAG, so cycle check is irrelevant there.
    const hasWaveField = handoffs.some(h => typeof h.wave === 'number');
    if (hasWaveField) return;

    // Only handoffs with a STABLE id participate in cycle-checking (see above).
    const stable = handoffs.filter(h => h.id || h.task_id);
    const idless = handoffs.length - stable.length;
    if (idless > 0) {
      console.warn(
        `[pre-flight] ${idless} handoff(s) lack a stable id (id/task_id) and are ` +
        'excluded from cycle-checking; an id-less task cannot be a dependency target.'
      );
    }
    if (stable.length === 0) return;

    const { buildGraph, groupIntoWaves } = require('./dependency-dag');
    let graph;
    try {
      graph = buildGraph(stable.map(h => ({
        id: h.id || h.task_id,
        depends_on: Array.isArray(h.depends_on) ? h.depends_on : [],
      })));
    } catch (e) {
      // Unknown-dependency reference — also a planning error; fail loud.
      throw new Error(`[pre-flight] ${e.message}`);
    }
    // FIX 3.1: hasCircularDependency() is itself `try{groupIntoWaves}catch`, so
    // running it then groupIntoWaves again ran Kahn 2-3 times and left an
    // unreachable defensive throw. Run Kahn ONCE here; on throw, rethrow with the
    // descriptive (circular OR unknown-dep) message prefixed for pre-flight.
    try {
      groupIntoWaves(graph);
    } catch (e) {
      throw new Error(`[pre-flight] ${e.message}`);
    }
  }

  /**
   * Build wave groups from HANDOFF handoffs array.
   * Kept as instance method for backward compatibility with tests.
   * @param {Array} handoffs — Raw handoffs array from HANDOFF.json
   * @param {boolean} [useDag] — Resolved DAG mode (threaded from runPreFlight).
   *   Falls back to _useDagMode() for direct callers (e.g. tests).
   */
  _buildWaves(handoffs, useDag = this._useDagMode()) {
    return this.waveExecutor.planWaves(handoffs, { useDag });
  }

  async checkIntelligenceDrift() {
    const events = this.getRecentAuditEvents(5);
    const lastThought = events.reverse().find(e => e.thought || e.reasoning);
    if (lastThought) {
      const result = this.interlock.evaluate(lastThought.span_id || 'wave-context', lastThought.thought || lastThought.reasoning);
      if (result.action === 'UPGRADE_MIR') {
        this.writeAudit({ event: 'intelligence_upgrade_signalled', new_mir: result.new_mir, reason: result.reason });
        return result;
      }
    }
    return { action: 'CONTINUE' };
  }

  async checkMissionFidelity() {
    await this.aligner.init();
    const events = this.getRecentAuditEvents(5);
    const lastThought = events.reverse().find(e => e.thought || e.reasoning);
    if (lastThought && !lastThought.best_match_id) {
      const alignment = this.aligner.checkAlignment(lastThought.thought || lastThought.reasoning);
      if (alignment.is_aligned) {
        if (alignment.confidence < 0.50) {
          const correction = await this.synthesizer.synthesizeCorrection(this.getRecentAuditEvents(10), { phase: this.phase });
          this.writeAudit({ event: 'scs_homing_injected', instruction: correction.instruction, req_id: correction.req_id, confidence: correction.confidence });
        }
      }
    }
  }

  async pause() {
    this.isPaused = true;
    this.updateState({ status: 'paused' });
    this.writeAudit({ event: 'auto_mode_paused', timestamp: new Date().toISOString() });
  }

  async complete() {
    const totalTasks = this.waves.reduce((s, w) => s + w.tasks.length, 0);
    console.log(`✅ Phase ${this.phase} complete — ${this.completedTasks.size}/${totalTasks} tasks`);

    if (fs.existsSync(this.handoffPath)) {
      try {
        const handoff = JSON.parse(fs.readFileSync(this.handoffPath, 'utf8'));
        const updated = Object.assign({}, handoff, {
          last_run: { phase: this.phase, completed: this.completedTasks.size, total: totalTasks, finished_at: new Date().toISOString() },
          last_updated: new Date().toISOString(),
        });
        fs.writeFileSync(this.handoffPath, JSON.stringify(updated, null, 2) + '\n');
      } catch (e) { /* Non-fatal */ }
    }

    this.updateState({ status: 'completed', completedAt: new Date().toISOString() });

    const phasesDir = path.join(process.cwd(), '.planning', 'phases', this.phase);
    if (!fs.existsSync(phasesDir)) fs.mkdirSync(phasesDir, { recursive: true });
    const report = progressStream.generateReport(this.auditPath, this.phase);
    fs.writeFileSync(path.join(phasesDir, 'AUTONOMOUS-REPORT.md'), report);

    try { const { runSync } = require('../memory/federated-sync'); await runSync(); } catch (err) { console.warn('⚠️ Federated Sync failed:', err.message); }
    try {
      _KnowledgeCapture = lazyRequire(_KnowledgeCapture, '../memory/knowledge-capture');
      const captured = _KnowledgeCapture.captureFromPhaseCompletion(this.phase);
      const stability = _KnowledgeCapture.captureArchitecturalStability(this.phase);
      if (captured.length + stability.length > 0) console.log(`🧠 Knowledge Graph: Captured ${captured.length + stability.length} insights.`);
    } catch (err) { console.error('⚠️ Knowledge Capture failed:', err.message); }

    try {
      _TemporalHub = lazyRequire(_TemporalHub, '../engine/temporal-hub');
      const gcConfig = this._loadTemporalGcConfig();
      const gcResult = await _TemporalHub.gc(gcConfig);
      if (gcResult.deleted > 0) {
        this.writeAudit({ event: 'temporal_gc_completed', deleted: gcResult.deleted, remaining: gcResult.remaining });
      }
    } catch (e) { /* GC failure is non-critical */ }

    this.writeAudit({ event: 'auto_mode_completed', timestamp: new Date().toISOString() });
  }

  writeAudit(event) {
    // UC-04b: single unified, hash-chained, synchronous-DURABLE append. The sync
    // fsync'd write means in-process consumers (StuckMonitor reads the event
    // object directly below; any file re-readers see it immediately) get durable
    // data at once — replacing the old dual raw-appendFileSync + async-buffer write
    // that left the live AUDIT.jsonl chain unverifiable.
    const stamped = appendAuditEntrySync(this.auditPath, event);

    const STATE_CHANGING_EVENTS = ['auto_mode_started', 'phase_planned', 'phase_execution_started', 'task_completed', 'hindsight_injected', 'auto_mode_completed'];
    if (STATE_CHANGING_EVENTS.includes(stamped.event)) {
      _TemporalHub = lazyRequire(_TemporalHub, '../engine/temporal-hub');
      _TemporalHub.captureState(stamped.id, { agent: stamped.agent || 'auto-runner', event: stamped.event, phase: this.phase }).catch(() => {});
    }

    const result = this.monitor.analyze(stamped);
    if (result) this.handleStuck(result);
  }

  handleStuck(result) {
    console.error(`🛑 STUCK PATTERN DETECTED: ${result.pattern} - ${result.message}`);
    if (result.driftScore > 80) {
      _MeshSelfHealer = lazyRequire(_MeshSelfHealer, './mesh-self-healer');
      const repairPlan = _MeshSelfHealer.homeIn(result.did || 'auto-runner', result.driftScore);
      if (repairPlan) { this.writeAudit({ event: 'mesh_healing_active', plan: repairPlan }); return; }
    }
    this.writeAudit({ event: 'auto_mode_escalated', reason: result.message });
    this.isPaused = true;
  }

  updateState(update) {
    // Delegate to state manager but keep backward compat with direct statePath access
    let state = Object.create(null);
    if (fs.existsSync(this.statePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
        for (const key of Object.keys(parsed)) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
          state[key] = parsed[key];
        }
      } catch (e) { /* Corrupt — start fresh */ }
    }
    Object.assign(state, update);
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
  }

  /**
   * Lazily registers (once) the autonomous runner's own ZTAI identity and
   * returns { did, tier }. ztai-manager is a SINGLETON (not a constructor) and
   * exposes no getIdentity() — the runner must register a DID to obtain one.
   * Cached on the instance so every wave evaluates under one stable identity.
   * Tier 3: autonomous phase processing is a high-trust operation; the policy
   * engine still runs its own blast-radius analysis on top, so this is an INPUT
   * to evaluation, not a self-granted bypass.
   */
  async _getRunnerIdentity() {
    if (!this._runnerIdentity) {
      _ZTAIManager = lazyRequire(_ZTAIManager, '../governance/ztai-manager');
      const did = await _ZTAIManager.registerAgent(
        `auto-runner:${process.env.MF_PROJECT_ID || 'MF-ALPHA'}:phase-${this.phase}`,
        3,
        this._sessionId
      );
      const agent = _ZTAIManager.getAgent(did);
      this._runnerIdentity = { did, tier: agent && typeof agent.tier === 'number' ? agent.tier : 3 };
    }
    return this._runnerIdentity;
  }

  async evaluateWavePolicy() {
    let identity;
    try {
      identity = await this._getRunnerIdentity();
    } catch (err) {
      // Fail CLOSED: if the runner cannot establish a verifiable identity, deny
      // the wave rather than proceeding ungoverned.
      console.warn(`[APO-DENY] Could not establish runner identity: ${err.message}`);
      this.writeAudit({ event: 'auto_mode_denied', reason: `identity unavailable: ${err.message}`, phase: this.phase });
      return false;
    }

    const intent = {
      did: identity.did,
      action: 'process_phase_wave',
      resource: `projects/${process.env.MF_PROJECT_ID || 'MF-ALPHA'}/phases/${this.phase}/*`,
      tier: identity.tier,
      sessionId: this._sessionId,
      metadata: { engine: 'Nimbus-S4', mode: 'autonomous', wave_timestamp: new Date().toISOString() }
    };

    // policyEngine.evaluate is ASYNC — must be awaited, or `result` is a Promise
    // and `result.verdict === 'DENY'` is always false (the gate never fires).
    const result = await this.policyEngine.evaluate(intent);
    if (result.verdict === 'DENY') { console.warn(`[APO-DENY] ${result.reason}`); return false; }
    return true;
  }

  async checkArbitrage() {
    const events = this.getRecentAuditEvents(10);
    const successCount = events.filter(e => e.status === 'success' || e.event === 'task_completed').length;
    const confidence = (successCount / Math.max(events.length, 1)) * 0.8 + 0.2;
    return (confidence / 0.5) >= this.c2cThreshold;
  }

  async checkContextDensity() {
    const events = this.getRecentAuditEvents(20);
    const analysis = this.refactorer.analyzeDensity(events);
    if (analysis.shouldRefactor) {
      const refactorEvent = this.refactorer.generateRefactorPlan(events, this.phase);
      this.writeAudit(refactorEvent);
    }
  }

  async checkHumanSteering(isReliable) {
    if (!isReliable) {
      const events = this.getRecentAuditEvents(20);
      const bundlePath = this.handoverManager.createNexusBundle({ phase: this.phase, wave: 'active', recentEvents: events, reasoningTrace: 'Reasoning isolated in SRE.' });
      this.writeAudit({ event: 'human_handover_requested', bundle: bundlePath, timestamp: new Date().toISOString() });
    }
    const steerPath = path.join(process.cwd(), '.planning', 'STEER.json');
    if (fs.existsSync(steerPath)) {
      const instructions = fs.readFileSync(steerPath, 'utf8').trim().split('\n');
      if (instructions.length > 0) fs.unlinkSync(steerPath);
    }
  }

  async checkSRESignals() {
    console.log('📡 SRE SENTINEL: Monitoring audit trail for anomalies...');
    const incident = await this.sentinel.scanAudit(this.auditPath);
    if (incident && incident.status === 'CRITICAL') {
      console.error(`🚨 SRE INCIDENT DETECTED: [${incident.remediation_id}] ${incident.incident_type}`);
      this.writeAudit({ event: 'sre_incident_detected', incident_type: incident.incident_type, rid: incident.remediation_id });
      const mirrorPath = await this.mirror.replicate(incident);
      const decision = await this.adversary.runDebate(incident, mirrorPath);
      if (decision.verdict === 'APPROVED' || decision.verdict === 'AMENDED') {
        let baseline, postFix;
        try {
          baseline = this.verifier.simulateShadowWave(false);
          postFix  = this.verifier.simulateShadowWave(true);
        } catch (e) {
          this.writeAudit({ event: 'sre_sli_unavailable', rid: incident.remediation_id, reason: e.message });
          return;
        }
        const verification = await this.verifier.verify(baseline, postFix);
        if (verification.isHealthy) {
          this.writeAudit({ event: 'sre_remediation_applied', rid: incident.remediation_id, verdict: decision.verdict });
        } else {
          this.writeAudit({ event: 'sre_remediation_failed_sli', rid: incident.remediation_id });
        }
      } else {
        this.writeAudit({ event: 'sre_remediation_rejected_by_auditor', rid: incident.remediation_id });
      }
      await this.mirror.cleanup(mirrorPath);
    }
  }

  getRecentAuditEvents(count) {
    if (!fs.existsSync(this.auditPath)) return [];
    const CHUNK = 4096 * count;
    const stat = fs.statSync(this.auditPath);
    if (stat.size === 0) return [];
    const fd = fs.openSync(this.auditPath, 'r');
    const readStart = Math.max(0, stat.size - CHUNK);
    const buf = Buffer.alloc(stat.size - readStart);
    fs.readSync(fd, buf, 0, buf.length, readStart);
    fs.closeSync(fd);
    const lines = buf.toString('utf8').trim().split('\n');
    return lines.slice(-count).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  }

  _loadTemporalGcConfig() {
    try {
      const configPath = path.join(process.cwd(), '.mindforge', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.temporal) {
          return {
            maxSnapshots: config.temporal.max_snapshots || 50,
            maxAgeDays: config.temporal.max_age_days || 7
          };
        }
      }
    } catch (e) { /* Fall through to defaults */ }
    return { maxSnapshots: 50, maxAgeDays: 7 };
  }
}

// Primary export remains the AutoRunner class (back-compat with all callers/tests
// that do `const AutoRunner = require('./auto-runner')`). UC-14 pure helpers are
// attached as named properties so `require('./auto-runner').isTimedOut` works too.
AutoRunner.isTimedOut = isTimedOut;
AutoRunner.decideRollback = decideRollback;

module.exports = AutoRunner;
module.exports.isTimedOut = isTimedOut;
module.exports.decideRollback = decideRollback;
