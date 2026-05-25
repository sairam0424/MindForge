/**
 * MindForge SDK — Public API
 * @module @mindforge/sdk
 */

export { MindForgeClient } from './client';
export { MindForgeEventStream } from './events';
export { commands } from './commands';
export { MindForgeMemory } from './memory';
export type { CommandOptions } from './commands';
export type {
  MindForgeConfig,
  PhaseResult,
  TaskResult,
  SecurityFinding,
  GateResult,
  HealthReport,
  HealthIssue,
  MindForgeEvent,
  AuditLogEntry,
  WaveExecutionResult,
  MigrationResult,
} from './types';

export const VERSION = '10.0.6';
