/**
 * MindForge — Node Repair Operator
 * Implements RETRY → DECOMPOSE → PRUNE → ESCALATE decision logic.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

/**
 * Determine the repair strategy for a failed task.
 * @param {object} context - Task context
 * @returns {'RETRY'|'DECOMPOSE'|'PRUNE'|'ESCALATE'}
 */
function determineRepairStrategy(context) {
  const {
    planId,
    phase,
    attemptNumber,     // 1 = first failure, 2 = retry also failed
    errorOutput,
    isTier3Change,
    isOnCriticalPath,  // other plans have this plan as a dependency
    planFilePath,
    repairBudget = 2,
  } = context;

  // Tier 3 changes ALWAYS escalate — never auto-approve auth/payment/PII
  if (isTier3Change) {
    return 'ESCALATE';
  }

  // First failure — always try RETRY first
  if (attemptNumber === 1) {
    return 'RETRY';
  }

  // Retry also failed — try DECOMPOSE if the plan is decomposable
  if (attemptNumber === 2 && isPlanDecomposable(planFilePath)) {
    return 'DECOMPOSE';
  }

  // Cannot DECOMPOSE (or decompose also failed) — try PRUNE if not critical path
  if (!isOnCriticalPath) {
    return 'PRUNE';
  }

  // On critical path and all repair strategies exhausted — must ESCALATE
  return 'ESCALATE';
}

/**
 * Check if a plan can be split into independent sub-plans.
 */
function isPlanDecomposable(planFilePath) {
  if (!fs.existsSync(planFilePath)) return false;
  const content = fs.readFileSync(planFilePath, 'utf8');

  // Count distinct file domains
  const filesMatch = content.match(/<files>([\s\S]*?)<\/files>/);
  if (!filesMatch) return false;
  const files = filesMatch[1].trim().split('\n').filter(Boolean);

  // Decomposable if:
  // 1. More than 2 files (enough to split)
  // 2. Files span different directories (different concerns)
  if (files.length <= 1) return false;
  const dirs = new Set(files.map(f => f.trim().split('/').slice(0, 2).join('/')));
  return dirs.size > 1;
}

/**
 * Generate RETRY context injection — adds error details for the retry subagent.
 */
function buildRetryContext(errorOutput, attemptNumber) {
  const normalized = errorOutput
    .split('\n')
    .filter(l => /error|FAIL|error/i.test(l))
    .slice(0, 5)
    .join('\n');

  return `
[RETRY CONTEXT — attempt ${attemptNumber} of 2]
Previous attempt failed with:
${normalized}

Instructions:
- Do NOT repeat the same approach that caused this error
- Fix the specific error above before implementing new functionality
- If the error is an import/module error: verify the package is installed
- If the error is a type error: check the exact type definitions
- If the error is a test failure: read the test assertion carefully
`.trim();
}

/**
 * Build decomposed sub-plans from a failed plan.
 * Returns two PLAN file contents as strings.
 */
function buildDecomposedPlans(planContent, originalPlanId, phase) {
  const xmlMatch = planContent.match(/<task[^>]*>([\s\S]*?)<\/task>/);
  if (!xmlMatch) return null;

  const name       = (planContent.match(/<n>(.*?)<\/n>/) || [])[1] || 'Task';
  const action     = (planContent.match(/<action>([\s\S]*?)<\/action>/) || [])[1] || '';
  const filesMatch = planContent.match(/<files>([\s\S]*?)<\/files>/);
  const files      = filesMatch ? filesMatch[1].trim().split('\n').filter(Boolean) : [];
  const persona    = (planContent.match(/<persona>(.*?)<\/persona>/) || [])[1] || 'developer';

  const mid      = Math.ceil(files.length / 2);
  const filesA   = files.slice(0, mid);
  const filesB   = files.slice(mid);
  const idA      = `${originalPlanId}a`;
  const idB      = `${originalPlanId}b`;

  const planA = `<task type="auto">
  <n>${name} — Part A (Foundation)</n>
  <persona>${persona}</persona>
  <phase>${phase}</phase>
  <plan>${idA}</plan>
  <decomposed_from>${originalPlanId}</decomposed_from>
  <dependencies>${getPlanDependencies(planContent)}</dependencies>
  <files>
${filesA.map(f => `    ${f.trim()}`).join('\n')}
  </files>
  <action>
${splitAction(action, 'first_half')}
  </action>
  <verify>Run the tests for the files modified in this sub-task only</verify>
  <done>Part A files exist, compile cleanly, and their specific tests pass</done>
</task>`;

  const planB = `<task type="auto">
  <n>${name} — Part B (Integration)</n>
  <persona>${persona}</persona>
  <phase>${phase}</phase>
  <plan>${idB}</plan>
  <decomposed_from>${originalPlanId}</decomposed_from>
  <dependencies>${idA}</dependencies>
  <files>
${filesB.map(f => `    ${f.trim()}`).join('\n')}
  </files>
  <action>
${splitAction(action, 'second_half')}
  </action>
  <verify>Run the full test suite for the entire ${name} feature</verify>
  <done>All ${name} functionality working end-to-end</done>
</task>`;

  return { planA, planB, idA, idB };
}

/**
 * Fix the dependency chain after decomposing a plan.
 * Any plan that depended on the original plan now depends on the second sub-plan.
 */
function fixDependencyChain(phaseDir, originalPlanId, newDependentPlanId, phase) {
  const planFiles = fs.readdirSync(phaseDir)
    .filter(f => f.match(new RegExp(`^PLAN-${phase}-\\d`)) && f.endsWith('.md'));

  let fixed = 0;
  for (const planFile of planFiles) {
    const filePath = path.join(phaseDir, planFile);
    const content  = fs.readFileSync(filePath, 'utf8');

    // Check if this plan depends on the original decomposed plan
    const depPattern = new RegExp(`<dependencies>([^<]*\\b${originalPlanId}\\b[^<]*)</dependencies>`);
    if (depPattern.test(content)) {
      const updated = content.replace(depPattern, (match, deps) => {
        const newDeps = deps.replace(new RegExp(`\\b${originalPlanId}\\b`, 'g'), newDependentPlanId);
        return `<dependencies>${newDeps}</dependencies>`;
      });
      fs.writeFileSync(filePath, updated);
      fixed++;
    }
  }
  return fixed;
}

function getPlanDependencies(planContent) {
  return (planContent.match(/<dependencies>(.*?)<\/dependencies>/) || [])[1] || 'none';
}

function splitAction(action, half) {
  // Try period-delimited split first
  const periodSplit = action.split(/\.\s+/);
  if (periodSplit.length > 1) {
    const mid = Math.ceil(periodSplit.length / 2);
    return half === 'first_half'
      ? periodSplit.slice(0, mid).join('. ').trim()
      : periodSplit.slice(mid).join('. ').trim();
  }

  // Try newline-bullet split
  const bulletSplit = action.split(/\n-\s+/);
  if (bulletSplit.length > 1) {
    const mid = Math.ceil(bulletSplit.length / 2);
    return half === 'first_half'
      ? bulletSplit.slice(0, mid).join('\n- ').trim()
      : bulletSplit.slice(mid).join('\n- ').trim();
  }

  // Fallback: prefix the whole action with a half indicator
  const prefix = half === 'first_half' ? 'First half of: ' : 'Second half of: ';
  return prefix + action.trim().slice(0, Math.ceil(action.length / 2));
}

module.exports = {
  determineRepairStrategy,
  isPlanDecomposable,
  buildRetryContext,
  buildDecomposedPlans,
  fixDependencyChain,
};
