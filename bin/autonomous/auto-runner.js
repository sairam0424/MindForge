/**
 * MindForge — Auto-Runner Engine
 * The main entry point for /mindforge:auto.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const repairOperator = require('./repair-operator');
const stuckMonitor = require('./stuck-monitor');
const steeringManager = require('./steer');
const progressStream = require('./progress-stream');
const headlessAdapter = require('./headless');
const ContextRefactorer = require('./context-refactorer');
const KnowledgeCapture = require('../memory/knowledge-capture');
const TemporalHub = require('../engine/temporal-hub');
const IntentHarvester = require('./intent-harvester');
const MeshSelfHealer = require('./mesh-self-healer');
const crypto = require('crypto');

// MindForge v5 Core Modules
const PolicyEngine = require('../governance/policy-engine');
const RBACManager  = require('../governance/rbac-manager');
const ZTAIManager  = require('../governance/ztai-manager');
const HandoverManager = require('../engine/handover-manager');

class AutoRunner {
  constructor(options = {}) {
    this.phase = options.phase;
    this.isHeadless = options.headless || false;
    this.auditPath = path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
    this.statePath = path.join(process.cwd(), '.planning', 'auto-state.json');
    this.monitor = new stuckMonitor(this.auditPath);
    this.isPaused = false;
    this.handoverManager = new HandoverManager();

    // v5 Governance Initialization
    this.policyEngine = new PolicyEngine();
    this.rbacManager  = new RBACManager();

    // v5 PAR Initialization
    this.refactorer = new ContextRefactorer();
    this.c2cThreshold = 0.65;
  }

  async run() {
    console.log(`🚀 Starting MindForge Autonomous Engine [Phase ${this.phase}]`);

    if (this.isHeadless) {
      headlessAdapter.setupHeadlessMode(this);
    }

    // 1. Pre-flight checks
    this.runPreFlight();

    // 2. Main Wave Loop
    while (await this.hasNextWave()) {
      if (this.isPaused) break;
      
      // Pillar 2 (APO): Pre-execution Policy Check
      const permit = await this.evaluateWavePolicy();
      if (!permit) {
        console.error('🛑 POLICY VIOLATION: Execution aborted by Agentic Policy Orchestrator.');
        this.writeAudit({ event: 'auto_mode_denied', reason: 'Policy violation detected' });
        break;
      }

      // Pillar 3 (PAR): Confidence-to-Cost Arbitrage
      const isReliable = await this.checkArbitrage();
      if (!isReliable) {
        console.warn('⚠️ PAR ARBITRAGE: Confidence-to-Cost ratio below threshold. Escalating to human.');
        this.writeAudit({ event: 'auto_mode_escalated', reason: 'Low C2C ratio' });
        break;
      }

      // Pillar 3 (PAR): Context Density Refactoring
      await this.checkContextDensity();

      // Pillar 7 (DHH): Check for Human Steering
      await this.checkHumanSteering(isReliable);

      await this.executeWave();
    }

    await this.complete();
  }

  runPreFlight() {
    console.log('🔍 Running pre-flight checks...');
    // Real logic would check git status, health, etc.
    this.writeAudit({ event: 'auto_mode_started', phase: this.phase, timestamp: new Date().toISOString() });
  }

  async hasNextWave() {
    // Logic to check HANDOFF.json for incomplete waves
    return false; // Placeholder for now
  }

  async executeWave() {
    // Parallel task execution logic...
  }

  async pause() {
    this.isPaused = true;
    this.updateState({ status: 'paused' });
    this.writeAudit({ event: 'auto_mode_paused', timestamp: new Date().toISOString() });
  }

  async complete() {
    console.log('✅ Phase complete!');
    const report = progressStream.generateReport(this.auditPath, this.phase);
    fs.writeFileSync(path.join(process.cwd(), `.planning/phases/${this.phase}/AUTONOMOUS-REPORT.md`), report);
    
    // v5 Pillar 1: Federated Intelligence Mesh (FIM)
    try {
      const { runSync } = require('../memory/federated-sync');
      console.log('🔄 Finalizing organizational intelligence sync...');
      await runSync();
    } catch (err) {
      console.warn('⚠️ Federated Sync failed at phase end:', err.message);
    }
    
    // Auto-capture knowledge from completed phase (ADRs, findings)
    try {
      const captured = KnowledgeCapture.captureFromPhaseCompletion(this.phase);
      if (captured.length > 0) {
        console.log(`🧠 Knowledge Graph: Captured ${captured.length} new insights from phase completion.`);
      }
    } catch (err) {
      console.error('⚠️ Knowledge Capture failed:', err.message);
    }
    
    this.writeAudit({ event: 'auto_mode_completed', timestamp: new Date().toISOString() });
  }

  writeAudit(event) {
    if (!event.id) event.id = crypto.randomBytes(8).toString('hex');
    if (!event.timestamp) event.timestamp = new Date().toISOString();
    
    fs.appendFileSync(this.auditPath, JSON.stringify(event) + '\n');
    
    // Auto-capture state for significant events
    const STATE_CHANGING_EVENTS = [
      'auto_mode_started',
      'phase_planned',
      'phase_execution_started',
      'task_completed',
      'hindsight_injected',
      'auto_mode_completed'
    ];
    
    if (STATE_CHANGING_EVENTS.includes(event.event)) {
      TemporalHub.captureState(event.id, { 
        agent: event.agent || 'auto-runner',
        event: event.event,
        phase: this.phase
      });
    }

    const result = this.monitor.analyze(event);
    if (result) this.handleStuck(result);
  }

  handleStuck(result) {
    console.error(`🛑 STUCK PATTERN DETECTED: ${result.pattern} - ${result.message}`);
    
    // v7: Mesh Self-Healing (Pillar XII)
    if (result.driftScore > 80) {
      console.log('[HOMING-REPAIR] Stuck pattern with high drift detected. Invoking Mesh Self-Healer...');
      const repairPlan = MeshSelfHealer.homeIn(result.did || 'auto-runner', result.driftScore);
      if (repairPlan) {
        this.writeAudit({ event: 'mesh_healing_active', plan: repairPlan });
        // In a real system, this would modify the execution DAG to include the repair wave
        return; 
      }
    }

    this.writeAudit({ event: 'auto_mode_escalated', reason: result.message });
    process.exit(10);
  }

  updateState(update) {
    let state = {};
    if (fs.existsSync(this.statePath)) {
      state = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
    }
    Object.assign(state, update);
    fs.writeFileSync(this.statePath, JSON.stringify(state, null, 2));
  }

  /**
   * Evaluates the policy for the next wave's intent. (v5 APO - HARDENED)
   */
  async evaluateWavePolicy() {
    // [HARDEN] Dynamically derive intent from ZTAI identity and phase context
    const manager = new ZTAIManager();
    const identity = await manager.getIdentity();
    
    const intent = {
      did: identity.did,
      action: 'process_phase_wave',
      resource: `projects/${process.env.MF_PROJECT_ID || 'MF-ALPHA'}/phases/${this.phase}/*`,
      tier: identity.tier || 1,
      metadata: {
        engine: 'Nimbus-S4',
        mode: 'autonomous',
        wave_timestamp: new Date().toISOString()
      }
    };

    const result = this.policyEngine.evaluate(intent);
    
    if (result.verdict === 'DENY') {
      console.warn(`[APO-DENY] Intent rejected: ${result.reason} [ReqID: ${result.requestId}]`);
      return false;
    }

    console.log(`[APO-PERMIT] Intent approved: ${result.reason} [ReqID: ${result.requestId}]`);
    return true;
  }

  /**
   * Predictive Agentic Reliability (PAR) - C2C Arbitrage
   */
  async checkArbitrage() {
    // Simulated C2C calculation based on recent wave success rate
    const events = this.getRecentAuditEvents(10);
    const successCount = events.filter(e => e.status === 'success' || e.event === 'task_completed').length;
    
    // Confidence = SuccessRate * 0.8 + 0.2
    const confidence = (successCount / Math.max(events.length, 1)) * 0.8 + 0.2;
    const estimatedCost = 0.5; // Placeholder for token cost estimation
    
    const c2c = confidence / estimatedCost;
    console.log(`[PAR-C2C] Confidence: ${confidence.toFixed(2)}, Cost: ${estimatedCost.toFixed(2)}, Ratio: ${c2c.toFixed(2)}`);
    
    return c2c >= this.c2cThreshold;
  }

  /**
   * Predictive Agentic Reliability (PAR) - Context Refactoring
   */
  async checkContextDensity() {
    const events = this.getRecentAuditEvents(20);
    const analysis = this.refactorer.analyzeDensity(events);
    
    if (analysis.shouldRefactor) {
      console.log(`[PAR-REFACTOR] Context density low (${analysis.density}). Triggering proactive refactor.`);
      const refactorEvent = this.refactorer.generateRefactorPlan(events, this.phase);
      this.writeAudit(refactorEvent);
      
      // In a real implementation, this would trigger a system_handoff summarization
      // For now, we log it to the audit stream for the agent to action
    }
  }

  async checkHumanSteering(isReliable) {
    if (!isReliable) {
      console.log('[DHH-AUTO] Low reliability detected. Packaging Nexus State Bundle for human review...');
      const events = this.getRecentAuditEvents(20);
      const bundlePath = this.handoverManager.createNexusBundle({
        phase: this.phase,
        wave: 'active',
        recentEvents: events,
        reasoningTrace: 'Reasoning isolated in SRE.'
      });
      
      this.writeAudit({ 
        event: 'human_handover_requested', 
        bundle: bundlePath, 
        timestamp: new Date().toISOString() 
      });
    }

    // Check for mid-wave steering instructions if available
    const steerPath = path.join(process.cwd(), '.planning', 'STEER.json');
    if (fs.existsSync(steerPath)) {
      const instructions = fs.readFileSync(steerPath, 'utf8').trim().split('\n');
      if (instructions.length > 0) {
        console.log(`[DHH-STEER] Processing ${instructions.length} injected human instructions...`);
        // Real implementation would inject these into the agent's task list
        fs.unlinkSync(steerPath); // Clear handled instructions
      }
    }
  }

  getRecentAuditEvents(count) {
    if (!fs.existsSync(this.auditPath)) return [];
    const lines = fs.readFileSync(this.auditPath, 'utf8').trim().split('\n');
    return lines.slice(-count).map(l => JSON.parse(l));
  }
}

module.exports = AutoRunner;
