export const meta = {
  name: 'tech-evaluation',
  description: 'Scored technology evaluation across DX, performance, security, ecosystem, and community',
  whenToUse: 'When choosing between technologies, frameworks, or libraries for a project',
  phases: [
    { title: 'Scope', detail: 'Define candidates and evaluation criteria' },
    { title: 'Evaluate', detail: '5 parallel dimension agents per candidate' },
    { title: 'Score', detail: 'Build weighted scoring matrix' },
    { title: 'Recommend', detail: 'Produce ranked recommendation with trade-offs' },
  ],
}

const EVAL_SCHEMA = {
  type: 'object',
  properties: {
    dimension: { type: 'string' },
    score: { type: 'number', minimum: 1, maximum: 10 },
    rationale: { type: 'string' },
    pros: { type: 'array', items: { type: 'string' } },
    cons: { type: 'array', items: { type: 'string' } },
  },
  required: ['dimension', 'score', 'rationale', 'pros', 'cons'],
}

const RECOMMEND_SCHEMA = {
  type: 'object',
  properties: {
    winner: { type: 'string' },
    summary: { type: 'string' },
    ranking: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, totalScore: { type: 'number' }, verdict: { type: 'string' } }, required: ['name', 'totalScore', 'verdict'] } },
    tradeoffs: { type: 'array', items: { type: 'string' } },
    recommendation: { type: 'string' },
  },
  required: ['winner', 'summary', 'ranking', 'tradeoffs', 'recommendation'],
}

const input = args || 'No candidates specified — pass "TechA vs TechB vs TechC for [use case]" as args.'

phase('Scope')
log(`Evaluating: ${input.slice(0, 80)}`)

const DIMENSIONS = [
  { label: 'dx', name: 'Developer Experience', prompt: `Evaluate the developer experience of: ${input}. Consider: API ergonomics, documentation quality, error messages, learning curve, tooling, IDE support, type safety, and community examples. Score 1-10.` },
  { label: 'perf', name: 'Performance', prompt: `Evaluate the runtime performance of: ${input}. Consider: throughput, latency, memory footprint, scalability, benchmarks available, and known bottlenecks. Score 1-10.` },
  { label: 'security', name: 'Security', prompt: `Evaluate the security posture of: ${input}. Consider: CVE history, security audit results, supply chain risk, default-secure configuration, auth/authz support, and maintenance cadence. Score 1-10.` },
  { label: 'ecosystem', name: 'Ecosystem', prompt: `Evaluate the ecosystem of: ${input}. Consider: number of integrations, plugin quality, third-party packages, cloud provider support, and lock-in risk. Score 1-10.` },
  { label: 'community', name: 'Community', prompt: `Evaluate the community health of: ${input}. Consider: GitHub stars, contributor count, issue response time, Discord/Slack activity, recent releases, and long-term viability. Score 1-10.` },
]

phase('Evaluate')
const evaluations = await parallel(
  DIMENSIONS.map(d => () => agent(d.prompt, { schema: EVAL_SCHEMA, label: `eval:${d.label}`, phase: 'Evaluate' }))
)

phase('Score')
const validEvals = evaluations.filter(Boolean)
const scoreMatrix = validEvals.map(e => `${e.dimension}: ${e.score}/10 — ${e.rationale}`).join('\n')
log(`Score matrix built from ${validEvals.length} dimensions`)

phase('Recommend')
const recommendation = await agent(
  `Based on this technology evaluation for "${input}", produce a ranked recommendation:\n\nScores:\n${scoreMatrix}\n\nIdentify the winner, explain the trade-offs, and give a clear recommendation for when to choose each option.`,
  { schema: RECOMMEND_SCHEMA, label: 'recommend' }
)

return {
  input,
  evaluations: validEvals,
  recommendation,
}
