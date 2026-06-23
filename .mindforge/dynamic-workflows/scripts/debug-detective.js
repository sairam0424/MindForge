export const meta = {
  name: 'debug-detective',
  description: '4-hypothesis parallel investigation → evidence gathering → scientific RCA',
  whenToUse: 'When debugging a hard-to-reproduce bug, production issue, or mysterious failure with unclear root cause',
  phases: [
    { title: 'Intake', detail: 'Document symptoms, context, and reproduction steps' },
    { title: 'Hypothesize', detail: '4 parallel hypothesis agents from different angles' },
    { title: 'Evidence', detail: 'Parallel evidence gathering per hypothesis' },
    { title: 'RCA', detail: 'Scientific root cause analysis from evidence' },
    { title: 'Fix', detail: 'Targeted fix plan with regression test spec' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const INTAKE_SCHEMA = {
    type: 'object',
    properties: {
      bugSummary: { type: 'string' },
      symptoms: { type: 'array', items: { type: 'string' } },
      reproducible: { type: 'boolean' },
      affectedComponents: { type: 'array', items: { type: 'string' } },
      recentChanges: { type: 'array', items: { type: 'string' } },
      environment: { type: 'string' },
    },
    required: ['bugSummary', 'symptoms', 'affectedComponents'],
  };

  const HYPOTHESIS_SCHEMA = {
    type: 'object',
    properties: {
      angle: { type: 'string' },
      hypothesis: { type: 'string' },
      reasoning: { type: 'string' },
      evidenceNeeded: { type: 'array', items: { type: 'string' } },
      probability: { type: 'string', enum: ['high', 'medium', 'low'] },
    },
    required: ['angle', 'hypothesis', 'reasoning', 'evidenceNeeded', 'probability'],
  };

  const EVIDENCE_SCHEMA = {
    type: 'object',
    properties: {
      hypothesis: { type: 'string' },
      supportingEvidence: { type: 'array', items: { type: 'string' } },
      refutingEvidence: { type: 'array', items: { type: 'string' } },
      verdict: { type: 'string', enum: ['strongly-supported', 'weakly-supported', 'inconclusive', 'refuted'] },
      confidence: { type: 'number' },
    },
    required: ['hypothesis', 'supportingEvidence', 'refutingEvidence', 'verdict', 'confidence'],
  };

  const RCA_SCHEMA = {
    type: 'object',
    properties: {
      rootCause: { type: 'string' },
      causalChain: { type: 'array', items: { type: 'string' } },
      contributingFactors: { type: 'array', items: { type: 'string' } },
      whyNowExplanation: { type: 'string' },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    },
    required: ['rootCause', 'causalChain', 'confidence'],
  };

  const FIX_SCHEMA = {
    type: 'object',
    properties: {
      fixDescription: { type: 'string' },
      filestoChange: { type: 'array', items: { type: 'string' } },
      implementationSteps: { type: 'array', items: { type: 'string' } },
      regressionTestSpec: { type: 'string' },
      riskOfFix: { type: 'string', enum: ['low', 'medium', 'high'] },
    },
    required: ['fixDescription', 'implementationSteps', 'regressionTestSpec'],
  };

  const bugReport = args || 'No bug report provided — describe the bug, symptoms, and context in args.';

  phase('Intake');
  log(`Analyzing bug report: ${bugReport.slice(0, 80)}`);
  const intake = await agent(
    `Analyze this bug report and extract structured information: "${bugReport}"\n\nIdentify: bug summary, specific symptoms observed, whether reproducible, affected components/files, any recent changes that might be related, and environment (prod/staging/dev, OS, browser, etc.).`,
    { schema: INTAKE_SCHEMA, label: 'intake' }
  );
  if (!intake) { log('Warning: agent returned null for intake, skipping'); return { bugReport, error: 'agent-null' }; }
  log(`Bug: ${intake.bugSummary} | Affects: ${intake.affectedComponents.join(', ')}`);

  phase('Hypothesize');
  const context = `Bug: ${intake.bugSummary}\nSymptoms: ${intake.symptoms.join(', ')}\nAffected: ${intake.affectedComponents.join(', ')}\nRecent changes: ${(intake.recentChanges || []).join(', ')}`;
  const hypotheses = await parallel([
    () => agent(`Generate a hypothesis from a CODE perspective for this bug: ${context}\n\nFocus on: logic errors, off-by-one, null/undefined handling, async/await issues, type coercion. What specific code defect could cause these symptoms?`, { schema: HYPOTHESIS_SCHEMA, label: 'hypothesis-code', phase: 'Hypothesize' }),
    () => agent(`Generate a hypothesis from a STATE/DATA perspective for this bug: ${context}\n\nFocus on: database state corruption, stale cache, race condition, shared mutable state, session/cookie issues. What data or state problem could cause these symptoms?`, { schema: HYPOTHESIS_SCHEMA, label: 'hypothesis-state', phase: 'Hypothesize' }),
    () => agent(`Generate a hypothesis from an INTEGRATION/ENVIRONMENT perspective for this bug: ${context}\n\nFocus on: API contract mismatch, network timeout, environment variable, dependency version conflict, OS/browser differences. What external factor could cause these symptoms?`, { schema: HYPOTHESIS_SCHEMA, label: 'hypothesis-integration', phase: 'Hypothesize' }),
    () => agent(`Generate a hypothesis from a REGRESSION perspective for this bug: ${context}\n\nFocus on: what recent change (deploy, config, dependency update) most likely introduced this. Which commit or change is the prime suspect?`, { schema: HYPOTHESIS_SCHEMA, label: 'hypothesis-regression', phase: 'Hypothesize' }),
  ]);

  phase('Evidence');
  const validHypotheses = hypotheses.filter(Boolean);
  log(`${validHypotheses.length} hypotheses — gathering evidence in parallel`);

  const evidence = await parallel(
    validHypotheses.map(h => () => agent(
      `Gather evidence for or against this hypothesis about the bug "${intake.bugSummary}":\n\nHypothesis: ${h.hypothesis}\nEvidence needed: ${h.evidenceNeeded.join(', ')}\n\nLook in the codebase for: ${h.evidenceNeeded.join(', ')}. Report what you find that supports OR refutes this hypothesis. Rate your verdict.`,
      { schema: EVIDENCE_SCHEMA, label: `evidence:${h.angle.slice(0, 20)}`, phase: 'Evidence' }
    ))
  );

  phase('RCA');
  const evidenceSummary = evidence.filter(Boolean).map(e => `${e.hypothesis}: ${e.verdict} (${e.confidence}%) — supports: [${e.supportingEvidence.slice(0, 2).join(', ')}] refutes: [${e.refutingEvidence.slice(0, 1).join(', ')}]`).join('\n');
  const rca = await agent(
    `Perform a scientific root cause analysis for: "${intake.bugSummary}"\n\nEvidence summary:\n${evidenceSummary}\n\nIdentify the root cause (the specific defect that, if fixed, would prevent the bug), the causal chain (how root cause leads to symptoms), contributing factors, and why it appeared now. Rate your confidence.`,
    { schema: RCA_SCHEMA, label: 'rca' }
  );
  if (!rca) { log('Warning: agent returned null for rca, skipping'); return { bugReport, intake, hypotheses: validHypotheses, evidence: evidence.filter(Boolean), error: 'agent-null' }; }
  log(`RCA: ${rca.rootCause.slice(0, 80)} (confidence: ${rca.confidence})`);

  phase('Fix');
  const fix = await agent(
    `Design a targeted fix for this bug.\n\nRoot cause: ${rca.rootCause}\nCausal chain: ${rca.causalChain.join(' → ')}\nAffected components: ${intake.affectedComponents.join(', ')}\n\nProvide: exact fix description, which files to change, step-by-step implementation, a regression test specification that would catch this bug if reintroduced, and risk assessment of the fix.`,
    { schema: FIX_SCHEMA, label: 'fix' }
  );
  if (!fix) { log('Warning: agent returned null for fix, skipping'); return { bugReport, intake, hypotheses: validHypotheses, evidence: evidence.filter(Boolean), rca, error: 'agent-null' }; }

  return { bugReport, intake, hypotheses: validHypotheses, evidence: evidence.filter(Boolean), rca, fix };
}
