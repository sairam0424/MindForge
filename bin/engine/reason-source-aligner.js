/**
 * MindForge v6.5.0 — Reason-Source Alignment (RSA)
 * Component: Reason Source Aligner (Pillar XII)
 * 
 * Ensures mission fidelity by cross-referencing reasoning thoughts 
 * with the Requirements Registry ([REQ-ID]).
 */
'use strict';

const fs = require('fs');
const path = require('path');

class ReasonSourceAligner {
  constructor(reqPath = '.planning/REQUIREMENTS.md') {
    this.requirementsPath = path.resolve(process.cwd(), reqPath);
    this.registry = [];
    this.ALIGNMENT_THRESHOLD = 0.60; // Mission fidelity floor
    this.initialized = false;
  }

  /**
   * Initializes the aligner by parsing the REQUIREMENTS.md file.
   */
  async init() {
    if (this.initialized) return;
    
    try {
      if (!fs.existsSync(this.requirementsPath)) {
        console.warn(`[RSA] Requirements file not found at ${this.requirementsPath}`);
        return;
      }

      const content = fs.readFileSync(this.requirementsPath, 'utf8');
      this.registry = this._parseRequirements(content);
      this.initialized = true;
      console.log(`[RSA] Loaded ${this.registry.length} requirements into registry.`);
    } catch (err) {
      console.error('[RSA] Initialization failed:', err);
    }
  }

  /**
   * Checks if a thought aligns with any requirement.
   * @param {string} thought - The reasoning thought to check.
   * @returns {Object} - Alignment results.
   */
  checkAlignment(thought) {
    if (!this.initialized) return { score: 1.0, reason: 'uninitialized' }; // Fail-safe stable

    const alignmentScores = this.registry.map(req => {
      const score = this._calculateSimilarity(thought, req.summary + ' ' + req.description);
      return { id: req.id, score };
    });

    const bestMatch = alignmentScores.sort((a, b) => b.score - a.score)[0];

    return {
      is_aligned: bestMatch ? bestMatch.score > 0.25 : false, // Sparse mapping allowed
      best_match_id: bestMatch ? bestMatch.id : null,
      confidence: bestMatch ? parseFloat(bestMatch.score.toFixed(4)) : 0,
    };
  }

  /**
   * Parses Markdown requirements into JSON structure.
   */
  _parseRequirements(markdown) {
    const registry = [];
    // v6.5.0 Hardened: Handles optional blank lines between header and body
    const regex = /## \[([\w-]+)\] (.*?)\n\n?([\s\S]*?)(?=\n+## |$)/g;
    let match;

    while ((match = regex.exec(markdown)) !== null) {
      registry.push({
        id: match[1],
        summary: match[2].trim(),
        description: match[3].trim()
      });
    }

    return registry;
  }

  /**
   * Similarity Heuristic (Keyword-based overlap)
   */
  _calculateSimilarity(a, b) {
    const getTokens = (str) => new Set(str.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 3));
    const tokensA = getTokens(a);
    const tokensB = getTokens(b);
    
    if (tokensA.size === 0 || tokensB.size === 0) return 0;
    
    const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
    const union = new Set([...tokensA, ...tokensB]);
    
    return intersection.size / tokensA.size; // Weighted by thought coverage
  }

  /**
   * Retrieves the full details of a specific requirement by ID.
   * Useful for v6.6.0 SCS self-healing synthesis.
   * @param {string} reqId 
   */
  getRequirementDetails(reqId) {
    if (!this.initialized) return null;
    return this.registry.find(req => req.id === reqId) || null;
  }
}

module.exports = new ReasonSourceAligner();
