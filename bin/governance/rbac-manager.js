/**
 * MindForge v5 — Agentic RBAC Manager
 * Maps Agent DIDs to specific project roles and granular permissions.
 */
'use strict';

const fs    = require('node:fs');
const path  = require('node:path');
const ztai  = require('./ztai-manager');

class RBACManager {
  constructor(config = {}) {
    this.rolesPath = config.rolesPath || path.join(process.cwd(), '.planning/AGENT-ROLES.json');
    this.defaultRoles = {
      'did:mindforge:planner': ['lead-architect', 'resource-optimizer'],
      'did:mindforge:executor': ['developer', 'test-automator'],
      'did:mindforge:reviewer': ['security-auditor', 'compliance-checker'],
      'did:mindforge:researcher': ['knowledge-detective'],
      'did:mindforge:tool': ['system-operator']
    };
    this.temporaryElevations = new Map(); // key: `${did}:${role}`, value: { timer, expiresAt }
  }

  /**
   * Gets the roles assigned to a specific agent DID.
   * @param {string} did 
   */
  getRoles(did) {
    const roles = this.loadRoles();
    // Return explicit roles OR default roles based on persona-matched DIDs
    const explicit = roles[did];
    if (explicit) return explicit;

    // Default mapping (regex for persona-based DIDs)
    for (const [pattern, defaultRoles] of Object.entries(this.defaultRoles)) {
      if (did.includes(pattern)) return defaultRoles;
    }

    return ['guest-agent'];
  }

  /**
   * [HARDEN] Dynamically binds roles based on ZTAI trust tiers if no explicit role exists.
   * Ensures high-trust agents automatically get architect-level visibility.
   */
  async getRolesByTier(did) {
    const manager = new ztai();
    const identity = await manager.getIdentity();
    const explicit = this.getRoles(did);

    if (identity.tier >= 3) {
      return [...new Set([...explicit, 'lead-architect'])];
    }
    if (identity.tier >= 2) {
      return [...new Set([...explicit, 'developer'])];
    }
    return explicit;
  }

  loadRoles() {
    if (!fs.existsSync(this.rolesPath)) return {};
    try {
      return JSON.parse(fs.readFileSync(this.rolesPath, 'utf8'));
    } catch {
      return {};
    }
  }

  /**
   * Assigns a role to an agent.
   */
  assignRole(did, roles) {
    const current = this.loadRoles();
    current[did] = Array.isArray(roles) ? roles : [roles];
    fs.writeFileSync(this.rolesPath, JSON.stringify(current, null, 2));
    console.log(`[RBAC] Assigned roles [${roles}] to agent ${did}`);
  }

  /**
   * Revokes all roles for an agent.
   */
  revokeRoles(did) {
    const current = this.loadRoles();
    delete current[did];
    fs.writeFileSync(this.rolesPath, JSON.stringify(current, null, 2));
  }

  /**
   * Temporarily elevates an agent to a role for a limited duration.
   * The elevation auto-expires after ttlMs milliseconds.
   * @param {string} did - Agent DID
   * @param {string} role - Role to temporarily grant
   * @param {number} ttlMs - Time-to-live in milliseconds (default: 1 hour)
   */
  elevateRole(did, role, ttlMs = 3600000) {
    const key = `${did}:${role}`;

    // Clear existing elevation if any
    if (this.temporaryElevations.has(key)) {
      clearTimeout(this.temporaryElevations.get(key).timer);
    }

    const timer = setTimeout(() => {
      this.temporaryElevations.delete(key);
    }, ttlMs);

    // Prevent timer from keeping process alive
    if (timer.unref) timer.unref();

    this.temporaryElevations.set(key, {
      timer,
      expiresAt: Date.now() + ttlMs
    });

    return { did, role, expiresAt: Date.now() + ttlMs };
  }

  /**
   * Checks if an agent currently has a temporary role elevation.
   * @param {string} did - Agent DID
   * @param {string} role - Role to check
   */
  hasTemporaryElevation(did, role) {
    const key = `${did}:${role}`;
    const elevation = this.temporaryElevations.get(key);
    if (!elevation) return false;
    if (Date.now() > elevation.expiresAt) {
      clearTimeout(elevation.timer);
      this.temporaryElevations.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Revokes a temporary elevation before its TTL expires.
   * @param {string} did - Agent DID
   * @param {string} role - Role to revoke
   */
  revokeElevation(did, role) {
    const key = `${did}:${role}`;
    const elevation = this.temporaryElevations.get(key);
    if (elevation) {
      clearTimeout(elevation.timer);
      this.temporaryElevations.delete(key);
    }
  }

  /**
   * Checks if an agent has a specific permission based on their roles.
   * Also checks temporary elevations.
   * @param {string} did
   * @param {string} permission
   */
  hasPermission(did, permission) {
    const roles = this.getRoles(did);
    const PERMISSION_MAP = {
      'lead-architect': ['write_architecture', 'approve_adr', 'global_sync_push'],
      'developer':      ['write_src', 'read_src', 'execute_tests'],
      'security-auditor': ['read_security', 'write_audit_log', 'block_execution'],
      'system-operator': ['write_bin', 'modify_infrastructure'],
      'guest-agent':     ['read_src']
    };

    // Check static roles first
    for (const role of roles) {
      if (PERMISSION_MAP[role]?.includes(permission)) return true;
    }

    // Check temporary elevations
    for (const [role, permissions] of Object.entries(PERMISSION_MAP)) {
      if (permissions.includes(permission) && this.hasTemporaryElevation(did, role)) {
        return true;
      }
    }

    return false;
  }
}

module.exports = RBACManager;
