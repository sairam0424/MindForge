/**
 * MindForge v9.0.0 — Temporal Shadow Mirror (Pillar XXI)
 *
 * Incident replication via git-worktree isolation.
 *
 * ISOLATION HONESTY (audit finding #24 / UC-22):
 * This module provides GIT WORKTREE isolation only — a separate working tree
 * and branch off the current repo. It does NOT provide container/Docker
 * isolation (no separate kernel, network, filesystem, or process namespaces).
 * A `docker --version` probe gates an "enhanced" path, but that path still runs
 * in a git worktree; real Docker orchestration (build/run/mount) is a
 * NOT-YET-IMPLEMENTED future enhancement. The returned mirror is always a
 * worktree, and `activeMirror.isolation` reports the actual level provided.
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

    // All replication currently runs in a git worktree (see file header).
    // For CRITICAL incidents where a Docker toolchain is present we note that a
    // future container-isolation path could be used, but we DO NOT claim to run
    // it — we still replicate in a worktree and label it honestly.
    const wantsContainer = incident.details?.severity === 'CRITICAL' && this.isDockerAvailable();

    if (wantsContainer) {
      return this.replicateCriticalWorktree(incident);
    }
    return this.replicateLevel1(incident);
  }

  /**
   * Level 1 Replication: Git Worktree
   * High-speed, lightweight logic isolation (NOT container isolation).
   *
   * Provides a separate working tree + branch off the current repo. This
   * isolates source/logic changes; it shares the host kernel, network,
   * filesystem and process namespaces with the running engine.
   */
  async replicateLevel1(incident) {
    const mirrorId = `mirror-${incident.remediation_id}`;
    const mirrorPath = path.join(this.baseDir, mirrorId);
    const branchName = `sre-repro-${incident.remediation_id}`;

    console.log(`[worktree] Creating git worktree at ${mirrorPath}...`);

    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }

      // 1. Create a reproduction branch and add worktree in one step (Atomic)
      // In a real system, we'd base this on the commit hash from the trace_id
      execSync(`git worktree add -b ${branchName} ${mirrorPath}`, { stdio: 'ignore' });

      this.activeMirror = {
        path: mirrorPath,
        branch: branchName,
        type: 'worktree-isolation',
        // Honest disclosure of the isolation actually provided.
        isolation: 'git-worktree',
      };

      // 3. Inject incident metadata for the agent to use
      fs.writeFileSync(path.join(mirrorPath, 'REPLICATION.json'), JSON.stringify(incident, null, 2));

      return mirrorPath;
    } catch (err) {
      console.error(`[ShadowMirror] worktree replication failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * CRITICAL-incident replication when a Docker toolchain is detected.
   *
   * HONESTY: This still replicates in a GIT WORKTREE. It does not build or run
   * a container, does not mount any volume, and does not provide container
   * isolation. Real Docker sandboxing (build/run/mount) is a NOT-YET-IMPLEMENTED
   * enhancement tracked separately; until it lands, this path is identical in
   * isolation guarantees to {@link replicateLevel1} and is labelled as such.
   */
  async replicateCriticalWorktree(incident) {
    console.log('[worktree] CRITICAL incident: replicating in git worktree (container isolation not implemented).');
    const mirrorPath = await this.replicateLevel1(incident);

    // Note the unimplemented future path without claiming it ran.
    this.activeMirror.dockerAvailable = true;
    this.activeMirror.note =
      'docker binary detected; real container isolation is a future enhancement — this mirror used git-worktree isolation only';

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
      // Every mirror this module produces is a git worktree (see replicate()).
      // Accept the legacy 'worktree'/'docker-hybrid' labels for backward compat
      // in case an older serialized mirror is handed in.
      const worktreeTypes = ['worktree-isolation', 'worktree', 'docker-hybrid'];
      if (worktreeTypes.includes(this.activeMirror.type)) {
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
