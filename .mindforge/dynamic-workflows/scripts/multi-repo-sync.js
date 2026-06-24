export const meta = {
  name: 'multi-repo-sync',
  description: 'Parallel per-repo audit → cross-repo divergence map → sync plan',
  whenToUse: 'When managing multiple related repos and need to find/fix divergence in shared config, deps, or conventions',
  phases: [
    { title: 'Discover', detail: 'List target repos and their relationships' },
    { title: 'Audit', detail: 'Parallel audit per repo for divergence from the reference' },
    { title: 'DivergenceMap', detail: 'Cross-repo divergence map with severity' },
    { title: 'SyncPlan', detail: 'Prioritized sync plan — what to align and how' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const REPO_SCHEMA = {
    type: 'object',
    properties: {
      repos: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, path: { type: 'string' }, role: { type: 'string' } }, required: ['name', 'path'] } },
      referenceRepo: { type: 'string' },
      syncDimensions: { type: 'array', items: { type: 'string' } },
    },
    required: ['repos', 'syncDimensions'],
  };

  const AUDIT_SCHEMA = {
    type: 'object',
    properties: {
      repo: { type: 'string' },
      divergences: { type: 'array', items: { type: 'object', properties: { dimension: { type: 'string' }, severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }, description: { type: 'string' }, fix: { type: 'string' } }, required: ['dimension', 'severity', 'description', 'fix'] } },
    },
    required: ['repo', 'divergences'],
  };

  const SYNC_SCHEMA = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      syncItems: { type: 'array', items: { type: 'object', properties: { repo: { type: 'string' }, dimension: { type: 'string' }, action: { type: 'string' }, priority: { type: 'string', enum: ['p0', 'p1', 'p2'] } }, required: ['repo', 'dimension', 'action', 'priority'] } },
    },
    required: ['summary', 'syncItems'],
  };

  const target = args || 'current workspace (list repo paths in args, comma-separated)';

  phase('Discover');
  const discovery = await agent(`Discover all related repositories in: "${target}". List each repo's name, path, and role (primary/service/library/config). Identify the reference/canonical repo (if any) and what dimensions should be synchronized: dependencies, CI config, lint config, code conventions, shared utilities, test patterns.`, { schema: REPO_SCHEMA, label: 'discover' });
  if (!discovery) { return { target, error: 'discovery-agent-null' }; }
  log(`Found ${discovery.repos.length} repos, ${discovery.syncDimensions.length} sync dimensions`);

  phase('Audit');
  const audits = await parallel(
    discovery.repos.map(r => () => agent(`Audit repo "${r.name}" at "${r.path}" against the reference "${discovery.referenceRepo || 'best practices'}". Check dimensions: ${discovery.syncDimensions.join(', ')}. For each divergence: dimension, severity, what differs, and exact fix.`, { schema: AUDIT_SCHEMA, label: `audit:${r.name}`, phase: 'Audit' }))
  );

  phase('DivergenceMap');
  const allDivergences = audits.filter(Boolean).flatMap(a => a.divergences.map(d => ({ repo: a.repo, ...d })));
  log(`${allDivergences.length} divergences across ${discovery.repos.length} repos`);

  phase('SyncPlan');
  const divergenceText = allDivergences.slice(0, 20).map(d => `[${d.severity}] ${d.repo}/${d.dimension}: ${d.description} → ${d.fix}`).join('\n');
  const syncPlan = await agent(`Create a sync plan for: "${target}"\n\nDivergences:\n${divergenceText}\n\nPrioritize by severity and group by dimension for efficient batching. P0=critical/security, P1=high/consistency, P2=medium/nice-to-have.`, { schema: SYNC_SCHEMA, label: 'sync-plan' });

  return { target, discovery, audits: audits.filter(Boolean), syncPlan };
}
