/**
 * MindForge Nexus — Legacy Shim (v5.9.0)
 * 
 * This file acts as a compatibility layer for the v4.1.0-alpha.nexus ART protocol.
 * ALL core tracing logic has been migrated to /bin/engine/nexus-tracer.js for 
 * production-grade performance and security hardening.
 */

'use strict';

module.exports = require('../../bin/engine/nexus-tracer');
