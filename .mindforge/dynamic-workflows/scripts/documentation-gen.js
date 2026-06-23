export const meta = {
  name: 'documentation-gen',
  description: 'Parallel per-file doc generation → style normalization → publish-ready documentation',
  whenToUse: 'When generating or refreshing documentation for a codebase, API, or module',
  phases: [
    { title: 'Scope', detail: 'Discover files needing documentation' },
    { title: 'Generate', detail: 'Parallel doc generation per file/module' },
    { title: 'Normalize', detail: 'Style consistency pass across all generated docs' },
    { title: 'Publish', detail: 'Assemble README, API reference, and changelog entries' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const FILE_LIST_SCHEMA = {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            type: { type: 'string', enum: ['module', 'class', 'function', 'api-route', 'config', 'util'] },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            currentDocStatus: { type: 'string', enum: ['none', 'partial', 'outdated', 'current'] },
          },
          required: ['path', 'type', 'priority', 'currentDocStatus'],
        },
      },
    },
    required: ['files'],
  };

  const DOC_SCHEMA = {
    type: 'object',
    properties: {
      path: { type: 'string' },
      summary: { type: 'string' },
      description: { type: 'string' },
      parameters: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' }, description: { type: 'string' }, required: { type: 'boolean' } }, required: ['name', 'type', 'description'] } },
      returns: { type: 'string' },
      examples: { type: 'array', items: { type: 'string' } },
      sideEffects: { type: 'array', items: { type: 'string' } },
    },
    required: ['path', 'summary', 'description'],
  };

  const PUBLISH_SCHEMA = {
    type: 'object',
    properties: {
      readmeSection: { type: 'string' },
      apiReference: { type: 'string' },
      quickStart: { type: 'string' },
      changelogEntries: { type: 'array', items: { type: 'string' } },
    },
    required: ['readmeSection', 'apiReference', 'quickStart'],
  };

  const target = args || 'current codebase (run from repo root)';

  phase('Scope');
  log(`Scoping documentation for: ${target}`);
  const fileList = await agent(
    `Discover all files in: "${target}" that need documentation. Focus on: public APIs, exported functions/classes, route handlers, configuration modules. For each file note its type (module/class/function/api-route/config/util), documentation priority (high=public API, medium=internal, low=util), and current doc status (none/partial/outdated/current). Skip test files and auto-generated files.`,
    { schema: FILE_LIST_SCHEMA, label: 'scope' }
  );

  const highAndMedium = (fileList.files || []).filter(f => f.priority === 'high' || f.priority === 'medium').slice(0, 15);
  log(`Generating docs for ${highAndMedium.length} priority files`);

  phase('Generate');
  const docs = await parallel(
    highAndMedium.map(f => () => agent(
      `Generate complete documentation for the file at "${f.path}" in codebase: "${target}". It is a ${f.type}. Write: (1) one-line summary, (2) full description with purpose and usage context, (3) all parameters with types and descriptions, (4) return value description, (5) 1-2 concrete usage examples, (6) any side effects or important caveats.`,
      { schema: DOC_SCHEMA, label: `doc:${f.path.split('/').pop().replace('.', '-')}`, phase: 'Generate' }
    ))
  );

  phase('Normalize');
  const validDocs = docs.filter(Boolean);
  const docSummaries = validDocs.map(d => `${d.path}: ${d.summary}`).join('\n');
  log(`${validDocs.length} docs generated — normalizing style`);

  phase('Publish');
  const publish = await agent(
    `Assemble publish-ready documentation for: "${target}"\n\nGenerated docs:\n${docSummaries}\n\nProduce: (1) README API section (markdown table of all public exports with one-line descriptions), (2) full API reference (each entry with params, returns, example), (3) quick-start guide showing the most common 3-5 use cases, (4) CHANGELOG entry lines for newly documented items.`,
    { schema: PUBLISH_SCHEMA, label: 'publish' }
  );

  return { target, fileList, docs: validDocs, publish };
}
