export const meta = {
  name: 'competitive-teardown',
  description: '5 parallel competitor angle agents → pipeline synthesis into competitive positioning report',
  whenToUse: 'When doing competitive research before a product launch, pricing decision, or strategy review',
  phases: [
    { title: 'Scope', detail: 'Identify competitors and define evaluation framework' },
    { title: 'Research', detail: '5 parallel competitor angle agents: product/tech/pricing/hiring/community' },
    { title: 'Analyze', detail: 'Synthesize competitive landscape from all angles' },
    { title: 'Synthesis', detail: 'Competitive positioning report with differentiation opportunities' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const SCOPE_SCHEMA = {
    type: 'object',
    properties: {
      productDescription: { type: 'string' },
      competitors: { type: 'array', items: { type: 'string' } },
      evaluationDimensions: { type: 'array', items: { type: 'string' } },
      targetMarket: { type: 'string' },
    },
    required: ['productDescription', 'competitors', 'targetMarket'],
  };

  const ANGLE_SCHEMA = {
    type: 'object',
    properties: {
      angle: { type: 'string' },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            competitor: { type: 'string' },
            insight: { type: 'string' },
            strength: { type: 'string' },
            weakness: { type: 'string' },
            signal: { type: 'string' },
          },
          required: ['competitor', 'insight'],
        },
      },
      keyTakeaway: { type: 'string' },
    },
    required: ['angle', 'findings', 'keyTakeaway'],
  };

  const ANALYSIS_SCHEMA = {
    type: 'object',
    properties: {
      competitorProfiles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            summary: { type: 'string' },
            keyStrengths: { type: 'array', items: { type: 'string' } },
            keyWeaknesses: { type: 'array', items: { type: 'string' } },
            threatLevel: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
          required: ['name', 'summary', 'keyStrengths', 'keyWeaknesses', 'threatLevel'],
        },
      },
      marketDynamics: { type: 'string' },
    },
    required: ['competitorProfiles', 'marketDynamics'],
  };

  const SYNTHESIS_SCHEMA = {
    type: 'object',
    properties: {
      executiveSummary: { type: 'string' },
      competitivePosition: { type: 'string', enum: ['leader', 'challenger', 'follower', 'nicher'] },
      differentiationOpportunities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            opportunity: { type: 'string' },
            dimension: { type: 'string' },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            actionable: { type: 'string' },
          },
          required: ['opportunity', 'dimension', 'actionable'],
        },
      },
      threatsToWatch: { type: 'array', items: { type: 'string' } },
      strategicRecommendations: { type: 'array', items: { type: 'string' } },
    },
    required: ['executiveSummary', 'competitivePosition', 'differentiationOpportunities', 'strategicRecommendations'],
  };

  const target = args || 'current product (describe your product and list competitors in args)';

  phase('Scope');
  log(`Competitive teardown for: ${target}`);
  const scope = await agent(
    `Define the competitive landscape for: "${target}". Identify: (1) a concise description of the product/service being analyzed, (2) the top 3-5 direct competitors, (3) key evaluation dimensions for this market, (4) the target market and customer segment. If competitors are not specified in the input, infer them from the product description.`,
    { schema: SCOPE_SCHEMA, label: 'scope' }
  );
  if (!scope) { log('Warning: agent returned null for scope, skipping'); return { target, error: 'agent-null' }; }
  log(`Analyzing ${scope.competitors.length} competitors: ${scope.competitors.join(', ')}`);

  const competitorList = scope.competitors.join(', ');
  const productCtx = `Product: ${scope.productDescription} | Market: ${scope.targetMarket}`;

  phase('Research');
  const ANGLES = [
    { label: 'product-features', prompt: `Analyze PRODUCT FEATURES AND UX for these competitors in the context of: "${target}". ${productCtx}. Competitors: ${competitorList}. For each: key features, UX quality, product gaps, what users love/hate (based on known reviews/feedback). What are the feature differentiators?` },
    { label: 'technical-architecture', prompt: `Analyze TECHNICAL ARCHITECTURE AND STACK for: ${competitorList}. Context: "${target}". ${productCtx}. For each: known tech stack, scalability approach, API availability, integration ecosystem, technical moat (patents, proprietary tech, network effects). What technical signals suggest future direction?` },
    { label: 'pricing-model', prompt: `Analyze PRICING MODELS for: ${competitorList}. Context: "${target}". ${productCtx}. For each: pricing tiers, free/trial offering, enterprise vs SMB focus, pricing transparency, value metric (per seat/usage/feature). What pricing patterns dominate? Where are the gaps?` },
    { label: 'hiring-signals', prompt: `Analyze HIRING SIGNALS for: ${competitorList}. Context: "${target}". ${productCtx}. For each: recent job postings patterns (what roles they're hiring = what they're building), team growth trajectory, key hires/departures, which teams are expanding. What does hiring signal about product roadmap?` },
    { label: 'community-ecosystem', prompt: `Analyze COMMUNITY AND ECOSYSTEM for: ${competitorList}. Context: "${target}". ${productCtx}. For each: community size and engagement (GitHub stars, Discord/Slack, forum activity), developer ecosystem (integrations, plugins, APIs), content marketing, thought leadership, NPS signals. Who has the strongest ecosystem moat?` },
  ];

  const angleResults = await parallel(
    ANGLES.map(a => () => agent(a.prompt, { schema: ANGLE_SCHEMA, label: `angle:${a.label}`, phase: 'Research' }))
  );

  phase('Analyze');
  const validAngles = angleResults.filter(Boolean);
  const angleSummary = validAngles.map(a => `${a.angle}: ${a.keyTakeaway}`).join('\n');

  const analysis = await agent(
    `Synthesize competitive profiles for: "${target}"\n\nCompetitors: ${competitorList}\n\nAngle summaries:\n${angleSummary}\n\nFor each competitor: 2-sentence summary, top 3 strengths, top 3 weaknesses, and threat level (high/medium/low) to our product. Describe overall market dynamics.`,
    { schema: ANALYSIS_SCHEMA, label: 'analyze' }
  );

  if (!analysis) { log('Warning: agent returned null for analysis, skipping'); return { target, error: 'agent-null' }; }
  phase('Synthesis');
  const profileSummary = analysis.competitorProfiles.map(p => `${p.name} (threat=${p.threatLevel}): strengths=[${p.keyStrengths.slice(0, 2).join(', ')}] weaknesses=[${p.keyWeaknesses.slice(0, 2).join(', ')}]`).join('\n');

  const synthesis = await pipeline([
    () => agent(
      `Create a competitive positioning report for: "${target}"\n\n${productCtx}\n\nCompetitor profiles:\n${profileSummary}\n\nMarket dynamics: ${analysis.marketDynamics}\n\nAngle takeaways:\n${angleSummary}\n\nProvide: executive summary, competitive position (leader/challenger/follower/nicher), top 3-5 differentiation opportunities with confidence and actionable next steps, key threats to monitor, and 3-5 strategic recommendations.`,
      { schema: SYNTHESIS_SCHEMA, label: 'synthesis' }
    ),
  ]);

  return { target, scope, angles: validAngles, analysis, synthesis };
}
