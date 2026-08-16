/**
 * MindForge v8 Persistence Verification Test
 * Tests the Unified Persistence Layer (SQLite via sql.js)
 */
const nexusTracer = require('../bin/engine/nexus-tracer');
const remediationQueue = require('../bin/revops/remediation-queue');
const semanticHub = require('../bin/memory/semantic-hub');
const vectorHub = require('../bin/memory/vector-hub');

async function runTest() {
  const testId = Math.random().toString(36).substr(2, 6);
  console.log(`[TEST] Starting v8 Persistence Verification (Test ID: ${testId})...`);

  try {
    // 1. Test NexusTracer -> VectorHub
    console.log('[TEST] Recording reasoning trace...');
    const traceId = nexusTracer.startTrace(`v8_trace_${testId}`);
    const spanId = await nexusTracer.startSpan(`v8_span_${testId}`);
    await nexusTracer.recordReasoning(spanId, 'mf-tester', `Celestial persistence test ${testId}.`, 'verified');
    await nexusTracer.endSpan(spanId);

    // 2. Test RemediationQueue -> VectorHub
    console.log('[TEST] Enqueuing remediation...');
    const remId = `rem_v8_${testId}`;
    const remediation = await remediationQueue.enqueue({
      remediation_id: remId,
      span_id: spanId,
      strategy: 'REASONING_RESTART'
    });
    console.log(`[TEST] Enqueued: ${remediation.remediation_id}`);

    await remediationQueue.updateStatus(remId, 'COMPLETED');
    console.log('[TEST] Updated remediation status.');

    // 3. Test SemanticHub -> VectorHub
    console.log('[TEST] Saving skill...');
    const skillId = `sk_v8_${testId}`;
    await semanticHub.saveSkill({
      id: skillId,
      name: `Celestial Reasoning ${testId}`,
      description: 'High-performance SQL-backed reasoning',
      success_rate: 0.99
    });

    // 4. Verify SQLite contents
    console.log('[TEST] Verifying SQLite contents...');
    await vectorHub.init();

    const traces = vectorHub.query(
      'SELECT * FROM traces WHERE trace_id = ?',
      [`v8_trace_${testId}`]
    );
    console.log(`[TEST] Traces found: ${traces.length}`);

    const rems = vectorHub.query(
      'SELECT * FROM remediations WHERE id = ?',
      [remId]
    );
    console.log(`[TEST] Remediations found: ${rems.length} (Status: ${rems[0]?.status})`);

    const skills = vectorHub.query(
      'SELECT * FROM skills WHERE skill_id = ?',
      [skillId]
    );
    console.log(`[TEST] Skills found: ${skills.length} (Success Rate: ${skills[0]?.success_rate})`);

    // 5. Semantic Search Test
    console.log('[TEST] Testing semantic search (FTS)...');
    const results = await vectorHub.searchTraces(`persistence test ${testId}`);
    console.log(`[TEST] FTS Search Results: ${results.length}`);

    const checks = [
      ['traces', traces.length],
      ['remediations', rems.length],
      ['skills', skills.length],
      ['fts search results', results.length],
    ];
    const empty = checks.filter(([, n]) => !(n > 0)).map(([name]) => name);

    if (empty.length === 0) {
      console.log('✅ MindForge v8 Persistence Verification Passed.');
    } else {
      // Must set a non-zero code, not just log. This branch previously printed ❌ and then
      // fell into `finally { process.exit(0) }`, so the suite reported ✓ PASS while telling
      // you it had failed — and tests/run-all.js gates purely on the child exit code.
      console.error(`❌ MindForge v8 Persistence Verification Failed — empty: ${empty.join(', ')}`);
      process.exitCode = 1;
    }

  } catch (err) {
    console.error(`[TEST] Error: ${err.message}`);
    process.exitCode = 1;
  } finally {
    // The forced exit is deliberate — sql.js/WASM keeps handles open and the process would
    // otherwise linger — but it must PROPAGATE the outcome. A bare process.exit(0) here
    // overrode both the assertion branch above and any process.exitCode set in the catch.
    process.exit(process.exitCode || 0);
  }
}

runTest();
