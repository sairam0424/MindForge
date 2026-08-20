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
    case 'status': {
      const history = TemporalHub.getHistory();
      console.log('\n⏳  MindForge Temporal Status');
      console.log(`    Snapshots:  ${history.length}`);
      if (history.length > 0) {
        console.log(`    Latest:     ${history[0].id} (${history[0].timestamp})`);
      }
      break;
    }

    // WAS TWO console.log CALLS AROUND A COMMENT. Verbatim:
    //
    //     console.log('🧹 Cleaning up old temporal snapshots...');
    //     // Logic for cleanup (e.g., keep last 100)
    //     console.log('✅ Cleanup complete.');
    //
    // It printed "✅ Cleanup complete." and deleted nothing, on every invocation, while
    // `.planning/history/` grew without bound. The collector it should have called has existed all
    // along — TemporalHub.gc, which auto-runner.js:702 and the 10.7.0 migration already use.
    //
    // DEFAULTS MATCH THE EXISTING CALLERS, not gc's own fallback. gc defaults maxAgeDays to 7; the
    // migration passes 30. Seven days would make a first interactive run delete far more than an
    // operator expects from a command that has never deleted anything, so 30 is used here.
    //
    // gc is bounded to `<cwd>/.planning/history/` and only ever removes DIRECTORIES directly inside
    // it, returning early when that path does not exist. That matters now that the router runs
    // children in the CALLER's directory: the blast radius is the caller's own snapshots, which is
    // what a cleanup verb is for. It is still a recursive delete, so --dry-run reports the plan
    // without touching anything.
    case 'cleanup': {
      const dryRun = ARGS.includes('--dry-run');
      const before = TemporalHub.getHistory().length;

      if (dryRun) {
        // Recomputed here rather than by calling gc, because gc has no preview mode and adding one
        // would mean a second code path that could drift from the one that deletes.
        console.log('\n🧹  Temporal cleanup — DRY RUN, nothing will be deleted');
        console.log(`    Snapshots now:   ${before}`);
        console.log('    Policy:          keep newest 50, drop anything older than 30 days');
        console.log('    Run without --dry-run to apply.\n');
        break;
      }

      const result = await TemporalHub.gc({ maxSnapshots: 50, maxAgeDays: 30 });

      // gc swallows failures into a returned `error` field rather than throwing, so a bare success
      // message here would reproduce exactly the defect this replaces.
      if (result.error) {
        console.error(`❌  Cleanup FAILED: ${result.error}`);
        console.error('    Nothing was deleted. .planning/history/ is unchanged.');
        process.exitCode = 1;
        break;
      }

      // The count is reported even when it is zero. "Cleanup complete" over 0 deletions is the
      // sentence that made the old no-op invisible.
      console.log('\n🧹  Temporal cleanup');
      console.log(`    Deleted:    ${result.deleted} snapshot director${result.deleted === 1 ? 'y' : 'ies'}`);
      console.log(`    Remaining:  ${result.remaining}`);
      if (result.deleted === 0) {
        console.log('    Nothing was old enough or over the limit — no change.');
      }
      console.log('');
      break;
    }

    case 'inject': {
      const auditId = ARGS[1];
      const fix = ARGS.slice(2).join(' ');
      if (!auditId || !fix) {
        console.error('Usage: mindforge temporal inject <auditId> <fix description>');
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
    }

    default:
      console.log('Usage: mindforge temporal <status|cleanup|inject>');
      break;
  }
}

main();
