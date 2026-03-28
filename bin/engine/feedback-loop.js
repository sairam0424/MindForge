/**
 * MindForge — WaveFeedbackLoop (Pillar VI: Proactive Equilibrium)
 * Monitors divergence during wave execution and triggers self-healing.
 */

class WaveFeedbackLoop {
  constructor(config = {}) {
    this.failureThreshold = config.failureThreshold || 0.20; // 20% failure rate
    this.divergenceWeight = config.divergenceWeight || 1.5; // Bias for rapid divergence
    this.waveState = {
      completed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
    };
  }

  /**
   * Updates the feedback loop with a task result.
   */
  update(result) {
    this.waveState.total++;
    if (result.status === 'completed') {
      this.waveState.completed++;
    } else if (result.status === 'failed') {
      this.waveState.failed++;
    } else {
      this.waveState.skipped++;
    }
  }

  /**
   * Calculates the current divergence rate.
   * @returns {number} - 0.0 to 1.0 divergence rate.
   */
  calculateDivergence() {
    if (this.waveState.total === 0) return 0;
    const failureRate = this.waveState.failed / this.waveState.total;
    const skippedRate = this.waveState.skipped / this.waveState.total;
    
    // Divergence includes failures and unexpected skips
    return (failureRate + (skippedRate * 0.5));
  }

  /**
   * Determines if the wave is "Diverging" and needs autonomous recovery.
   * @returns {Object} - Result (shouldPause, reason)
   */
  shouldTriggerHindsight() {
    const divergence = this.calculateDivergence();
    const minSample = 5; // Start checking after 5 tasks to avoid noise

    if (this.waveState.total < minSample) return { shouldPause: false };

    if (divergence >= this.failureThreshold) {
      return {
        shouldPause: true,
        divergence: divergence.toFixed(2),
        reason: `Wave Divergence reached critical threshold (${(divergence * 100).toFixed(0)}%). Triggering Temporal Hindsight for RCA and repair.`,
      };
    }

    return { shouldPause: false };
  }

  reset() {
    this.waveState = { completed: 0, failed: 0, skipped: 0, total: 0 };
  }
}

module.exports = WaveFeedbackLoop;
