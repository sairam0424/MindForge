export const meta = {
  name: 'test-coverage-gap',
  description: 'Parallel per-module coverage analysis → gap map → prioritized test-writing plan',
  whenToUse: 'When you need to find and fix test coverage gaps across a codebase or module',
  phases: [
    { title: 'Discover', detail: 'Map modules and identify testable units' },
    { title: 'Analyze', detail: 'Parallel coverage analysis per module' },
    { title: 'GapMap', detail: 'Synthesize gaps by severity and risk' },
    { title: 'Plan', detail: 'Prioritized test-writing plan with concrete test cases' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const MODULE_SCHEMA = {
    type: 'object',
    properties: {
      modules: {
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' }, path: { type: 'string' }, risk: { type: 'string', enum: ['high', 'medium', 'low'] } },
          required: ['name', 'path', 'risk'],
        },
      },
    },
    required: ['modules'],
  };

  const COVERAGE_SCHEMA = {
    type: 'object',
    properties: {
      module: { type: 'string' },
      testedBehaviors: { type: 'array', items: { type: 'string' } },
      untestedBehaviors: { type: 'array', items: { type: 'string' } },
      missingEdgeCases: { type: 'array', items: { type: 'string' } },
      estimatedCoverage: { type: 'number' },
    },
    required: ['module', 'testedBehaviors', 'untestedBehaviors', 'missingEdgeCases', 'estimatedCoverage'],
  };

  const PLAN_SCHEMA = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      prioritizedTests: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            module: { type: 'string' },
            behavior: { type: 'string' },
            priority: { type: 'string', enum: ['p0', 'p1', 'p2'] },
            testDescription: { type: 'string' },
            skeletonCode: { type: 'string' },
          },
          required: ['module', 'behavior', 'priority', 'testDescription', 'skeletonCode'],
        },
      },
    },
    required: ['summary', 'prioritizedTests'],
  };

  const target = args || 'current codebase (run from repo root)';

  phase('Discover');
  log(`Discovering testable modules in: ${target}`);
  const discovery = await agent(
    `Discover and list all testable modules in: "${target}". For each module identify its path and risk level (high=core business logic/auth/payment, medium=data processing, low=utilities/helpers). Focus on source files that should have tests.`,
    { schema: MODULE_SCHEMA, label: 'discover' }
  );
  const modules = ((discovery || {}).modules || []).slice(0, 12);
  log(`Found ${modules.length} modules to analyze`);

  phase('Analyze');
  const coverageResults = await parallel(
    modules.map(m => () => agent(
      `Analyze test coverage for module: "${m.name}" at path: "${m.path}" in codebase: "${target}". List: (1) behaviors currently tested, (2) behaviors NOT tested that should be, (3) missing edge cases. Estimate current coverage % (0-100).`,
      { schema: COVERAGE_SCHEMA, label: `cov:${m.name.slice(0, 20)}`, phase: 'Analyze' }
    ))
  );

  phase('GapMap');
  const gaps = coverageResults.filter(Boolean);
  const gapSummary = gaps.map(g => `${g.module} (~${g.estimatedCoverage}% covered): untested=[${g.untestedBehaviors.slice(0, 3).join(', ')}]`).join('\n');
  log(`Coverage gaps identified across ${gaps.length} modules`);

  phase('Plan');
  const plan = await agent(
    `Create a prioritized test-writing plan for: "${target}"\n\nCoverage gaps:\n${gapSummary}\n\nFor each gap, write a concrete test description and skeleton code. Prioritize: P0=high-risk untested, P1=medium-risk gaps, P2=edge cases. Include the actual test skeleton (describe/it or test() blocks) for each.`,
    { schema: PLAN_SCHEMA, label: 'plan' }
  );

  return { target, modules, gaps, plan };
}
