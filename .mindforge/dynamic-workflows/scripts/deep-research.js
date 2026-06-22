export const meta = {
  name: 'deep-research',
  description: 'Fan-out web research with adversarial claim verification and cited synthesis',
  whenToUse: 'When you need a deep, multi-source, fact-checked research report on any topic',
  phases: [
    { title: 'Scope', detail: 'Decompose question into 5 search angles' },
    { title: 'Search', detail: '5 parallel web search agents, one per angle' },
    { title: 'Fetch', detail: 'Dedup URLs, fetch top 15 sources, extract falsifiable claims' },
    { title: 'Verify', detail: '3-vote adversarial verification per claim (need 2/3 to kill)' },
    { title: 'Synthesize', detail: 'Merge semantic dupes, rank by confidence, cite sources' },
  ],
}

const ANGLES_SCHEMA = {
  type: 'object',
  properties: {
    angles: {
      type: 'array',
      items: { type: 'object', properties: { label: { type: 'string' }, query: { type: 'string' } }, required: ['label', 'query'] },
      minItems: 5, maxItems: 5,
    },
  },
  required: ['angles'],
}

const SEARCH_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: { type: 'object', properties: { title: { type: 'string' }, url: { type: 'string' }, snippet: { type: 'string' } }, required: ['title', 'url', 'snippet'] },
    },
  },
  required: ['results'],
}

const CLAIMS_SCHEMA = {
  type: 'object',
  properties: {
    claims: {
      type: 'array',
      items: { type: 'object', properties: { claim: { type: 'string' }, source: { type: 'string' }, evidence: { type: 'string' } }, required: ['claim', 'source', 'evidence'] },
    },
  },
  required: ['claims'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: { refuted: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['refuted', 'reason'],
}

const SYNTH_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: { type: 'object', properties: { claim: { type: 'string' }, confidence: { type: 'string' }, sources: { type: 'array', items: { type: 'string' } }, evidence: { type: 'string' } }, required: ['claim', 'confidence', 'sources', 'evidence'] },
    },
  },
  required: ['summary', 'findings'],
}

const question = args || 'No question provided — please pass your research question as args.'

phase('Scope')
log(`Q: ${question.slice(0, 60)}…`)
const scoped = await agent(
  `Decompose this research question into exactly 5 independent search angles. Each angle should approach the topic from a different perspective (e.g., implementation, theory, examples, trade-offs, contrarian view). Question: "${question}"`,
  { schema: ANGLES_SCHEMA, label: 'decompose' }
)
const angles = scoped.angles
log(`Decomposed into ${angles.length} angles: ${angles.map(a => a.label).join(', ')}`)

phase('Search')
const searchResults = await parallel(
  angles.map(angle => () => agent(
    `Web search for: "${angle.query}". Return the top 6 most relevant results with title, URL, and a brief snippet explaining why each is relevant to: "${angle.query}"`,
    { schema: SEARCH_SCHEMA, label: angle.label }
  ))
)

phase('Fetch')
const allUrls = new Map()
for (const res of searchResults.filter(Boolean)) {
  for (const r of res.results) {
    if (!allUrls.has(r.url)) allUrls.set(r.url, r)
  }
}
const uniqueUrls = [...allUrls.values()].slice(0, 15)
log(`Fetched ${searchResults.filter(Boolean).length * 6} results → ${uniqueUrls.length} unique sources → extracting claims`)

const claimBatches = await parallel(
  uniqueUrls.map(src => () => agent(
    `Read this source and extract up to 5 specific, falsifiable factual claims from it. Only extract claims that are directly relevant to: "${question}". Source URL: ${src.url}\nSnippet: ${src.snippet}`,
    { schema: CLAIMS_SCHEMA, label: `claims:${src.url.slice(8, 40)}` }
  ))
)
const allClaims = claimBatches.filter(Boolean).flatMap(b => b.claims).slice(0, 25)
log(`Extracted ${allClaims.length} claims → verifying top 25`)

phase('Verify')
const verified = await parallel(
  allClaims.map(c => () =>
    parallel([
      () => agent(`Try to REFUTE this claim. Default to refuted=true if uncertain or unverifiable. Claim: "${c.claim}"`, { schema: VERDICT_SCHEMA, label: `verify-1:${c.claim.slice(0, 30)}` }),
      () => agent(`Adversarially challenge this claim from a different angle. Default to refuted=true if you cannot confirm it. Claim: "${c.claim}"`, { schema: VERDICT_SCHEMA, label: `verify-2:${c.claim.slice(0, 30)}` }),
      () => agent(`As a skeptical fact-checker, evaluate this claim. Default to refuted=true if evidence is weak. Claim: "${c.claim}"`, { schema: VERDICT_SCHEMA, label: `verify-3:${c.claim.slice(0, 30)}` }),
    ]).then(votes => {
      const refutes = votes.filter(Boolean).filter(v => v.refuted).length
      return { ...c, survives: refutes <= 1, votes: `${3 - refutes}-${refutes}` }
    })
  )
)
const confirmed = verified.filter(Boolean).filter(c => c.survives)
const killed = verified.filter(Boolean).filter(c => !c.survives)
log(`Verify done: ${allClaims.length} claims → ${confirmed.length} confirmed, ${killed.length} killed`)

phase('Synthesize')
const synthesis = await agent(
  `Synthesize these verified research findings into a comprehensive report answering: "${question}"

Confirmed findings (${confirmed.length}):
${confirmed.map((c, i) => `${i + 1}. [${c.votes}] ${c.claim} (source: ${c.source})`).join('\n')}

Killed findings (${killed.length}):
${killed.map(c => `- [${c.votes}] ${c.claim}`).join('\n')}

Produce a clear summary and a ranked findings list. For each finding, state the claim, confidence level (high/medium/low), sources, and evidence.`,
  { schema: SYNTH_SCHEMA, label: 'synthesize' }
)

return {
  question,
  summary: synthesis.summary,
  findings: synthesis.findings,
  refuted: killed.map(c => ({ claim: c.claim, vote: c.votes, source: c.source })),
  sources: uniqueUrls.map(u => u.url),
  stats: {
    angles: angles.length,
    sourcesFetched: uniqueUrls.length,
    claimsExtracted: allClaims.length,
    claimsVerified: allClaims.length,
    confirmed: confirmed.length,
    killed: killed.length,
  },
}
