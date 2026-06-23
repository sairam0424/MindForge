/**
 * MindForge SDK — Public API
 * @module @mindforge/sdk
 */

export { MindForgeClient } from './client';
export { MindForgeEventStream, WebSocketEventStream } from './events';
export { commands, batch } from './commands';
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
  StreamChunk,
  StreamingExecutionResult,
  BatchExecutionRequest,
  BatchExecutionResult,
} from './types';

export const VERSION = '11.7.1';
