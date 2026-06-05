"use strict";
/* eslint-disable */
// @generated — VENDORED from sdk/src by scripts/vendor-sdk-into-mcp.js. DO NOT EDIT.
// Edit the canonical file under sdk/src and re-run the vendoring script.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MindForgeClient = void 0;
/**
 * MindForge SDK — Main Client
 */
const events_1 = require("events");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const events_2 = require("./events");
class MindForgeClient extends events_1.EventEmitter {
    constructor(config = {}) {
        super();
        this.projectRoot = config.projectRoot ?? process.cwd();
        this.config = {
            projectRoot: this.projectRoot,
            apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '',
            ciMode: config.ciMode ?? (process.env.CI === 'true'),
            outputFormat: config.outputFormat ?? 'json',
            taskTimeoutMs: config.taskTimeoutMs ?? 600000,
        };
    }
    // ── Project state ──────────────────────────────────────────────────────────
    isInitialised() {
        return fs.existsSync(path.join(this.projectRoot, '.planning', 'PROJECT.md'));
    }
    readState() {
        const statePath = path.join(this.projectRoot, '.planning', 'STATE.md');
        if (!fs.existsSync(statePath))
            return null;
        return { raw: fs.readFileSync(statePath, 'utf8') };
    }
    readHandoff() {
        const handoffPath = path.join(this.projectRoot, '.planning', 'HANDOFF.json');
        if (!fs.existsSync(handoffPath))
            return null;
        try {
            return JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
        }
        catch {
            return null;
        }
    }
    // ── Health check ───────────────────────────────────────────────────────────
    async health() {
        const errors = [];
        const warnings = [];
        const info = [];
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
    readAuditLog(filter) {
        const auditPath = path.join(this.projectRoot, '.planning', 'AUDIT.jsonl');
        if (!fs.existsSync(auditPath))
            return [];
        return fs.readFileSync(auditPath, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map((line) => { try {
            return JSON.parse(line);
        }
        catch {
            return null;
        } })
            .filter((entry) => !!entry)
            .filter(entry => {
            if (filter?.event && entry.event !== filter.event)
                return false;
            if (filter?.phase !== undefined && entry.phase !== filter.phase)
                return false;
            if (filter?.since && new Date(entry.timestamp) < filter.since)
                return false;
            return true;
        });
    }
    // ── Metrics reading ────────────────────────────────────────────────────────
    readSessionMetrics(limit = 10) {
        const metricsPath = path.join(this.projectRoot, '.mindforge', 'metrics', 'session-quality.jsonl');
        if (!fs.existsSync(metricsPath))
            return [];
        return fs.readFileSync(metricsPath, 'utf8')
            .split('\n')
            .filter(Boolean)
            .slice(-limit)
            .map((line) => { try {
            return JSON.parse(line);
        }
        catch {
            return null;
        } })
            .filter(Boolean);
    }
    // ── Config validation ──────────────────────────────────────────────────────
    validateConfig() {
        const errors = [];
        const warnings = [];
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
                    .filter(([, def]) => def.nonOverridable === true)
                    .map(([key]) => key);
                for (const key of nonOverridableKeys) {
                    // Non-overridable fields must not be set to false
                    const disabledPattern = new RegExp(`\\[${key}\\]\\s*=\\s*false`, 'i');
                    if (disabledPattern.test(content)) {
                        errors.push(`Non-overridable field [${key}] cannot be disabled`);
                    }
                }
            }
            catch {
                warnings.push('MINDFORGE-SCHEMA.json exists but could not be parsed');
            }
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    // ── v9 Pillar XXIV: Wave execution status ─────────────────────────────────
    readAutoState() {
        const statePath = path.join(this.projectRoot, '.planning', 'auto-state.json');
        if (!fs.existsSync(statePath))
            return null;
        try {
            return JSON.parse(fs.readFileSync(statePath, 'utf8'));
        }
        catch {
            return null;
        }
    }
    // ── v9 Pillar XXVI: Knowledge query ───────────────────────────────────────
    getDbPath() {
        return path.join(this.projectRoot, '.mindforge', 'celestial.db');
    }
    isDatabaseInitialized() {
        return fs.existsSync(this.getDbPath());
    }
    // ── v11 Phase 5B: Streaming execution ─────────────────────────────────────
    async streamExecution(phase, options) {
        const eventSource = new events_2.WebSocketEventStream();
        await eventSource.connect();
        const chunks = [];
        let resolveNext = null;
        eventSource.on('stream_chunk', (data) => {
            if (resolveNext) {
                resolveNext({ value: data, done: data.type === 'done' });
                resolveNext = null;
            }
            else {
                chunks.push(data);
            }
        });
        const stream = {
            [Symbol.asyncIterator]() {
                return {
                    next() {
                        if (chunks.length > 0) {
                            const chunk = chunks.shift();
                            if (chunk.type === 'done')
                                eventSource.disconnect();
                            return Promise.resolve({ value: chunk, done: chunk.type === 'done' });
                        }
                        return new Promise(resolve => { resolveNext = resolve; });
                    },
                    return() {
                        eventSource.disconnect();
                        return Promise.resolve({ value: undefined, done: true });
                    }
                };
            }
        };
        return { phaseId: phase, taskId: options?.taskFilter || '*', stream };
    }
    // ── v11 Phase 5B: Batch execution with semaphore-based concurrency ────────
    async batchExecute(request) {
        const startTime = Date.now();
        const maxConcurrency = request.maxConcurrency || 3;
        const results = [];
        let running = 0;
        const queue = [...request.tasks];
        await new Promise((resolve) => {
            const processNext = () => {
                if (queue.length === 0 && running === 0) {
                    resolve();
                    return;
                }
                while (running < maxConcurrency && queue.length > 0) {
                    const task = queue.shift();
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
    validateRuntimeConfig() {
        const errors = [];
        if (!this.config.projectRoot)
            errors.push('projectRoot is required');
        if (this.config.taskTimeoutMs && this.config.taskTimeoutMs < 0)
            errors.push('taskTimeoutMs must be positive');
        return { valid: errors.length === 0, errors };
    }
    executeCommand(command, options) {
        const args = Array.isArray(options?.args) ? options.args : [];
        const cwd = options?.cwd ?? this.projectRoot;
        const timeoutMs = this.config.taskTimeoutMs;
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)(command, args, { cwd, shell: false });
            let stdout = '';
            let stderr = '';
            let settled = false;
            const timer = setTimeout(() => {
                if (settled)
                    return;
                child.kill('SIGTERM');
                setTimeout(() => { if (!child.killed)
                    child.kill('SIGKILL'); }, 2000).unref();
                settled = true;
                reject(new Error(`Command timed out after ${timeoutMs}ms: ${command}`));
            }, timeoutMs);
            timer.unref();
            child.stdout?.on('data', (d) => { stdout += d.toString(); });
            child.stderr?.on('data', (d) => { stderr += d.toString(); });
            child.on('error', (err) => {
                if (settled)
                    return;
                clearTimeout(timer);
                settled = true;
                reject(err);
            });
            child.on('close', (code) => {
                if (settled)
                    return;
                clearTimeout(timer);
                settled = true;
                resolve({ stdout, stderr, exitCode: code ?? -1 });
            });
        });
    }
}
exports.MindForgeClient = MindForgeClient;
