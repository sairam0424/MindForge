/**
 * MindForge SDK — Main Client
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import type {
  MindForgeConfig, HealthReport, AuditLogEntry,
  StreamChunk, StreamingExecutionResult, BatchExecutionRequest, BatchExecutionResult
} from './types';
import { WebSocketEventStream } from './events';

export class MindForgeClient extends EventEmitter {
  private config: Required<MindForgeConfig>;
  private projectRoot: string;

  constructor(config: MindForgeConfig = {}) {
    super();
    this.projectRoot = config.projectRoot ?? process.cwd();
    this.config = {
      projectRoot:    this.projectRoot,
      apiKey:         config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '',
      ciMode:         config.ciMode ?? (process.env.CI === 'true'),
      outputFormat:   config.outputFormat ?? 'json',
      taskTimeoutMs:  config.taskTimeoutMs ?? 600_000,
    };
  }
  // ── Project state ──────────────────────────────────────────────────────────
  isInitialised(): boolean {
    return fs.existsSync(path.join(this.projectRoot, '.planning', 'PROJECT.md'));
  }

  readState(): Record<string, unknown> | null {
    const statePath = path.join(this.projectRoot, '.planning', 'STATE.md');
    if (!fs.existsSync(statePath)) return null;
    return { raw: fs.readFileSync(statePath, 'utf8') };
  }

  readHandoff(): Record<string, unknown> | null {
    const handoffPath = path.join(this.projectRoot, '.planning', 'HANDOFF.json');
    if (!fs.existsSync(handoffPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
    } catch {
      return null;
    }
  }

  // ── Health check ───────────────────────────────────────────────────────────
  async health(): Promise<HealthReport> {
    const errors:   Array<{ category: string; message: string; autoRepairable: boolean }> = [];
    const warnings: Array<{ category: string; message: string; autoRepairable: boolean }> = [];
    const info:     Array<{ category: string; message: string; autoRepairable: boolean }> = [];

    const requiredFiles = [
      '.planning/STATE.md',
      '.planning/HANDOFF.json',
      '.planning/AUDIT.jsonl',
      '.mindforge/org/CONVENTIONS.md',
    ];

    for (const file of requiredFiles) {
      const fullPath = path.join(this.projectRoot, file);
      if (!fs.existsSync(fullPath)) {
        warnings.push({ category: 'installation', message: `Missing: ${file}`, autoRepairable: false });
      }
    }

    // Check HANDOFF.json validity
    const handoff = this.readHandoff();
    if (handoff && !handoff.schema_version) {
      errors.push({ category: 'state', message: 'HANDOFF.json missing schema_version field', autoRepairable: false });
    }

    // Check AUDIT.jsonl
    const auditPath = path.join(this.projectRoot, '.planning', 'AUDIT.jsonl');
    if (fs.existsSync(auditPath)) {
      const lineCount = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean).length;
      if (lineCount > 9000) {
        warnings.push({ category: 'audit', message: `AUDIT.jsonl has ${lineCount} lines — archive soon`, autoRepairable: true });
      }
      info.push({ category: 'audit', message: `AUDIT.jsonl: ${lineCount} entries`, autoRepairable: false });
    }

    return {
      overallStatus: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'healthy',
      errors,
      warnings,
      informational: info,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Audit log reading ──────────────────────────────────────────────────────
  readAuditLog(filter?: { event?: string; phase?: number; since?: Date }): AuditLogEntry[] {
    const auditPath = path.join(this.projectRoot, '.planning', 'AUDIT.jsonl');
    if (!fs.existsSync(auditPath)) return [];

    return fs.readFileSync(auditPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line: string) => { try { return JSON.parse(line) as AuditLogEntry; } catch { return null; } })
      .filter((entry: AuditLogEntry | null): entry is AuditLogEntry => !!entry)
      .filter(entry => {
        if (filter?.event && entry.event !== filter.event) return false;
        if (filter?.phase !== undefined && entry.phase !== filter.phase) return false;
        if (filter?.since && new Date(entry.timestamp) < filter.since) return false;
        return true;
      });
  }

  // ── Metrics reading ────────────────────────────────────────────────────────
  readSessionMetrics(limit = 10): unknown[] {
    const metricsPath = path.join(this.projectRoot, '.mindforge', 'metrics', 'session-quality.jsonl');
    if (!fs.existsSync(metricsPath)) return [];

    return fs.readFileSync(metricsPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .slice(-limit)
      .map((line: string) => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean);
  }

  // ── Config validation ──────────────────────────────────────────────────────
  validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const configPath = path.join(this.projectRoot, 'MINDFORGE.md');
    if (!fs.existsSync(configPath)) {
      return { valid: false, errors: ['MINDFORGE.md not found at project root'], warnings: [] };
    }

    const content = fs.readFileSync(configPath, 'utf8');

    // Required fields that must be present in a valid MINDFORGE.md
    const requiredFields = [
      { key: 'VERSION', pattern: /\[VERSION\]\s*=\s*.+/ },
      { key: 'REACTIVE_MODE', pattern: /\[REACTIVE_MODE\]\s*=\s*.+/ },
      { key: 'PLANNER', pattern: /\[PLANNER\]\s*=\s*.+/ },
      { key: 'EXECUTOR', pattern: /\[EXECUTOR\]\s*=\s*.+/ },
      { key: 'MIN_SOUL_SCORE', pattern: /\[MIN_SOUL_SCORE\]\s*=\s*.+/ },
    ];

    for (const field of requiredFields) {
      if (!field.pattern.test(content)) {
        errors.push(`Missing required field: [${field.key}]`);
      }
    }

    // Recommended fields — warn if missing
    const recommendedFields = [
      { key: 'COST_WARN_USD', pattern: /\[COST_WARN_USD\]\s*=\s*.+/ },
      { key: 'COST_HARD_LIMIT_USD', pattern: /\[COST_HARD_LIMIT_USD\]\s*=\s*.+/ },
      { key: 'BLOCK_ON_SECURITY', pattern: /\[BLOCK_ON_SECURITY\]\s*=\s*.+/ },
    ];

    for (const field of recommendedFields) {
      if (!field.pattern.test(content)) {
        warnings.push(`Recommended field missing: [${field.key}]`);
      }
    }

    // Schema-based validation if schema file exists
    const schemaPath = path.join(this.projectRoot, '.mindforge', 'MINDFORGE-SCHEMA.json');
    if (fs.existsSync(schemaPath)) {
      try {
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        const nonOverridableKeys = Object.entries(schema.properties ?? {})
          .filter(([, def]: [string, unknown]) => (def as Record<string, unknown>).nonOverridable === true)
          .map(([key]) => key);

        for (const key of nonOverridableKeys) {
          // Non-overridable fields must not be set to false
          const disabledPattern = new RegExp(`\\[${key}\\]\\s*=\\s*false`, 'i');
          if (disabledPattern.test(content)) {
            errors.push(`Non-overridable field [${key}] cannot be disabled`);
          }
        }
      } catch {
        warnings.push('MINDFORGE-SCHEMA.json exists but could not be parsed');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ── v9 Pillar XXIV: Wave execution status ─────────────────────────────────
  readAutoState(): Record<string, unknown> | null {
    const statePath = path.join(this.projectRoot, '.planning', 'auto-state.json');
    if (!fs.existsSync(statePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch {
      return null;
    }
  }

  // ── v9 Pillar XXVI: Knowledge query ───────────────────────────────────────
  getDbPath(): string {
    return path.join(this.projectRoot, '.mindforge', 'celestial.db');
  }

  isDatabaseInitialized(): boolean {
    return fs.existsSync(this.getDbPath());
  }

  // ── v11 Phase 5B: Streaming execution ─────────────────────────────────────
  async streamExecution(phase: number, options?: { taskFilter?: string }): Promise<StreamingExecutionResult> {
    const eventSource = new WebSocketEventStream();
    await eventSource.connect();

    const chunks: StreamChunk[] = [];
    let resolveNext: ((value: IteratorResult<StreamChunk>) => void) | null = null;

    eventSource.on('stream_chunk', (data: StreamChunk) => {
      if (resolveNext) {
        resolveNext({ value: data, done: data.type === 'done' });
        resolveNext = null;
      } else {
        chunks.push(data);
      }
    });

    const stream: AsyncIterable<StreamChunk> = {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<StreamChunk>> {
            if (chunks.length > 0) {
              const chunk = chunks.shift()!;
              if (chunk.type === 'done') eventSource.disconnect();
              return Promise.resolve({ value: chunk, done: chunk.type === 'done' });
            }
            return new Promise(resolve => { resolveNext = resolve; });
          },
          return(): Promise<IteratorResult<StreamChunk>> {
            eventSource.disconnect();
            return Promise.resolve({ value: undefined as unknown as StreamChunk, done: true });
          }
        };
      }
    };

    return { phaseId: phase, taskId: options?.taskFilter || '*', stream };
  }

  // ── v11 Phase 5B: Batch execution with semaphore-based concurrency ────────
  async batchExecute(request: BatchExecutionRequest): Promise<BatchExecutionResult> {
    const startTime = Date.now();
    const maxConcurrency = request.maxConcurrency || 3;
    const results: BatchExecutionResult['results'] = [];

    let running = 0;
    const queue = [...request.tasks];

    await new Promise<void>((resolve) => {
      const processNext = () => {
        if (queue.length === 0 && running === 0) {
          resolve();
          return;
        }
        while (running < maxConcurrency && queue.length > 0) {
          const task = queue.shift()!;
          running++;
          this.executeCommand(task.command, task.options)
            .then(result => {
              results.push({ taskId: task.id, status: 'fulfilled', result });
            })
            .catch(error => {
              results.push({ taskId: task.id, status: 'rejected', error: error.message });
            })
            .finally(() => {
              running--;
              processNext();
            });
        }
      };
      processNext();
    });

    return { results, totalDurationMs: Date.now() - startTime };
  }

  // ── v11 Phase 5B: Runtime config validation ───────────────────────────────
  validateRuntimeConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!this.config.projectRoot) errors.push('projectRoot is required');
    if (this.config.taskTimeoutMs && this.config.taskTimeoutMs < 0) errors.push('taskTimeoutMs must be positive');
    return { valid: errors.length === 0, errors };
  }

  private async executeCommand(command: string, options?: Record<string, unknown>): Promise<unknown> {
    return { command, options, executed: true };
  }
}
