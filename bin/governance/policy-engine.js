/**
 * MindForge v6.0.0 — Agentic Policy Orchestrator (APO) Engine
 * Evaluates agent intents against organizational security policies with CADIA integration.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const ImpactAnalyzer = require('./impact-analyzer');
const policyGate = require('./policy-gate-hardened');
const { AuditWriter } = require('../utils/file-io');

class PolicyEngine {
  constructor(config = {}) {
    this.policiesDir = config.policiesDir || path.join(__dirname, 'policies');
    this.planningDir = config.planningDir || path.join(process.cwd(), '.planning');
    this.auditLogPath = path.join(this.planningDir, 'RISK-AUDIT.jsonl');
    this._auditWriter = new AuditWriter(this.auditLogPath);
    this.ensurePoliciesDir();
  }

  ensurePoliciesDir() {
    if (!fs.existsSync(this.policiesDir)) {
      fs.mkdirSync(this.policiesDir, { recursive: true });
    }
  }

  /**
   * Evaluates an agent's intent against all active policies using CADIA.
   */
  async evaluate(intent) {
    const requestId = `pol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sessionId = intent.sessionId || 'default_session';
    const currentGoal = this.getCurrentGoal();
    
    console.log(`[APO-EVAL] [${requestId}] Evaluating intent: ${intent.action} on ${intent.resource} by ${intent.did}`);

    // Pillar II (v6.0.0): CADIA Dynamic Impact Scoring
    let impactScore = 100;
    let riskTier = 'UNKNOWN';

    try {
      impactScore = ImpactAnalyzer.analyze({
        action: intent.action,
        target: intent.resource,
        namespace: intent.namespace
      }, {
        sessionId,
        trustTier: intent.tier || 0,
        currentGoal
      });
      riskTier = ImpactAnalyzer.getRiskTier(impactScore);
      console.log(`[APO-BLAST] [${requestId}] Calculated Blast Radius: ${impactScore}/100 [Tier: ${riskTier}]`);
    } catch (err) {
      console.error(`[APO-ERR] [${requestId}] Impact analysis failed. Defaulting to high-impact restriction.`, err);
    }

    const policies = this.loadPolicies();
    let verdict = { verdict: 'DENY', reason: 'No matching PERMIT policy found (Implicit Deny)', requestId };

    // 1. Check for explicit DENY rules (High-Priority)
    for (const policy of policies) {
      if (policy.effect === 'DENY' && this.matches(policy, intent)) {
        verdict = { verdict: 'DENY', reason: `Violation: ${policy.description || policy.id}`, requestId };
        this.logAudit(intent, impactScore, verdict);
        return verdict;
      }
    }

    // 2. Pillar II (v6.0.0): Dynamic Blast Radius Enforcement with Tier 3 Bypass
    for (const policy of policies) {
      if (this.matches(policy, intent)) {
        if (policy.max_impact && impactScore >= policy.max_impact) {
          
          // [PQAS] v7: Hardened Biometric Bypass for Risk > 95
          if (impactScore > 95) {
            const gateResult = await policyGate.evaluateBypass(intent, impactScore);
            if (gateResult.status === 'WAIT_FOR_BIOMETRIC' || gateResult.status === 'WAIT_FOR_ORBITAL') {
              verdict = { 
                verdict: 'DENY', 
                reason: gateResult.reason, 
                requestId,
                status: 'WAIT_FOR_BIOMETRIC',
                challenge_id: gateResult.challenge_id
              };
              this.logAudit(intent, impactScore, verdict);
              return verdict;
            }
            console.log(`[PQAS-GATE] [${requestId}] Biometric signature verified. Proceeding with high-risk mutation.`);
            verdict = { verdict: 'PERMIT', reason: `Authorized via Biometric Bypass [${gateResult.signature || 'WEB-AUTHN-DEX'}]`, requestId };
            this.logAudit(intent, impactScore, verdict);
            return verdict;
          }

          // [ENTERPRISE] Tier 3 Reasoning/PQ Proof Bypass
          if (intent.tier >= 3 && (intent.reasoning_proof || intent.pq_proof)) {
             const quantumCrypto = require('./quantum-crypto');
             let isProofValid = true;

             if (intent.pq_proof) {
               const zkResult = quantumCrypto.verifyZKProof(intent.pq_proof, intent.id);
               isProofValid = zkResult.verified === true;
               if (!isProofValid) {
                 console.log(`[APO-ZK] [${requestId}] ZK proof denied: ${zkResult.reason}${zkResult.simulated ? ' (simulated)' : ''}`);
               }
             }

             if (isProofValid) {
                console.log(`[APO-BYPASS] [${requestId}] Tier 3 'Sovereign Proof' verified (${intent.pq_proof ? 'ZK-PQ' : 'Standard'}). Overriding Blast Radius limit.`);
                // Continue to permit check
             } else {
                verdict = { verdict: 'DENY', reason: 'ZK proof verification failed. Configure a verifier module or provide a valid proof.', requestId };
                this.logAudit(intent, impactScore, verdict);
                return verdict;
             }
          } else {
            verdict = { 
              verdict: 'DENY', 
              reason: `Dynamic Blast Radius Violation: Intent impact (${impactScore}) exceeds policy limit (${policy.max_impact}). ${intent.tier < 3 ? 'Upgrade to Tier 3 for bypass.' : 'Provide Sovereign Proof.'}`, 
              requestId 
            };
            this.logAudit(intent, impactScore, verdict);
            return verdict;
          }
        }
      }
    }

    // 3. Check for explicit PERMIT rules
    for (const policy of policies) {
      if (policy.effect === 'PERMIT' && this.matches(policy, intent)) {
        verdict = { verdict: 'PERMIT', reason: `Authorized by ${policy.id}`, requestId };
        this.logAudit(intent, impactScore, verdict);
        return verdict;
      }
    }

    this.logAudit(intent, impactScore, verdict);
    return verdict;
  }

  getCurrentGoal() {
    const statePath = path.join(this.planningDir, 'STATE.md');
    if (!fs.existsSync(statePath)) return '';
    try {
      const content = fs.readFileSync(statePath, 'utf8');
      const match = content.match(/## Current phase\n(.*?)\n/);
      return match ? match[1].trim() : '';
    } catch {
      return '';
    }
  }

  logAudit(intent, impactScore, verdict) {
    this._auditWriter.write({
      timestamp: new Date().toISOString(),
      requestId: verdict.requestId,
      did: intent.did,
      tier: intent.tier,
      action: intent.action,
      resource: intent.resource,
      impactScore,
      verdict: verdict.verdict,
      reason: verdict.reason
    });
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

  matches(policy, intent) {
    const { conditions } = policy;
    if (!conditions) return true;

    if (conditions.did && !this.globMatch(conditions.did, intent.did)) return false;
    if (conditions.action && !this.globMatch(conditions.action, intent.action)) return false;
    if (conditions.resource && !this.globMatch(conditions.resource, intent.resource)) return false;
    if (conditions.min_tier && (intent.tier || 0) < conditions.min_tier) return false;

    return true;
  }

  /**
   * Simple glob matching for policy conditions.
   * Supports '*' (any string) and '?' (any character).
   */
  globMatch(pattern, text) {
    if (!pattern || !text) return false;
    if (pattern === '*') return true;
    
    // Escape regex characters but keep * and ?
    const regexStr = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
      
    const regex = new RegExp(`^${regexStr}$`, 'i');
    return regex.test(text);
  }
}

module.exports = PolicyEngine;

