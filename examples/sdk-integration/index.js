const { MindForgeClient, MindForgeEventStream } = require('@mindforge/sdk');

async function main() {
  const client = new MindForgeClient();

  // Check project health
  const state = client.readState();
  console.log('Project state:', state ? 'initialized' : 'not initialized');

  // Validate configuration
  const validation = client.validateConfig();
  if (!validation.valid) {
    console.error('Config issues:', validation.errors);
    return;
  }

  // Read audit log
  const entries = client.readAuditLog();
  console.log(`Audit entries: ${entries.length}`);

  console.log('MindForge SDK integration working!');
}

main().catch(console.error);
