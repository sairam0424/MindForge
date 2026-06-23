export const meta = {
  name: 'architecture-modernization',
  description: 'Legacy architecture map → target design → migration sequencing → risk gates',
  whenToUse: 'When planning a major architecture overhaul: monolith-to-services, framework upgrade, or platform migration',
  phases: [
    { title: 'Map', detail: 'Map current architecture: components, dependencies, coupling, pain points' },
    { title: 'Design', detail: '3 parallel target architecture proposals with trade-off analysis' },
    { title: 'Select', detail: 'Judge panel selects best design, synthesizes hybrid' },
    { title: 'Sequence', detail: 'Migration sequencing with risk gates and rollback checkpoints' },
    { title: 'Roadmap', detail: 'Sprint-by-sprint modernization roadmap' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const MAP_SCHEMA = {
    type: 'object',
    properties: {
      components: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, responsibility: { type: 'string' }, coupling: { type: 'string', enum: ['tight', 'loose', 'very-tight'] }, painPoints: { type: 'array', items: { type: 'string' } } }, required: ['name', 'responsibility', 'coupling'] } },
      primaryPainPoints: { type: 'array', items: { type: 'string' } },
      technicalDebt: { type: 'array', items: { type: 'string' } },
    },
    required: ['components', 'primaryPainPoints', 'technicalDebt'],
  };

  const DESIGN_SCHEMA = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      approach: { type: 'string' },
      components: { type: 'array', items: { type: 'string' } },
      pros: { type: 'array', items: { type: 'string' } },
      cons: { type: 'array', items: { type: 'string' } },
      migrationComplexity: { type: 'string', enum: ['low', 'medium', 'high', 'very-high'] },
      timeEstimate: { type: 'string' },
    },
    required: ['name', 'approach', 'pros', 'cons', 'migrationComplexity'],
  };

  const VERDICT_SCHEMA = {
    type: 'object',
    properties: {
      winner: { type: 'string' },
      rationale: { type: 'string' },
      hybridAdjustments: { type: 'array', items: { type: 'string' } },
      targetArchDescription: { type: 'string' },
    },
    required: ['winner', 'rationale', 'targetArchDescription'],
  };

  const ROADMAP_SCHEMA = {
    type: 'object',
    properties: {
      phases: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            phaseNum: { type: 'number' },
            name: { type: 'string' },
            work: { type: 'array', items: { type: 'string' } },
            riskGates: { type: 'array', items: { type: 'string' } },
            rollbackCheckpoint: { type: 'string' },
            durationWeeks: { type: 'number' },
          },
          required: ['phaseNum', 'name', 'work', 'riskGates', 'rollbackCheckpoint'],
        },
      },
      totalDurationWeeks: { type: 'number' },
      criticalDependencies: { type: 'array', items: { type: 'string' } },
    },
    required: ['phases', 'totalDurationWeeks'],
  };

  const target = args || 'current codebase (describe your modernization goal in args)';

  phase('Map');
  log(`Mapping current architecture for: ${target}`);
  const archMap = await agent(
    `Map the current architecture of: "${target}". Identify all major components, their responsibilities, coupling levels (tight/loose), and pain points. List the primary architectural pain points and technical debt items that motivate modernization.`,
    { schema: MAP_SCHEMA, label: 'arch-map' }
  );
  log(`Found ${archMap.components.length} components, ${archMap.primaryPainPoints.length} pain points`);

  phase('Design');
  const mapContext = `Current architecture: ${archMap.components.map(c => `${c.name}(${c.coupling} coupling)`).join(', ')}\nPain points: ${archMap.primaryPainPoints.join(', ')}`;
  const designs = await parallel([
    () => agent(`Design a CONSERVATIVE modernization architecture for: "${target}". ${mapContext}. Propose incremental improvements with minimal disruption — strangler fig pattern, adapter layers, gradual extraction. Optimize for low migration risk.`, { schema: DESIGN_SCHEMA, label: 'design-conservative', phase: 'Design' }),
    () => agent(`Design an AGGRESSIVE modernization architecture for: "${target}". ${mapContext}. Propose a modern target state — microservices, event-driven, serverless, or modern monolith. Optimize for long-term maintainability.`, { schema: DESIGN_SCHEMA, label: 'design-aggressive', phase: 'Design' }),
    () => agent(`Design a PRAGMATIC modernization architecture for: "${target}". ${mapContext}. Balance risk vs benefit — modular monolith, domain-driven boundaries, selective extraction of high-value services. Optimize for team productivity.`, { schema: DESIGN_SCHEMA, label: 'design-pragmatic', phase: 'Design' }),
  ]);

  phase('Select');
  const designsText = designs.filter(Boolean).map(d => `Option: ${d.name}\nApproach: ${d.approach}\nPros: ${d.pros.join(', ')}\nCons: ${d.cons.join(', ')}\nComplexity: ${d.migrationComplexity}\nTime: ${d.timeEstimate}`).join('\n\n');
  const verdict = await agent(
    `Select the best modernization architecture for: "${target}"\n\nThree options:\n${designsText}\n\nChoose the winner based on: migration risk, team capability, business continuity, long-term value. Suggest hybrid adjustments that take the best elements from runners-up. Describe the final target architecture.`,
    { schema: VERDICT_SCHEMA, label: 'design-select' }
  );
  log(`Selected: ${verdict.winner} — ${verdict.rationale.slice(0, 80)}`);

  phase('Sequence');
  const roadmap = await agent(
    `Create a phased migration roadmap for: "${target}"\n\nTarget architecture: ${verdict.targetArchDescription}\n\nCurrent pain points: ${archMap.primaryPainPoints.join(', ')}\n\nSequence the work into migration phases with: specific work items, risk gates (conditions that must be true before proceeding), rollback checkpoints, and duration estimates. Ensure each phase is independently deployable.`,
    { schema: ROADMAP_SCHEMA, label: 'sequence' }
  );

  return { target, archMap, designs: designs.filter(Boolean), verdict, roadmap };
}
