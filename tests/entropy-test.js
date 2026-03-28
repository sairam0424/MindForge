const NexusTracer = require('../bin/engine/nexus-tracer');
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
  const spanId = tracer.startSpan('test_stagnation_wave');

  // Repetitive thoughts (should trigger stagnation)
  const repetitiveThoughts = [
    "I should check the file system permissions for the target directory.",
    "Checking file permissions for the target directory seems necessary.",
    "The directory permissions should be verified before proceeding.",
    "I will now verify the file system permissions for the directory."
  ];

  console.log('--- Injecting repetitive thoughts ---');
  for (let i = 0; i < repetitiveThoughts.length; i++) {
    tracer.recordReasoning(spanId, 'test-agent', repetitiveThoughts[i]);
    const lines = fs.readFileSync(path.join(__dirname, 'test-audit.jsonl'), 'utf8').trim().split('\n');
    const lastEvent = JSON.parse(lines[lines.length - 1]);
    
    console.log(`Step ${i + 1} | Entropy similarity: ${lastEvent.entropy || 0} | Stagnant: ${lastEvent.is_stagnant}`);
    
    if (lastEvent.event === 'self_heal_trigger') {
      console.log('✅ SUCCESS: Proactive Self-Heal triggered!');
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
