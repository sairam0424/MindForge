/**
 * MindForge v7 — Neural Drift Remediation (NDR)
 * Component: Logic Validator
 *
 * Performs high-level semantic validation on agent reasoning traces.
 *
 * Strategy: real-when-available, else honest heuristic.
 *   - By DEFAULT this validator uses a local Self-Reflective Heuristic
 *     (`_reflectiveHeuristic`). This is the standard path and runs everywhere,
 *     with no external dependency.
 *   - OPTIONALLY, if a local Ollama model is actually reachable at the
 *     configured endpoint, validation is upgraded to a real model call
 *     (`_modelValidation`). Reachability is determined by a real, fail-fast
 *     network probe — never a hardcoded flag. When Ollama is absent (the
 *     normal case) the probe fails fast and we fall back to the heuristic.
 *
 * The return shape is stable: { is_valid, confidence, critique, method }.
 * Consumers (nexus-tracer) read `is_valid` and `critique`.
 */
'use strict';

const configManager = require('../governance/config-manager');

// Fail-fast budget for the reachability probe and the model call. Ollama is
// usually absent, so this must time out quickly to avoid hanging CI/production.
const PROBE_TIMEOUT_MS = 400;
const MODEL_TIMEOUT_MS = 4000;

class LogicValidator {
  constructor() {
    this.endpoint = configManager.get('governance.local_model_endpoint', 'localhost:11434');
    this.model = configManager.get('governance.local_model_name', 'llama3');
    // Reflects reality: set by probeModel(), not hardcoded. Unknown until probed.
    this.isModelAvailable = false;
    this._probed = false;
  }

  /**
   * Normalises the configured endpoint into a base URL (adds scheme if absent).
   * @returns {string}
   */
  _baseUrl() {
    const ep = String(this.endpoint || 'localhost:11434').trim();
    return /^https?:\/\//i.test(ep) ? ep.replace(/\/+$/, '') : `http://${ep.replace(/\/+$/, '')}`;
  }

  /**
   * Resets cached probe state (used by tests to re-probe after changing endpoint).
   */
  resetProbe() {
    this._probed = false;
    this.isModelAvailable = false;
  }

  /**
   * Real, fail-fast reachability check for a local Ollama instance.
   * Performs a short GET to the Ollama tags endpoint. On ANY error or timeout
   * (the normal case when Ollama is absent) it resolves `false` — never throws,
   * never hangs. Sets `this.isModelAvailable` from the actual result.
   * @returns {Promise<boolean>}
   */
  async probeModel() {
    let reachable = false;
    try {
      const res = await fetch(`${this._baseUrl()}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS)
      });
      reachable = res.ok;
    } catch {
      // ECONNREFUSED / timeout / DNS / abort — Ollama not reachable. Stay quiet.
      reachable = false;
    }
    this.isModelAvailable = reachable;
    this._probed = true;
    return reachable;
  }

  /**
   * Validates a reasoning trace using the best available method.
   * Probes for a local model on first call (lazy); falls back to the heuristic
   * when unreachable.
   * @param {string} thought - The agent's thought string
   * @param {Object} context - Optional metadata (span attributes, etc.)
   */
  async validate(thought, context = {}) {
    const spanTag = context && context.span_id ? ` span=${context.span_id}` : '';
    console.log(`[LogicValidator] Validating trace segment (Length: ${thought.length})${spanTag}`);

    if (!this._probed) {
      await this.probeModel();
    }

    if (this.isModelAvailable) {
      try {
        return await this._modelValidation(thought);
      } catch {
        // Model became unreachable mid-flight — degrade honestly to heuristic.
        this.isModelAvailable = false;
        return this._reflectiveHeuristic(thought);
      }
    }
    return this._reflectiveHeuristic(thought);
  }

  /**
   * Real Local Model Validation via Ollama's /api/generate.
   * Asks the model whether the thought is logical and grounded, then derives a
   * real is_valid/confidence from the response — no fabricated fixed values.
   */
  async _modelValidation(thought) {
    const prompt =
      'You are a reasoning-trace auditor. Decide whether the following agent ' +
      'thought is logical and grounded (consistent, on-task, no self-contradiction).\n' +
      'Reply with ONLY a JSON object: {"valid": <true|false>, "confidence": <0..1>, ' +
      '"critique": "<short reason>"}.\n\n' +
      `Thought: """${thought}"""`;

    const res = await fetch(`${this._baseUrl()}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt, stream: false }),
      signal: AbortSignal.timeout(MODEL_TIMEOUT_MS)
    });

    if (!res.ok) {
      throw new Error(`Ollama responded ${res.status}`);
    }

    const payload = await res.json();
    const parsed = this._parseModelResponse(payload && payload.response);

    return {
      is_valid: parsed.valid,
      confidence: parsed.confidence,
      critique: parsed.critique,
      method: `ollama:${this.model}`
    };
  }

  /**
   * Robustly parses the model's textual response into a verdict. Falls back to
   * conservative defaults derived from the raw text when JSON is unavailable —
   * never invents a fixed high-confidence pass.
   * @param {string} raw
   */
  _parseModelResponse(raw) {
    const text = String(raw || '');
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const obj = JSON.parse(match[0]);
        const valid = obj.valid === true || obj.valid === 'true';
        let confidence = Number(obj.confidence);
        if (!Number.isFinite(confidence)) confidence = valid ? 0.6 : 0.4;
        confidence = Math.min(1, Math.max(0, confidence));
        const critique = typeof obj.critique === 'string' && obj.critique.trim()
          ? obj.critique.trim()
          : (valid ? 'Model judged the thought logical and grounded.'
                   : 'Model flagged the thought as illogical or ungrounded.');
        return { valid, confidence, critique };
      } catch {
        // fall through to text heuristic below
      }
    }

    // No parseable JSON: derive a conservative verdict from the raw text.
    const lowered = text.toLowerCase();
    const valid = !/(invalid|illogical|not\s+grounded|inconsistent|"valid"\s*:\s*false)/.test(lowered)
      && /(valid|logical|grounded|consistent)/.test(lowered);
    return {
      valid,
      confidence: valid ? 0.55 : 0.45,
      critique: 'Model response was unstructured; verdict derived from text.'
    };
  }

  /**
   * Local Self-Reflective Heuristic — the default validation path. More
   * intensive than the DriftDetector; uses self-doubt and goal-misalignment
   * markers. Honestly labelled as a heuristic (no model is involved here).
   */
  async _reflectiveHeuristic(thought) {
    const t = String(thought || '').toLowerCase();

    // Check for "Self-Doubt" markers that might indicate drift
    const doubtMarkers = ['i am not sure', 'maybe i should wait', 'actually, i forgot', 'i will instead try to just'];
    const doubtCount = doubtMarkers.filter(m => t.includes(m)).length;

    // Check for "Goal Misalignment"
    const goalMismatch = t.includes('ignoring current goal') || t.includes('outside scope');

    const score = 1.0 - (doubtCount * 0.2) - (goalMismatch ? 0.5 : 0);

    return {
      is_valid: score > 0.6,
      confidence: parseFloat(score.toFixed(2)),
      critique: score < 0.8 ? 'Reflection detected minor inconsistencies or self-doubt.' : 'Reflective logic is stable.',
      method: 'Self-Reflective-Heuristic'
    };
  }
}

module.exports = new LogicValidator();
