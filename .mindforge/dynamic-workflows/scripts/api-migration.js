export const meta = {
  name: 'api-migration',
  description: 'Breaking change detection → versioning strategy → migration guide → compatibility matrix',
  whenToUse: 'When planning or documenting an API version migration — detect breaking changes and generate consumer migration guidance',
  phases: [
    { title: 'Detect', detail: 'Detect breaking vs non-breaking changes between old and new API versions' },
    { title: 'Version', detail: 'Propose versioning strategy: semver, URL versioning, or header versioning' },
    { title: 'Guide', detail: 'Generate migration guide for API consumers' },
    { title: 'Matrix', detail: 'Compatibility matrix: which client versions work with which API versions' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const CHANGES_SCHEMA = {
    type: 'object',
    properties: {
      apiName: { type: 'string' },
      oldVersion: { type: 'string' },
      newVersion: { type: 'string' },
      breakingChanges: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            endpoint: { type: 'string' },
            changeType: { type: 'string', enum: ['removed-endpoint', 'renamed-field', 'changed-type', 'removed-field', 'changed-auth', 'changed-status-code', 'changed-behavior'] },
            description: { type: 'string' },
            impactedClients: { type: 'string' },
          },
          required: ['endpoint', 'changeType', 'description'],
        },
      },
      nonBreakingChanges: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            endpoint: { type: 'string' },
            changeType: { type: 'string', enum: ['added-endpoint', 'added-optional-field', 'added-header', 'performance-improvement', 'deprecation-notice'] },
            description: { type: 'string' },
          },
          required: ['endpoint', 'changeType', 'description'],
        },
      },
    },
    required: ['apiName', 'breakingChanges', 'nonBreakingChanges'],
  };

  const VERSIONING_SCHEMA = {
    type: 'object',
    properties: {
      strategy: { type: 'string', enum: ['url-versioning', 'header-versioning', 'semver-package', 'content-negotiation'] },
      rationale: { type: 'string' },
      versionIdentifier: { type: 'string' },
      deprecationPolicy: { type: 'string' },
      sunsetTimeline: { type: 'string' },
    },
    required: ['strategy', 'rationale', 'versionIdentifier', 'deprecationPolicy'],
  };

  const GUIDE_SCHEMA = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      migrationSteps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            step: { type: 'number' },
            title: { type: 'string' },
            description: { type: 'string' },
            codeExample: { type: 'string' },
            requiredBy: { type: 'string' },
          },
          required: ['step', 'title', 'description'],
        },
      },
      searchAndReplace: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            find: { type: 'string' },
            replaceWith: { type: 'string' },
            context: { type: 'string' },
          },
          required: ['find', 'replaceWith'],
        },
      },
    },
    required: ['summary', 'migrationSteps'],
  };

  const MATRIX_SCHEMA = {
    type: 'object',
    properties: {
      matrix: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            clientVersion: { type: 'string' },
            apiV1Compatible: { type: 'boolean' },
            apiV2Compatible: { type: 'boolean' },
            migrationRequired: { type: 'boolean' },
            notes: { type: 'string' },
          },
          required: ['clientVersion', 'apiV1Compatible', 'apiV2Compatible', 'migrationRequired'],
        },
      },
      supportEndsDate: { type: 'string' },
      recommendation: { type: 'string' },
    },
    required: ['matrix', 'recommendation'],
  };

  const target = args || 'current API (provide old/new version paths or describe the changes in args)';

  phase('Detect');
  log(`Detecting API changes in: ${target}`);
  const changes = await agent(
    `Analyze the API changes in: "${target}". Compare old vs new API versions. Classify each change as: BREAKING (removed endpoints, renamed/removed fields, changed types, auth changes, status code changes) or NON-BREAKING (added endpoints, added optional fields, performance improvements, deprecation notices). Include the old and new version identifiers.`,
    { schema: CHANGES_SCHEMA, label: 'detect-changes' }
  );
  log(`API: ${changes.apiName} — ${changes.breakingChanges.length} breaking, ${changes.nonBreakingChanges.length} non-breaking changes`);

  phase('Version');
  const breakingSummary = changes.breakingChanges.map(c => `${c.endpoint}: ${c.changeType} — ${c.description}`).join('\n');
  const versioning = await agent(
    `Propose a versioning strategy for: "${changes.apiName}" migrating from ${changes.oldVersion || 'v1'} to ${changes.newVersion || 'v2'}.\n\nBreaking changes:\n${breakingSummary}\n\nRecommend: URL versioning (/v1, /v2), header versioning (API-Version: 2), or semver package versioning. Include: rationale, deprecation policy, and sunset timeline for the old version.`,
    { schema: VERSIONING_SCHEMA, label: 'versioning' }
  );
  log(`Strategy: ${versioning.strategy} — sunset: ${versioning.sunsetTimeline}`);

  phase('Guide');
  const guide = await agent(
    `Write a migration guide for consumers of: "${changes.apiName}" upgrading from ${changes.oldVersion || 'v1'} to ${changes.newVersion || 'v2'}.\n\nBreaking changes:\n${breakingSummary}\n\nVersioning: ${versioning.strategy} (${versioning.versionIdentifier})\n\nProvide: (1) executive summary of what changed and why, (2) numbered migration steps in order, each with description and code example, (3) search-and-replace patterns for automated migration (what to find and replace in client code).`,
    { schema: GUIDE_SCHEMA, label: 'guide' }
  );
  log(`Migration guide: ${guide.migrationSteps.length} steps`);

  phase('Matrix');
  const allChanges = [...changes.breakingChanges, ...changes.nonBreakingChanges];
  const changeSummary = allChanges.slice(0, 10).map(c => `${c.endpoint}: ${c.changeType}`).join(', ');
  const matrix = await agent(
    `Create a compatibility matrix for: "${changes.apiName}"\n\nChanges: ${changeSummary}\n\nVersioning: ${versioning.strategy}\nDeprecation policy: ${versioning.deprecationPolicy}\n\nFor typical client version groups (very-old, old, current, new), show compatibility with each API version and whether migration is required. Include support end date and overall recommendation.`,
    { schema: MATRIX_SCHEMA, label: 'matrix' }
  );

  return { target, changes, versioning, guide, matrix };
}
