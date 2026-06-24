export const meta = {
  name: 'mutation-testing',
  description: 'Mutant generator → parallel kill-test agents → mutation score + survival report',
  whenToUse: 'When assessing test suite quality — finds tests that pass even when code is subtly broken',
  phases: [
    { title: 'Analyze', detail: 'Identify mutable source lines: conditions, operators, return values' },
    { title: 'Mutate', detail: 'Generate 10-15 specific mutation descriptions' },
    { title: 'Kill', detail: 'Parallel kill-test per mutation — would existing tests catch it?' },
    { title: 'Report', detail: 'Mutation score report with killed/survived/timeout breakdown' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const SOURCE_SCHEMA = {
    type: 'object',
    properties: {
      sourceFiles: { type: 'array', items: { type: 'string' } },
      testFiles: { type: 'array', items: { type: 'string' } },
      mutableLines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            file: { type: 'string' },
            lineNumber: { type: 'number' },
            code: { type: 'string' },
            mutationType: { type: 'string', enum: ['condition', 'operator', 'return-value', 'boundary', 'negation', 'constant'] },
          },
          required: ['file', 'code', 'mutationType'],
        },
      },
    },
    required: ['sourceFiles', 'testFiles', 'mutableLines'],
  };

  const MUTATIONS_SCHEMA = {
    type: 'object',
    properties: {
      mutations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            file: { type: 'string' },
            original: { type: 'string' },
            mutated: { type: 'string' },
            mutationType: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['id', 'file', 'original', 'mutated', 'mutationType', 'description'],
        },
      },
    },
    required: ['mutations'],
  };

  const KILL_SCHEMA = {
    type: 'object',
    properties: {
      mutationId: { type: 'string' },
      status: { type: 'string', enum: ['killed', 'survived', 'timeout', 'equivalent'] },
      killedBy: { type: 'string' },
      reason: { type: 'string' },
      suggestedTest: { type: 'string' },
    },
    required: ['mutationId', 'status', 'reason'],
  };

  const REPORT_SCHEMA = {
    type: 'object',
    properties: {
      mutationScore: { type: 'number' },
      summary: { type: 'string' },
      killed: { type: 'number' },
      survived: { type: 'number' },
      timeout: { type: 'number' },
      equivalent: { type: 'number' },
      survivorDetails: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            mutation: { type: 'string' },
            suggestedTest: { type: 'string' },
          },
          required: ['mutation', 'suggestedTest'],
        },
      },
      topWeaknesses: { type: 'array', items: { type: 'string' } },
    },
    required: ['mutationScore', 'summary', 'killed', 'survived', 'topWeaknesses'],
  };

  const target = args || 'current codebase (run from repo root)';

  phase('Analyze');
  log(`Analyzing source for mutable lines in: ${target}`);
  const sourceAnalysis = await agent(
    `Analyze the source code in: "${target}" to identify mutable lines for mutation testing. Find: (1) conditional expressions (if/else, ternary, switch), (2) arithmetic/comparison operators (+, -, *, /, >, <, ==, !=), (3) return values in key functions, (4) boundary values (0, -1, +1, null checks), (5) boolean negations. Also identify source files and their test files. List the 15 most testable mutable lines.`,
    { schema: SOURCE_SCHEMA, label: 'analyze' }
  );
  if (!sourceAnalysis) { return { target, error: 'sourceAnalysis-agent-null' }; }
  log(`Found ${sourceAnalysis.mutableLines.length} mutable lines across ${sourceAnalysis.sourceFiles.length} source files`);

  phase('Mutate');
  const mutableContext = sourceAnalysis.mutableLines.slice(0, 15).map(l => `${l.file}:${l.lineNumber || '?'} [${l.mutationType}] \`${l.code}\``).join('\n');
  const mutationSpec = await agent(
    `Generate 10-15 specific mutations for testing the test suite quality of: "${target}"\n\nMutable lines:\n${mutableContext}\n\nFor each mutation: assign unique ID (M01, M02...), show original code, mutated code, mutation type, and plain-English description of what changed. Focus on mutations that SHOULD be caught by good tests — boundary off-by-ones, condition flips, operator swaps.`,
    { schema: MUTATIONS_SCHEMA, label: 'mutate' }
  );
  if (!mutationSpec) { return { target, sourceAnalysis, error: 'mutationSpec-agent-null' }; }
  log(`Generated ${mutationSpec.mutations.length} mutations`);

  phase('Kill');
  const killResults = await parallel(
    mutationSpec.mutations.map(m => () => agent(
      `Assess if the existing test suite in: "${target}" would CATCH this mutation.\n\nMutation ${m.id}: In file ${m.file}, changed \`${m.original}\` to \`${m.mutated}\`.\nDescription: ${m.description}\n\nLook at the test files. Would any existing test fail if this mutation were applied? Answer: killed (test would fail), survived (no test catches it), equivalent (mutation doesn't change behavior), or timeout (unclear). If survived, suggest a specific test that would kill it.`,
      { schema: KILL_SCHEMA, label: `kill:${m.id}`, phase: 'Kill' }
    ))
  );

  phase('Report');
  const killData = killResults.filter(Boolean);
  const killed = killData.filter(r => r.status === 'killed').length;
  const survived = killData.filter(r => r.status === 'survived').length;
  const timeout = killData.filter(r => r.status === 'timeout').length;
  const equivalent = killData.filter(r => r.status === 'equivalent').length;
  const total = killed + survived + timeout;
  const mutationScore = total > 0 ? Math.round((killed / total) * 100) : 0;

  log(`Mutation score: ${mutationScore}% (${killed} killed, ${survived} survived, ${timeout} timeout)`);

  const survivorSummary = killData
    .filter(r => r.status === 'survived')
    .map(r => {
      const mutation = mutationSpec.mutations.find(m => m.id === r.mutationId);
      return `${r.mutationId}: ${mutation ? mutation.description : r.mutationId} — suggested test: ${r.suggestedTest || 'none'}`;
    })
    .join('\n');

  const report = await agent(
    `Write a mutation testing report for: "${target}"\n\nMutation score: ${mutationScore}% (${killed}/${total} killed)\nKilled: ${killed}, Survived: ${survived}, Timeout: ${timeout}, Equivalent: ${equivalent}\n\nSurvivors:\n${survivorSummary || 'none'}\n\nDescribe: overall test suite quality, top weaknesses in test coverage exposed by survivors, specific suggested tests to add, and interpretation of the mutation score.`,
    { schema: REPORT_SCHEMA, label: 'report' }
  );

  return { target, sourceAnalysis, mutations: mutationSpec.mutations, killResults: killData, report };
}
