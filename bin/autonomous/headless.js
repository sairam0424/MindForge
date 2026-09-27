/**
 * MindForge — Headless Adapter
 * Handles signal management and non-interactive output.
 */
'use strict';

function setupHeadlessMode(executor) {
  // Disable fancy TTY reporting
  process.env.NO_COLOR = '1';
  process.env.INTERACTIVE = '0';

  // Hardened signal handling to prevent race conditions during write
  let isShuttingDown = false;

  async function handleSignal(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.error(`\n⚠️ Received ${signal}. Snapshotting state for resumption...`);

    try {
      // pause() ensures all state is flushed to disk and current step is stabilized
      await executor.pause();
      console.error('✅ State saved. You can resume with /mindforge:auto --resume');
      process.exit(0);
    } catch (err) {
      console.error('❌ Failed to save state during shutdown:', err.message);
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));
}

module.exports = { setupHeadlessMode };

// ── Refuse to report success for work that never ran ──────────────────────────
//
// THE DEFECT. bin/mindforge-cli.js's `headless` verb and .github/workflows/mindforge-autonomous.yml's
// daily cron both invoke this file directly (`node bin/autonomous/headless.js ...`). Before this
// guard, that just defined setupHeadlessMode() and reached end-of-file: no dispatch, no error, exit
// 0. The CI job's own report-generation step then swallows the resulting empty-output JSON parse
// failure (`|| echo "Report generation failed" > AUTONOMOUS-REPORT.md`), so the job shows green every
// day while doing zero real work -- a silent false-success class this project's own AutoRunner
// refuses to commit elsewhere (see auto-runner.js's executeWave(): "A wave with no executor now
// writes ONE honest entry and throws, instead of N false ones"). There is no comparable guard at
// this file's actual entrypoint, so headless.js never even reaches that check.
//
// WHY NOT WIRE UP A REAL RUN INSTEAD. AutoRunner.run() genuinely exists and is well-built, but it
// requires a `taskExecutor` function that performs real work, and nothing in this codebase provides
// one (confirmed: zero production `new AutoRunner(` call sites outside tests) -- building one means
// deciding how to invoke an actual agent/model from a CLI script, which is a new feature, not a bug
// fix. This repo's own docs/research/2026-08-v12-upgrade-report.md (DEL-02) already reached the same
// conclusion: delete the fabricating path, route through wave-executor.js only once a real executor
// exists, and ship a throwing stub as the interim state. This is that stub.
if (require.main === module) {
  process.stderr.write(
    'MindForge autonomous execution engine has no real task executor wired -- refusing to report '
    + 'success for work that would not run.\n'
    + 'bin/autonomous/auto-runner.js\'s AutoRunner requires a taskExecutor function that actually '
    + 'dispatches tasks; nothing in this codebase provides one yet (zero production callers). Running '
    + 'this CLI verb or the daily autonomous-engine workflow previously exited 0 having done nothing --\n'
    + 'that is now a hard failure instead of a silent lie. Tracked as DEL-02 in '
    + 'docs/research/2026-08-v12-upgrade-report.md.\n'
  );
  process.exit(1);
}
