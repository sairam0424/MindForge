export const meta = {
  name: 'ux-heuristic-audit',
  description: '10 Nielsen heuristics parallel audit → severity ranking → fix brief',
  whenToUse: 'When auditing a UI for usability problems using Nielsen\'s 10 heuristics before launch or redesign',
  phases: [
    { title: 'Scope', detail: 'Define target UI and identify key user flows to audit' },
    { title: 'Audit', detail: '10 parallel heuristic evaluators — one per Nielsen heuristic' },
    { title: 'Rank', detail: 'Severity ranking of all violations by impact on user experience' },
    { title: 'Brief', detail: 'Prioritized fix brief with specific design recommendations' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const HEURISTIC_SCHEMA = {
    type: 'object',
    properties: {
      heuristic: { type: 'string' },
      violations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            component: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            description: { type: 'string' },
            recommendation: { type: 'string' },
          },
          required: ['severity', 'description', 'recommendation'],
        },
      },
      score: { type: 'number' },
    },
    required: ['heuristic', 'violations', 'score'],
  };

  const RANK_SCHEMA = {
    type: 'object',
    properties: {
      rankedViolations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            rank: { type: 'number' },
            heuristic: { type: 'string' },
            description: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            impactScore: { type: 'number' },
          },
          required: ['rank', 'heuristic', 'description', 'severity', 'impactScore'],
        },
      },
      overallUsabilityScore: { type: 'number' },
    },
    required: ['rankedViolations', 'overallUsabilityScore'],
  };

  const BRIEF_SCHEMA = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      criticalFixes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            issue: { type: 'string' },
            heuristic: { type: 'string' },
            fix: { type: 'string' },
            effort: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          required: ['issue', 'heuristic', 'fix', 'effort'],
        },
      },
      quickWins: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'criticalFixes', 'quickWins'],
  };

  const target = args || 'current codebase (run from repo root)';

  phase('Scope');
  log(`UX heuristic audit target: ${target}`);

  const HEURISTICS = [
    { label: 'visibility-of-status', prompt: `Evaluate Nielsen Heuristic #1 "Visibility of System Status" for: "${target}". Check: Does the UI always keep users informed about what is going on? Are loading states shown? Is progress communicated? Are confirmations displayed after actions? Score 0-100 (100=perfect) and list all violations with severity.` },
    { label: 'match-real-world', prompt: `Evaluate Nielsen Heuristic #2 "Match Between System and the Real World" for: "${target}". Check: Does the UI use language and concepts familiar to users? Are metaphors and icons intuitive? Is information ordered naturally? Score 0-100 and list violations.` },
    { label: 'user-control', prompt: `Evaluate Nielsen Heuristic #3 "User Control and Freedom" for: "${target}". Check: Can users undo/redo actions? Is there a clear exit from every state? Are emergency exits clearly marked? Can users cancel ongoing operations? Score 0-100 and list violations.` },
    { label: 'consistency', prompt: `Evaluate Nielsen Heuristic #4 "Consistency and Standards" for: "${target}". Check: Do similar actions have similar appearance and behavior? Are platform conventions followed? Are labels consistent across screens? Score 0-100 and list violations.` },
    { label: 'error-prevention', prompt: `Evaluate Nielsen Heuristic #5 "Error Prevention" for: "${target}". Check: Are good error-prone conditions eliminated? Are confirmation dialogs shown for destructive actions? Is inline validation used? Are form constraints visible before submission? Score 0-100 and list violations.` },
    { label: 'recognition-over-recall', prompt: `Evaluate Nielsen Heuristic #6 "Recognition Rather Than Recall" for: "${target}". Check: Are options visible rather than remembered? Are instructions visible in context? Are recently used items surfaced? Are tooltips and help text available? Score 0-100 and list violations.` },
    { label: 'flexibility', prompt: `Evaluate Nielsen Heuristic #7 "Flexibility and Efficiency of Use" for: "${target}". Check: Are there keyboard shortcuts for expert users? Can users customize frequent actions? Are there accelerators for power users? Does the UI serve both novice and expert? Score 0-100 and list violations.` },
    { label: 'aesthetic-minimalism', prompt: `Evaluate Nielsen Heuristic #8 "Aesthetic and Minimalist Design" for: "${target}". Check: Does every element serve a purpose? Is irrelevant information removed? Are visual hierarchies clear? Is there excessive decoration or noise? Score 0-100 and list violations.` },
    { label: 'error-recognition', prompt: `Evaluate Nielsen Heuristic #9 "Help Users Recognize, Diagnose, and Recover from Errors" for: "${target}". Check: Are error messages in plain language (not error codes)? Do they precisely indicate the problem? Do they constructively suggest solutions? Score 0-100 and list violations.` },
    { label: 'help-docs', prompt: `Evaluate Nielsen Heuristic #10 "Help and Documentation" for: "${target}". Check: Is help easy to search? Is documentation focused on user tasks? Are concrete steps listed? Is context-sensitive help available? Score 0-100 and list violations.` },
  ];

  phase('Audit');
  const auditResults = await parallel(
    HEURISTICS.map(h => () => agent(h.prompt, { schema: HEURISTIC_SCHEMA, label: `heuristic:${h.label}`, phase: 'Audit' }))
  );

  phase('Rank');
  const allViolations = auditResults.filter(Boolean).flatMap(r => (r.violations || []).map(v => ({ heuristic: r.heuristic, ...v })));
  log(`${allViolations.length} violations found across 10 heuristics — ranking by severity`);

  const violationSummary = allViolations.slice(0, 30).map(v => `[${v.severity}] ${v.heuristic || 'unknown'}: ${v.description}`).join('\n');
  const ranked = await agent(
    `Rank these UX violations by impact on user experience for: "${target}"\n\nViolations:\n${violationSummary}\n\nRank each by impact score (1-10), assign a rank number starting from 1 (most critical). Calculate an overall usability score (0-100) across all heuristics.`,
    { schema: RANK_SCHEMA, label: 'rank' }
  );

  phase('Brief');
  const topViolations = (ranked.rankedViolations || []).slice(0, 10).map(v => `[Rank ${v.rank}/${v.severity}] ${v.heuristic}: ${v.description}`).join('\n');
  const brief = await agent(
    `Create a UX fix brief for: "${target}"\n\nOverall usability score: ${ranked.overallUsabilityScore}/100\n\nTop violations:\n${topViolations}\n\nFor each critical/high violation provide: specific fix with design recommendation, implementation effort (low/medium/high). Also list quick wins (low effort, high impact fixes). Write a 2-3 sentence executive summary.`,
    { schema: BRIEF_SCHEMA, label: 'brief' }
  );

  return { target, audits: auditResults.filter(Boolean), ranked, brief };
}
