export const meta = {
  name: 'writer-reviewer',
  description: 'Anthropic Writer/Reviewer pattern: implement in Context A → fresh Context B reviews the diff',
  whenToUse: 'When you want unbiased code review — a fresh context reviewer has no bias toward code it did not write',
  phases: [
    { title: 'Implement', detail: 'Writer agent implements the requested change' },
    { title: 'Review', detail: 'Fresh reviewer agent inspects only the diff without implementation context' },
    { title: 'Verdict', detail: 'Accept / request-changes verdict with specific actionable feedback' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const IMPL_SCHEMA = {
    type: 'object',
    properties: {
      description: { type: 'string' },
      filesChanged: { type: 'array', items: { type: 'string' } },
      approach: { type: 'string' },
      diff: { type: 'string' },
      testingDone: { type: 'string' },
    },
    required: ['description', 'filesChanged', 'approach', 'diff'],
  };

  const REVIEW_SCHEMA = {
    type: 'object',
    properties: {
      verdict: { type: 'string', enum: ['approve', 'request-changes', 'comment'] },
      summary: { type: 'string' },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] },
            location: { type: 'string' },
            issue: { type: 'string' },
            suggestion: { type: 'string' },
          },
          required: ['severity', 'location', 'issue', 'suggestion'],
        },
      },
      positives: { type: 'array', items: { type: 'string' } },
      approvalConditions: { type: 'array', items: { type: 'string' } },
    },
    required: ['verdict', 'summary', 'issues'],
  };

  const task = args || 'No task specified — describe the implementation task in args.';

  phase('Implement');
  log(`Writer implementing: ${task.slice(0, 80)}`);
  const implementation = await agent(
    `Implement this task in the current codebase: "${task}"\n\nWrite the complete implementation. After implementing, provide: (1) description of what you built, (2) list of files changed, (3) your implementation approach and key decisions, (4) a diff-style summary of changes (show old → new for key parts), (5) testing done or test commands to run.`,
    { schema: IMPL_SCHEMA, label: 'writer' }
  );
  log(`Writer: ${implementation.description} | Changed: ${implementation.filesChanged.join(', ')}`);

  phase('Review');
  const diffContext = `TASK: ${task}\n\nCHANGES MADE:\n${implementation.diff}\n\nFILES CHANGED: ${implementation.filesChanged.join(', ')}\n\nTESTING: ${implementation.testingDone || 'not specified'}`;
  const review = await agent(
    `You are a senior code reviewer. Review this code change with fresh eyes — you were NOT involved in the implementation.\n\n${diffContext}\n\nReview for: correctness (does it actually solve the task?), edge cases (null/empty/large inputs), security (injection, auth, secrets), performance (N+1, unbounded loops), maintainability (naming, complexity, DRY). Give a verdict: approve / request-changes / comment. For each issue: severity (blocker/major/minor/nit), exact location, what's wrong, specific suggestion.`,
    { schema: REVIEW_SCHEMA, label: 'reviewer' }
  );
  log(`Reviewer verdict: ${review.verdict} | ${review.issues.length} issues (${review.issues.filter(i => i.severity === 'blocker').length} blockers)`);

  phase('Verdict');
  const blockers = review.issues.filter(i => i.severity === 'blocker');
  const majors = review.issues.filter(i => i.severity === 'major');

  return {
    task,
    implementation,
    review,
    verdict: {
      decision: review.verdict,
      blockerCount: blockers.length,
      majorCount: majors.length,
      approved: review.verdict === 'approve',
      requiredFixes: blockers.concat(majors).map(i => `[${i.severity.toUpperCase()}] ${i.location}: ${i.suggestion}`),
    },
  };
}
