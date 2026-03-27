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

  test('should initialize a valid trace and spans', () => {
    const span = NexusTracer.startSpan('test_wave_01');
    expect(span.trace_id).toBeDefined();
    expect(span.span_id).toBeDefined();
    expect(span.name).toBe('test_wave_01');
  });

  test('should support hierarchical spans', () => {
    const parent = NexusTracer.startSpan('parent');
    const child = NexusTracer.startSpan('child', { parent_span_id: parent.span_id });
    
    expect(child.trace_id).toBe(parent.trace_id);
    expect(child.parent_span_id).toBe(parent.span_id);
  });

  test('should record reasoning trace to AUDIT.jsonl', () => {
    const span = NexusTracer.startSpan('reasoning_task');
    NexusTracer.recordReasoning('Considering memory safety in Rust vs C++');
    
    const logs = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
    const lastEntry = JSON.parse(logs[logs.length - 1]);
    
    expect(lastEntry.event).toBe('reasoning_trace');
    expect(lastEntry.thought).toContain('memory safety');
    expect(lastEntry.trace_id).toBe(span.trace_id);
  });

  test('should close spans and update state', () => {
    const span = NexusTracer.startSpan('closing_task');
    NexusTracer.endSpan(span.span_id);
    
    expect(NexusTracer.activeSpans.has(span.span_id)).toBe(false);
  });
});
