/**
 * MindForge v3 — Hindsight Injector
 * Manages state rollbacks and autonomous re-triggering.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const TemporalHub = require('./engine/temporal-hub');

class HindsightInjector {
  /**
   * Rollback state to T_n and prepare for re-execution.
   * @param {string} auditId - The point to rollback to.
   * @param {string} fixDescription - Description of the correction being injected.
   */
  static async inject(auditId, fixDescription) {
    console.log(`[hindsight] Injecting fix at ${auditId}: "${fixDescription}"`);

    try {
      // 1. Rollback .planning directory
      TemporalHub.rollbackTo(auditId);

      // 2. Append the "Hindsight" event to AUDIT.jsonl via the unified, hash-chained,
      //    durable append (UC-04b) so this entry links into the single verifiable chain.
      const { appendAuditEntrySync } = require('./autonomous/audit-writer');
      const auditPath = path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
      const hindsightEvent = appendAuditEntrySync(auditPath, {
        event:       'hindsight_injected',
        target_id:   auditId,
        description: fixDescription,
        agent:       'temporal-hub'
      });

      // 3. Mark the state as "ready_for_regeneration"
      const statePath = path.join(process.cwd(), '.planning', 'auto-state.json');
      if (fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        state.status = 'awaiting_regeneration';
        state.last_hindsight = hindsightEvent.id;
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      }

      // 4. Capture the new state immediately
      await TemporalHub.captureState(hindsightEvent.id, {
        event: 'hindsight_injected',
        target_id: auditId
      });

      return { success: true, event: hindsightEvent };
    } catch (err) {
      console.error('[hindsight] Injection failed:', err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = HindsightInjector;
