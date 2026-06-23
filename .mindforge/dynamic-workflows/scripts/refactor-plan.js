export const meta = {
  name: 'refactor-plan',
  description: 'Technical debt scan → risk-sorted sequence → safe refactor implementation plan',
  whenToUse: 'When you need to plan a refactoring safely without breaking existing behavior',
  phases: [
    { title: 'Scan', detail: 'Identify technical debt, complexity hotspots, dead code' },
    { title: 'Prioritize', detail: 'Risk-sort by blast radius and test coverage' },
    { title: 'Sequence', detail: 'Order changes to minimize merge conflicts' },
    { title: 'Plan', detail: 'Produce step-by-step refactor plan with verification gates' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const DEBT_SCHEMA = {
    type: 'object',
    properties: {
      area: { type: 'string' },
      debts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            location: { type: 'string' },
            description: { type: 'string' },
            blastRadius: { type: 'string', enum: ['wide', 'medium', 'narrow'] },
            testCoverage: { type: 'string', enum: ['good', 'partial', 'none'] },
          },
          required: ['type', 'description', 'blastRadius', 'testCoverage'],
        },
      },
    },
    required: ['area', 'debts'],
  };

  const PRIORITY_SCHEMA = {
    type: 'object',
    properties: {
      prioritized: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rank: { type: 'number' },
            description: { type: 'string' },
            risk: { type: 'string', enum: ['low', 'medium', 'high'] },
            rationale: { type: 'string' },
            prerequisite: { type: 'string' },
          },
          required: ['rank', 'description', 'risk', 'rationale'],
        },
      },
    },
    required: ['prioritized'],
  };

  const PLAN_SCHEMA = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            step: { type: 'number' },
            title: { type: 'string' },
            action: { type: 'string' },
            verification: { type: 'string' },
            rollback: { type: 'string' },
            estimatedEffort: { type: 'string' },
          },
          required: ['step', 'title', 'action', 'verification'],
        },
      },
      totalEstimate: { type: 'string' },
      risks: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'steps', 'totalEstimate', 'risks'],
  };

  const target = args || 'current codebase (run from repo root)';

  phase('Scan');
  log(`Scanning: ${target}`);

  const SCAN_AREAS = [
    { label: 'structural', prompt: `Scan for structural technical debt in: "${target}". Look for: God objects/files (>400 lines), circular dependencies, tight coupling, missing abstraction layers, inconsistent patterns across similar features.` },
    { label: 'complexity', prompt: `Scan for complexity debt in: "${target}". Look for: functions >50 lines, nesting >4 levels, cyclomatic complexity, boolean parameter flags, long parameter lists, feature envy, shotgun surgery patterns.` },
    { label: 'maintenance', prompt: `Scan for maintenance debt in: "${target}". Look for: dead code, commented-out code, outdated comments, TODO/FIXME/HACK markers, deprecated API usage, inconsistent naming, magic numbers/strings.` },
  ];

  const scans = await parallel(
    SCAN_AREAS.map(a => () => agent(a.prompt, { schema: DEBT_SCHEMA, label: `scan:${a.label}`, phase: 'Scan' }))
  );

  phase('Prioritize');
  const allDebts = scans.filter(Boolean).flatMap(s => s.debts);
  log(`Found ${allDebts.length} debt items across ${scans.filter(Boolean).length} areas`);
  const debtList = allDebts.slice(0, 20).map((d, i) => `${i + 1}. [blast:${d.blastRadius}][coverage:${d.testCoverage}] ${d.description}`).join('\n');
  const prioritized = await agent(
    `Prioritize this refactoring backlog by risk. Items with narrow blast radius + good test coverage = tackle first (low risk). Wide blast radius + no coverage = tackle last or skip.\n\nDebts:\n${debtList}`,
    { schema: PRIORITY_SCHEMA, label: 'prioritize' }
  );

  phase('Sequence');
  const topItems = prioritized.prioritized.slice(0, 10).map(p => `${p.rank}. [${p.risk}] ${p.description}: ${p.rationale}`).join('\n');

  phase('Plan');
  const plan = await agent(
    `Create a safe, step-by-step refactoring plan for: "${target}"\n\nPrioritized items:\n${topItems}\n\nFor each step, specify: the action to take, how to verify it didn't break anything, rollback procedure, and estimated effort. Order steps to minimize merge conflicts.`,
    { schema: PLAN_SCHEMA, label: 'plan' }
  );

  return {
    target,
    debtItems: allDebts.length,
    prioritized: prioritized.prioritized,
    plan,
  };
}
