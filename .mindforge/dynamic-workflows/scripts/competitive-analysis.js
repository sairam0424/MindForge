export const meta = {
  name: 'competitive-analysis',
  description: 'Multi-angle competitive research producing a SWOT and positioning summary',
  whenToUse: 'When evaluating a product, company, or technology against competitors',
  phases: [
    { title: 'Scope', detail: 'Define target and 5 research angles' },
    { title: 'Research', detail: 'Parallel: product / pricing / reviews / community / roadmap' },
    { title: 'SWOT', detail: 'Synthesize strengths, weaknesses, opportunities, threats' },
    { title: 'Position', detail: 'Produce positioning recommendations' },
  ],
}

const RESEARCH_SCHEMA = {
  type: 'object',
  properties: {
    angle: { type: 'string' },
    findings: { type: 'array', items: { type: 'string' } },
    sources: { type: 'array', items: { type: 'string' } },
  },
  required: ['angle', 'findings', 'sources'],
}

const SWOT_SCHEMA = {
  type: 'object',
  properties: {
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    opportunities: { type: 'array', items: { type: 'string' } },
    threats: { type: 'array', items: { type: 'string' } },
  },
  required: ['strengths', 'weaknesses', 'opportunities', 'threats'],
}

const POSITION_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    differentiators: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'differentiators', 'recommendations', 'risks'],
}

const target = args || 'No target specified — pass your product/company/technology as args.'

phase('Scope')
log(`Target: ${target.slice(0, 60)}`)

const ANGLES = [
  { label: 'product', prompt: `Research the core product features, capabilities, and user experience of: ${target}. Include concrete examples and compare against known alternatives.` },
  { label: 'pricing', prompt: `Research the pricing model, tiers, and value proposition of: ${target}. Compare against competitor pricing. Include free vs paid features.` },
  { label: 'reviews', prompt: `Research user reviews, sentiment, and common complaints/praise for: ${target}. Look for patterns in G2, Product Hunt, Reddit, and tech forums.` },
  { label: 'community', prompt: `Research the developer/user community, ecosystem, integrations, and third-party support for: ${target}. Check GitHub stars, Discord, documentation quality.` },
  { label: 'roadmap', prompt: `Research the public roadmap, recent releases, and future direction of: ${target}. Look for changelogs, blog posts, and founder/team communications.` },
]

phase('Research')
const research = await parallel(
  ANGLES.map(a => () => agent(a.prompt, { schema: RESEARCH_SCHEMA, label: `research:${a.label}`, phase: 'Research' }))
)

phase('SWOT')
const allFindings = research.filter(Boolean).map(r => `[${r.angle}] ${r.findings.join(' | ')}`).join('\n')
const swot = await agent(
  `Based on this competitive research about "${target}", produce a SWOT analysis:\n\n${allFindings}`,
  { schema: SWOT_SCHEMA, label: 'swot' }
)

phase('Position')
const swotText = `S: ${swot.strengths.join(', ')} | W: ${swot.weaknesses.join(', ')} | O: ${swot.opportunities.join(', ')} | T: ${swot.threats.join(', ')}`
const positioning = await agent(
  `Based on this SWOT for "${target}", produce a positioning summary with key differentiators, strategic recommendations, and risks to watch:\n\n${swotText}`,
  { schema: POSITION_SCHEMA, label: 'position' }
)

return {
  target,
  research: research.filter(Boolean),
  swot,
  positioning,
  sources: research.filter(Boolean).flatMap(r => r.sources),
}
