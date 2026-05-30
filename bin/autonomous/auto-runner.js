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
const { createAuditWriter } = require('./audit-writer');
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

class AutoRunner {
  constructor(options = {}) {
    if (options.phase != null && !/^[a-zA-Z0-9_-]+$/.test(String(options.phase))) {
      throw new Error('Invalid phase identifier — must be alphanumeric, hyphens, or underscores');
    }
    this.phase = String(options.phase ?? 0);
    this.isHeadless = options.headless || false;
    this.isPaused = false;

    // Paths
    const planningDir = path.join(process.cwd(), '.planning');
    this.auditPath = path.join(planningDir, 'AUDIT.jsonl');
    this.statePath = path.join(planningDir, 'auto-state.json');
    this.handoffPath = path.join(planningDir, 'HANDOFF.json');

    // Extracted module instances
    this.stateManager = createStateManager(planningDir);
    this.auditWriter = createAuditWriter(this.auditPath);
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

  runPreFlight() {
    console.log('🔍 Running pre-flight checks...');

    // UC-01: fail closed on version drift before any wave executes
    try {
      const { assertVersionConsistency } = require('../utils/version-check');
      assertVersionConsistency(this.projectRoot || process.cwd());
    } catch (e) {
      throw new Error(`[pre-flight] ${e.message}`);
    }

    const handoff = this.stateManager.readHandoff();
    this.waves = this._buildWaves(handoff.handoffs);
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
   * Build wave groups from HANDOFF handoffs array.
   * Kept as instance method for backward compatibility with tests.
   */
  _buildWaves(handoffs) {
    return this.waveExecutor.planWaves(handoffs);
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
    await this.auditWriter.close();
  }

  writeAudit(event) {
    const crypto = require('crypto');
    if (!event.id) event = Object.assign({}, event, { id: crypto.randomBytes(8).toString('hex') });
    if (!event.timestamp) event = Object.assign({}, event, { timestamp: new Date().toISOString() });

    // Synchronous write for backward compat (monitor needs immediate data)
    fs.appendFileSync(this.auditPath, JSON.stringify(event) + '\n');

    // Also buffer in async writer for future async consumers
    this.auditWriter.write(event);

    const STATE_CHANGING_EVENTS = ['auto_mode_started', 'phase_planned', 'phase_execution_started', 'task_completed', 'hindsight_injected', 'auto_mode_completed'];
    if (STATE_CHANGING_EVENTS.includes(event.event)) {
      _TemporalHub = lazyRequire(_TemporalHub, '../engine/temporal-hub');
      _TemporalHub.captureState(event.id, { agent: event.agent || 'auto-runner', event: event.event, phase: this.phase }).catch(() => {});
    }

    const result = this.monitor.analyze(event);
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

  async evaluateWavePolicy() {
    _ZTAIManager = lazyRequire(_ZTAIManager, '../governance/ztai-manager');
    const manager = new _ZTAIManager();
    const identity = await manager.getIdentity();
    const intent = { did: identity.did, action: 'process_phase_wave', resource: `projects/${process.env.MF_PROJECT_ID || 'MF-ALPHA'}/phases/${this.phase}/*`, tier: identity.tier || 1, metadata: { engine: 'Nimbus-S4', mode: 'autonomous', wave_timestamp: new Date().toISOString() } };
    const result = this.policyEngine.evaluate(intent);
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
        const baseline = this.verifier.simulateShadowWave(false);
        const postFix = this.verifier.simulateShadowWave(true);
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

module.exports = AutoRunner;
