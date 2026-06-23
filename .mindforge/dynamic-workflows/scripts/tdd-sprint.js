export const meta = {
  name: 'tdd-sprint',
  description: 'Strict Red-Green-Refactor TDD loop with spec-first discipline',
  whenToUse: 'When implementing a feature or fix using test-driven development methodology',
  phases: [
    { title: 'Spec', detail: 'Define behavior requirements and acceptance criteria' },
    { title: 'Red', detail: 'Write failing test that captures the requirement' },
    { title: 'Green', detail: 'Write minimal code to make the test pass' },
    { title: 'Refactor', detail: 'Clean up while keeping tests green, verify all pass' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const SPEC_SCHEMA = {
    type: 'object',
    properties: {
      behaviorName: { type: 'string' },
      given: { type: 'string' },
      when: { type: 'string' },
      then: { type: 'string' },
      acceptanceCriteria: { type: 'array', items: { type: 'string' } },
      edgeCases: { type: 'array', items: { type: 'string' } },
      outOfScope: { type: 'array', items: { type: 'string' } },
    },
    required: ['behaviorName', 'given', 'when', 'then', 'acceptanceCriteria', 'edgeCases'],
  };

  const TEST_SCHEMA = {
    type: 'object',
    properties: {
      testDescription: { type: 'string' },
      testCode: { type: 'string' },
      whyItFails: { type: 'string' },
      fileToCreate: { type: 'string' },
    },
    required: ['testDescription', 'testCode', 'whyItFails', 'fileToCreate'],
  };

  const IMPL_SCHEMA = {
    type: 'object',
    properties: {
      approachExplanation: { type: 'string' },
      implementationCode: { type: 'string' },
      fileToCreate: { type: 'string' },
      minimalityRationale: { type: 'string' },
    },
    required: ['approachExplanation', 'implementationCode', 'fileToCreate', 'minimalityRationale'],
  };

  const REFACTOR_SCHEMA = {
    type: 'object',
    properties: {
      improvements: { type: 'array', items: { type: 'string' } },
      refactoredCode: { type: 'string' },
      testsStillPass: { type: 'boolean' },
      explanation: { type: 'string' },
    },
    required: ['improvements', 'refactoredCode', 'testsStillPass', 'explanation'],
  };

  const requirement = args || 'No requirement specified — pass your feature/behavior description as args.';

  phase('Spec');
  log(`Requirement: ${requirement.slice(0, 80)}`);
  const spec = await agent(
    `Write a precise behavioral specification for: "${requirement}"\n\nUse Given-When-Then format. Be explicit about inputs, outputs, and edge cases. List what is OUT of scope to keep this focused.`,
    { schema: SPEC_SCHEMA, label: 'spec' }
  );
  log(`Spec: ${spec.behaviorName} | ${spec.acceptanceCriteria.length} acceptance criteria, ${spec.edgeCases.length} edge cases`);

  phase('Red');
  const specText = `Given: ${spec.given}\nWhen: ${spec.when}\nThen: ${spec.then}\nCriteria: ${spec.acceptanceCriteria.join(', ')}`;
  const test = await agent(
    `Write a FAILING test for this behavior specification:\n${specText}\n\nWrite the minimal test that will fail because the implementation doesn't exist yet. Explain WHY it fails. Use the project's test framework (detect from file extensions or state Jest/Vitest/Node assert).`,
    { schema: TEST_SCHEMA, label: 'red' }
  );
  log(`[RED] Test: "${test.testDescription}" — fails because: ${test.whyItFails}`);

  phase('Green');
  const testContext = `Test: ${test.testDescription}\n\nTest code:\n${test.testCode}\n\nFails because: ${test.whyItFails}`;
  const impl = await agent(
    `Write the MINIMUM implementation to make this test pass:\n${testContext}\n\nWrite ONLY what is needed to make the test go green. No extra features, no future-proofing. Explain why this is the minimal solution.`,
    { schema: IMPL_SCHEMA, label: 'green' }
  );
  log(`[GREEN] Minimal implementation: ${impl.minimalityRationale}`);

  phase('Refactor');
  const greenContext = `Test: ${test.testCode}\nImplementation: ${impl.implementationCode}`;
  const refactored = await agent(
    `Refactor this passing implementation for clarity and maintainability, keeping all tests green:\n${greenContext}\n\nList specific improvements made (naming, structure, extraction, simplification). The tests MUST still pass after refactoring.`,
    { schema: REFACTOR_SCHEMA, label: 'refactor' }
  );
  log(`[REFACTOR] ${refactored.improvements.length} improvements, tests still pass: ${refactored.testsStillPass}`);

  return {
    requirement,
    spec,
    test,
    implementation: impl,
    refactored,
    cycle: { red: test.testDescription, green: impl.approachExplanation, refactor: refactored.explanation },
  };
}
