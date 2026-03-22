/**
 * MindForge — Stuck Detection Engine
 * Monitors AUDIT.jsonl for S01-S04 patterns.
 */
'use strict';

const fs = require('fs');

class StuckMonitor {
  constructor(auditPath) {
    this.auditPath = auditPath;
    this.history = [];
    this.patterns = {
      S01_LINT_LOOP: 0,
      S02_COMMAND_LOOP: 0,
    };
  }

  analyze(event) {
    this.history.push(event);
    if (this.history.length > 50) this.history.shift();

    // Check S01: Lint Loop (Identical multi_replace calls)
    if (this.detectS01(event)) return { pattern: 'S01', message: 'Stuck in lint loop: identical edits detected.' };

    // Check S02: Command Loop (Identical failing commands)
    if (this.detectS02(event)) return { pattern: 'S02', message: 'Stuck in command loop: identical failing commands.' };

    return null;
  }

  detectS01(event) {
    if (event.tool !== 'multi_replace_file_content') return false;

    const similar = this.history.filter(h =>
      h.tool === 'multi_replace_file_content' &&
      h.args?.TargetFile === event.args?.TargetFile &&
      this.isContentSimilar(h.args?.ReplacementChunks?.[0]?.ReplacementContent, event.args?.ReplacementChunks?.[0]?.ReplacementContent)
    );

    return similar.length >= 3;
  }

  detectS02(event) {
    if (event.tool !== 'run_command' || event.status !== 'failed') return false;

    const identical = this.history.filter(h =>
      h.tool === 'run_command' &&
      h.status === 'failed' &&
      h.args?.CommandLine === event.args?.CommandLine
    );

    return identical.length >= 3;
  }

  isContentSimilar(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    // Simple similarity check (hardened from Roadmap requirement)
    const dist = this.levenshtein(a.slice(0, 100), b.slice(0, 100));
    return dist < 10;
  }

  levenshtein(a, b) {
    const tmp = [];
    for (let i = 0; i <= a.length; i++) { tmp[i] = [i]; }
    for (let j = 0; j <= b.length; j++) { tmp[0][j] = j; }
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            tmp[i][j] = Math.min(tmp[i - 1][j] + 1, tmp[i][j - 1] + 1, tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
    }
    return tmp[a.length][b.length];
  }
}

module.exports = StuckMonitor;
