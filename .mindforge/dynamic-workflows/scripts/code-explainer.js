export const meta = {
  name: 'code-explainer',
  description: 'Structural map → domain extraction → architecture patterns → guided narrative tour for onboarding',
  whenToUse: 'When onboarding a new developer, writing system documentation, or creating a guided tour of an unfamiliar codebase',
  phases: [
    { title: 'Structure', detail: 'Map file structure, entry points, and module boundaries' },
    { title: 'Domain', detail: 'Extract domain concepts, business logic, and key abstractions' },
    { title: 'Architecture', detail: 'Identify architectural patterns, data flow, and design decisions' },
    { title: 'Tour', detail: 'Synthesize a guided narrative tour for a new developer' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const STRUCTURE_SCHEMA = {
    type: 'object',
    properties: {
      entryPoints: { type: 'array', items: { type: 'string' } },
      modules: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            path: { type: 'string' },
            responsibility: { type: 'string' },
            publicApi: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'path', 'responsibility'],
        },
      },
      keyFiles: { type: 'array', items: { type: 'string' } },
      dependencies: { type: 'array', items: { type: 'string' } },
    },
    required: ['entryPoints', 'modules', 'keyFiles'],
  };

  const DOMAIN_SCHEMA = {
    type: 'object',
    properties: {
      coreConcepts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            concept: { type: 'string' },
            definition: { type: 'string' },
            whereImplemented: { type: 'string' },
          },
          required: ['concept', 'definition'],
        },
      },
      businessRules: { type: 'array', items: { type: 'string' } },
      dataModels: { type: 'array', items: { type: 'string' } },
    },
    required: ['coreConcepts', 'businessRules'],
  };

  const ARCHITECTURE_SCHEMA = {
    type: 'object',
    properties: {
      pattern: { type: 'string' },
      dataFlow: { type: 'string' },
      keyDesignDecisions: { type: 'array', items: { type: 'string' } },
      integrationPoints: { type: 'array', items: { type: 'string' } },
      gotchas: { type: 'array', items: { type: 'string' } },
    },
    required: ['pattern', 'dataFlow', 'keyDesignDecisions'],
  };

  const TOUR_SCHEMA = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            step: { type: 'number' },
            title: { type: 'string' },
            fileOrConcept: { type: 'string' },
            explanation: { type: 'string' },
            whyItMatters: { type: 'string' },
          },
          required: ['step', 'title', 'explanation', 'whyItMatters'],
        },
      },
      firstDayChecklist: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'steps', 'firstDayChecklist'],
  };

  const target = args || 'current codebase (run from repo root)';

  phase('Structure');
  log(`Mapping code structure for: ${target}`);
  const structure = await agent(
    `Map the file structure of: "${target}". Identify: (1) entry points (main files, index files, CLI entry), (2) all major modules with their path and single-line responsibility, (3) the 5-10 most important files a new developer should read first, (4) key external dependencies. Focus on what's PUBLIC — exported functions, routes, APIs.`,
    { schema: STRUCTURE_SCHEMA, label: 'structure' }
  );
  if (!structure) { log('Warning: agent returned null for structure, skipping'); return { target, error: 'agent-null' }; }
  log(`Found ${structure.modules.length} modules, ${structure.entryPoints.length} entry points`);

  phase('Domain');
  const moduleContext = structure.modules.slice(0, 10).map(m => `${m.name} (${m.path}): ${m.responsibility}`).join('\n');
  const domain = await agent(
    `Extract the domain concepts and business logic from: "${target}"\n\nModules:\n${moduleContext}\n\nIdentify: (1) core business concepts and their definitions (what is a "User", "Order", "Pipeline" etc. in THIS codebase), (2) key business rules (what must always be true), (3) the main data models and their relationships. Focus on the WHAT, not the HOW.`,
    { schema: DOMAIN_SCHEMA, label: 'domain' }
  );
  if (!domain) { log('Warning: agent returned null for domain, skipping'); return { target, structure, error: 'agent-null' }; }
  log(`${domain.coreConcepts.length} core concepts, ${domain.businessRules.length} business rules identified`);

  phase('Architecture');
  const domainContext = domain.coreConcepts.slice(0, 5).map(c => `${c.concept}: ${c.definition}`).join('\n');
  const arch = await agent(
    `Identify the architectural patterns in: "${target}"\n\nDomain: ${domainContext}\n\nDescribe: (1) the overall architectural pattern (MVC, CQRS, event-driven, layered, etc.), (2) how data flows through the system end-to-end, (3) the top 3-5 key design decisions and WHY they were made, (4) integration points with external systems, (5) gotchas and non-obvious behaviors a new developer must know.`,
    { schema: ARCHITECTURE_SCHEMA, label: 'architecture' }
  );
  if (!arch) { log('Warning: agent returned null for arch, skipping'); return { target, structure, domain, error: 'agent-null' }; }
  log(`Architecture: ${arch.pattern}`);

  phase('Tour');
  const tourContext = `
Structure: ${structure.entryPoints.length} entry points, ${structure.modules.length} modules
Key files: ${structure.keyFiles.slice(0, 5).join(', ')}
Pattern: ${arch.pattern}
Data flow: ${arch.dataFlow}
Core concepts: ${domain.coreConcepts.slice(0, 4).map(c => c.concept).join(', ')}
Gotchas: ${(arch.gotchas || []).slice(0, 3).join('; ')}
  `.trim();

  const tour = await agent(
    `Create a guided narrative tour of: "${target}" for a developer joining the team today.\n\n${tourContext}\n\nWrite 6-10 sequential steps that progressively reveal the codebase. Each step: a clear title, which file/concept to look at, plain-English explanation, and WHY it matters. Start with the entry point, build to the domain, then reveal the architecture. End with a "first day" checklist of things to read and run.`,
    { schema: TOUR_SCHEMA, label: 'tour' }
  );

  return { target, structure, domain, arch, tour };
}
