export const meta = {
  name: 'onboard-codebase',
  description: 'Map structure → domain analysis → architecture → generate guided tour and onboarding docs',
  whenToUse: 'When joining a new codebase or onboarding a team member to an existing repo',
  phases: [
    { title: 'Map', detail: 'Discover file structure, languages, entry points' },
    { title: 'Domain', detail: 'Identify business domains and core abstractions' },
    { title: 'Architecture', detail: 'Map layers, data flow, and key patterns' },
    { title: 'Tour', detail: 'Generate guided tour and onboarding documentation' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const MAP_SCHEMA = {
    type: 'object',
    properties: {
      primaryLanguage: { type: 'string' },
      secondaryLanguages: { type: 'array', items: { type: 'string' } },
      frameworks: { type: 'array', items: { type: 'string' } },
      entryPoints: { type: 'array', items: { type: 'string' } },
      testingFrameworks: { type: 'array', items: { type: 'string' } },
      totalFiles: { type: 'string' },
      keyDirectories: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, purpose: { type: 'string' } }, required: ['path', 'purpose'] } },
    },
    required: ['primaryLanguage', 'frameworks', 'entryPoints', 'keyDirectories'],
  };

  const DOMAIN_SCHEMA = {
    type: 'object',
    properties: {
      domains: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, keyFiles: { type: 'array', items: { type: 'string' } } }, required: ['name', 'description', 'keyFiles'] } },
      coreAbstractions: { type: 'array', items: { type: 'string' } },
      businessPurpose: { type: 'string' },
    },
    required: ['domains', 'coreAbstractions', 'businessPurpose'],
  };

  const ARCH_SCHEMA = {
    type: 'object',
    properties: {
      architectureStyle: { type: 'string' },
      layers: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, responsibility: { type: 'string' } }, required: ['name', 'responsibility'] } },
      dataFlow: { type: 'string' },
      keyPatterns: { type: 'array', items: { type: 'string' } },
      externalDependencies: { type: 'array', items: { type: 'string' } },
      gotchas: { type: 'array', items: { type: 'string' } },
    },
    required: ['architectureStyle', 'layers', 'dataFlow', 'keyPatterns', 'gotchas'],
  };

  const TOUR_SCHEMA = {
    type: 'object',
    properties: {
      quickStart: { type: 'string' },
      tourSteps: { type: 'array', items: { type: 'object', properties: { step: { type: 'number' }, title: { type: 'string' }, file: { type: 'string' }, explanation: { type: 'string' } }, required: ['step', 'title', 'explanation'] } },
      keyConventions: { type: 'array', items: { type: 'string' } },
      whereToStartCoding: { type: 'string' },
      commonPitfalls: { type: 'array', items: { type: 'string' } },
    },
    required: ['quickStart', 'tourSteps', 'keyConventions', 'whereToStartCoding', 'commonPitfalls'],
  };

  const repo = args || 'current repository (run from repo root)';

  phase('Map');
  log(`Mapping: ${repo}`);
  const map = await agent(
    `Map the structure of this codebase: "${repo}"\n\nIdentify: primary language, frameworks, entry points (main files, index, CLI), test frameworks, and the purpose of each top-level directory. Be specific — list actual file paths.`,
    { schema: MAP_SCHEMA, label: 'map' }
  );
  log(`${map.primaryLanguage} codebase, ${map.frameworks.join('+')} — ${map.keyDirectories.length} key directories`);

  phase('Domain');
  const mapSummary = `Stack: ${map.primaryLanguage} + ${map.frameworks.join(', ')}\nDirs: ${map.keyDirectories.map(d => `${d.path} (${d.purpose})`).join(', ')}`;
  const domain = await agent(
    `Identify the business domains and core abstractions in: "${repo}"\n${mapSummary}\n\nWhat problem does this software solve? What are the main domain concepts? What are the key abstractions (models, services, controllers, etc.)?`,
    { schema: DOMAIN_SCHEMA, label: 'domain' }
  );
  log(`${domain.domains.length} domains: ${domain.domains.map(d => d.name).join(', ')}`);

  phase('Architecture');
  const domainSummary = `Purpose: ${domain.businessPurpose}\nDomains: ${domain.domains.map(d => d.name).join(', ')}\nAbstractions: ${domain.coreAbstractions.join(', ')}`;
  const arch = await agent(
    `Map the technical architecture of: "${repo}"\n${domainSummary}\n\nWhat architecture style (MVC, layered, event-driven, microservices)? What are the layers? How does data flow? What key patterns and gotchas should a new developer know?`,
    { schema: ARCH_SCHEMA, label: 'architecture' }
  );

  phase('Tour');
  const archSummary = `Style: ${arch.architectureStyle}\nLayers: ${arch.layers.map(l => l.name).join(' → ')}\nPatterns: ${arch.keyPatterns.join(', ')}`;
  const tour = await agent(
    `Create an onboarding tour for: "${repo}"\n${mapSummary}\n${domainSummary}\n${archSummary}\n\nWrite a quick start, a 5-10 step guided tour through the most important files (in learning order), key conventions to follow, where to start making changes, and common pitfalls to avoid.`,
    { schema: TOUR_SCHEMA, label: 'tour' }
  );

  return {
    repo,
    map,
    domain,
    architecture: arch,
    tour,
  };
}
