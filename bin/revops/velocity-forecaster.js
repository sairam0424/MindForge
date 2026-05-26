/**
 * MindForge v5.10.0 — AgRevOps Velocity Forecaster
 * Predicts milestone completion ETA based on historical velocity.
 */
'use strict';

const fs = require('fs');
const path = require('path');

class VelocityForecaster {
  constructor() {
    this.auditPath = path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
  }

  /**
   * Predict completion ETA for remaining tasks.
   * @param {Object} metrics - From MetricsAggregator
   */
  predict(metrics) {
    const completedTasks = metrics.auditEntries?.filter(e => e.event === 'task_completed') || [];
    if (completedTasks.length < 2) {
      return { 
        avg_seconds_per_task: 0, 
        tasks_remaining: metrics.tasks_total - metrics.tasks_completed, 
        eta: 'Inconclusive (Not enough data)' 
      };
    }

    // Sort by timestamp
    const sorted = [...completedTasks].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Calculate historical duration between tasks
    let totalSeconds = 0;
    for (let i = 1; i < sorted.length; i++) {
        const delta = (new Date(sorted[i].timestamp) - new Date(sorted[i - 1].timestamp)) / 1000;
        // ignore outliers (gaps longer than 1 hour)
        if (delta < 3600) {
            totalSeconds += delta;
        }
    }

    const avgSeconds = totalSeconds / (sorted.length - 1) || 0;
    const remainingTasks = Math.max(0, metrics.tasks_total - metrics.tasks_completed);
    const etaSeconds = avgSeconds * remainingTasks;

    const etaDate = new Date(Date.now() + (etaSeconds * 1000));

    return {
      avg_seconds_per_task: parseFloat(avgSeconds.toFixed(1)),
      tasks_completed: metrics.tasks_completed,
      tasks_remaining: remainingTasks,
      eta: remainingTasks > 0 ? etaDate.toLocaleString() : 'Done',
      confidence: completedTasks.length > 5 ? 'High (85%)' : 'Medium (60%)',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new VelocityForecaster();
