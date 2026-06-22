export const meta = {
  name: 'perf-optimize',
  description: 'Profile → parallel bottleneck hunt across DB/network/CPU/memory → prioritized fix plan',
  whenToUse: 'When an application is slow and you need to find and fix performance bottlenecks',
  phases: [
    { title: 'Profile', detail: 'Establish baseline metrics and identify slow paths' },
    { title: 'Identify', detail: '4 parallel agents: DB queries / network / CPU / memory' },
    { title: 'Plan', detail: 'Prioritize fixes by impact-to-effort ratio' },
    { title: 'Benchmark', detail: 'Define verification benchmarks for each fix' },
  ],
}

const PROFILE_SCHEMA = {
  type: 'object',
  properties: {
    slowestPaths: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, currentLatency: { type: 'string' }, target: { type: 'string' } }, required: ['path', 'currentLatency'] } },
    bottleneckHypothesis: { type: 'string' },
    profilingCommands: { type: 'array', items: { type: 'string' } },
  },
  required: ['slowestPaths', 'bottleneckHypothesis', 'profilingCommands'],
}

const BOTTLENECK_SCHEMA = {
  type: 'object',
  properties: {
    dimension: { type: 'string' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          location: { type: 'string' },
          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
          fix: { type: 'string' },
          effort: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['description', 'impact', 'fix', 'effort'],
      },
    },
  },
  required: ['dimension', 'issues'],
}

const FIX_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    prioritized: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rank: { type: 'number' },
          fix: { type: 'string' },
          dimension: { type: 'string' },
          expectedImprovement: { type: 'string' },
          effort: { type: 'string' },
          implementation: { type: 'string' },
        },
        required: ['rank', 'fix', 'expectedImprovement', 'effort', 'implementation'],
      },
    },
    totalEstimate: { type: 'string' },
    quickWins: { type: 'array', items: { type: 'string' } },
  },
  required: ['prioritized', 'totalEstimate', 'quickWins'],
}

const BENCHMARK_SCHEMA = {
  type: 'object',
  properties: {
    baselineTests: { type: 'array', items: { type: 'string' } },
    successCriteria: { type: 'array', items: { type: 'object', properties: { fix: { type: 'string' }, metric: { type: 'string' }, target: { type: 'string' } }, required: ['fix', 'metric', 'target'] } },
    monitoringSetup: { type: 'array', items: { type: 'string' } },
  },
  required: ['baselineTests', 'successCriteria', 'monitoringSetup'],
}

const target = args || 'current application (run from repo root)'

phase('Profile')
log(`Profiling: ${target}`)
const profile = await agent(
  `Identify the slowest code paths and performance bottleneck hypothesis for: "${target}"\n\nWhat are the likely slow endpoints/functions? What profiling commands should be run? What is your initial bottleneck hypothesis?`,
  { schema: PROFILE_SCHEMA, label: 'profile' }
)
log(`${profile.slowestPaths.length} slow paths identified, hypothesis: ${profile.bottleneckHypothesis.slice(0, 80)}`)

phase('Identify')
const context = `Target: ${target}\nSlow paths: ${profile.slowestPaths.map(p => p.path).join(', ')}\nHypothesis: ${profile.bottleneckHypothesis}`

const DIMENSIONS = [
  { label: 'db', prompt: `Hunt for DATABASE performance bottlenecks in: ${context}\n\nLook for: N+1 queries, missing indexes, full table scans, unoptimized JOINs, missing query caching, connection pool exhaustion, slow aggregate queries.` },
  { label: 'network', prompt: `Hunt for NETWORK performance bottlenecks in: ${context}\n\nLook for: missing HTTP caching, no CDN, uncompressed responses, chatty APIs (many small requests), missing connection pooling, DNS lookups in hot paths, synchronous external calls.` },
  { label: 'cpu', prompt: `Hunt for CPU/COMPUTE performance bottlenecks in: ${context}\n\nLook for: inefficient algorithms (O(n²) where O(n log n) exists), regex in hot paths, JSON serialization overhead, cryptographic operations in request path, missing memoization.` },
  { label: 'memory', prompt: `Hunt for MEMORY performance bottlenecks in: ${context}\n\nLook for: memory leaks, unbounded caches, large object retention, excessive GC pressure, buffer accumulation, object pool exhaustion, unnecessary data loading.` },
]

const bottlenecks = await parallel(
  DIMENSIONS.map(d => () => agent(d.prompt, { schema: BOTTLENECK_SCHEMA, label: `identify:${d.label}`, phase: 'Identify' }))
)

phase('Plan')
const allIssues = bottlenecks.filter(Boolean).flatMap(b => b.issues.map(i => ({ ...i, dimension: b.dimension })))
log(`${allIssues.length} bottlenecks found across ${bottlenecks.filter(Boolean).length} dimensions`)
const issueList = allIssues.slice(0, 20).map(i => `[${i.dimension}][${i.impact}/${i.effort}] ${i.description} → ${i.fix}`).join('\n')
const fixPlan = await agent(
  `Prioritize this performance fix backlog by impact-to-effort ratio:\n${issueList}\n\nRank by: high impact + low effort first. List quick wins (can implement in <1 hour) separately. Include implementation guidance for each.`,
  { schema: FIX_PLAN_SCHEMA, label: 'plan' }
)

phase('Benchmark')
const topFixes = fixPlan.prioritized.slice(0, 5).map(f => `${f.rank}. ${f.fix} (expected: ${f.expectedImprovement})`).join('\n')
const benchmarks = await agent(
  `Define performance benchmarks for verifying these fixes:\n${topFixes}\n\nFor each fix, specify: the baseline test to run before, the success metric (P95 latency, throughput, memory), and the target value. Include monitoring setup recommendations.`,
  { schema: BENCHMARK_SCHEMA, label: 'benchmark' }
)

return {
  target,
  profile,
  bottlenecks: bottlenecks.filter(Boolean),
  fixPlan,
  benchmarks,
  stats: { totalIssues: allIssues.length, quickWins: fixPlan.quickWins.length },
}
