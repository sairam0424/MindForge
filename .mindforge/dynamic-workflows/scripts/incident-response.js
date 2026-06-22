export const meta = {
  name: 'incident-response',
  description: 'Parallel investigation across logs, metrics, traces, and code → mitigation → RCA → postmortem',
  whenToUse: 'When responding to a production incident or unexpected system failure',
  phases: [
    { title: 'Alert', detail: 'Characterize the incident: impact, scope, timeline' },
    { title: 'Investigate', detail: '4 parallel agents: logs / metrics / traces / code changes' },
    { title: 'Mitigate', detail: 'Identify and apply immediate mitigation steps' },
    { title: 'RCA', detail: 'Root cause analysis and postmortem document' },
  ],
}

const CHARACTERIZE_SCHEMA = {
  type: 'object',
  properties: {
    incidentTitle: { type: 'string' },
    severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
    impactDescription: { type: 'string' },
    affectedSystems: { type: 'array', items: { type: 'string' } },
    startTime: { type: 'string' },
    symptoms: { type: 'array', items: { type: 'string' } },
    hypothesis: { type: 'string' },
  },
  required: ['incidentTitle', 'severity', 'impactDescription', 'affectedSystems', 'symptoms', 'hypothesis'],
}

const INVESTIGATE_SCHEMA = {
  type: 'object',
  properties: {
    angle: { type: 'string' },
    findings: { type: 'array', items: { type: 'string' } },
    suspectedCause: { type: 'string' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['angle', 'findings', 'suspectedCause', 'confidence'],
}

const MITIGATE_SCHEMA = {
  type: 'object',
  properties: {
    immediateActions: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, command: { type: 'string' }, risk: { type: 'string' } }, required: ['action', 'risk'] } },
    estimatedRecoveryTime: { type: 'string' },
    rollbackSteps: { type: 'array', items: { type: 'string' } },
  },
  required: ['immediateActions', 'estimatedRecoveryTime', 'rollbackSteps'],
}

const POSTMORTEM_SCHEMA = {
  type: 'object',
  properties: {
    rootCause: { type: 'string' },
    timeline: { type: 'array', items: { type: 'object', properties: { time: { type: 'string' }, event: { type: 'string' } }, required: ['time', 'event'] } },
    contributingFactors: { type: 'array', items: { type: 'string' } },
    actionItems: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, owner: { type: 'string' }, priority: { type: 'string' } }, required: ['action', 'owner', 'priority'] } },
    lessonsLearned: { type: 'array', items: { type: 'string' } },
  },
  required: ['rootCause', 'timeline', 'contributingFactors', 'actionItems', 'lessonsLearned'],
}

const incident = args || 'No incident description provided — pass your incident description, symptoms, and affected systems as args.'

phase('Alert')
log(`Incident: ${incident.slice(0, 80)}`)
const characterization = await agent(
  `Characterize this production incident: "${incident}"\n\nDetermine severity (P0=total outage, P1=major degradation, P2=partial impact, P3=minor), list affected systems, symptoms, and your initial hypothesis about the root cause.`,
  { schema: CHARACTERIZE_SCHEMA, label: 'characterize' }
)
log(`[${characterization.severity}] ${characterization.incidentTitle} — ${characterization.symptoms.length} symptoms identified`)

phase('Investigate')
const context = `Incident: ${characterization.incidentTitle}\nHypothesis: ${characterization.hypothesis}\nSystems: ${characterization.affectedSystems.join(', ')}`

const INVESTIGATION_ANGLES = [
  { label: 'logs', prompt: `Investigate this incident from the LOGS angle: ${context}\n\nWhat log patterns, error messages, or anomalies would you look for? What do recent application/system logs likely show? What would confirm or refute the hypothesis?` },
  { label: 'metrics', prompt: `Investigate this incident from the METRICS angle: ${context}\n\nWhat metrics (CPU, memory, latency, error rates, throughput) would spike or drop? What dashboards to check? What thresholds were likely crossed?` },
  { label: 'traces', prompt: `Investigate this incident from the DISTRIBUTED TRACES angle: ${context}\n\nWhat trace patterns would reveal the failure point? Which service calls would show elevated latency or errors? What would a flame graph show?` },
  { label: 'code', prompt: `Investigate this incident from the RECENT CODE CHANGES angle: ${context}\n\nWhat types of recent deployments, config changes, or dependency updates could cause this? What specific code patterns are suspect? What git history to examine?` },
]

const investigations = await parallel(
  INVESTIGATION_ANGLES.map(a => () => agent(a.prompt, { schema: INVESTIGATE_SCHEMA, label: `investigate:${a.label}`, phase: 'Investigate' }))
)

phase('Mitigate')
const investigationSummary = investigations.filter(Boolean).map(i => `[${i.angle}] ${i.suspectedCause} (${i.confidence} confidence): ${i.findings.slice(0, 2).join(', ')}`).join('\n')
const mitigation = await agent(
  `Based on these investigation findings, identify IMMEDIATE mitigation actions:\n${investigationSummary}\n\nPrioritize actions that restore service quickly. Include rollback steps and estimate recovery time.`,
  { schema: MITIGATE_SCHEMA, label: 'mitigate' }
)

phase('RCA')
const allContext = `Incident: ${characterization.incidentTitle}\nInvestigations:\n${investigationSummary}\nMitigation: ${mitigation.immediateActions.map(a => a.action).join(', ')}`
const postmortem = await agent(
  `Write a blameless postmortem for this incident:\n${allContext}\n\nIdentify the root cause, create a timeline, list contributing factors, define concrete action items (with owners and priority), and extract lessons learned.`,
  { schema: POSTMORTEM_SCHEMA, label: 'postmortem' }
)

return {
  incident,
  characterization,
  investigations: investigations.filter(Boolean),
  mitigation,
  postmortem,
}
