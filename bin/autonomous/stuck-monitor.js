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

    // Check S03: Semantic Mirroring (Reasoning Loop)
    if (this.detectS03(event)) return { pattern: 'S03', message: 'Stuck in reasoning loop: semantic mirroring detected.' };

    // Check S04: Infinite Decomposition (Planning Paradox)
    if (this.detectS04(event)) return { pattern: 'S04', message: 'Stuck in planning paradox: infinite decomposition detected.' };

    return null;
  }

  detectS03(event) {
    if (event.event !== 'reasoning_trace') return false;

    // Compare with the last 5 thoughts in history
    const reflections = this.history.filter(h => h.event === 'reasoning_trace');
    if (reflections.length < 3) return false;

    const currentThought = event.thought;
    const previousThoughts = reflections.slice(-4, -1);

    const isMirroring = previousThoughts.some(p => 
      this.isContentSimilar(p.thought, currentThought)
    );

    return isMirroring;
  }

  detectS04(event) {
    if (event.event !== 'reasoning_trace') return false;

    const decompositions = this.history.filter(h => 
      h.event === 'reasoning_trace' && 
      (h.thought?.toLowerCase().includes('break down') || h.thought?.toLowerCase().includes('sub-task'))
    );

    // If more than 4 consecutive decompositions without a command or edit
    const lastActionIndex = this.history.findLastIndex(h => 
      h.tool === 'run_command' || h.tool === 'replace_file_content' || h.tool === 'multi_replace_file_content'
    );

    const recentDecomps = decompositions.filter(d => 
      this.history.indexOf(d) > lastActionIndex
    );

    return recentDecomps.length >= 4;
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
