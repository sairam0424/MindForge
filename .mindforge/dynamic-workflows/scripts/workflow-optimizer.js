export const meta = {
  name: 'workflow-optimizer',
  description: 'Builder + scorer + a distinct process-optimizer role: each round scores the OUTPUT, but a separate optimizer agent reviews the round and proposes structural changes to the PROCESS itself (extra phases, different builder count, a corrected rubric) — the next round runs under the revised process, so the comparison is whether the workflow is getting better at producing good outputs, not just whether one artifact beat another',
  whenToUse: 'When you want to improve a repeatable PROCESS across attempts, not just polish one output — e.g. "this review workflow keeps missing X, fix the workflow, not just this one review" or tuning how a builder+scorer pipeline should be structured before locking it in as a reusable workflow',
  phases: [
    { title: 'Scope', detail: 'pin the task family, the outcome metric, and any prior round history supplied by the caller' },
    { title: 'Cycle', detail: 'builder runs under the current process -> scorer grades the output -> a separate process-optimizer proposes structural changes to the process for next round' },
    { title: 'Report', detail: 'process-change history alongside the score trend, so a rising score can be attributed to real structural improvements' },
  ],
};

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    output: { type: 'string', description: 'the complete artifact produced this round' },
    processFollowed: { type: 'string', description: 'plainly describe the steps you actually took to produce this — this is read by the process-optimizer, not the scorer, so be concrete about HOW you worked, not just what you made' },
  },
  required: ['output', 'processFollowed'],
};

const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'number', description: '0-100 against the fixed outcome metric — same metric every round, this is what lets rounds be compared' },
    gaps: { type: 'array', items: { type: 'string' }, description: 'specific shortfalls in THIS output, for context — not process suggestions, that is the optimizer\'s job' },
  },
  required: ['score', 'gaps'],
};

const OPTIMIZE_SCHEMA = {
  type: 'object',
  properties: {
    expectFurtherGains: { type: 'boolean', description: 'false if you believe this process has converged and further optimization rounds would just be noise — this is the signal that ends the loop early, use it honestly' },
    structuralChanges: {
      type: 'array',
      items: { type: 'string' },
      description: 'concrete edits to the WORKFLOW\'s own steps/roles/gates for next round, each one sentence. Not edits to the artifact itself.',
    },
    diagnosis: { type: 'string', description: 'ONE sentence: why the process (not the artifact) produced this result.' },
    revisedRubricNotes: { type: 'string', description: 'one sentence on anything the scorer should additionally weigh next round, or empty string if the rubric is fine as-is' },
    revisedBuilderPrompt: { type: 'string', description: 'the complete next-round builder instructions, incorporating the structural changes above — self-contained, not a diff. Put this field LAST since it is the longest.' },
  },
  required: ['expectFurtherGains', 'structuralChanges', 'diagnosis', 'revisedRubricNotes', 'revisedBuilderPrompt'],
};

function parseArgs(raw) {
  if (raw && typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // Not valid JSON despite looking like it — fall through and treat as a plain taskFamily string.
      }
    }
    return trimmed;
  }
  return raw || {};
}

const input = parseArgs(args);
const taskFamily = typeof input === 'string' ? input : input.taskFamily;
const metric = typeof input === 'object' ? input.metric : null;
const maxRounds = (typeof input === 'object' && input.maxRounds) || 5;
const priorHistory = (typeof input === 'object' && Array.isArray(input.priorHistory)) ? input.priorHistory : [];

if (!taskFamily) {
  throw new Error(
    'workflow-optimizer requires args = { taskFamily, metric, maxRounds?, priorHistory? } or a plain string taskFamily. ' +
    'taskFamily = the repeatable kind of task this process handles (not one single input — describe the CLASS of task, since the optimizer is improving a reusable process, not one artifact). ' +
    'metric = the fixed outcome rubric every round is scored against. maxRounds default 5. ' +
    'priorHistory = optional array of {round, structuralChanges, score} objects from a PREVIOUS invocation of this workflow, if you are resuming optimization across sessions — this script has no filesystem access, so true cross-session history must be passed back in by the caller from a prior run\'s returned processHistory.'
  );
}

phase('Scope');
log(`Task family: ${taskFamily}`);
log(`Metric: ${metric || '(optimizer will state and hold a fixed metric)'}`);
if (priorHistory.length) log(`Resuming with ${priorHistory.length} prior round(s) of history supplied by caller`);

const processHistory = [...priorHistory];
let currentBuilderPrompt = `Task family: ${taskFamily}\n${metric ? `You will be scored against: ${metric}\n` : ''}\nProduce a complete attempt. Also describe the process you followed to produce it.`;
let currentRubricNotes = '';

phase('Cycle');
const startRound = processHistory.length + 1;
const lastRound = processHistory.length + maxRounds;
for (let round = startRound; round <= lastRound; round++) {
  if (budget.total && budget.remaining() < 25_000) {
    log(`Stopping at round ${round - 1}: token budget nearly exhausted (${Math.round(budget.remaining() / 1000)}k left)`);
    break;
  }

  const build = await agent(currentBuilderPrompt, { label: `build:r${round}`, phase: 'Cycle', schema: BUILD_SCHEMA });

  const scorePrompt = `Score this output against the task family's fixed metric — same rubric every round, do not adjust for effort or process, only the outcome.\n\nTask family: ${taskFamily}\n${metric ? `Metric: ${metric}\n` : ''}${currentRubricNotes ? `Additional weighting from process-optimizer review: ${currentRubricNotes}\n` : ''}\nOutput:\n${build.output}`;
  const scored = await agent(scorePrompt, { label: `score:r${round}`, phase: 'Cycle', schema: SCORE_SCHEMA });

  log(`Round ${round}: score ${scored.score}/100`);

  const optimizePrompt = `You are the process-optimizer. Your job is NOT to improve this one output — a separate builder will do that next round using instructions you write. Your job is to diagnose WHY the current PROCESS produced this result, and propose structural changes to the process itself.\n\nTask family: ${taskFamily}\n${metric ? `Metric: ${metric}\n` : ''}\nCurrent builder instructions:\n${currentBuilderPrompt}\n\nThis round's process, as the builder described it:\n${build.processFollowed}\n\nThis round's score: ${scored.score}/100\nGaps identified: ${scored.gaps.join('; ')}\n\n${processHistory.length ? `Prior rounds' structural changes and scores:\n${processHistory.map(h => `Round ${h.round}: score ${h.score} — changed: ${h.structuralChanges.join('; ')}`).join('\n')}\n` : ''}\nPropose structural changes to the WORKFLOW (not the artifact) for the next round, and write the complete revised builder instructions that incorporate them.`;
  const optimized = await agent(optimizePrompt, { label: `optimize:r${round}`, phase: 'Cycle', schema: OPTIMIZE_SCHEMA });

  processHistory.push({
    round,
    score: scored.score,
    gaps: scored.gaps,
    diagnosis: optimized.diagnosis,
    structuralChanges: optimized.structuralChanges,
  });

  log(`Round ${round} optimizer: ${optimized.structuralChanges.length} structural change(s) proposed for next round`);

  if (!optimized.expectFurtherGains) {
    log(`Optimizer judges the process has converged after round ${round} — stopping early rather than burning further rounds on noise.`);
    break;
  }

  currentBuilderPrompt = optimized.revisedBuilderPrompt;
  currentRubricNotes = optimized.revisedRubricNotes || currentRubricNotes;
}

phase('Report');
const scoreTrend = processHistory.map(h => h.score);
const improved = scoreTrend.length >= 2 && scoreTrend.at(-1) > scoreTrend[0];
log(`Score trend across ${processHistory.length} round(s): ${scoreTrend.join(' -> ')}`);

return {
  taskFamily,
  metric: metric || '(optimizer-held, see round 1 diagnosis for the rubric it used)',
  processHistory,
  finalBuilderPrompt: currentBuilderPrompt,
  scoreTrend,
  processImprovedOutcome: improved,
  note: 'Pass this run\'s processHistory back in as args.priorHistory on a future invocation to continue optimizing the same process across sessions — this script holds no state of its own between runs.',
};
