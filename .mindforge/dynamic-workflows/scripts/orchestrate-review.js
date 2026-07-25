export const meta = {
  name: 'orchestrate-review',
  description: '4-lens parallel review — factual, domain, safety, style — coordinated as one panel and merged into a single verdict',
  whenToUse: 'When reviewing content or a decision where correctness/security/performance is the wrong axis split — e.g. a document, a policy, a plan, an AI-generated artifact, anything where you want independent factual-accuracy, domain-expert, safety, and voice/style perspectives rather than code-review dimensions',
  phases: [
    { title: 'Scope', detail: 'pin the target and any domain context' },
    { title: 'Panel', detail: '4 parallel lenses: factual / domain / safety / style' },
    { title: 'Consensus', detail: 'merge findings, deduplicate, score severity' },
    { title: 'Verdict', detail: 'single panel verdict with findings by lens' },
  ],
};

const LENS_SCHEMA = {
  type: 'object',
  properties: {
    lens: { type: 'string' },
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
  required: ['lens', 'findings', 'summary'],
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

function parseArgs(raw) {
  if (raw && typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // Not valid JSON despite looking like it — fall through and treat as a plain target string.
      }
    }
    return trimmed;
  }
  return raw || {};
}

const input = parseArgs(args);
const target = (typeof input === 'string' ? input : input.target) || 'the artifact provided in this conversation';
const domainContext = typeof input === 'object' ? input.domainContext : null;

phase('Scope');
log(`Reviewing: ${target}`);
if (domainContext) log(`Domain context: ${domainContext}`);

const PANEL = [
  {
    label: 'factual',
    prompt: `Review for FACTUAL ACCURACY: "${target}". Check every checkable claim: numbers, dates, names, quotes, causal claims, and anything stated as fact. Flag claims that are wrong, unverifiable, unsourced where a source is implied, or stated with more confidence than the evidence supports. Do not flag matters of opinion or style — only things that could be objectively wrong. Rate each as blocking/major/minor/suggestion.`,
  },
  {
    label: 'domain',
    prompt: `Review for DOMAIN CORRECTNESS: "${target}". ${domainContext ? `Domain context: ${domainContext}. ` : ''}Check whether the content reflects genuine expertise in its subject area: correct terminology, sound reasoning within the field's own conventions, no naive mistakes an actual practitioner would catch, and no missing context a domain expert would consider essential. Rate each as blocking/major/minor/suggestion.`,
  },
  {
    label: 'safety',
    prompt: `Review for SAFETY: "${target}". Check for: harmful, dangerous, or misleading instructions; content that could cause real-world harm if acted on; missing caveats on genuinely risky actions; privacy or security exposure; and anything that should carry a warning but doesn't. Do not flag mild edginess or strong opinions — only things with real potential for harm. Rate each as blocking/major/minor/suggestion.`,
  },
  {
    label: 'style',
    prompt: `Review for STYLE and VOICE: "${target}". Check for: clarity, tone consistency, awkward phrasing, structure that buries the point, jargon that doesn't earn its place, and whether the writing matches its evident purpose and audience. Rate each as blocking/major/minor/suggestion — reserve "blocking" for style so broken it undermines comprehension, not mere preference.`,
  },
];

phase('Panel');
const reviews = await parallel(
  PANEL.map(p => () => agent(p.prompt, { schema: LENS_SCHEMA, label: `lens:${p.label}`, phase: 'Panel' }))
);

phase('Consensus');
const allFindings = reviews.filter(Boolean).flatMap(r => r.findings.map(f => ({ ...f, lens: r.lens })));
const blocking = allFindings.filter(f => f.severity === 'blocking');
const major = allFindings.filter(f => f.severity === 'major');
const minor = allFindings.filter(f => f.severity === 'minor');
const suggestions = allFindings.filter(f => f.severity === 'suggestion');
log(`${allFindings.length} total findings: ${blocking.length} blocking, ${major.length} major, ${minor.length} minor, ${suggestions.length} suggestions`);

const findingsSummary = allFindings.slice(0, 20).map(f => `[${f.severity.toUpperCase()}][${f.lens}] ${f.issue} → ${f.suggestion}`).join('\n');

phase('Verdict');
const verdict = await agent(
  `Produce a final panel verdict for: "${target}"\n\nFindings:\n${findingsSummary}\n\nIf there are any blocking issues, verdict is BLOCKING. If major issues exist, CHANGES_REQUIRED. If only minor/suggestions, APPROVED_WITH_SUGGESTIONS. Otherwise APPROVED.`,
  { schema: VERDICT_SCHEMA, label: 'verdict' }
);

return {
  target,
  reviews: reviews.filter(Boolean),
  verdict,
  stats: { total: allFindings.length, blocking: blocking.length, major: major.length, minor: minor.length, suggestions: suggestions.length },
};
