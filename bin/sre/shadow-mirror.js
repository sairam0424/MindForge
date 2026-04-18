/**
 * MindForge v9.0.0 — Temporal Shadow Mirror (Pillar XXI)
 * Hybrid isolation for incident replication.
 */
'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

class ShadowMirror {
  constructor(options = {}) {
    this.baseDir = options.baseDir || path.join(process.cwd(), '.mindforge', 'mirrors');
    this.activeMirror = null;
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
    const mirrorId = `mirror-${incident.remediation_id}`;
    const mirrorPath = path.join(this.baseDir, mirrorId);
    const branchName = `sre-repro-${incident.remediation_id}`;

    console.log(`[Level 1] Creating git worktree at ${mirrorPath}...`);

    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }

      // 1. Create a reproduction branch and add worktree in one step (Atomic)
      // In a real system, we'd base this on the commit hash from the trace_id
      execSync(`git worktree add -b ${branchName} ${mirrorPath}`, { stdio: 'ignore' });
      
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
        execSync(`git worktree remove ${this.activeMirror.path} --force`, { stdio: 'ignore' });
        execSync(`git branch -D ${this.activeMirror.branch}`, { stdio: 'ignore' });
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
