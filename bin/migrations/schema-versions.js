/**
 * MindForge — Schema Version Registry
 * Documents every breaking schema change across all released versions.
 * Used by the migration engine to determine what migrations are needed.
 */
'use strict';

const SCHEMA_HISTORY = [
  {
    version: '0.1.0',
    date: '2026-01-01',
    description: 'Initial release',
    handoff_fields_added: [
      'schema_version', 'project', 'phase', 'plan', 'next_task',
      'blockers', 'decisions_needed', 'context_refs', '_warning', 'updated_at',
    ],
    handoff_fields_removed: [],
    audit_fields_added: ['id', 'timestamp', 'event', 'agent', 'phase'],
    breaking: [],
  },
  {
    version: '0.5.0',
    date: '2026-01-15',
    description: 'Intelligence layer — smart compaction adds structured fields',
    handoff_fields_added: [
      'decisions_made', 'discoveries', 'implicit_knowledge',
      'quality_signals', 'compaction_level', 'compaction_timestamp',
    ],
    handoff_fields_removed: [],
    audit_fields_added: [],
    breaking: [
      'compaction_protocol.md now requires Level 1/2/3 classification',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-02-01',
    description: 'Distribution platform — adds per-developer and CI fields',
    handoff_fields_added: [
      'developer_id', 'session_id', 'recent_commits', 'recent_files',
    ],
    handoff_fields_removed: [],
    audit_fields_added: ['session_id'],
    breaking: [
      'AUDIT.jsonl entries should now include session_id',
      'INTEGRATIONS-CONFIG.md gains EMERGENCY_APPROVERS field',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-22',
    description: 'First stable release — plugin system and stable interface contract',
    handoff_fields_added: ['plugin_api_version'],
    handoff_fields_removed: [],
    audit_fields_added: [],
    breaking: [
      'VERIFY_PASS_RATE_WARNING_THRESHOLD in MINDFORGE.md is now 0.0-1.0 (was 0-100)',
      'AUDIT.jsonl session_id is now required (was optional)',
      'HANDOFF.json plugin_api_version field is now required for plugin compatibility',
    ],
  },
  {
    version: '2.0.0',
    date: '2026-03-23',
    description: 'v2.0.0 - The Autonomous Enterprise: multi-runtime and enhanced governance',
    handoff_fields_added: [],
    handoff_fields_removed: [],
    audit_fields_added: ['runtime', 'agent_id'],
    breaking: [
      'Additive migration required to backfill audit/token fields',
      'Plugin API version upgraded to 2.0.0',
    ],
  },
  {
    version: '11.0.0',
    date: '2026-05-28',
    description: 'v11.0.0 - Persona Expansion: temporal config, rate limiting, wave execution, audit archival',
    handoff_fields_added: [],
    handoff_fields_removed: [],
    audit_fields_added: [],
    breaking: [
      'config.json gains temporal, rate_limiting, session, wave_execution sections',
      'AUDIT.jsonl auto-archived if exceeding 5000 lines',
      'MINDFORGE.md VERSION format drops suffix (was X.Y.Z-SUFFIX, now X.Y.Z)',
    ],
  },
];

module.exports = { SCHEMA_HISTORY };
