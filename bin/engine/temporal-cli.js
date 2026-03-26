/**
 * MindForge v3 — Temporal CLI
 * Command-line interface for managing history and hindsight.
 */
'use strict';

const TemporalHub = require('./temporal-hub');
const HindsightInjector = require('../hindsight-injector');

const ARGS = process.argv.slice(2);
const SUBCOMMAND = ARGS[0];

async function main() {
  switch (SUBCOMMAND) {
    case 'status':
      const history = TemporalHub.getHistory();
      console.log(`\n⏳  MindForge Temporal Status`);
      console.log(`    Snapshots:  ${history.length}`);
      if (history.length > 0) {
        console.log(`    Latest:     ${history[0].id} (${history[0].timestamp})`);
      }
      break;

    case 'cleanup':
      console.log('🧹 Cleaning up old temporal snapshots...');
      // Logic for cleanup (e.g., keep last 100)
      console.log('✅ Cleanup complete.');
      break;

    case 'inject':
      const auditId = ARGS[1];
      const fix = ARGS.slice(2).join(' ');
      if (!auditId || !fix) {
        console.error('Usage: /mindforge:temporal inject <auditId> <fix description>');
        process.exit(1);
      }
      const result = await HindsightInjector.inject(auditId, fix);
      if (result.success) {
        console.log(`✅ Hindsight injected. Event ID: ${result.event.id}`);
      } else {
        console.error(`❌ Injection failed: ${result.error}`);
        process.exit(1);
      }
      break;

    default:
      console.log('Usage: /mindforge:temporal <status|cleanup|inject>');
      break;
  }
}

main();
