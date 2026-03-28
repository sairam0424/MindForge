/**
 * MindForge Nexus — Core Tracer Engine (v4.1.0-alpha.nexus)
 *
 * Handles Agentic Reasoning Tracing (ART) spans and OpenTelemetry-compatible 
 * trace context propagation across the agentic mesh.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ztai = require('../governance/ztai-manager');
const SREManager = require('./sre-manager');

class NexusTracer {
  constructor(config = {}) {
    this.projectId = config.projectId || 'mindforge-nexus';
    this.auditPath = config.auditPath || path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
    this.currentTraceId = null;
    this.activeSpans = new Map();
    this.did = config.did || null; // Active Agent DID
    this.enableZtai = config.enableZtai !== false;
    this.sreManager = new SREManager();

    // v5 Pillar III: Reasoning Entropy Monitoring (RES)
    this.RES_THRESHOLD = 0.8; // Similarity threshold for stagnation
    this.entropyCache = new Map(); // spanId -> [thoughtHistories]

    // v5 Pillar IV: Agentic SBOM
    this.sbom = {
      manifest_version: '1.0.0',
      models: new Set(),
      skills: new Set(),
      startTime: new Date().toISOString()
    };
  }

  /**
   * Initialize or resume a trace.
   */
  startTrace(traceId = null) {
    this.currentTraceId = traceId || `tr_${crypto.randomBytes(8).toString('hex')}`;
    return this.currentTraceId;
  }

  /**
   * Start a new ART span.
   */
  startSpan(name, attributes = {}, parentSpanId = null) {
    const spanId = `sp_${crypto.randomBytes(6).toString('hex')}`;
    const startTime = new Date().toISOString();

    const span = {
      id: spanId,
      trace_id: this.currentTraceId,
      parent_id: parentSpanId || null,
      name,
      status: 'active',
      start_time: startTime,
      attributes: {
        ...attributes,
        service: 'mindforge-nexus',
      }
    };

    this.activeSpans.set(spanId, span);

    // Track model and skill in SBOM if provided in attributes
    if (attributes.model_id) this.sbom.models.add(attributes.model_id);
    if (attributes.skill) this.sbom.skills.add(attributes.skill);

    // v5 Pillar VI: Enclave Check
    if (attributes.is_confidential && !attributes.enclave_id) {
      try {
        span.attributes.enclave_id = this.sreManager.initializeEnclave({ 
          tier: attributes.tier || 1, 
          did: this.did 
        });
      } catch (err) {
        console.warn(`[NexusTracer] Failed to initialize SRE for confidential span: ${err.message}`);
      }
    }

    // Record span start in AUDIT.jsonl
    this._recordEvent('span_started', { 
      span_id: spanId, 
      parent_span_id: parentSpanId,
      span_name: name,
      ...attributes,
      enclave_id: span.attributes.enclave_id
    });

    return spanId;
  }

  /**
   * End an active span.
   */
  endSpan(spanId, status = 'success', metadata = {}) {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.status = status;
    span.end_time = new Date().toISOString();
    
    // v5 Pillar VI: Enclave Termination
    if (span.attributes.enclave_id) {
      this.sreManager.terminateEnclave(span.attributes.enclave_id);
    }

    this._recordEvent('span_completed', {
      span_id: spanId,
      status,
      ...metadata
    });

    this.activeSpans.delete(spanId);
  }

  /**
   * Record a Reasoning Trace event (ART granularity).
   */
  recordReasoning(spanId, agent, thought, resolution = 'none') {
    const span = this.activeSpans.get(spanId);
    let sanitizedThought = thought;

    if (span && span.attributes.enclave_id) {
      sanitizedThought = this.sreManager.sanitizeThoughtChain(thought, span.attributes.enclave_id);
    }

    // v5 Pillar III: PES (Proactive Equilibrium Scoring)
    const entropy = this.calculateEntropy(spanId, sanitizedThought);
    const isStagnant = entropy > this.RES_THRESHOLD;

    this._recordEvent('reasoning_trace', {
      span_id: spanId,
      agent,
      thought: sanitizedThought,
      resolution,
      entropy: parseFloat(entropy.toFixed(4)),
      is_stagnant: isStagnant
    });

    if (isStagnant) {
      const history = this.entropyCache.get(spanId) || [];
      const stagnationCount = history.filter(h => h.entropy > this.RES_THRESHOLD).length;

      if (stagnationCount >= 3) {
        this._recordEvent('vulnerability_detected', {
          span_id: spanId,
          type: 'REASONING_LOOP',
          severity: 'HIGH',
          description: 'Agent reasoning entropy dropped below threshold (stagnation detected). Triggering proactive RCA.',
          entropy_score: entropy
        });
        
        // Signal proactive recovery
        this.recordSelfHeal(spanId, {
          type: 'PROACTIVE_RCA',
          cause: 'REASONING_STAGNATION',
          suggestion: 'Entropy threshold exceeded. Switch reasoning strategy.'
        });
      }
    }
  }

  /**
   * Calculates "Reasoning Entropy" (Similarity to previous thoughts).
   * Range 0.0 (High Entropy/New) to 1.0 (Low Entropy/Repetitive).
   */
  calculateEntropy(spanId, currentThought) {
    if (!this.entropyCache.has(spanId)) {
      this.entropyCache.set(spanId, []);
    }
    const history = this.entropyCache.get(spanId);
    
    if (history.length === 0) {
      history.push({ thought: currentThought, entropy: 0 });
      return 0;
    }

    // Simple Jaccard Similarity approach for stagnation detection
    const getTokens = (str) => new Set(str.toLowerCase().split(/\s+/).filter(t => t.length > 3));
    const currentTokens = getTokens(currentThought);
    
    let maxSimilarity = 0;
    for (const prev of history) {
      const prevTokens = getTokens(prev.thought);
      const intersection = new Set([...currentTokens].filter(x => prevTokens.has(x)));
      const union = new Set([...currentTokens, ...prevTokens]);
      const similarity = union.size === 0 ? 0 : intersection.size / union.size;
      if (similarity > maxSimilarity) maxSimilarity = similarity;
    }

    history.push({ thought: currentThought, entropy: maxSimilarity });
    if (history.length > 5) history.shift(); // Sliding window of 5 thoughts

    return maxSimilarity;
  }

  /**
   * Internal AUDIT writer.
   */
  _recordEvent(event, data) {
    const entry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      event,
      trace_id: this.currentTraceId,
      ...data
    };

    // ZTAI Signing Logic
    if (this.enableZtai && this.did) {
      try {
        entry.did = this.did;
        // Sign the stringified entry WITHOUT the signature field itself
        const payload = JSON.stringify(entry);
        entry.signature = ztai.signData(this.did, payload);
      } catch (err) {
        console.warn(`[NexusTracer] ZTAI signing failed: ${err.message}`);
      }
    }

    try {
      if (!fs.existsSync(path.dirname(this.auditPath))) {
        fs.mkdirSync(path.dirname(this.auditPath), { recursive: true });
      }
      fs.appendFileSync(this.auditPath, JSON.stringify(entry) + '\n');
    } catch (err) {
      console.error(`[NexusTracer] Failed to write audit entry: ${err.message}`);
    }
  }

  /**
   * Records a FinOps budget decision (Pillar V).
   */
  recordFinOps(spanId, decision) {
    this._recordEvent('finops_decision', {
      span_id: spanId,
      ...decision
    });
  }

  /**
   * Records a Self-Healing trigger event (Pillar VI).
   */
  recordSelfHeal(spanId, report) {
    this._recordEvent('self_heal_trigger', {
      span_id: spanId,
      ...report
    });
  }

  /**
   * Finalize and export the Agentic SBOM (Pillar IV).
   */
  exportSBOM(outputPath = null) {
    const finalPath = outputPath || path.join(process.cwd(), '.planning', 'MANIFEST.sbom.json');
    const manifest = {
      ...this.sbom,
      models: Array.from(this.sbom.models),
      skills: Array.from(this.sbom.skills),
      endTime: new Date().toISOString()
    };

    try {
      if (!fs.existsSync(path.dirname(finalPath))) {
        fs.mkdirSync(path.dirname(finalPath), { recursive: true });
      }
      fs.writeFileSync(finalPath, JSON.stringify(manifest, null, 2));
      
      this._recordEvent('sbom_exported', { path: finalPath });
      return finalPath;
    } catch (err) {
      console.error(`[NexusTracer] Failed to export SBOM: ${err.message}`);
      return null;
    }
  }
}

module.exports = NexusTracer;
