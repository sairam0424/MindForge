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

class NexusTracer {
  constructor(config = {}) {
    this.projectId = config.projectId || 'mindforge-nexus';
    this.auditPath = config.auditPath || path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
    this.currentTraceId = null;
    this.activeSpans = new Map();
    this.did = config.did || null; // Active Agent DID
    this.enableZtai = config.enableZtai !== false;
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

    // Record span start in AUDIT.jsonl
    this._recordEvent('span_started', { 
      span_id: spanId, 
      parent_span_id: parentSpanId,
      span_name: name,
      ...attributes 
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
    this._recordEvent('reasoning_trace', {
      span_id: spanId,
      agent,
      thought,
      resolution
    });
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
}

module.exports = NexusTracer;
