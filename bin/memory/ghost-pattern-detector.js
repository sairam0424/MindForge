/**
 * MindForge Ghost Pattern Detector
 * v4.2.5 — Proactive Risk Mitigation
 */

const semanticHub = require('./semantic-hub');
const fs = require('node:fs/promises');

class GhostPatternDetector {
  /**
   * Analyzes a newly proposed pattern against the global Ghost Hub.
   * @param {Object} proposedPattern - The architecture/pattern being proposed.
   * @returns {Promise<Array<Object>>} - List of detected risks.
   */
  async analyzeRisk(proposedPattern) {
    console.log(`[GHOST-DETECTOR] Analyzing proposed pattern: ${proposedPattern.id}`);

    // 1. Fetch ghost patterns from semantic hub
    const ghostPatterns = await semanticHub.getGhostPatterns();
    if (ghostPatterns.length === 0) return [];

    // 2. Fuzzy match or Tag overlap logic (Simulated)
    const risks = ghostPatterns.filter(ghost => {
      // Check for tag overlap
      const overlap = ghost.tags.filter(t => proposedPattern.tags.includes(t));
      
      // If there's an overlap and the ghost is tagged 'failure', trigger a risk.
      const isRisk = (overlap.length >= 2 || ghost.tags.includes('critical-fail'));
      if (isRisk) {
        console.warn(`[GHOST-DETECTOR] Found potential ghost match: ${ghost.id} (Tags: ${overlap.join(',')})`);
      }
      return isRisk;
    });

    return risks.map(r => ({
      ghostId: r.id,
      riskLevel: r.tags.includes('p0') ? 'CRITICAL' : 'HIGH',
      description: `Pattern similarity detected with past failure: ${r.failureContext || 'N/A'}`,
      mitigation: r.mitigationStrategy || 'Consult mf-reviewer for deep-audit.'
    }));
  }

  /**
   * Batch scan the local project for ghost patterns.
   */
  async fullScan() {
    const localPatterns = await this.loadLocalPatterns();
    const allRisks = [];

    for (const p of localPatterns) {
      const risks = await this.analyzeRisk(p);
      if (risks.length > 0) allRisks.push({ patternId: p.id, risks });
    }

    return allRisks;
  }

  async loadLocalPatterns() {
    const localFile = '.mindforge/memory/pattern-library.jsonl';
    try {
      const data = await fs.readFile(localFile, 'utf8');
      return data.split('\n').filter(Boolean).map(JSON.parse);
    } catch (e) {
      return [];
    }
  }
}

module.exports = new GhostPatternDetector();
