export const meta = {
  name: 'verification-loop',
  description: 'Implementer vs. scorer loop: one agent revises an artifact each round, a separate agent scores it against a fixed metric, and the implementer keeps re-attempting until the score is maxed or a round cap is hit',
  whenToUse: 'When a task has a single well-defined quality metric worth pushing as high as possible, rather than a single fixed-count review pass — e.g. tightening a prompt, hardening a config, polishing a spec, or any "keep improving this until the score stops moving" task',
  phases: [
    { title: 'Scope', detail: 'pin the artifact, the metric, and the target/max-round cap' },
    { title: 'Round', detail: 'implementer revises, scorer grades — repeats until target hit, score plateaus, or cap reached' },
    { title: 'Report', detail: 'round-by-round score history and the final artifact' },
  ],
};

const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'number', description: '0-100. Same metric every round — do not silently redefine what "good" means between rounds.' },
    breakdown: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          criterion: { type: 'string' },
          points: { type: 'number' },
          maxPoints: { type: 'number' },
          note: { type: 'string' },
        },
        required: ['criterion', 'points', 'maxPoints', 'note'],
      },
    },
    topFixes: {
      type: 'array',
      items: { type: 'string' },
      description: 'the highest-leverage concrete changes that would raise the score next round, ordered by impact — not a full audit, just what to fix next',
    },
  },
  required: ['score', 'breakdown', 'topFixes'],
};

const REVISE_SCHEMA = {
  type: 'object',
  properties: {
    artifact: { type: 'string', description: 'the full revised artifact — not a diff, not a description of changes, the complete thing so the next scorer round has the real content' },
    changesThisRound: { type: 'array', items: { type: 'string' } },
  },
  required: ['artifact', 'changesThisRound'],
};

function parseArgs(raw) {
  if (raw && typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // Not valid JSON despite looking like it — fall through and treat as a plain task string.
      }
    }
    return trimmed;
  }
  return raw || {};
}

const input = parseArgs(args);
const task = typeof input === 'string' ? input : input.task;
const metric = typeof input === 'string' ? null : input.metric;
const targetScore = (typeof input === 'object' && input.targetScore) || 95;
const maxRounds = (typeof input === 'object' && input.maxRounds) || 8;
const plateauRounds = (typeof input === 'object' && input.plateauRounds) || 2;

if (!task) {
  throw new Error(
    'verification-loop requires args = { task, metric, targetScore?, maxRounds?, plateauRounds? } ' +
    'or args = "<task description that fully states the scoring metric>". ' +
    'task = what to build/revise. metric = the exact rubric the scorer must grade against (if omitted, the scorer infers one from task and reports it every round for consistency). ' +
    'targetScore default 95. maxRounds default 8. plateauRounds default 2 (stop early if score does not improve for this many consecutive rounds).'
  );
}

phase('Scope');
log(`Task: ${task}`);
log(`Metric: ${metric || '(scorer will state and hold a fixed rubric)'}`);
log(`Target: ${targetScore}/100, max ${maxRounds} rounds, stop after ${plateauRounds} flat rounds`);

const scoreHistory = [];
let currentArtifact = null;
let roundsFlat = 0;

phase('Round');
for (let round = 1; round <= maxRounds; round++) {
  if (budget.total && budget.remaining() < 20_000) {
    log(`Stopping at round ${round - 1}: token budget nearly exhausted (${Math.round(budget.remaining() / 1000)}k left)`);
    break;
  }

  const revisePrompt = currentArtifact
    ? `Task: ${task}\n${metric ? `Metric the scorer grades against: ${metric}\n` : ''}\nCurrent artifact (round ${round - 1} score: ${scoreHistory.at(-1)?.score}):\n${currentArtifact}\n\nScorer feedback from last round, ordered by impact:\n${scoreHistory.at(-1)?.topFixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\nRevise the artifact to address as many of these as you genuinely can without breaking anything the scorer already gave points for. Return the complete revised artifact, not a diff.`
    : `Task: ${task}\n${metric ? `Metric the scorer will grade against: ${metric}\n` : 'State the metric you are optimizing for, then '}Produce a first complete attempt at the artifact.`;

  const revision = await agent(revisePrompt, { label: `implement:r${round}`, phase: 'Round', schema: REVISE_SCHEMA });
  currentArtifact = revision.artifact;

  const scorePrompt = `Score this artifact against the task's metric. Be strict and consistent with how you'd score any round of this same task — same rubric every time, do not grade on a curve relative to the previous round.\n\nTask: ${task}\n${metric ? `Metric: ${metric}\n` : ''}\nArtifact:\n${currentArtifact}`;
  const scored = await agent(scorePrompt, { label: `score:r${round}`, phase: 'Round', schema: SCORE_SCHEMA });

  scoreHistory.push(scored);
  log(`Round ${round}: score ${scored.score}/100`);

  if (scored.score >= targetScore) {
    log(`Target ${targetScore} reached at round ${round} — stopping.`);
    break;
  }

  const prevScore = scoreHistory.length > 1 ? scoreHistory[scoreHistory.length - 2].score : -Infinity;
  if (scored.score <= prevScore) {
    roundsFlat++;
    if (roundsFlat >= plateauRounds) {
      log(`Score has not improved for ${plateauRounds} consecutive rounds — stopping (diminishing returns, not a bug).`);
      break;
    }
  } else {
    roundsFlat = 0;
  }
}

phase('Report');
const finalScore = scoreHistory.at(-1);
log(`Final score: ${finalScore.score}/100 across ${scoreHistory.length} round(s)`);

return {
  task,
  metric: metric || '(scorer-inferred, see round 1 breakdown for the rubric it held)',
  finalArtifact: currentArtifact,
  finalScore: finalScore.score,
  scoreHistory: scoreHistory.map((s, i) => ({ round: i + 1, score: s.score, topFixes: s.topFixes })),
  stoppedBecause:
    finalScore.score >= targetScore ? 'target-reached' :
    roundsFlat >= plateauRounds ? 'plateaued' :
    'max-rounds',
};
