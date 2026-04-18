/**
 * MindForge v9.0.0 — Adversarial SRE Debate (Pillar XXII)
 * Specialized three-way consensus for high-stakes remediation.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const ModelClient = require('../models/model-client');
const crypto = require('node:crypto');

class AdversarialSRE {
  constructor(options = {}) {
    this.sessionId = options.sessionId || 'sre-session';
  }

  /**
   * Runs the SRE debate loop for a specific incident.
   * @param {Object} incident - The incident details from Sentinel
   * @param {string} mirrorPath - Path to the Shadow Mirror environment
   */
  async runDebate(incident, mirrorPath) {
    console.log(`⚖️ SRE DEBATE: Starting consensus loop for ${incident.incident_type}...`);

    // 1. Proposer (SRE Engineer) - Tier 2
    console.log('  [1/3] SRE Engineer proposing fix...');
    const proposerResult = await ModelClient.complete({
      persona: 'sre-engineer',
      tier: 2,
      systemPrompt: `You are the SRE Proposer. An incident of type ${incident.incident_type} was detected.
Incident Details: ${JSON.stringify(incident.details)}
Propose a surgical remediation plan that minimizes downtime and avoids regressions.
Include an [SRE_PLAN] block with specific file mutations.`,
      userMessage: `Environment: ${mirrorPath}\nIncident: ${incident.remediation_id}`,
      taskName: `sre-proposal-${incident.remediation_id}`
    });
    const proposal = proposerResult.content;

    // 2. Hunter (Chaos/Regression Agent) - Tier 2
    console.log('  [2/3] Chaos Hunter identifying regressions...');
    const hunterResult = await ModelClient.complete({
      persona: 'qa-engineer',
      tier: 2,
      systemPrompt: `You are the SRE Chaos Hunter. Your goal is to find ways the proposed fix could break production.
Check for resource leaks, performance hits, or new security vulnerabilities introduced by the fix.
Include an [SRE_CRITIQUE] block with at least 2 critical concerns.`,
      userMessage: `Proposed Fix:\n${proposal}`,
      taskName: `sre-chaos-${incident.remediation_id}`
    });
    const critique = hunterResult.content;

    // 3. Auditor (Specialist SRE Auditor) - Tier 3 (Opus Locked)
    console.log('  [3/3] SRE Auditor (Opus) rendering final verdict...');
    const auditorResult = await ModelClient.complete({
      persona: 'sre-auditor',
      tier: 3, // Force tier 3 for Opus binding
      systemPrompt: `You are the High-Intelligence SRE Auditor (Opus-class). 
You must analyze the struggle between the Proposer and the Hunter.
Your goal is to ensure "Deterministic Reliability."
Render a final [VERDICT]: APPROVED | REJECTED | AMENDED.
If AMENDED, provide the final corrected logic.`,
      userMessage: `Incident: ${incident.incident_type}\n\nPROPOSAL:\n${proposal}\n\nCRITIQUE:\n${critique}`,
      taskName: `sre-audit-${incident.remediation_id}`
    });
    const finalVerdict = auditorResult.content;

    // Record the decision
    const decisionId = crypto.randomBytes(4).toString('hex');
    const decisionPath = path.join(process.cwd(), '.planning', 'decisions', `SRE-${decisionId}.md`);
    
    const record = `
# SRE Decision Trace — ${decisionId}
- **Incident**: ${incident.incident_type}
- **Timestamp**: ${new Date().toISOString()}
- **Mirror**: ${mirrorPath}

## Proposer Logic
${proposal}

## Chaos Critique
${critique}

## Final Auditor Verdict (Opus)
${finalVerdict}
`;

    if (!fs.existsSync(path.dirname(decisionPath))) {
      fs.mkdirSync(path.dirname(decisionPath), { recursive: true });
    }
    fs.writeFileSync(decisionPath, record);

    console.log(`✅ SRE Debate Complete. Verdict: ${this.parseVerdict(finalVerdict)}`);
    return {
      decision_id: decisionId,
      verdict: this.parseVerdict(finalVerdict),
      trace_path: decisionPath,
      final_logic: finalVerdict
    };
  }

  parseVerdict(text) {
    if (text.includes('[VERDICT]: APPROVED')) return 'APPROVED';
    if (text.includes('[VERDICT]: REJECTED')) return 'REJECTED';
    if (text.includes('[VERDICT]: AMENDED')) return 'AMENDED';
    return 'UNKNOWN';
  }
}

module.exports = AdversarialSRE;
