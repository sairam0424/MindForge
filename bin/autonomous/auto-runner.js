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
const KnowledgeCapture = require('../memory/knowledge-capture');

class AutoRunner {
  constructor(options = {}) {
    this.phase = options.phase;
    this.isHeadless = options.headless || false;
    this.auditPath = path.join(process.cwd(), '.planning/AUDIT.jsonl');
    this.statePath = path.join(process.cwd(), '.planning/auto-state.json');
    this.monitor = new stuckMonitor(this.auditPath);
    this.isPaused = false;
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
      await this.executeWave();
    }

    this.complete();
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

  complete() {
    console.log('✅ Phase complete!');
    const report = progressStream.generateReport(this.auditPath, this.phase);
    fs.writeFileSync(path.join(process.cwd(), `.planning/phases/${this.phase}/AUTONOMOUS-REPORT.md`), report);
    
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
    if (!event.timestamp) event.timestamp = new Date().toISOString();
    fs.appendFileSync(this.auditPath, JSON.stringify(event) + '\n');
    const result = this.monitor.analyze(event);
    if (result) this.handleStuck(result);
  }

  handleStuck(result) {
    console.error(`🛑 STUCK PATTERN DETECTED: ${result.pattern} - ${result.message}`);
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
}

module.exports = AutoRunner;
