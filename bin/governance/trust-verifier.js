/**
 * MindForge ZTAI Trust Verifier
 * v4.2.0-alpha.ztai
 */

const fs = require('fs');
const ztai = require('./ztai-manager');

class TrustVerifier {
  /**
   * Verifies a single audit entry.
   * @param {object} entry - The audit entry object
   * @returns {object} - { valid: boolean, error: string|null, tier: number }
   */
  verifyEntry(entry) {
    if (!entry.did || !entry.signature) {
      return { valid: false, error: 'Missing ZTAI identity (did/signature)', tier: 0 };
    }

    try {
      // Reconstruct payroll for verification (signature is stripped)
      const { signature, ...payloadObj } = entry;
      const payload = JSON.stringify(payloadObj);

      const isValid = ztai.verifySignature(entry.did, payload, signature);
      const agent = ztai.getAgent(entry.did);

      if (!isValid) {
        return { valid: false, error: 'Cryptographic signature mismatch', tier: agent ? agent.tier : 0 };
      }

      return { valid: true, error: null, tier: agent.tier };
    } catch (err) {
      return { valid: false, error: err.message, tier: 0 };
    }
  }

  /**
   * Validates a Tier 3 action requirement.
   * @param {string} did - Executing agent DID
   */
  isAuthorizedForTier3(did) {
    const agent = ztai.getAgent(did);
    return agent && agent.tier >= 3;
  }

  /**
   * Scans a file of JSONL audit entries for integrity.
   * @param {string} filePath 
   */
  async verifyAuditLog(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const results = {
      total: lines.length,
      valid: 0,
      invalid: 0,
      errors: []
    };

    for (const [index, line] of lines.entries()) {
      try {
        const entry = JSON.parse(line);
        const { valid, error } = this.verifyEntry(entry);
        if (valid) {
          results.valid++;
        } else {
          results.invalid++;
          results.errors.push(`Line ${index + 1}: ${error}`);
        }
      } catch (err) {
        results.invalid++;
        results.errors.push(`Line ${index + 1}: Invalid JSON`);
      }
    }

    return results;
  }
}

module.exports = new TrustVerifier();
