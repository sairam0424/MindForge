export const meta = {
  name: 'ai-model-eval',
  description: '4-parallel model benchmark agents → scoring matrix → cost/performance recommendation',
  whenToUse: 'When choosing between AI models or providers for a use case — benchmark quality, speed, and cost simultaneously',
  phases: [
    { title: 'Scope', detail: 'Define evaluation criteria and test prompts for the use case' },
    { title: 'Benchmark', detail: '4 parallel model evaluators (quality / reasoning / speed / cost)' },
    { title: 'Score', detail: 'Scoring matrix across all dimensions' },
    { title: 'Recommend', detail: 'Ranked recommendation with break-even cost analysis' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const CRITERIA_SCHEMA = {
    type: 'object',
    properties: {
      useCase: { type: 'string' },
      testPrompts: { type: 'array', items: { type: 'string' } },
      priorities: { type: 'array', items: { type: 'string' } },
      modelsToEvaluate: { type: 'array', items: { type: 'string' } },
    },
    required: ['useCase', 'testPrompts', 'priorities', 'modelsToEvaluate'],
  };

  const EVAL_SCHEMA = {
    type: 'object',
    properties: {
      dimension: { type: 'string' },
      scores: { type: 'array', items: { type: 'object', properties: { model: { type: 'string' }, score: { type: 'number' }, notes: { type: 'string' } }, required: ['model', 'score'] } },
    },
    required: ['dimension', 'scores'],
  };

  const RECOMMENDATION_SCHEMA = {
    type: 'object',
    properties: {
      winner: { type: 'string' },
      rationale: { type: 'string' },
      ranking: { type: 'array', items: { type: 'object', properties: { model: { type: 'string' }, totalScore: { type: 'number' }, bestFor: { type: 'string' } }, required: ['model', 'totalScore', 'bestFor'] } },
      costNote: { type: 'string' },
    },
    required: ['winner', 'rationale', 'ranking'],
  };

  const useCase = args || 'general purpose AI assistant for coding tasks';

  phase('Scope');
  const criteria = await agent(`Define evaluation criteria and test prompts for this AI model use case: "${useCase}". Create 3-5 representative test prompts that reflect the actual workload. List evaluation priorities (quality/speed/cost/context-length/reasoning) in order of importance. Suggest which models to evaluate (e.g., claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5, gpt-4o, gemini-2.0-flash).`, { schema: CRITERIA_SCHEMA, label: 'scope' });
  log(`Evaluating ${criteria.modelsToEvaluate.length} models on ${criteria.priorities.length} dimensions`);

  phase('Benchmark');
  const DIMENSIONS = [
    { label: 'quality', prompt: `Evaluate OUTPUT QUALITY of these models for: "${useCase}". Test prompts: ${criteria.testPrompts.slice(0, 3).join(' | ')}. Models: ${criteria.modelsToEvaluate.join(', ')}. Score each 0-100 for accuracy, completeness, and usefulness. Base scores on published benchmarks (MMLU, HumanEval, SWE-bench, coding evals) and known model capabilities.` },
    { label: 'reasoning', prompt: `Evaluate REASONING CAPABILITY of these models for: "${useCase}". Models: ${criteria.modelsToEvaluate.join(', ')}. Score 0-100 for multi-step reasoning, code understanding, logical deduction. Reference published benchmarks (MATH, BBH, ARC).` },
    { label: 'speed-latency', prompt: `Evaluate SPEED AND LATENCY of these models: ${criteria.modelsToEvaluate.join(', ')}. Score 0-100 (100=fastest). Include: typical time-to-first-token, output tokens/second, and whether the model supports streaming. Reference publicly available benchmarks and known provider SLAs.` },
    { label: 'cost-efficiency', prompt: `Evaluate COST EFFICIENCY of these models for: "${useCase}" with typical usage of ~1000 input tokens and ~500 output tokens per call. Models: ${criteria.modelsToEvaluate.join(', ')}. Score 0-100 (100=cheapest). Include: price per 1M input/output tokens from official pricing pages, estimated monthly cost at 100K calls/month.` },
  ];

  const evals = await parallel(
    DIMENSIONS.map(d => () => agent(d.prompt, { schema: EVAL_SCHEMA, label: `eval:${d.label}`, phase: 'Benchmark' }))
  );

  phase('Score');
  const validEvals = evals.filter(Boolean);
  const modelScores = {};
  criteria.modelsToEvaluate.forEach(model => {
    modelScores[model] = validEvals.reduce((sum, e) => {
      const s = (e.scores || []).find(sc => sc.model === model);
      return sum + (s ? s.score : 0);
    }, 0);
  });
  const sorted = Object.entries(modelScores).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) log(`Scoring complete — top model: ${sorted[0][0]}`);

  phase('Recommend');
  const scoreText = Object.entries(modelScores).sort((a, b) => b[1] - a[1]).map(([m, s]) => `${m}: ${s} total`).join(', ');
  const recommendation = await agent(`Provide a model recommendation for: "${useCase}"\n\nScores: ${scoreText}\n\nPriorities: ${criteria.priorities.join(' > ')}\n\nRank all models, declare the winner with rationale, note the best model for each specific priority, and include a cost note for the top 2 models.`, { schema: RECOMMENDATION_SCHEMA, label: 'recommend' });

  return { useCase, criteria, evals: validEvals, modelScores, recommendation };
}
