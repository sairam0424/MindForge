export const meta = {
  name: 'cost-analysis',
  description: 'Parallel infra/API/query/bundle cost agents → reduction plan with ROI estimates',
  whenToUse: 'When auditing and reducing operational costs across infrastructure, API calls, database, and frontend bundle',
  phases: [
    { title: 'Scope', detail: 'Identify cost centers and establish current baseline' },
    { title: 'Analyze', detail: '4 parallel cost dimension agents: infra / API / database / bundle' },
    { title: 'Model', detail: 'Cost model with reduction opportunities and ROI estimates' },
    { title: 'Plan', detail: 'Prioritized cost reduction plan with implementation steps' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const SCOPE_SCHEMA = {
    type: 'object',
    properties: {
      costCenters: { type: 'array', items: { type: 'string' } },
      estimatedMonthlyCost: { type: 'string' },
      primaryTechnology: { type: 'string' },
    },
    required: ['costCenters', 'primaryTechnology'],
  };

  const COST_DIM_SCHEMA = {
    type: 'object',
    properties: {
      dimension: { type: 'string' },
      currentEstimate: { type: 'string' },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            item: { type: 'string' },
            currentCost: { type: 'string' },
            wasteType: { type: 'string', enum: ['over-provisioning', 'idle-resource', 'inefficient-query', 'unused-api', 'large-bundle', 'redundant-call', 'other'] },
            potentialSaving: { type: 'string' },
            fix: { type: 'string' },
          },
          required: ['item', 'wasteType', 'potentialSaving', 'fix'],
        },
      },
    },
    required: ['dimension', 'findings'],
  };

  const PLAN_SCHEMA = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      totalEstimatedSaving: { type: 'string' },
      reductionItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            dimension: { type: 'string' },
            monthlySaving: { type: 'string' },
            effort: { type: 'string', enum: ['low', 'medium', 'high'] },
            roi: { type: 'string' },
            priority: { type: 'string', enum: ['p0', 'p1', 'p2'] },
          },
          required: ['action', 'dimension', 'monthlySaving', 'effort', 'priority'],
        },
      },
    },
    required: ['summary', 'totalEstimatedSaving', 'reductionItems'],
  };

  const target = args || 'current codebase (run from repo root)';

  phase('Scope');
  log(`Cost analysis target: ${target}`);
  const scope = await agent(
    `Identify the cost centers and technology stack for: "${target}". What cloud provider, databases, third-party APIs, and frontend framework are used? Estimate the primary monthly cost categories (infra, API calls, database, frontend delivery).`,
    { schema: SCOPE_SCHEMA, label: 'scope' }
  );
  if (!scope) { log('Warning: agent returned null for scope, skipping'); return { target, error: 'agent-null' }; }
  log(`Cost centers: ${scope.costCenters.join(', ')}`);

  phase('Analyze');
  const DIMENSIONS = [
    { label: 'infrastructure', prompt: `Analyze INFRASTRUCTURE costs for: "${target}" (${scope.primaryTechnology}). Look for: over-provisioned compute (instances larger than needed), idle resources (unused databases, VMs, load balancers), storage waste (old snapshots, unused volumes), network egress inefficiencies, cold-start penalties on serverless. Estimate current spend and potential savings per item.` },
    { label: 'api-costs', prompt: `Analyze THIRD-PARTY API costs for: "${target}". Look for: excessive LLM/AI API calls (missing caching, redundant calls), payment provider fees that could be reduced, over-calling external APIs when local cache would suffice, unused API subscriptions, inefficient batch vs single calls. Estimate current spend and potential savings.` },
    { label: 'database-query', prompt: `Analyze DATABASE QUERY costs for: "${target}". Look for: N+1 queries (fetching rows in a loop), missing indexes on WHERE/JOIN/ORDER BY columns, SELECT * where only a few columns are needed, unbounded queries without LIMIT, expensive full-table scans, redundant queries that could be cached. Estimate compute cost impact and savings.` },
    { label: 'bundle-runtime', prompt: `Analyze BUNDLE AND RUNTIME OVERHEAD costs for: "${target}". Look for: large JS bundles (over 500KB) increasing CDN bandwidth costs, unoptimized images (missing WebP, no lazy loading), missing HTTP cache headers causing repeat downloads, unused dependencies inflating bundle size, missing code splitting. Estimate bandwidth/CDN cost impact.` },
  ];

  const dimResults = await parallel(
    DIMENSIONS.map(d => () => agent(d.prompt, { schema: COST_DIM_SCHEMA, label: `cost:${d.label}`, phase: 'Analyze' }))
  );

  phase('Model');
  const allFindings = dimResults.filter(Boolean).flatMap(d => d.findings.map(f => ({ dimension: d.dimension, ...f })));
  log(`${allFindings.length} cost findings across 4 dimensions`);

  phase('Plan');
  const findingSummary = allFindings.slice(0, 20).map(f => `[${f.dimension}/${f.wasteType}] ${f.item}: save ${f.potentialSaving} — ${f.fix}`).join('\n');
  const plan = await agent(
    `Create a cost reduction plan for: "${target}"\n\nCost findings:\n${findingSummary}\n\nPrioritize by: P0=quick wins with high savings (low effort, >$500/mo), P1=high savings medium effort, P2=nice-to-have. For each item estimate monthly saving, implementation effort, and ROI timeframe. Calculate total estimated monthly saving.`,
    { schema: PLAN_SCHEMA, label: 'plan' }
  );

  return { target, scope, dimResults: dimResults.filter(Boolean), plan };
}
