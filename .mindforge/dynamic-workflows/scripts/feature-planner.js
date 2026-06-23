export const meta = {
  name: 'feature-planner',
  description: 'Sequential pipeline: brief → PRD → architecture → user stories',
  whenToUse: 'When starting a new feature and need a complete specification before coding',
  phases: [
    { title: 'Brief', detail: 'Clarify goals, users, success criteria' },
    { title: 'PRD', detail: 'Generate product requirements document' },
    { title: 'Architecture', detail: 'Design technical architecture and data flow' },
    { title: 'Stories', detail: 'Break into implementation user stories' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const BRIEF_SCHEMA = {
    type: 'object',
    properties: {
      featureName: { type: 'string' },
      problem: { type: 'string' },
      targetUsers: { type: 'string' },
      successCriteria: { type: 'array', items: { type: 'string' } },
      outOfScope: { type: 'array', items: { type: 'string' } },
    },
    required: ['featureName', 'problem', 'targetUsers', 'successCriteria', 'outOfScope'],
  };

  const PRD_SCHEMA = {
    type: 'object',
    properties: {
      overview: { type: 'string' },
      requirements: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, type: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string' } }, required: ['id', 'type', 'description', 'priority'] } },
      nonFunctional: { type: 'array', items: { type: 'string' } },
      acceptanceCriteria: { type: 'array', items: { type: 'string' } },
    },
    required: ['overview', 'requirements', 'nonFunctional', 'acceptanceCriteria'],
  };

  const ARCH_SCHEMA = {
    type: 'object',
    properties: {
      approach: { type: 'string' },
      components: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, responsibility: { type: 'string' } }, required: ['name', 'responsibility'] } },
      dataFlow: { type: 'string' },
      newFiles: { type: 'array', items: { type: 'string' } },
      modifiedFiles: { type: 'array', items: { type: 'string' } },
      risks: { type: 'array', items: { type: 'string' } },
    },
    required: ['approach', 'components', 'dataFlow', 'newFiles', 'modifiedFiles', 'risks'],
  };

  const STORIES_SCHEMA = {
    type: 'object',
    properties: {
      stories: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            asA: { type: 'string' },
            iWant: { type: 'string' },
            soThat: { type: 'string' },
            acceptanceCriteria: { type: 'array', items: { type: 'string' } },
            estimate: { type: 'string' },
          },
          required: ['id', 'title', 'asA', 'iWant', 'soThat', 'acceptanceCriteria', 'estimate'],
        },
      },
    },
    required: ['stories'],
  };

  const feature = args || 'No feature described — pass your feature description as args.';

  phase('Brief');
  log(`Feature: ${feature.slice(0, 60)}`);
  const brief = await agent(
    `Create a feature brief for: "${feature}". Clarify the core problem, target users, measurable success criteria, and explicit out-of-scope items.`,
    { schema: BRIEF_SCHEMA, label: 'brief' }
  );

  phase('PRD');
  const briefText = `Feature: ${brief.featureName}\nProblem: ${brief.problem}\nUsers: ${brief.targetUsers}\nSuccess: ${brief.successCriteria.join(', ')}`;
  const prd = await agent(
    `Write a product requirements document for this feature:\n${briefText}\n\nInclude functional requirements (must/should/could), non-functional requirements, and acceptance criteria.`,
    { schema: PRD_SCHEMA, label: 'prd' }
  );

  phase('Architecture');
  const reqSummary = prd.requirements.slice(0, 8).map(r => `${r.id} [${r.priority}]: ${r.description}`).join('\n');
  const arch = await agent(
    `Design the technical architecture for this feature:\nBrief: ${briefText}\nRequirements:\n${reqSummary}\n\nIdentify the implementation approach, components, data flow, files to create/modify, and key risks.`,
    { schema: ARCH_SCHEMA, label: 'architecture' }
  );

  phase('Stories');
  const archSummary = `Approach: ${arch.approach}\nNew files: ${arch.newFiles.join(', ')}\nModified: ${arch.modifiedFiles.join(', ')}`;
  const stories = await agent(
    `Break this feature into user stories:\nBrief: ${briefText}\nArchitecture: ${archSummary}\n\nWrite stories in "As a [user], I want [goal], so that [benefit]" format with acceptance criteria and t-shirt size estimates (XS/S/M/L/XL).`,
    { schema: STORIES_SCHEMA, label: 'stories' }
  );

  return { feature, brief, prd, architecture: arch, stories: stories.stories };
}
