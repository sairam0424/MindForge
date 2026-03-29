/**
 * MindForge v5.10.0 — AgRevOps ROI Engine
 * Calculates $ Value Saved vs $ Token Cost.
 */
'use strict';

const fs = require('fs');
const path = require('path');

class ROIEngine {
  constructor() {
    this.hourlyRate = 100; // Average Enterprise Dev Hourly Rate (USD)
    this.taskValues = {
      'refactor': 1.5, // 1.5 hours saved
      'test': 0.75,   // 0.75 hours saved
      'architect': 4.0, // 4 hours saved
      'default': 0.5   // 0.5 hours saved
    };
  }

  /**
   * Calculate ROI from current session metrics.
   * @param {Object} metrics - From MetricsAggregator
   */
  calculate(metrics) {
    const tokenCost = metrics.costs?.reduce((sum, c) => sum + (c.cost || 0), 0) || 0;
    
    // map successful tasks to dev hours
    const tasks = metrics.auditEntries?.filter(e => e.event === 'task_completed') || [];
    let hoursSaved = 0;

    tasks.forEach(t => {
      const type = this.detectTaskType(t.message || t.task || '');
      hoursSaved += this.taskValues[type] || this.taskValues.default;
    });

    const grossValue = hoursSaved * this.hourlyRate;
    const netValue   = grossValue - tokenCost;
    const roi        = tokenCost > 0 ? (netValue / tokenCost) * 100 : 0;

    return {
      token_cost: parseFloat(tokenCost.toFixed(4)),
      hours_saved: parseFloat(hoursSaved.toFixed(2)),
      gross_value: parseFloat(grossValue.toFixed(2)),
      net_value: parseFloat(netValue.toFixed(2)),
      roi_percentage: parseFloat(roi.toFixed(1)),
      currency: 'USD'
    };
  }

  detectTaskType(msg) {
    const m = msg.toLowerCase();
    if (m.includes('refactor')) return 'refactor';
    if (m.includes('test') || m.includes('verify')) return 'test';
    if (m.includes('architect') || m.includes('design') || m.includes('pillar')) return 'architect';
    return 'default';
  }
}

module.exports = new ROIEngine();
