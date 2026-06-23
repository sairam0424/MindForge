export const meta = {
  name: 'data-pipeline-validate',
  description: 'Pipeline stage-by-stage validation → data quality gates → anomaly detection report',
  whenToUse: 'When validating a data pipeline for correctness, completeness, and quality before production use',
  phases: [
    { title: 'Map', detail: 'Map all pipeline stages from source to sink' },
    { title: 'Validate', detail: 'Parallel validation per stage (schema / completeness / transforms / outputs)' },
    { title: 'Quality', detail: 'Data quality gate assessment — freshness, completeness, consistency' },
    { title: 'Report', detail: 'Validation report with stage health scores and fix recommendations' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const PIPELINE_SCHEMA = {
    type: 'object',
    properties: {
      stages: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string', enum: ['source', 'transform', 'enrich', 'filter', 'aggregate', 'sink'] }, input: { type: 'string' }, output: { type: 'string' } }, required: ['name', 'type'] } },
      pipelineName: { type: 'string' },
    },
    required: ['stages', 'pipelineName'],
  };

  const STAGE_SCHEMA = {
    type: 'object',
    properties: {
      stage: { type: 'string' },
      issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }, category: { type: 'string' }, description: { type: 'string' }, fix: { type: 'string' } }, required: ['severity', 'category', 'description', 'fix'] } },
      healthScore: { type: 'number' },
    },
    required: ['stage', 'issues', 'healthScore'],
  };

  const REPORT_SCHEMA = {
    type: 'object',
    properties: {
      overallHealth: { type: 'string', enum: ['healthy', 'degraded', 'critical', 'failing'] },
      summary: { type: 'string' },
      criticalIssues: { type: 'array', items: { type: 'string' } },
      recommendations: { type: 'array', items: { type: 'string' } },
    },
    required: ['overallHealth', 'summary', 'criticalIssues', 'recommendations'],
  };

  const target = args || 'current data pipeline (run from pipeline directory)';

  phase('Map');
  const pipelineMap = await agent(`Map all stages of the data pipeline in: "${target}". Identify each stage by name, type (source/transform/enrich/filter/aggregate/sink), its input data source, and output. List them in execution order.`, { schema: PIPELINE_SCHEMA, label: 'map' });
  if (!pipelineMap) { log('Warning: agent returned null for pipelineMap, skipping'); return { target, error: 'agent-null' }; }
  log(`Pipeline: ${pipelineMap.pipelineName} — ${pipelineMap.stages.length} stages`);

  phase('Validate');
  const validations = await parallel(
    pipelineMap.stages.map(s => () => agent(
      `Validate pipeline stage "${s.name}" (${s.type}) in: "${target}". Check: (1) schema validation — correct data types, required fields present, (2) completeness — no unexpected nulls or missing records, (3) transform correctness — business rules applied correctly, (4) output contracts — downstream consumers will receive expected format. Rate each issue critical/high/medium/low.`,
      { schema: STAGE_SCHEMA, label: `validate:${s.name}`, phase: 'Validate' }
    ))
  );

  phase('Quality');
  const stageScores = validations.filter(Boolean).map(v => `${v.stage}: ${v.healthScore}/100`).join(', ');
  log(`Stage health: ${stageScores}`);

  phase('Report');
  const issueList = validations.filter(Boolean).flatMap(v => v.issues.map(i => `[${v.stage}/${i.severity}] ${i.description}`)).slice(0, 15);
  const report = await agent(`Create a data pipeline validation report for: "${target}"\n\nStage health scores: ${stageScores}\n\nIssues found:\n${issueList.join('\n')}\n\nDetermine overall pipeline health, list critical issues, and provide prioritized recommendations.`, { schema: REPORT_SCHEMA, label: 'report' });

  return { target, pipelineMap, validations: validations.filter(Boolean), report };
}
