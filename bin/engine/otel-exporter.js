'use strict';
/**
 * MindForge — OTel GenAI Exporter (UC-18).
 * Translates NexusTracer spans to OpenTelemetry GenAI semantic conventions.
 * Active only when OTEL_EXPORTER_OTLP_ENDPOINT is set.
 *
 * NexusTracer span shape (from nexus-tracer.js startSpan/endSpan):
 *   {
 *     id: 'sp_<hex>',
 *     trace_id: 'tr_<hex>',
 *     parent_id: string|null,
 *     name: string,
 *     status: 'active'|'success'|'error',
 *     start_time: ISO-8601,
 *     end_time: ISO-8601,
 *     attributes: {
 *       service: string,
 *       host: string,
 *       pid: number,
 *       model_id?: string,
 *       skill?: string,
 *       input_tokens?: number,
 *       output_tokens?: number,
 *       ...
 *     }
 *   }
 *
 * Mapping to OTel GenAI semantic conventions:
 *   span.name → name
 *   span.attributes.model_id → gen_ai.request.model, gen_ai.response.model
 *   span.attributes.input_tokens → gen_ai.usage.input_tokens
 *   span.attributes.output_tokens → gen_ai.usage.output_tokens
 *   span.name → gen_ai.operation.name
 *   'mindforge' → gen_ai.system (or span.attributes.provider if present)
 */

const crypto = require('crypto');

/**
 * Check if the OTel exporter is enabled (env var gate).
 * @returns {boolean}
 */
function isEnabled() {
  return !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
}

/**
 * Translate a NexusTracer span to OTel GenAI-compatible format.
 * Produces a valid 16-byte hex traceId and 8-byte hex spanId.
 *
 * @param {object} nexusSpan - A span object from NexusTracer
 * @returns {object} OTel-compatible span object
 */
function toOtelSpan(nexusSpan) {
  const attrs = nexusSpan.attributes || {};

  return {
    traceId: crypto.randomBytes(16).toString('hex'),
    spanId: crypto.randomBytes(8).toString('hex'),
    parentSpanId: nexusSpan.parent_id || '',
    name: nexusSpan.name || 'unknown',
    kind: 1, // SPAN_KIND_INTERNAL
    startTimeUnixNano: nexusSpan.start_time
      ? BigInt(new Date(nexusSpan.start_time).getTime()) * 1_000_000n
      : 0n,
    endTimeUnixNano: nexusSpan.end_time
      ? BigInt(new Date(nexusSpan.end_time).getTime()) * 1_000_000n
      : 0n,
    status: nexusSpan.status === 'success' ? { code: 1 } : { code: 2 },
    attributes: {
      'gen_ai.system': attrs.provider || 'mindforge',
      'gen_ai.request.model': attrs.model_id || '',
      'gen_ai.response.model': attrs.model_id || '',
      'gen_ai.usage.input_tokens': attrs.input_tokens || 0,
      'gen_ai.usage.output_tokens': attrs.output_tokens || 0,
      'gen_ai.operation.name': nexusSpan.name || '',
      'service.name': attrs.service || 'mindforge-nexus',
    },
  };
}

/**
 * Serialize BigInt values to strings for JSON compatibility.
 * @param {object} otelSpan
 * @returns {object}
 */
function toJsonSafe(otelSpan) {
  return {
    ...otelSpan,
    startTimeUnixNano: String(otelSpan.startTimeUnixNano),
    endTimeUnixNano: String(otelSpan.endTimeUnixNano),
  };
}

/**
 * Export a NexusTracer span to the OTel-compatible local file.
 * In production, this would POST to OTEL_EXPORTER_OTLP_ENDPOINT/v1/traces.
 * For now, appends to .mindforge/metrics/otel-spans.jsonl for verification.
 *
 * @param {object} nexusSpan - A span from NexusTracer
 */
async function exportSpan(nexusSpan) {
  if (!isEnabled()) return;

  const otelSpan = toOtelSpan(nexusSpan);
  const jsonSafe = toJsonSafe(otelSpan);

  const fs = require('fs');
  const path = require('path');
  const outPath = path.join(process.cwd(), '.mindforge', 'metrics', 'otel-spans.jsonl');

  try {
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(outPath, JSON.stringify(jsonSafe) + '\n');
  } catch {
    // Non-fatal: observability export should never break the main flow
  }
}

module.exports = { isEnabled, toOtelSpan, toJsonSafe, exportSpan };
