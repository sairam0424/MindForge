/**
 * MindForge SDK — Type Definitions
 */

export interface MindForgeConfig {
  /** Path to the project root (default: cwd) */
  projectRoot?: string;
  /** Claude API key (default: ANTHROPIC_API_KEY env var) */
  apiKey?: string;
  /** CI mode — disables interactive features */
  ciMode?: boolean;
  /** Output format for events */
  outputFormat?: 'json' | 'text' | 'github-annotations';
  /** Timeout per task in milliseconds (default: 600000 — 10 minutes) */
  taskTimeoutMs?: number;
}

export interface PhaseResult {
  phase: number;
  status: 'success' | 'failure' | 'warning' | 'skipped';
  tasksCompleted: number;
  tasksTotal: number;
  commits: string[];
  securityFindings: SecurityFinding[];
  qualityGateResults: GateResult[];
  durationMs: number;
  errorMessage?: string;
}

export interface TaskResult {
  planId: string;
  taskName: string;
  status: 'completed' | 'failed' | 'skipped';
  commitSha?: string;
  verifyOutput?: string;
  durationMs: number;
  errorMessage?: string;
}

export interface SecurityFinding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  owaspCategory: string;
  file: string;
  line: number;
  description: string;
  remediation: string;
  remediated: boolean;
}

export interface GateResult {
  gate: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  detail?: string;
}

export interface HealthReport {
  overallStatus: 'healthy' | 'warning' | 'error';
  errors: HealthIssue[];
  warnings: HealthIssue[];
  informational: HealthIssue[];
  timestamp: string;
}

export interface HealthIssue {
  category: string;
  message: string;
  autoRepairable: boolean;
  fixCommand?: string;
}

export type MindForgeEvent =
  | { type: 'task_started';   phase: number; plan: string; taskName: string }
  | { type: 'task_completed'; phase: number; plan: string; commitSha: string }
  | { type: 'task_failed';    phase: number; plan: string; error: string }
  | { type: 'wave_started';   phase: number; wave: number; taskCount: number }
  | { type: 'wave_completed'; phase: number; wave: number }
  | { type: 'phase_completed'; phase: number; result: PhaseResult }
  | { type: 'security_finding'; finding: SecurityFinding }
  | { type: 'gate_result';    gate: GateResult }
  | { type: 'log';            level: 'info' | 'warn' | 'error'; message: string };

export interface AuditLogEntry {
  timestamp: string;
  event: string;
  phase?: number;
  [key: string]: unknown;
}
