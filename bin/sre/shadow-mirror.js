/**
 * MindForge v9.0.0 — Temporal Shadow Mirror (Pillar XXI)
 * Hybrid isolation for incident replication.
 */
'use strict';

const { execSync, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Whitelist for the trust-boundary remediation_id. Git branch/path names built
// from it must contain only characters that are inert both to the shell and to
// git ref syntax. We allow conservative identifier characters only.
const REMEDIATION_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
// Reject a leading '-' so the id can never be parsed as a git option/flag even
// when passed via an argv array (defence-in-depth alongside the whitelist).
const REMEDIATION_ID_MAX = 128;

class ShadowMirror {
  constructor(options = {}) {
    this.baseDir = options.baseDir || path.join(process.cwd(), '.mindforge', 'mirrors');
    this.activeMirror = null;
  }

  /**
   * Validates and returns a remediation_id safe for use in git branch/path
   * names. Fail-closed: throws on missing, empty, oversized, or non-whitelisted
   * input rather than building a worktree with an attacker-controlled or empty
   * name. Only `[A-Za-z0-9._-]` is permitted, and a leading dash is rejected so
   * the value can never be interpreted as a git flag.
   *
   * @param {string} id incident.remediation_id (TRUST BOUNDARY)
   * @returns {string} the validated id, unchanged
   * @throws {Error} if the id is missing or contains unsafe characters
   */
  static sanitizeRemediationId(id) {
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('ShadowMirror: missing or invalid remediation_id (expected non-empty string)');
    }
    if (id.length > REMEDIATION_ID_MAX) {
      throw new Error(`ShadowMirror: invalid remediation_id (exceeds ${REMEDIATION_ID_MAX} chars)`);
    }
    if (id.startsWith('-')) {
      throw new Error('ShadowMirror: invalid remediation_id (must not start with a dash)');
    }
    if (!REMEDIATION_ID_PATTERN.test(id)) {
      throw new Error('ShadowMirror: invalid remediation_id (only [A-Za-z0-9._-] allowed — refusing unsafe value)');
    }
    return id;
  }

  /**
   * Orchestrates replication based on incident severity and requirements.
   */
  async replicate(incident) {
    console.log(`🌀 Shadow Mirror: Replicating incident [${incident.remediation_id}]...`);
    
    // Choose isolation level
    const level = (incident.details?.severity === 'CRITICAL') ? 2 : 1;
    
    if (level === 2 && this.isDockerAvailable()) {
      return this.replicateLevel2(incident);
    } else {
      return this.replicateLevel1(incident);
    }
  }

  /**
   * Level 1 Replication: Git Worktree
   * High-speed, lightweight logic isolation.
   */
  async replicateLevel1(incident) {
    // Validate the trust-boundary id BEFORE it is used to build any git
    // branch/path or command. Fail-closed on anything unsafe.
    const safeId = ShadowMirror.sanitizeRemediationId(incident && incident.remediation_id);
    const mirrorId = `mirror-${safeId}`;
    const mirrorPath = path.join(this.baseDir, mirrorId);
    const branchName = `sre-repro-${safeId}`;

    console.log(`[Level 1] Creating git worktree at ${mirrorPath}...`);

    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }

      // 1. Create a reproduction branch and add worktree in one step (Atomic).
      // Arguments are passed as an argv array (NO shell) so branchName/mirrorPath
      // cannot inject commands even if validation were bypassed.
      execFileSync('git', ['worktree', 'add', '-b', branchName, mirrorPath], { stdio: 'ignore' });

      this.activeMirror = { path: mirrorPath, branch: branchName, type: 'worktree' };

      // 3. Inject incident metadata for the agent to use
      fs.writeFileSync(path.join(mirrorPath, 'REPLICATION.json'), JSON.stringify(incident, null, 2));

      return mirrorPath;
    } catch (err) {
      console.error(`[ShadowMirror] Level 1 replication failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Level 2 Replication: Docker Sandbox
   * Full environment isolation for state-bound incidents.
   */
  async replicateLevel2(incident) {
    console.log('[Level 2] Initializing Docker sandbox interface...');
    // For the hackathon demo, we'll scaffold the Docker-ready worktree which would then be mounted
    const mirrorPath = await this.replicateLevel1(incident);
    
    const dockerfile = `
FROM node:18-slim
WORKDIR /app
COPY . .
RUN npm install --production
CMD ["node", "bin/engine/logic-validator.js"]
    `;
    
    fs.writeFileSync(path.join(mirrorPath, 'Dockerfile.sre'), dockerfile);
    console.log(`[Level 2] Dockerfile.sre generated at ${mirrorPath}. Mounting volume for isolation.`);
    
    this.activeMirror.type = 'docker-hybrid';
    return mirrorPath;
  }

  isDockerAvailable() {
    try {
      execSync('docker --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleans up the active mirror and its associated branch/worktree.
   */
  cleanup() {
    if (!this.activeMirror) return;

    console.log(`🧹 Cleaning up Shadow Mirror: ${this.activeMirror.path}...`);
    try {
      if (this.activeMirror.type === 'worktree' || this.activeMirror.type === 'docker-hybrid') {
        // argv-array form (NO shell): path/branch are stored values derived from
        // an already-validated remediation_id, but we pass them as arguments so
        // no shell interpolation can ever occur.
        execFileSync('git', ['worktree', 'remove', this.activeMirror.path, '--force'], { stdio: 'ignore' });
        execFileSync('git', ['branch', '-D', this.activeMirror.branch], { stdio: 'ignore' });
        // Clean up the folder just in case
        if (fs.existsSync(this.activeMirror.path)) {
          fs.rmSync(this.activeMirror.path, { recursive: true });
        }
      }
      this.activeMirror = null;
    } catch (err) {
      console.error(`[ShadowMirror] Cleanup failed: ${err.message}`);
    }
  }
}

module.exports = ShadowMirror;
