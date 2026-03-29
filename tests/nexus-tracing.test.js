const fs = require('fs');
const path = require('path');
const NexusTracer = require('../.mindforge/engine/nexus-tracer');

describe('Nexus Tracer & ART Protocol', () => {
  const auditPath = path.join(__dirname, '../.planning/AUDIT.jsonl');

  beforeEach(() => {
    // Clear audit log before tests
    if (fs.existsSync(auditPath)) {
      fs.truncateSync(auditPath, 0);
    }
  });

  test('should initialize a valid trace and spans', async () => {
    const span = await NexusTracer.startSpan('test_wave_01');
    expect(span.trace_id).toBeDefined();
    expect(span.id).toBeDefined(); // Use span.id instead of span_id
    expect(span.name).toBe('test_wave_01');
  });

  test('should support hierarchical spans', async () => {
    const parentId = await NexusTracer.startSpan('parent');
    const childId = await NexusTracer.startSpan('child', {}, parentId);
    
    const child = NexusTracer.activeSpans.get(childId);
    expect(child.trace_id).toBe(NexusTracer.currentTraceId);
    expect(child.parent_id).toBe(parentId);
  });

  test('should record reasoning trace to AUDIT.jsonl', async () => {
    const spanId = await NexusTracer.startSpan('reasoning_task');
    await NexusTracer.recordReasoning(spanId, 'test-agent', 'Considering memory safety in Rust vs C++');
    
    const logs = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
    const lastEntry = JSON.parse(logs[logs.length - 1]);
    
    expect(lastEntry.event).toBe('reasoning_trace');
    expect(lastEntry.thought).toContain('memory safety');
    expect(lastEntry.trace_id).toBe(NexusTracer.currentTraceId);
  });

  test('should close spans and update state', async () => {
    const spanId = await NexusTracer.startSpan('closing_task');
    await NexusTracer.endSpan(spanId);
    
    expect(NexusTracer.activeSpans.has(spanId)).toBe(false);
  });
});
