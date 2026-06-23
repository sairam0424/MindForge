export const meta = {
  name: 'security-threat-model',
  description: 'Asset inventory → STRIDE threat enumeration → parallel mitigations → CVSS-style score matrix',
  whenToUse: 'When threat modeling a system architecture, new feature, or service before implementation or security review',
  phases: [
    { title: 'Assets', detail: 'Inventory system assets, data flows, and trust boundaries' },
    { title: 'STRIDE', detail: '6 parallel STRIDE threat agents — one per threat category' },
    { title: 'Mitigate', detail: 'Parallel mitigation agent per identified threat' },
    { title: 'Score', detail: 'CVSS-style risk score matrix with remediation priority' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const ASSETS_SCHEMA = {
    type: 'object',
    properties: {
      assets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['data', 'service', 'credential', 'infrastructure', 'user'] },
            sensitivity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            description: { type: 'string' },
          },
          required: ['name', 'type', 'sensitivity'],
        },
      },
      dataFlows: { type: 'array', items: { type: 'string' } },
      trustBoundaries: { type: 'array', items: { type: 'string' } },
      entryPoints: { type: 'array', items: { type: 'string' } },
    },
    required: ['assets', 'dataFlows', 'trustBoundaries', 'entryPoints'],
  };

  const STRIDE_SCHEMA = {
    type: 'object',
    properties: {
      category: { type: 'string', enum: ['Spoofing', 'Tampering', 'Repudiation', 'InformationDisclosure', 'DenialOfService', 'ElevationOfPrivilege'] },
      threats: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            threatId: { type: 'string' },
            title: { type: 'string' },
            affectedAsset: { type: 'string' },
            attackVector: { type: 'string' },
            likelihood: { type: 'string', enum: ['high', 'medium', 'low'] },
            impact: { type: 'string', enum: ['high', 'medium', 'low'] },
            description: { type: 'string' },
          },
          required: ['threatId', 'title', 'affectedAsset', 'likelihood', 'impact', 'description'],
        },
      },
    },
    required: ['category', 'threats'],
  };

  const MITIGATION_SCHEMA = {
    type: 'object',
    properties: {
      threatId: { type: 'string' },
      controls: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            control: { type: 'string' },
            type: { type: 'string', enum: ['preventive', 'detective', 'corrective'] },
            implementation: { type: 'string' },
            effort: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          required: ['control', 'type', 'implementation', 'effort'],
        },
      },
      residualRisk: { type: 'string', enum: ['high', 'medium', 'low', 'accepted'] },
    },
    required: ['threatId', 'controls', 'residualRisk'],
  };

  const SCORE_SCHEMA = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      overallRiskLevel: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      scoreMatrix: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            threatId: { type: 'string' },
            title: { type: 'string' },
            category: { type: 'string' },
            cvssEstimate: { type: 'number' },
            priority: { type: 'string', enum: ['p0', 'p1', 'p2', 'p3'] },
            mitigationStatus: { type: 'string', enum: ['mitigated', 'partial', 'unmitigated'] },
          },
          required: ['threatId', 'title', 'category', 'cvssEstimate', 'priority'],
        },
      },
      topRisks: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'overallRiskLevel', 'scoreMatrix', 'topRisks'],
  };

  const target = args || 'current system (run from repo root or describe the system in args)';

  phase('Assets');
  log(`Threat modeling target: ${target}`);
  const assetModel = await agent(
    `Inventory the security-relevant assets, data flows, and trust boundaries for: "${target}". Identify: (1) assets (data stores, services, credentials, infrastructure) with sensitivity level, (2) data flows between components, (3) trust boundaries (where data crosses privilege levels), (4) entry points (public APIs, user inputs, external integrations).`,
    { schema: ASSETS_SCHEMA, label: 'assets' }
  );
  log(`${assetModel.assets.length} assets, ${assetModel.trustBoundaries.length} trust boundaries, ${assetModel.entryPoints.length} entry points`);

  const assetContext = `Assets: ${assetModel.assets.slice(0, 5).map(a => `${a.name}(${a.sensitivity})`).join(', ')}\nData flows: ${assetModel.dataFlows.slice(0, 3).join(', ')}\nTrust boundaries: ${assetModel.trustBoundaries.slice(0, 3).join(', ')}\nEntry points: ${assetModel.entryPoints.slice(0, 3).join(', ')}`;

  phase('STRIDE');
  const STRIDE_CATEGORIES = [
    { cat: 'Spoofing', prompt: `Identify SPOOFING threats for: "${target}". ${assetContext}. Spoofing = an attacker pretends to be someone/something they're not. Look for: weak authentication, missing identity verification, forged tokens/sessions, impersonation attacks. Assign each threat a unique ID (S-01, S-02...), affected asset, likelihood, and impact.` },
    { cat: 'Tampering', prompt: `Identify TAMPERING threats for: "${target}". ${assetContext}. Tampering = malicious modification of data. Look for: insufficient authorization on write operations, missing integrity checks, SQL/command injection, insecure deserialization, CSRF. Assign IDs (T-01...), affected asset, likelihood, impact.` },
    { cat: 'Repudiation', prompt: `Identify REPUDIATION threats for: "${target}". ${assetContext}. Repudiation = ability to deny performing an action. Look for: missing audit logs, insufficient logging of sensitive operations, lack of digital signatures, no non-repudiation controls. Assign IDs (R-01...).` },
    { cat: 'InformationDisclosure', prompt: `Identify INFORMATION DISCLOSURE threats for: "${target}". ${assetContext}. Info disclosure = exposure of data to unauthorized parties. Look for: verbose error messages, debug endpoints, insecure data storage, missing encryption at rest/transit, over-permissive APIs, PII exposure. Assign IDs (I-01...).` },
    { cat: 'DenialOfService', prompt: `Identify DENIAL OF SERVICE threats for: "${target}". ${assetContext}. DoS = making resources unavailable. Look for: missing rate limits, resource exhaustion endpoints, expensive unbounded queries, large payload acceptance without limits, connection pool exhaustion. Assign IDs (D-01...).` },
    { cat: 'ElevationOfPrivilege', prompt: `Identify ELEVATION OF PRIVILEGE threats for: "${target}". ${assetContext}. EoP = gaining unauthorized capabilities. Look for: broken access control, IDOR, privilege escalation paths, JWT/token manipulation, missing authorization checks on admin functions. Assign IDs (E-01...).` },
  ];

  const strideResults = await parallel(
    STRIDE_CATEGORIES.map(s => () => agent(s.prompt, { schema: STRIDE_SCHEMA, label: `stride:${s.cat.toLowerCase()}`, phase: 'STRIDE' }))
  );

  const allThreats = strideResults.filter(Boolean).flatMap(s => s.threats.map(t => ({ category: s.category, ...t })));
  log(`${allThreats.length} threats identified across 6 STRIDE categories`);

  phase('Mitigate');
  const highPriorityThreats = allThreats.filter(t => t.likelihood === 'high' || t.impact === 'high').slice(0, 12);
  log(`Generating mitigations for ${highPriorityThreats.length} high-priority threats`);

  const mitigations = await parallel(
    highPriorityThreats.map(t => () => agent(
      `Design mitigations for this threat in: "${target}"\n\nThreat ${t.threatId} [${t.category}]: ${t.title}\nDescription: ${t.description}\nAffected asset: ${t.affectedAsset}\nLikelihood: ${t.likelihood}, Impact: ${t.impact}\n\nProvide 2-3 security controls: preventive (stop it), detective (detect it), or corrective (respond to it). Include specific implementation steps and effort estimate. Rate residual risk after controls.`,
      { schema: MITIGATION_SCHEMA, label: `mitigate:${t.threatId}`, phase: 'Mitigate' }
    ))
  );

  phase('Score');
  const threatContext = allThreats.slice(0, 15).map(t => `${t.threatId} [${t.category}/${t.likelihood}/${t.impact}]: ${t.title}`).join('\n');
  const mitigationContext = mitigations.filter(Boolean).map(m => `${m.threatId}: ${m.controls.length} controls, residual=${m.residualRisk}`).join('\n');

  const scoreMatrix = await agent(
    `Create a CVSS-style risk score matrix for: "${target}"\n\nThreats:\n${threatContext}\n\nMitigations:\n${mitigationContext}\n\nFor each threat estimate a CVSS base score (0.0-10.0) based on likelihood×impact. Assign priority (P0=CVSS≥9, P1=7-8.9, P2=4-6.9, P3=<4). Determine overall risk level and list top 5 risks to address immediately.`,
    { schema: SCORE_SCHEMA, label: 'score-matrix' }
  );

  return { target, assetModel, threats: allThreats, mitigations: mitigations.filter(Boolean), scoreMatrix };
}
