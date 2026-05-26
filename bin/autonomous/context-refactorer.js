/**
 * MindForge — Context Refactorer Engine (v5.0.0-PAR)
 * Monitors context density and triggers proactive summarization/refactoring.
 */
'use strict';

const fs = require('fs');
const path = require('path');

class ContextRefactorer {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.3; // Min density before refactor
    this.windowSize = options.windowSize || 20;
    this.history = [];
  }

  /**
   * Analyze the current context density.
   * Density = (Implementation Events) / (Total Events)
   */
  analyzeDensity(events) {
    this.history = events.slice(-this.windowSize);
    
    if (this.history.length < 5) return { density: 1.0, shouldRefactor: false };

    const implementationEvents = this.history.filter(h => 
      h.tool === 'run_command' || 
      h.tool === 'replace_file_content' || 
      h.tool === 'multi_replace_file_content' ||
      h.event === 'task_completed'
    );

    const totalEvents = this.history.length;
    const density = implementationEvents.length / totalEvents;

    return {
      density: parseFloat(density.toFixed(2)),
      shouldRefactor: density < this.threshold
    };
  }

  /**
   * Generates a "Context Refactor" recommendation.
   */
  generateRefactorPlan(events, phase) {
    const reasoningChain = events
      .filter(e => e.event === 'reasoning_trace')
      .map(e => `- ${e.thought}`)
      .join('\n');

    return {
      event: 'context_refactor_triggered',
      phase,
      message: 'Context density low. Initiating proactive refactoring.',
      action: 'SUMMARIZE_AND_RESET',
      payload: {
        summary_prompt: `The current reasoning chain has become dense (${this.threshold}). Summarize the progress for Phase ${phase} and reset the active context window.`,
        trace_sample: reasoningChain.slice(-500) // Last few thoughts for context
      }
    };
  }
}

module.exports = ContextRefactorer;
