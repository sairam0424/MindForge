export const meta = {
  name: 'code-audit',
  description: 'Parallel security + quality + performance audit with adversarial finding verification',
  whenToUse: 'When you need a comprehensive code review before a release or security review',
  phases: [
    { title: 'Scope', detail: 'Build file list from git diff or path argument' },
    { title: 'Audit', detail: '3 parallel auditors: security / quality / performance' },
    { title: 'Verify', detail: 'Adversarial verification of high-severity findings' },
    { title: 'Report', detail: 'Risk-ranked report with actionable remediation' },
  ],
}

const FINDING_SCHEMA = {
  type: 'object',
  properties: {
    dimension: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
          title: { type: 'string' },
          file: { type: 'string' },
          description: { type: 'string' },
          remediation: { type: 'string' },
        },
        required: ['severity', 'title', 'description', 'remediation'],
      },
    },
  },
  required: ['dimension', 'findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: { isReal: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['isReal', 'reason'],
}

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    riskLevel: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
    findings: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, remediation: { type: 'string' } }, required: ['severity', 'title', 'description', 'remediation'] } },
    immediateActions: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'riskLevel', 'findings', 'immediateActions'],
}

const target = args || 'current git diff (run from repo root)'

phase('Scope')
log(`Auditing: ${target}`)

const AUDITORS = [
  { label: 'security', prompt: `Perform a security audit of this codebase/diff: "${target}". Check for: OWASP Top 10 (injection, broken auth, XSS, IDOR, misconfig, exposure, CSRF, insecure deserialization, known vulns, logging failures), hardcoded secrets, unsafe dependencies, input validation gaps, authorization flaws. Rate each finding as critical/high/medium/low/info.` },
  { label: 'quality', prompt: `Perform a code quality audit of: "${target}". Check for: functions >50 lines, nesting >4 levels, magic numbers, dead code, missing error handling, naming issues, copy-paste anti-patterns, missing tests, undefined behavior, race conditions. Rate each finding as critical/high/medium/low/info.` },
  { label: 'performance', prompt: `Perform a performance audit of: "${target}". Check for: N+1 queries, unbounded loops, missing pagination, synchronous I/O in hot paths, memory leaks, missing indexes, large bundle imports, inefficient algorithms, cache invalidation issues. Rate each finding as critical/high/medium/low/info.` },
]

phase('Audit')
const audits = await parallel(
  AUDITORS.map(a => () => agent(a.prompt, { schema: FINDING_SCHEMA, label: `audit:${a.label}`, phase: 'Audit' }))
)

phase('Verify')
const allFindings = audits.filter(Boolean).flatMap(a => a.findings.map(f => ({ ...f, dimension: a.dimension })))
const highSeverity = allFindings.filter(f => f.severity === 'critical' || f.severity === 'high')
log(`${allFindings.length} total findings, ${highSeverity.length} high/critical → adversarially verifying`)

const verifiedFindings = await parallel(
  highSeverity.map(f => () =>
    parallel([
      () => agent(`Is this finding a real issue or a false positive? Try to REFUTE it. Finding: "${f.title}" — ${f.description}`, { schema: VERDICT_SCHEMA, label: `verify-1:${f.title.slice(0, 30)}` }),
      () => agent(`Challenge this finding from a different angle. Is it actually exploitable/impactful? Finding: "${f.title}" — ${f.description}`, { schema: VERDICT_SCHEMA, label: `verify-2:${f.title.slice(0, 30)}` }),
    ]).then(votes => {
      const confirmed = votes.filter(Boolean).filter(v => v.isReal).length
      return { ...f, verified: confirmed >= 1 }
    })
  )
)

const confirmedHigh = verifiedFindings.filter(Boolean).filter(f => f.verified)
const lowSeverity = allFindings.filter(f => f.severity !== 'critical' && f.severity !== 'high')
const finalFindings = [...confirmedHigh, ...lowSeverity]

phase('Report')
const findingsSummary = finalFindings.slice(0, 20).map(f => `[${f.severity.toUpperCase()}] ${f.title}: ${f.description} → Fix: ${f.remediation}`).join('\n')
const report = await agent(
  `Produce a final security and quality report for: "${target}"\n\nFindings:\n${findingsSummary}\n\nIdentify the overall risk level, list findings by severity, and give the 3-5 most important immediate actions.`,
  { schema: REPORT_SCHEMA, label: 'report' }
)

return {
  target,
  audits: audits.filter(Boolean),
  report,
  stats: { total: allFindings.length, highSeverity: highSeverity.length, confirmed: confirmedHigh.length },
}
