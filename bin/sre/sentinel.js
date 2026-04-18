/**
 * MindForge v9.0.0 — Observability Sentinel (Pillar XX)
 * Monitors for specific incident signals, primarily "Sensitive Data Exposure" in traces.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const remediationQueue = require('../revops/remediation-queue');

class Sentinel {
  constructor(options = {}) {
    this.auditPath = options.auditPath || path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
    this.logPath = options.logPath || path.join(process.cwd(), 'logs', 'app.log');
    this.isMonitoring = false;
    
    // Hackathon Signal: Patterns that indicate potential sensitive data leak
    this.ANOMALY_PATTERNS = [
      /sk-ant-[\w-]{10,}/,          // Anthropic Secret Key
      /AIza[\w-]{35}/,              // Google API Key
      /EY[\w-]{10,}\.[\w-]{10,}/,   // JWT-like structures
      /password\s*[:=]\s*["']?[\w@#!$%^&*]{6,}/i // Passwords in cleartext
    ];
  }

  /**
   * Starts the sentinel monitoring loop.
   */
  start() {
    console.log('📡 MindForge Sentinel: Monitoring for high-entropy anomalies...');
    this.isMonitoring = true;
    
    // Use fs.watch if available, or a simple interval for the audit trail
    if (fs.existsSync(this.auditPath)) {
      fs.watchFile(this.auditPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime > prev.mtime) {
          this.scanAuditTrail();
        }
      });
    }

    // Ensure logs directory exists
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Scans a specific audit trail for anomalies.
   * @param {string} specificPath - Optional path to scan
   * @returns {Object|null} The raised incident if found
   */
  async scanAudit(specificPath) {
    const targetPath = specificPath || this.auditPath;
    try {
      if (!fs.existsSync(targetPath)) return null;
      const content = fs.readFileSync(targetPath, 'utf8').trim().split('\n');
      const lastLine = content[content.length - 1];
      if (!lastLine) return null;

      const event = JSON.parse(lastLine);
      const textToScan = JSON.stringify(event);

      for (const pattern of this.ANOMALY_PATTERNS) {
        if (pattern.test(textToScan)) {
          return await this.raiseIncident('SENSITIVE_DATA_EXPOSURE', {
            pattern: pattern.toString(),
            event_id: event.id,
            trace_id: event.trace_id || event.span_id,
            severity: 'CRITICAL'
          }, targetPath);
        }
      }
    } catch (err) {
      console.error(`[Sentinel] Scan failed: ${err.message}`);
    }
    return null;
  }

  /**
   * Enqueues an incident into the remediation queue for self-healing.
   */
  async raiseIncident(type, details, targetPath) {
    const remediationId = `sre-${crypto.randomBytes(4).toString('hex')}`;
    console.warn(`🚨 SENTINEL ALERT: ${type} detected! (ID: ${remediationId})`);

    const task = {
      remediation_id: remediationId,
      type: 'SRE_INCIDENT',
      incident_type: type,
      strategy: 'SHADOW_REPLICATE_AND_PATCH',
      details,
      status: 'CRITICAL'
    };

    await remediationQueue.enqueue(task);
    
    // Log to audit trail that an incident was raised
    this.logToAudit({
      event: 'sre_incident_detected',
      incident_type: type,
      remediation_id: remediationId,
      severity: details.severity
    }, targetPath);

    return task;
  }

  logToAudit(event, targetPath) {
    const logEntry = {
      id: crypto.randomBytes(8).toString('hex'),
      timestamp: new Date().toISOString(),
      agent: 'mindforge-sentinel',
      ...event
    };
    fs.appendFileSync(targetPath || this.auditPath, JSON.stringify(logEntry) + '\n');
  }

  stop() {
    this.isMonitoring = false;
    fs.unwatchFile(this.auditPath);
    console.log('📡 MindForge Sentinel: Monitoring stopped.');
  }
}

module.exports = Sentinel;
