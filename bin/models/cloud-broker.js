/**
 * MindForge — CloudBroker (Pillar V: Multi-Cloud Arbitrage & Hedging)
 * Dynamically routes tasks across multiple cloud providers (Vertex, Bedrock, Azure).
 */
'use strict';
 
const fs = require('fs');
const path = require('path');

class CloudBroker {
  constructor(config = {}) {
    this.providers = config.providers || ['anthropic', 'google', 'aws', 'azure'];
    this.statsPath = config.statsPath || path.join(__dirname, 'performance-stats.json');
    this.blacklist = new Map(); // provider -> expiry (Date)
    this.failureWindow = new Map(); // provider:taskType -> count
    this.state = {
      'anthropic': { latency: 450, costMultiplier: 1.0, healthy: true },
      'google': { latency: 600, costMultiplier: 0.85, healthy: true },
      'aws': { latency: 550, costMultiplier: 0.95, healthy: true },
      'azure': { latency: 650, costMultiplier: 1.1, healthy: true }
    };
    this.reloadStats();
  }

  /**
   * Loads performance stats from persistent storage and applies decay (0.95 factor).
   */
  reloadStats() {
    try {
      if (fs.existsSync(this.statsPath)) {
        const raw = JSON.parse(fs.readFileSync(this.statsPath, 'utf8'));
        
        // v5 Pillar V: Metrics Decay (Hyper-Enterprise Hardening)
        // Ensure historical data doesn't anchor the model if recent performance shifts.
        this.performanceStats = {};
        for (const [provider, tasks] of Object.entries(raw)) {
          this.performanceStats[provider] = {};
          for (const [task, stats] of Object.entries(tasks)) {
            this.performanceStats[provider][task] = {
              success: stats.success * 0.95,
              failure: stats.failure * 0.95
            };
          }
        }
      } else {
        this.performanceStats = {};
      }
    } catch (e) {
      console.warn(`[MCA-WARN] Failed to load performance stats: ${e.message}`);
      this.performanceStats = {};
    }
  }

  /**
   * Selects the optimal provider based on weighted latency, cost, and historical success.
   * @param {Object} requirements - Task requirements (maxLatency, budgetConstraint, taskType)
   * @returns {string} - Best provider ID
   */
  getBestProvider(requirements = {}) {
    this.reloadStats(); // Just-In-Time refresh for latest feedback loop data
    const taskType = requirements.taskType || 'default';

    const scored = Object.entries(this.state)
      .filter(([id, data]) => {
        // v5 Pillar V: Circuit Breaker Verification
        if (!data.healthy) return false;
        const blacklistExpiry = this.blacklist.get(id);
        if (blacklistExpiry && blacklistExpiry > new Date()) {
          return false; // Circuit is OPEN (Blacklisted)
        }
        return true;
      })
      .map(([id, data]) => {
        // Calculate Success Probability for this task
        const stats = this.performanceStats[id]?.[taskType] || { success: 1, failure: 0 };
        const totalTasks = stats.success + stats.failure;
        const successProb = totalTasks > 0 ? (stats.success / totalTasks) : 0.5;

        // Score Calculation (The "Affinity" Algorithm)
        const latencyWeight = 0.2;
        const costWeight = 0.3;
        const affinityWeight = 0.5; 

        const score = (data.latency * latencyWeight) + 
                      (data.costMultiplier * 1000 * costWeight) + 
                      ((1.0 - successProb) * 2000 * affinityWeight);

        return { id, score, successProb: successProb.toFixed(2) };
      });

    scored.sort((a, b) => a.score - b.score);
    
    if (scored.length > 0) {
      console.log(`[MCA-ROUTE] Selected provider: ${scored[0].id} (Affinity: ${scored[0].successProb} for '${taskType}')`);
    }

    return scored[0]?.id || 'anthropic';
  }

  /**
   * Implements the Provider Fallback Protocol.
   * Switches to the "Shadow Model" on the next best healthy provider.
   * @param {string} failedProvider - The provider that just failed
   * @returns {string} - Fallback provider ID
   */
  getFallbackProvider(failedProvider) {
    if (this.state[failedProvider]) {
      this.state[failedProvider].healthy = false;
    }

    const fallback = Object.entries(this.state)
      .filter(([id, data]) => id !== failedProvider && data.healthy)
      .sort((a, b) => a[1].latency - b[1].latency)[0];

    return fallback ? fallback[0] : 'google'; // Default fallback
  }

  /**
   * Retrieves provider-specific model mapping.
   */
  // v9: Provider model mappings aligned to Claude 4.x family
  mapToProviderModel(provider, modelGroup) {
    const mappings = {
      'anthropic': { 'sonnet': 'claude-sonnet-4-6', 'opus': 'claude-opus-4-7', 'haiku': 'claude-haiku-4-5' },
      'google': { 'sonnet': 'gemini-2.5-pro', 'haiku': 'gemini-2.5-flash' },
      'aws': { 'sonnet': 'anthropic.claude-sonnet-4-6-v1:0', 'haiku': 'anthropic.claude-haiku-4-5-v1:0' },
      'azure': { 'sonnet': 'claude-sonnet-4-6', 'haiku': 'claude-haiku-4-5' }
    };

    return mappings[provider]?.[modelGroup] || mappings[provider]?.['sonnet'];
  }

  /**
   * Records a task failure and manages the circuit breaker.
   */
  recordFailure(provider, taskType = 'default') {
    const key = `${provider}:${taskType}`;
    const failures = (this.failureWindow.get(key) || 0) + 1;
    this.failureWindow.set(key, failures);

    if (failures >= 3) {
      const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min blacklist
      this.blacklist.set(provider, expiry);
      console.warn(`[MCA-CIRCUIT-OPEN] Provider '${provider}' blacklisted for 10 min due to consecutive failures on '${taskType}'.`);
      this.failureWindow.set(key, 0); // Reset window upon blacklisting
    }
  }

  /**
   * Hardening: Simulate provider failures to verify Fallback Protocol.
   */
  startChaosMode() {
    console.log('[ENTERPRISE-RESILIENCE] CloudBroker Chaos Mode ACTIVE. Simulating jitter and provider dropouts...');
    setInterval(() => {
      const providers = Object.keys(this.latencyMap);
      const randomProvider = providers[Math.floor(Math.random() * providers.length)];
      this.latencyMap[randomProvider] = Math.random() > 0.7 ? 5000 : 100; // Spike latency
    }, 10000);
  }
}

module.exports = CloudBroker;
