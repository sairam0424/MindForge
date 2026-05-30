/**
 * MindForge — OTel GenAI Exporter Tests (UC-18)
 * Validates span translation from NexusTracer format to OTel GenAI conventions.
 */

'use strict';

const assert = require('assert');
const path = require('path');

const { isEnabled, toOtelSpan, toJsonSafe } = require(path.join(__dirname, '..', 'bin', 'engine', 'otel-exporter'));

console.log('\nMindForge — OTel GenAI Exporter Tests (UC-18)\n');

// ── Test Data ────────────────────────────────────────────────────────────────

const mockNexusSpan = {
  id: 'sp_a1b2c3d4e5f6',
  trace_id: 'tr_1234567890abcdef',
  parent_id: 'sp_parent123',
  name: 'generate_response',
  status: 'success',
  start_time: '2026-05-30T10:00:00.000Z',
  end_time: '2026-05-30T10:00:02.500Z',
  attributes: {
    service: 'mindforge-nexus',
    host: 'test-host',
    pid: 12345,
    model_id: 'claude-sonnet-4-6',
    skill: 'code-review',
    input_tokens: 1500,
    output_tokens: 800,
    provider: 'anthropic',
  },
};

// ── Tests ────────────────────────────────────────────────────────────────────

// Test 1: isEnabled returns false without env var
console.log('Test 1: isEnabled() returns false without OTEL_EXPORTER_OTLP_ENDPOINT...');
{
  const originalEnv = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  assert.strictEqual(isEnabled(), false, 'Should be disabled without env var');

  // Restore
  if (originalEnv) process.env.OTEL_EXPORTER_OTLP_ENDPOINT = originalEnv;
  console.log('  PASS: Exporter disabled without env var');
}

// Test 2: isEnabled returns true with env var
console.log('Test 2: isEnabled() returns true with OTEL_EXPORTER_OTLP_ENDPOINT set...');
{
  const originalEnv = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';

  assert.strictEqual(isEnabled(), true, 'Should be enabled with env var');

  // Restore
  if (originalEnv) {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = originalEnv;
  } else {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  }
  console.log('  PASS: Exporter enabled with env var');
}

// Test 3: traceId is 16 bytes (32 hex chars)
console.log('Test 3: traceId is 16 bytes (32 hex chars)...');
{
  const otel = toOtelSpan(mockNexusSpan);
  assert.strictEqual(otel.traceId.length, 32, 'traceId should be 32 hex chars (16 bytes)');
  assert.ok(/^[0-9a-f]{32}$/.test(otel.traceId), 'traceId should be valid hex');
  console.log('  PASS: Valid 16-byte traceId');
}

// Test 4: spanId is 8 bytes (16 hex chars)
console.log('Test 4: spanId is 8 bytes (16 hex chars)...');
{
  const otel = toOtelSpan(mockNexusSpan);
  assert.strictEqual(otel.spanId.length, 16, 'spanId should be 16 hex chars (8 bytes)');
  assert.ok(/^[0-9a-f]{16}$/.test(otel.spanId), 'spanId should be valid hex');
  console.log('  PASS: Valid 8-byte spanId');
}

// Test 5: gen_ai.request.model maps from attributes.model_id
console.log('Test 5: gen_ai.request.model maps from model_id...');
{
  const otel = toOtelSpan(mockNexusSpan);
  assert.strictEqual(otel.attributes['gen_ai.request.model'], 'claude-sonnet-4-6');
  assert.strictEqual(otel.attributes['gen_ai.response.model'], 'claude-sonnet-4-6');
  console.log('  PASS: Model mapped correctly');
}

// Test 6: gen_ai.usage.* maps from token counts
console.log('Test 6: gen_ai.usage.* maps from token counts...');
{
  const otel = toOtelSpan(mockNexusSpan);
  assert.strictEqual(otel.attributes['gen_ai.usage.input_tokens'], 1500);
  assert.strictEqual(otel.attributes['gen_ai.usage.output_tokens'], 800);
  console.log('  PASS: Token counts mapped correctly');
}

// Test 7: gen_ai.system maps from attributes.provider
console.log('Test 7: gen_ai.system maps from provider attribute...');
{
  const otel = toOtelSpan(mockNexusSpan);
  assert.strictEqual(otel.attributes['gen_ai.system'], 'anthropic');
  console.log('  PASS: Provider mapped to gen_ai.system');
}

// Test 8: gen_ai.system defaults to 'mindforge' without provider
console.log('Test 8: gen_ai.system defaults to mindforge without provider...');
{
  const spanNoProvider = {
    ...mockNexusSpan,
    attributes: { ...mockNexusSpan.attributes },
  };
  delete spanNoProvider.attributes.provider;
  const otel = toOtelSpan(spanNoProvider);
  assert.strictEqual(otel.attributes['gen_ai.system'], 'mindforge');
  console.log('  PASS: Default gen_ai.system is mindforge');
}

// Test 9: gen_ai.operation.name maps from span name
console.log('Test 9: gen_ai.operation.name maps from span name...');
{
  const otel = toOtelSpan(mockNexusSpan);
  assert.strictEqual(otel.attributes['gen_ai.operation.name'], 'generate_response');
  console.log('  PASS: Operation name mapped from span name');
}

// Test 10: startTimeUnixNano and endTimeUnixNano are BigInt nanoseconds
console.log('Test 10: Timestamps are BigInt nanoseconds...');
{
  const otel = toOtelSpan(mockNexusSpan);
  const expectedStart = BigInt(new Date('2026-05-30T10:00:00.000Z').getTime()) * 1_000_000n;
  const expectedEnd = BigInt(new Date('2026-05-30T10:00:02.500Z').getTime()) * 1_000_000n;
  assert.strictEqual(otel.startTimeUnixNano, expectedStart, 'Start time should be in nanoseconds');
  assert.strictEqual(otel.endTimeUnixNano, expectedEnd, 'End time should be in nanoseconds');
  console.log('  PASS: Timestamps converted to nanoseconds');
}

// Test 11: toJsonSafe serializes BigInt to string
console.log('Test 11: toJsonSafe serializes BigInt for JSON...');
{
  const otel = toOtelSpan(mockNexusSpan);
  const safe = toJsonSafe(otel);
  assert.strictEqual(typeof safe.startTimeUnixNano, 'string');
  assert.strictEqual(typeof safe.endTimeUnixNano, 'string');
  // Verify it's valid JSON
  assert.doesNotThrow(() => JSON.stringify(safe), 'Should be JSON-serializable');
  console.log('  PASS: BigInt serialized to string for JSON');
}

// Test 12: Handles span with missing fields gracefully
console.log('Test 12: Handles span with missing fields...');
{
  const minimalSpan = {
    id: 'sp_minimal',
    trace_id: 'tr_minimal',
    parent_id: null,
    name: null,
    status: 'error',
    start_time: null,
    end_time: null,
    attributes: {},
  };
  const otel = toOtelSpan(minimalSpan);
  assert.strictEqual(otel.name, 'unknown', 'Name defaults to unknown');
  assert.strictEqual(otel.attributes['gen_ai.request.model'], '');
  assert.strictEqual(otel.attributes['gen_ai.usage.input_tokens'], 0);
  assert.strictEqual(otel.attributes['gen_ai.usage.output_tokens'], 0);
  assert.strictEqual(otel.startTimeUnixNano, 0n);
  assert.strictEqual(otel.endTimeUnixNano, 0n);
  assert.strictEqual(otel.status.code, 2, 'Non-success status maps to code 2');
  console.log('  PASS: Missing fields handled with defaults');
}

// Test 13: Each call produces unique traceId and spanId
console.log('Test 13: Unique IDs per call...');
{
  const otel1 = toOtelSpan(mockNexusSpan);
  const otel2 = toOtelSpan(mockNexusSpan);
  assert.notStrictEqual(otel1.traceId, otel2.traceId, 'traceIds should differ');
  assert.notStrictEqual(otel1.spanId, otel2.spanId, 'spanIds should differ');
  console.log('  PASS: Unique IDs generated per invocation');
}

console.log('\n All OTel GenAI Exporter Tests Passed!\n');
