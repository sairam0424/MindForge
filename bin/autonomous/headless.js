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
