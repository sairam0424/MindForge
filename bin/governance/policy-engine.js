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
            // The gate looks up the attestation by `intent.requestId`, which this method never
            // set — it generated `requestId` as a local and passed the bare intent, so the lookup
            // always received undefined. Measured: orbital-guardian returns
            // {verified:false, reason:"missing requestId"}, so the attestation path could NEVER
            // approve, even immediately after a successful recordBypass(). The gate was stuck
            // closed, which is safe but means the whole hardware-attestation feature only ever
            // denied. tests/v8-orbital-governance.test.js passes an object that DOES carry
            // requestId, which is why the contract looked satisfied.
            //
            // A new object rather than a mutation: the caller's intent is not ours to modify.
            const gateResult = await policyGate.evaluateBypass({ ...intent, requestId }, impactScore);
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
            // Only claim an attestation when one was actually verified. evaluateBypass has TWO
            // non-WAIT returns, and they mean opposite things: an attestation verified in the
            // enclave (carries attestation_id), or "Impact within standard threshold" — which
            // states that no attestation was required. The old code logged "Biometric signature
            // verified" and recorded the audit reason "Authorized via Biometric Bypass
            // [WEB-AUTHN-DEX]" for BOTH, so the audit trail would assert a biometric verification
            // for an operation the gate had explicitly waved through unchecked. That is the audit
            // equivalent of a gate printing success without running.
            const attested = Boolean(gateResult.attestation_id);
            if (attested) {
              console.log(`[PQAS-GATE] [${requestId}] Hardware attestation ${gateResult.attestation_id} verified. Proceeding with high-risk mutation.`);
            } else {
              console.log(`[PQAS-GATE] [${requestId}] Gate returned ${gateResult.status} without an attestation: ${gateResult.reason}. NOT recording this as attested.`);
            }
            verdict = {
              verdict: 'PERMIT',
              reason: attested
                ? `Authorized via hardware attestation [${gateResult.attestation_id}]`
                : `Permitted without attestation: ${gateResult.reason || gateResult.status}`,
              requestId,
              attested,
            };
            this.logAudit(intent, impactScore, verdict);
            return verdict;
          }

          // [ENTERPRISE] Tier 3 Sovereign Proof Bypass (fail-closed).
          // A blast-radius override demands a CRYPTOGRAPHIC proof. Only a
          // pq_proof verified via verifyZKProof may authorize the bypass.
          // intent.reasoning_proof is free-form text validated nowhere, so it
          // MUST NOT, on its own, grant an override (UC-22 authz bypass fix).
          if (intent.tier >= 3 && (intent.reasoning_proof || intent.pq_proof)) {
             const quantumCrypto = require('./quantum-crypto');
             let isProofValid = false; // fail-closed: deny unless a real proof verifies

             if (intent.pq_proof) {
               const zkResult = quantumCrypto.verifyZKProof(intent.pq_proof, intent.id);
               isProofValid = zkResult.verified === true;
               if (!isProofValid) {
                 console.log(`[APO-ZK] [${requestId}] ZK proof denied: ${zkResult.reason}${zkResult.simulated ? ' (simulated)' : ''}`);
               }
             }

             if (isProofValid) {
                console.log(`[APO-BYPASS] [${requestId}] Tier 3 'Sovereign Proof' verified (ZK-PQ). Overriding Blast Radius limit.`);
                // Continue to permit check
             } else if (intent.pq_proof) {
                verdict = { verdict: 'DENY', reason: 'ZK proof verification failed. Configure a verifier module or provide a valid proof.', requestId };
                this.logAudit(intent, impactScore, verdict);
                return verdict;
             } else {
                // Only a reasoning_proof was supplied — not a cryptographic proof.
                verdict = {
                  verdict: 'DENY',
                  reason: 'reasoning_proof is not a cryptographic proof; provide a valid pq_proof / Sovereign Proof for blast-radius override.',
                  requestId
                };
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
    // LOCK-01: AuditWriter.write -> appendAuditEntrySync now takes a FAIL-CLOSED lock,
    // so this can reject under contention. It is intentionally not awaited (the verdict
    // path is synchronous), so catch here — otherwise the rejection escapes to a global
    // unhandledRejection handler and the lost audit record is invisible at this site.
    // The verdict is still returned: promoting an audit-write failure to an implicit
    // DENY is a behaviour change for v12, not a patch.
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
    }).catch(err => {
      console.error(`[APO-AUDIT-FAIL] [${verdict.requestId}] RISK-AUDIT append failed — decision NOT recorded: ${err.message}`);
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

