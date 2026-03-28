/**
 * MindForge v5 — Agentic Policy Orchestrator (APO) Engine
 * Evaluates agent intents against organizational security policies.
 */
'use strict';

const fs   = require('node:fs');
const path = require('node:path');

class PolicyEngine {
  constructor(config = {}) {
    this.policiesDir = config.policiesDir || path.join(__dirname, 'policies');
    this.ensurePoliciesDir();
  }

  ensurePoliciesDir() {
    if (!fs.existsSync(this.policiesDir)) {
      fs.mkdirSync(this.policiesDir, { recursive: true });
    }
  }

  /**
   * Evaluates an agent's intent against all active policies.
   * @param {Object} intent - The intent to evaluate.
   * @param {string} intent.did - Source agent DID.
   * @param {string} intent.action - Action type (e.g. 'write_file', 'delete_file').
   * @param {string} intent.resource - Target resource (e.g. file path).
   * @param {number} intent.tier - Agent trust tier.
   * @returns {Object} - { verdict: 'PERMIT' | 'DENY', reason: string, requestId: string }
   */
  evaluate(intent) {
    const requestId = `pol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    console.log(`[APO-EVAL] [${requestId}] Evaluating intent: ${intent.action} on ${intent.resource} by ${intent.did}`);

    const policies = this.loadPolicies();
    
    // Default Deny if no policies found
    if (policies.length === 0) {
      return { verdict: 'DENY', reason: 'No organizational policies defined (Default Deny)', requestId };
    }

    // 1. Check for explicit DENY rules first
    for (const policy of policies) {
      if (policy.effect === 'DENY' && this.matches(policy, intent)) {
        return { verdict: 'DENY', reason: `Violation: ${policy.description || policy.id}`, requestId };
      }
    }

    // 2. Check for explicit PERMIT rules
    for (const policy of policies) {
      if (policy.effect === 'PERMIT' && this.matches(policy, intent)) {
        return { verdict: 'PERMIT', reason: `Authorized by ${policy.id}`, requestId };
      }
    }

    return { verdict: 'DENY', reason: 'No matching PERMIT policy found (Implicit Deny)', requestId };
  }

  loadPolicies() {
    if (!fs.existsSync(this.policiesDir)) return [];
    
    return fs.readdirSync(this.policiesDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const content = fs.readFileSync(path.join(this.policiesDir, f), 'utf8');
          return JSON.parse(content);
        } catch (err) {
          console.error(`[APO-ERROR] Failed to parse policy ${f}:`, err.message);
          return null;
        }
      })
      .filter(Boolean);
  }

  /**
   * Simple rule matcher (simulated OPA/Rego logic).
   */
  matches(policy, intent) {
    const { conditions } = policy;
    if (!conditions) return true;

    // Check DID match (supports wildcards)
    if (conditions.did && !this.globMatch(conditions.did, intent.did)) return false;

    // Check Action match
    if (conditions.action && !this.globMatch(conditions.action, intent.action)) return false;

    // Check Resource match
    if (conditions.resource && !this.globMatch(conditions.resource, intent.resource)) return false;

    // Check Tier match
    if (conditions.min_tier && intent.tier < conditions.min_tier) return false;

    return true;
  }

  globMatch(pattern, text) {
    if (pattern === '*') return true;
    if (pattern === text) return true;
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(text);
  }
}

module.exports = PolicyEngine;
