/**
 * MindForge SDK — Public API
 * @module @mindforge/sdk
 */

export { MindForgeClient } from './client';
export { MindForgeEventStream } from './events';
export { commands } from './commands';
export type {
  MindForgeConfig,
  PhaseResult,
  TaskResult,
  SecurityFinding,
  GateResult,
  HealthReport,
  HealthIssue,
  MindForgeEvent,
  CommandOptions,
} from './types';

export const VERSION = '0.6.0';
