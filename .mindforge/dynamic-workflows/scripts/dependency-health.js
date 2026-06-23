export const meta = {
  name: 'dependency-health',
  description: 'Parallel per-dependency audit (CVEs / licenses / staleness / maintenance) → risk matrix',
  whenToUse: 'When auditing dependencies before a release, security review, or due diligence',
  phases: [
    { title: 'Inventory', detail: 'Extract full dependency tree from package manifests' },
    { title: 'Audit', detail: 'Parallel audit per batch: CVEs, license risk, staleness, maintenance status' },
    { title: 'RiskMatrix', detail: 'Consolidate into risk matrix with severity tiers' },
    { title: 'Action', detail: 'Prioritized upgrade / replace / accept recommendations' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const INVENTORY_SCHEMA = {
    type: 'object',
    properties: {
      dependencies: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            type: { type: 'string', enum: ['prod', 'dev', 'peer', 'optional'] },
          },
          required: ['name', 'version', 'type'],
        },
      },
      packageManager: { type: 'string' },
    },
    required: ['dependencies', 'packageManager'],
  };

  const BATCH_SCHEMA = {
    type: 'object',
    properties: {
      audits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            cveRisk: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'none'] },
            licenseRisk: { type: 'string', enum: ['copyleft', 'permissive', 'unknown', 'proprietary'] },
            staleness: { type: 'string', enum: ['current', 'minor-behind', 'major-behind', 'abandoned'] },
            maintenanceStatus: { type: 'string', enum: ['active', 'slow', 'stale', 'archived', 'unknown'] },
            recommendation: { type: 'string', enum: ['upgrade', 'replace', 'accept', 'remove'] },
            notes: { type: 'string' },
          },
          required: ['name', 'cveRisk', 'licenseRisk', 'staleness', 'maintenanceStatus', 'recommendation'],
        },
      },
    },
    required: ['audits'],
  };

  const ACTION_SCHEMA = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      immediateUpgrades: { type: 'array', items: { type: 'string' } },
      replaceWithAlternatives: { type: 'array', items: { type: 'object', properties: { current: { type: 'string' }, replacement: { type: 'string' }, reason: { type: 'string' } }, required: ['current', 'replacement', 'reason'] } },
      acceptableRisks: { type: 'array', items: { type: 'string' } },
      licenseIssues: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'immediateUpgrades', 'replaceWithAlternatives', 'acceptableRisks'],
  };

  const target = args || 'current project (run from repo root)';

  phase('Inventory');
  log(`Inventorying dependencies in: ${target}`);
  const inventory = await agent(
    `Extract the complete dependency list from package manifests in: "${target}". Look for package.json, requirements.txt, Pipfile, go.mod, Gemfile, Cargo.toml, or similar. List each dependency with its current version and type (prod/dev/peer/optional). Identify the package manager used.`,
    { schema: INVENTORY_SCHEMA, label: 'inventory' }
  );
  const allDeps = inventory.dependencies || [];
  log(`Found ${allDeps.length} dependencies (${inventory.packageManager})`);

  const BATCH_SIZE = 10;
  const batches = [];
  for (let i = 0; i < allDeps.length; i += BATCH_SIZE) {
    batches.push(allDeps.slice(i, i + BATCH_SIZE));
  }
  log(`Auditing in ${batches.length} batches of up to ${BATCH_SIZE}`);

  phase('Audit');
  const batchResults = await parallel(
    batches.map((batch, idx) => () => agent(
      `Audit these dependencies for security and health: ${batch.map(d => `${d.name}@${d.version}`).join(', ')}. For each: (1) known CVEs or security advisories, (2) license type (MIT/Apache/GPL/etc.), (3) staleness (how far behind latest), (4) maintenance status (active/slow/stale/archived). Provide upgrade/replace/accept/remove recommendation.`,
      { schema: BATCH_SCHEMA, label: `audit-batch-${idx}`, phase: 'Audit' }
    ))
  );

  phase('RiskMatrix');
  const allAudits = batchResults.filter(Boolean).flatMap(b => b.audits || []);
  const critical = allAudits.filter(a => a.cveRisk === 'critical' || a.cveRisk === 'high');
  const licenseIssues = allAudits.filter(a => a.licenseRisk === 'copyleft' || a.licenseRisk === 'unknown');
  log(`${critical.length} high/critical CVE risks, ${licenseIssues.length} license issues`);

  phase('Action');
  const matrixText = allAudits.filter(a => a.cveRisk !== 'none' || a.recommendation !== 'accept').slice(0, 20).map(a => `${a.name}: CVE=${a.cveRisk}, license=${a.licenseRisk}, staleness=${a.staleness}, status=${a.maintenanceStatus} → ${a.recommendation}`).join('\n');
  const actions = await agent(
    `Create a dependency action plan for: "${target}"\n\nRisk matrix:\n${matrixText}\n\nPrioritize: (1) immediate upgrades for critical CVEs, (2) replacements for abandoned/high-risk deps, (3) acceptable-risk accepts, (4) license issues to resolve. For replacements, suggest specific alternative packages.`,
    { schema: ACTION_SCHEMA, label: 'action-plan' }
  );

  return { target, inventory, audits: allAudits, actions, stats: { total: allDeps.length, criticalCVE: critical.length, licenseIssues: licenseIssues.length } };
}
