export const meta = {
  name: 'database-migration',
  description: 'Schema diff → risk analysis → migration scripts → rollback plan',
  whenToUse: 'When planning or reviewing a database schema migration — adding columns, changing types, dropping tables',
  phases: [
    { title: 'SchemaDiff', detail: 'Parse current and target schema, compute structural diff' },
    { title: 'RiskAnalysis', detail: 'Assess data loss risk, locking impact, and rollback complexity' },
    { title: 'Scripts', detail: 'Generate forward migration + rollback scripts' },
    { title: 'Runbook', detail: 'Step-by-step production runbook with verification checks' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const DIFF_SCHEMA = {
    type: 'object',
    properties: {
      changes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['add_table', 'drop_table', 'add_column', 'drop_column', 'change_type', 'add_index', 'drop_index', 'add_constraint', 'drop_constraint'] },
            table: { type: 'string' },
            column: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
            notes: { type: 'string' },
          },
          required: ['type', 'table'],
        },
      },
      database: { type: 'string' },
    },
    required: ['changes', 'database'],
  };

  const RISK_SCHEMA = {
    type: 'object',
    properties: {
      overallRisk: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      risks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            change: { type: 'string' },
            risk: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            mitigation: { type: 'string' },
          },
          required: ['change', 'risk', 'severity', 'mitigation'],
        },
      },
      requiresMaintenanceWindow: { type: 'boolean' },
      estimatedLockDuration: { type: 'string' },
    },
    required: ['overallRisk', 'risks', 'requiresMaintenanceWindow'],
  };

  const SCRIPTS_SCHEMA = {
    type: 'object',
    properties: {
      forwardMigration: { type: 'string' },
      rollbackMigration: { type: 'string' },
      verificationQueries: { type: 'array', items: { type: 'string' } },
    },
    required: ['forwardMigration', 'rollbackMigration', 'verificationQueries'],
  };

  const RUNBOOK_SCHEMA = {
    type: 'object',
    properties: {
      preChecks: { type: 'array', items: { type: 'string' } },
      steps: { type: 'array', items: { type: 'object', properties: { step: { type: 'number' }, action: { type: 'string' }, command: { type: 'string' }, rollbackIf: { type: 'string' } }, required: ['step', 'action'] } },
      postChecks: { type: 'array', items: { type: 'string' } },
      rollbackProcedure: { type: 'string' },
    },
    required: ['preChecks', 'steps', 'postChecks', 'rollbackProcedure'],
  };

  const target = args || 'current migration files (provide schema diff or migration directory as args)';

  phase('SchemaDiff');
  log(`Analyzing schema migration for: ${target}`);
  const diff = await agent(
    `Parse the database schema migration in: "${target}". Identify all schema changes: tables added/dropped, columns added/dropped/renamed, type changes, index changes, constraint changes. Identify the database type (PostgreSQL, MySQL, SQLite, etc.).`,
    { schema: DIFF_SCHEMA, label: 'schema-diff' }
  );
  if (!diff) { log('Warning: agent returned null for diff, skipping'); return { target, error: 'agent-null' }; }
  log(`${diff.changes.length} schema changes in ${diff.database}`);

  phase('RiskAnalysis');
  const [risks, scripts] = await parallel([
    () => agent(
      `Assess the production risk of this database migration on ${diff.database}: ${diff.changes.map(c => `${c.type} on ${c.table}${c.column ? '.' + c.column : ''}`).join(', ')}. For each change identify: data loss risk, lock duration, rollback complexity. Does this require a maintenance window? What's the overall risk level?`,
      { schema: RISK_SCHEMA, label: 'risk-analysis', phase: 'RiskAnalysis' }
    ),
    () => agent(
      `Generate migration scripts for ${diff.database} with these changes: ${diff.changes.map(c => `${c.type} on ${c.table}`).join(', ')}. Write: (1) forward migration SQL, (2) rollback SQL that fully reverses the changes, (3) verification queries to confirm success. Use safe patterns: IF NOT EXISTS, transactions, backfill before NOT NULL, etc.`,
      { schema: SCRIPTS_SCHEMA, label: 'scripts', phase: 'RiskAnalysis' }
    ),
  ]);

  if (!risks) { log('Warning: agent returned null for risks, skipping'); return { target, diff, error: 'agent-null' }; }
  phase('Runbook');
  const runbook = await agent(
    `Create a production deployment runbook for this ${diff.database} migration.\n\nChanges: ${diff.changes.map(c => `${c.type} on ${c.table}`).join(', ')}\nRisk: ${risks.overallRisk} — maintenance window required: ${risks.requiresMaintenanceWindow}\nTop risks: ${risks.risks.slice(0, 3).map(r => r.risk).join(', ')}\n\nInclude: pre-migration checks, numbered execution steps with exact commands and rollback conditions per step, post-migration verification, and complete rollback procedure.`,
    { schema: RUNBOOK_SCHEMA, label: 'runbook' }
  );
  if (!runbook) { return { target, diff, risks, scripts, error: 'runbook-agent-null' }; }

  return { target, diff, risks, scripts, runbook };
}
