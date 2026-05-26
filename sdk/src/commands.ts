/**
 * MindForge SDK — Command Builders
 * Builds the command strings that can be sent to Claude Code / Antigravity
 * via their programmatic APIs.
 */

export interface CommandOptions {
  flags?: string[];
  args?: string[];
}

export const commands = {
  /**
   * Build a /mindforge:health command string
   */
  health(opts: CommandOptions = {}): string {
    const flags = opts.flags?.join(' ') ?? '';
    return `/mindforge:health ${flags}`.trim();
  },

  /**
   * Build a /mindforge:plan-phase command string
   */
  planPhase(phase: number, opts: CommandOptions = {}): string {
    const flags = opts.flags?.join(' ') ?? '';
    return `/mindforge:plan-phase ${phase} ${flags}`.trim();
  },

  /**
   * Build a /mindforge:execute-phase command string
   */
  executePhase(phase: number, opts: CommandOptions = {}): string {
    const flags = opts.flags?.join(' ') ?? '';
    return `/mindforge:execute-phase ${phase} ${flags}`.trim();
  },

  /**
   * Build a /mindforge:security-scan command string
   */
  securityScan(path?: string, opts: CommandOptions = {}): string {
    const flags = opts.flags?.join(' ') ?? '';
    return `/mindforge:security-scan ${path ?? ''} ${flags}`.trim();
  },

  /**
   * Build a /mindforge:audit command string with filters
   */
  audit(filter: { phase?: number; event?: string; since?: string } = {}): string {
    const parts = ['/mindforge:audit'];
    if (filter.phase)  parts.push(`--phase ${filter.phase}`);
    if (filter.event)  parts.push(`--event ${filter.event}`);
    if (filter.since)  parts.push(`--since ${filter.since}`);
    return parts.join(' ');
  },

  /**
   * Build a /mindforge:pr-review command string
   */
  prReview(opts: CommandOptions = {}): string {
    const flags = opts.flags?.join(' ') ?? '';
    return `/mindforge:pr-review ${flags}`.trim();
  },
};
