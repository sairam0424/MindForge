/**
 * MindForge SDK — Main Client
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import type {
  MindForgeConfig, HealthReport, AuditLogEntry
} from './types';

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
    const configPath = path.join(this.projectRoot, 'MINDFORGE.md');
    if (!fs.existsSync(configPath)) {
      return { valid: true, errors: [], warnings: ['MINDFORGE.md not found — using defaults'] };
    }
    return { valid: true, errors: [], warnings: [] };
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
}
