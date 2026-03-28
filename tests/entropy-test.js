const { NexusTracer } = require('../bin/engine/nexus-tracer');
const TemporalHindsight = require('../bin/engine/temporal-hindsight');
const path = require('path');
const fs = require('fs');

async function testEntropyLoop() {
  console.log('🚀 Starting Reasoning Entropy (RES) Loop Test...');

  const tracer = new NexusTracer({
    auditPath: path.join(__dirname, 'test-audit.jsonl'),
    enableZtai: false // Disable signing for unit test
  });

  const hindsight = new TemporalHindsight();
  const spanId = await tracer.startSpan('test_stagnation_wave');

  // Identical thoughts to ensure entropy stagnation triggers Proactive Self-Heal
  const repetitiveThoughts = [
    "I should check the file system permissions for the target directory.",
    "I should check the file system permissions for the target directory.",
    "I should check the file system permissions for the target directory.",
    "I should check the file system permissions for the target directory."
  ];

  console.log('--- Injecting repetitive thoughts ---');
  for (let i = 0; i < repetitiveThoughts.length; i++) {
    await tracer.recordReasoning(spanId, 'test-agent', repetitiveThoughts[i]);
    const lines = fs.readFileSync(path.join(__dirname, 'test-audit.jsonl'), 'utf8').trim().split('\n');
    const lastEvent = JSON.parse(lines[lines.length - 1]);
    
    console.log(`Step ${i + 1} | Entropy similarity: ${lastEvent.entropy || 0} | Stagnant: ${lastEvent.is_stagnant}`);
    
    if (lastEvent.event === 'self_heal_trigger' || lastEvent.event === 'vulnerability_detected') {
      console.log('✅ SUCCESS: Proactive Self-Heal or Vulnerability detected!');
      const vector = hindsight.handleProactiveRecovery(lastEvent.trace_id, lastEvent.entropy_score || 0.9);
      console.log('🎯 Steering Vector:', vector.instruction);
      break;
    }
  }

  // Cleanup
  if (fs.existsSync(path.join(__dirname, 'test-audit.jsonl'))) {
    fs.unlinkSync(path.join(__dirname, 'test-audit.jsonl'));
  }
}

testEntropyLoop().catch(console.error);
