export const meta = {
  name: 'security-hardening',
  description: '5-angle OWASP parallel scout → 3-vote adversarial verification → threat model + remediation roadmap',
  whenToUse: 'When hardening a codebase before a security review, pentest, or production launch',
  phases: [
    { title: 'Scope', detail: 'Define attack surface and target context' },
    { title: 'Scout', detail: '5 parallel OWASP/CWE dimension scouts' },
    { title: 'Verify', detail: '3-vote adversarial verification per critical finding' },
    { title: 'ThreatModel', detail: 'STRIDE threat model from confirmed findings' },
    { title: 'Roadmap', detail: 'Prioritized remediation roadmap with severity/effort matrix' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const FINDING_SCHEMA = {
    type: 'object',
    properties: {
      dimension: { type: 'string' },
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            cwe: { type: 'string' },
            owasp: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
            title: { type: 'string' },
            location: { type: 'string' },
            description: { type: 'string' },
            remediation: { type: 'string' },
          },
          required: ['severity', 'title', 'description', 'remediation'],
        },
      },
    },
    required: ['dimension', 'findings'],
  };

  const VERDICT_SCHEMA = {
    type: 'object',
    properties: { isReal: { type: 'boolean' }, cvssEstimate: { type: 'number' }, reason: { type: 'string' } },
    required: ['isReal', 'reason'],
  };

  const THREAT_SCHEMA = {
    type: 'object',
    properties: {
      strideThreats: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            stride: { type: 'string', enum: ['Spoofing', 'Tampering', 'Repudiation', 'InfoDisclosure', 'DoS', 'ElevationOfPrivilege'] },
            threat: { type: 'string' },
            likelihood: { type: 'string', enum: ['high', 'medium', 'low'] },
            impact: { type: 'string', enum: ['high', 'medium', 'low'] },
            mitigation: { type: 'string' },
          },
          required: ['stride', 'threat', 'likelihood', 'impact', 'mitigation'],
        },
      },
    },
    required: ['strideThreats'],
  };

  const ROADMAP_SCHEMA = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      overallRisk: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      immediateActions: { type: 'array', items: { type: 'string' } },
      roadmap: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            sprint: { type: 'number' },
            items: { type: 'array', items: { type: 'string' } },
            riskReduction: { type: 'string' },
          },
          required: ['sprint', 'items', 'riskReduction'],
        },
      },
    },
    required: ['summary', 'overallRisk', 'immediateActions', 'roadmap'],
  };

  const target = args || 'current codebase (run from repo root)';

  phase('Scope');
  log(`Security hardening target: ${target}`);

  const SCOUTS = [
    { label: 'injection', prompt: `Scout for injection vulnerabilities in: "${target}". Cover: SQL injection, command injection, LDAP injection, XSS (stored/reflected/DOM), SSTI, XXE, path traversal (CWE-89, CWE-78, CWE-79, CWE-611, CWE-22). For each finding provide CWE ID, OWASP category, exact file/line if possible, and remediation.` },
    { label: 'auth-access', prompt: `Scout for authentication and access control issues in: "${target}". Cover: broken authentication, missing auth checks, JWT flaws, session fixation, privilege escalation, IDOR, missing rate limits (OWASP A01, A07). Include CWE IDs and remediation.` },
    { label: 'crypto-secrets', prompt: `Scout for cryptographic failures and secret exposure in: "${target}". Cover: hardcoded secrets, weak hashing (MD5/SHA1 for passwords), insecure random, unencrypted PII in transit/at-rest, certificate validation bypass (CWE-327, CWE-798, CWE-330). Include CWE IDs and remediation.` },
    { label: 'config-supply', prompt: `Scout for security misconfiguration and supply chain risks in: "${target}". Cover: debug endpoints exposed, CORS misconfig, CSP missing, dependency vulns, unpinned deps, outdated packages with CVEs (OWASP A05, A06). Include CWE IDs and remediation.` },
    { label: 'logging-monitoring', prompt: `Scout for logging, monitoring, and error handling security gaps in: "${target}". Cover: sensitive data in logs, missing audit trails, verbose error messages leaking internals, missing security event logging, SSRF via fetch/request (OWASP A09, A10, CWE-209). Include CWE IDs and remediation.` },
  ];

  phase('Scout');
  const scouts = await parallel(
    SCOUTS.map(s => () => agent(s.prompt, { schema: FINDING_SCHEMA, label: `scout:${s.label}`, phase: 'Scout' }))
  );

  phase('Verify');
  const allFindings = scouts.filter(Boolean).flatMap(s => (s.findings || []).map(f => ({ ...f, dimension: s.dimension })));
  const criticalAndHigh = allFindings.filter(f => f.severity === 'critical' || f.severity === 'high');
  log(`${allFindings.length} total findings, ${criticalAndHigh.length} critical/high → 3-vote adversarial verify`);

  const verified = await parallel(
    criticalAndHigh.map(f => () =>
      parallel([
        () => agent(`Try to REFUTE this security finding — is it a false positive? Finding: [${f.severity.toUpperCase()}] ${f.title} — ${f.description}. Default refuted=false only if clearly real.`, { schema: VERDICT_SCHEMA, label: `v1:${f.title.slice(0, 25)}`, phase: 'Verify' }),
        () => agent(`Challenge this finding from an attacker's perspective — is it actually exploitable? Finding: [${f.severity.toUpperCase()}] ${f.title} — ${f.description}. Rate exploitability.`, { schema: VERDICT_SCHEMA, label: `v2:${f.title.slice(0, 25)}`, phase: 'Verify' }),
        () => agent(`Assess business impact of this finding being exploited. Is the severity rating accurate? Finding: [${f.severity.toUpperCase()}] ${f.title} — ${f.description}.`, { schema: VERDICT_SCHEMA, label: `v3:${f.title.slice(0, 25)}`, phase: 'Verify' }),
      ]).then(votes => {
        if (!votes) return { ...f, confirmed: false };
        const realVotes = votes.filter(Boolean).filter(v => v.isReal).length;
        return { ...f, confirmed: realVotes >= 2 };
      })
    )
  );

  const confirmedHigh = verified.filter(Boolean).filter(f => f.confirmed);
  const lowerSeverity = allFindings.filter(f => f.severity !== 'critical' && f.severity !== 'high');
  const allConfirmed = [...confirmedHigh, ...lowerSeverity];
  log(`${confirmedHigh.length}/${criticalAndHigh.length} critical/high confirmed after 3-vote verification`);

  phase('ThreatModel');
  const findingSummary = allConfirmed.slice(0, 15).map(f => `[${f.severity}] ${f.title}: ${f.description}`).join('\n');
  const threatModel = await agent(
    `Generate a STRIDE threat model for: "${target}"\n\nBased on these confirmed findings:\n${findingSummary}\n\nFor each STRIDE category (Spoofing, Tampering, Repudiation, InfoDisclosure, DoS, ElevationOfPrivilege) identify the top threat, likelihood, impact, and mitigation.`,
    { schema: THREAT_SCHEMA, label: 'threat-model', phase: 'ThreatModel' }
  );
  if (!threatModel) { log('Warning: agent returned null for threatModel, skipping'); return { target, error: 'agent-null' }; }

  phase('Roadmap');
  const threatSummary = (threatModel.strideThreats || []).map(t => `[${t.stride}] ${t.threat} (${t.likelihood} likelihood, ${t.impact} impact) → ${t.mitigation}`).join('\n');
  const roadmap = await agent(
    `Create a prioritized security remediation roadmap for: "${target}"\n\nConfirmed findings (${allConfirmed.length} total):\n${findingSummary}\n\nSTRIDE threats:\n${threatSummary}\n\nGroup into 3 sprints by severity+effort. Sprint 1 = immediate (critical/high, low effort). Sprint 2 = short-term (high, higher effort + medium). Sprint 3 = long-term (medium/low). Include risk reduction estimate per sprint.`,
    { schema: ROADMAP_SCHEMA, label: 'roadmap', phase: 'Roadmap' }
  );
  if (!roadmap) { return { target, threats: threatModel, error: 'roadmap-agent-null', stats: { total: allFindings.length, criticalHigh: criticalAndHigh.length, confirmed: confirmedHigh.length } }; }

  return {
    target,
    threats: threatModel,
    report: {
      ...roadmap,
      stats: { total: allFindings.length, criticalHigh: criticalAndHigh.length, confirmed: confirmedHigh.length, lower: lowerSeverity.length },
    },
  };
}
