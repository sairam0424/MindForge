export const meta = {
  name: 'pr-review',
  description: '4-dimensional parallel PR review: correctness, security, performance, style → consensus verdict',
  whenToUse: 'When you want a thorough multi-perspective review of a pull request or diff',
  phases: [
    { title: 'Scope', detail: 'Read diff and build review context' },
    { title: 'Review', detail: '4 parallel reviewers: correctness / security / performance / style' },
    { title: 'Consensus', detail: 'Merge findings, deduplicate, score severity' },
    { title: 'Verdict', detail: 'Produce APPROVED / CHANGES REQUIRED verdict with findings' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const REVIEW_SCHEMA = {
    type: 'object',
    properties: {
      dimension: { type: 'string' },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['blocking', 'major', 'minor', 'suggestion'] },
            location: { type: 'string' },
            issue: { type: 'string' },
            suggestion: { type: 'string' },
          },
          required: ['severity', 'issue', 'suggestion'],
        },
      },
      summary: { type: 'string' },
    },
    required: ['dimension', 'findings', 'summary'],
  };

  const VERDICT_SCHEMA = {
    type: 'object',
    properties: {
      verdict: { type: 'string', enum: ['APPROVED', 'APPROVED_WITH_SUGGESTIONS', 'CHANGES_REQUIRED', 'BLOCKING'] },
      summary: { type: 'string' },
      blockingIssues: { type: 'array', items: { type: 'string' } },
      majorIssues: { type: 'array', items: { type: 'string' } },
      suggestions: { type: 'array', items: { type: 'string' } },
    },
    required: ['verdict', 'summary', 'blockingIssues', 'majorIssues', 'suggestions'],
  };

  const target = args || 'current git diff HEAD~1 (run from repo root)';

  phase('Scope');
  log(`Reviewing: ${target}`);

  const REVIEWERS = [
    { label: 'correctness', prompt: `Review this code change for CORRECTNESS: "${target}". Check for: logic errors, off-by-one bugs, null/undefined handling, incorrect assumptions, broken edge cases, missing error handling, incorrect API usage, race conditions, and test coverage gaps. Rate each finding as blocking/major/minor/suggestion.` },
    { label: 'security', prompt: `Review this code change for SECURITY: "${target}". Check for: injection vulnerabilities, broken authentication, XSS, CSRF, insecure direct object references, sensitive data exposure, hardcoded credentials, missing authorization checks, and insecure dependencies. Rate each as blocking/major/minor/suggestion.` },
    { label: 'performance', prompt: `Review this code change for PERFORMANCE: "${target}". Check for: N+1 queries, missing indexes, inefficient algorithms, memory leaks, synchronous blocking operations, unnecessary re-renders, large bundle imports, missing caching, and scalability concerns. Rate each as blocking/major/minor/suggestion.` },
    { label: 'style', prompt: `Review this code change for CODE STYLE and MAINTAINABILITY: "${target}". Check for: naming conventions, function length, complexity, magic numbers, dead code, missing comments for non-obvious logic, inconsistent patterns, DRY violations, and adherence to project conventions. Rate each as blocking/major/minor/suggestion.` },
  ];

  phase('Review');
  const reviews = await parallel(
    REVIEWERS.map(r => () => agent(r.prompt, { schema: REVIEW_SCHEMA, label: `review:${r.label}`, phase: 'Review' }))
  );

  phase('Consensus');
  const allFindings = reviews.filter(Boolean).flatMap(r => r.findings.map(f => ({ ...f, dimension: r.dimension })));
  const blocking = allFindings.filter(f => f.severity === 'blocking');
  const major = allFindings.filter(f => f.severity === 'major');
  const minor = allFindings.filter(f => f.severity === 'minor');
  const suggestions = allFindings.filter(f => f.severity === 'suggestion');
  log(`${allFindings.length} total findings: ${blocking.length} blocking, ${major.length} major, ${minor.length} minor, ${suggestions.length} suggestions`);

  const findingsSummary = allFindings.slice(0, 20).map(f => `[${f.severity.toUpperCase()}][${f.dimension}] ${f.issue} → ${f.suggestion}`).join('\n');

  phase('Verdict');
  const verdict = await agent(
    `Produce a final PR review verdict for: "${target}"\n\nFindings:\n${findingsSummary}\n\nIf there are any blocking issues, verdict is BLOCKING. If major issues exist, CHANGES_REQUIRED. If only minor/suggestions, APPROVED_WITH_SUGGESTIONS. Otherwise APPROVED.`,
    { schema: VERDICT_SCHEMA, label: 'verdict' }
  );

  return {
    target,
    reviews: reviews.filter(Boolean),
    verdict,
    stats: { total: allFindings.length, blocking: blocking.length, major: major.length, minor: minor.length, suggestions: suggestions.length },
  };
}
