/**
 * MindForge — TemporalHindsight (Pillar VI: Proactive Equilibrium)
 * Performs automated RCA and generates repair plans for diverging waves.
 */

const fs = require('fs');
const path = require('path');

class TemporalHindsight {
  constructor(config = {}) {
    this.projectRoot = config.projectRoot || process.cwd();
    this.historyLimit = config.historyLimit || 10; // Analyze last 10 failed tasks
  }

  /**
   * Performs Root Cause Analysis (RCA) on a failed wave.
   * @param {Object} waveReport - Current wave results (failed tasks, logs)
   * @returns {Object} - Diagnosis and Repair Plan
   */
  async analyze(waveReport) {
    const { failedTasks, divergence, phase } = waveReport;
    const diagnosis = this.diagnoseFailures(failedTasks);
    
    return {
      timestamp: new Date().toISOString(),
      phase,
      divergence,
      diagnosis,
      repairPlan: this.generateRepairPlan(diagnosis, phase),
    };
  }

  /**
   * Diagnoses common failure patterns in agentic workloads.
   */
  diagnoseFailures(tasks) {
    const errorMessages = tasks.map(t => t.error || '').join(' ').toLowerCase();
    
    if (errorMessages.includes('permission denied') || errorMessages.includes('eacces')) {
      return { type: 'ENVIRONMENTAL', cause: 'File system permission issues detected in multiple tasks.', severity: 'CRITICAL' };
    }
    
    if (errorMessages.includes('timeout') || errorMessages.includes('deadline exceeded')) {
      return { type: 'RESOURCE', cause: 'Wave execution timeout. Tasks are too large or the model response is slow.', severity: 'HIGH' };
    }
    
    if (errorMessages.includes('lint') || errorMessages.includes('syntax error')) {
      return { type: 'LOGIC', cause: 'Cumulative coding errors. The existing plan is producing invalid syntax consistently.', severity: 'STRICT' };
    }

    return { type: 'UNKNOWN', cause: 'Generic wave divergence. Multiple unrelated failures detected.', severity: 'MEDIUM' };
  }

  /**
   * Generates a "Self-Healing" Plan.md entry.
   */
  generateRepairPlan(diagnosis, phase) {
    const steps = [];
    
    switch (diagnosis.type) {
      case 'ENVIRONMENTAL':
        steps.push('PAUSE execution immediately.');
        steps.push('Run `chmod -R u+w .` (simulated) on the affected directories.');
        steps.push('Re-verify task 0.1 before resuming the wave.');
        break;
      case 'RESOURCE':
        steps.push('PAUSE execution and increase `taskTimeoutMs` by 50%.');
        steps.push('Request `EXECUTOR_MODEL` upgrade to `claude-3-opus` for complex tasks.');
        steps.push('Serialise the next wave (concurrency = 1) to reduce resource contention.');
        break;
      case 'LOGIC':
        steps.push('STOP active wave.');
        steps.push('Rewrite Sub-tasks in PLAN.md for Phase ' + phase + ' with stricter TDD requirements.');
        steps.push('Inject `Quality-Auditor` persona into the review loop.');
        break;
      default:
        steps.push('PAUSE and request human review for divergence RCA.');
    }
    
    return {
      title: `AUTONOMOUS REPAIR PLAN: PHASE ${phase}`,
      steps,
      autoApplyStatus: 'PENDING_SIGNATURE',
    };
  }

  /**
   * v5 Pillar III: Proactive Loop Recovery
   * Generates a "Steering Vector" to break agentic Reasoning Stagnation.
   */
  handleProactiveRecovery(traceId, entropyScore) {
    console.log(`[TemporalHindsight] Proactive Recovery triggered for trace ${traceId} (Entropy: ${entropyScore})`);
    
    const steeringVectors = [
      "CRITICAL: Stagnation detected. You have repeated similar reasoning steps 3 times. STOP your current approach and decompose the problem into smaller, independent sub-tasks.",
      "STATIONARY LOOP: Your recent thoughts show high similarity. Change your technical layer—if you were editing code, try running a diagnostic command instead.",
      "REASONING DEADLOCK: Entropy too low. Request human intervention or switch to the 'Architect' persona to re-evaluate the plan.",
      "DIVERGENCE ALERT: Proactive reset. Clear your context window of the last 3 reasoning steps and start fresh from the last successful checkpoint."
    ];

    // Pick a vector based on entropy severity
    const index = Math.min(Math.floor(entropyScore * steeringVectors.length), steeringVectors.length - 1);
    
    return {
      timestamp: new Date().toISOString(),
      trace_id: traceId,
      event: 'STEERING_VECTOR_GENERATED',
      entropy: entropyScore,
      instruction: steeringVectors[index],
      action: 'INJECT_SYSTEM_PROMPT'
    };
  }
}

module.exports = TemporalHindsight;
