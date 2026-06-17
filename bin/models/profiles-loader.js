'use strict';

/**
 * MindForge — Layered agent-profile + orchestration-template resolver.
 *
 * Ports the two pure algorithms from ECC's ecc2/src/config/mod.rs as JSON (no
 * TOML dep): reusable agent profiles with single-inheritance, and named
 * multi-step orchestration templates with {{var}} interpolation. Lets MindForge
 * declare reusable reviewer/security profiles and named swarm templates that
 * feed model-router / model-broker / the swarm-execution skill.
 *
 *   resolveAgentProfile(profiles, name)
 *     - single-inheritance via `inherits`, with cycle detection (throws on cycle)
 *     - tool/dir lists merge-unique; scalars override; append_system_prompt
 *       concatenates parent\n\nchild (ECC semantics).
 *   resolveOrchestrationTemplate(templates, profiles, name, vars)
 *     - {{var}} interpolation that FAILS LOUD listing every missing variable
 *     - validates each referenced profile resolves.
 */

const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g;

function mergeUnique(base, additions) {
  const out = base.slice();
  for (const v of (additions || [])) {
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

/**
 * Resolve an agent profile by name against a { name: profileConfig } map.
 * Each profileConfig may have: inherits, agent, model, allowedTools[],
 * disallowedTools[], permissionMode, addDirs[], maxBudgetUsd, tokenBudget,
 * appendSystemPrompt.
 */
function resolveAgentProfile(profiles, name, _chain) {
  const chain = _chain || [];
  if (chain.includes(name)) {
    throw new Error(`agent profile inheritance cycle: ${[...chain, name].join(' -> ')}`);
  }
  const profile = profiles && profiles[name];
  if (!profile) {
    throw new Error(`Unknown agent profile: ${name}`);
  }

  chain.push(name);
  const resolved = profile.inherits
    ? resolveAgentProfile(profiles, profile.inherits, chain)
    : { profileName: '', allowedTools: [], disallowedTools: [], addDirs: [], appendSystemPrompt: null };
  chain.pop();

  return applyProfile(resolved, name, profile);
}

function applyProfile(resolved, name, config) {
  const next = Object.assign({}, resolved, { profileName: name });
  if (config.agent != null) next.agent = config.agent;
  if (config.model != null) next.model = config.model;
  next.allowedTools = mergeUnique(resolved.allowedTools || [], config.allowedTools);
  next.disallowedTools = mergeUnique(resolved.disallowedTools || [], config.disallowedTools);
  if (config.permissionMode != null) next.permissionMode = config.permissionMode;
  next.addDirs = mergeUnique(resolved.addDirs || [], config.addDirs);
  if (config.maxBudgetUsd != null) next.maxBudgetUsd = config.maxBudgetUsd;
  if (config.tokenBudget != null) next.tokenBudget = config.tokenBudget;

  const parentPrompt = resolved.appendSystemPrompt || null;
  const childPrompt = config.appendSystemPrompt || null;
  next.appendSystemPrompt =
    parentPrompt && childPrompt ? `${parentPrompt}\n\n${childPrompt}`
      : parentPrompt || childPrompt || null;

  return next;
}

/**
 * Interpolate {{var}} placeholders. Collects ALL missing keys and throws a
 * single error listing them (fail-loud), matching ECC's behavior.
 */
function interpolateRequired(value, vars) {
  const missing = new Set();
  const rendered = String(value).replace(PLACEHOLDER, (_m, key) => {
    if (vars && Object.prototype.hasOwnProperty.call(vars, key)) return String(vars[key]);
    missing.add(key);
    return '';
  });
  if (missing.size > 0) {
    throw new Error(`missing orchestration template variable(s): ${[...missing].sort().join(', ')}`);
  }
  return rendered;
}

function interpolateOptional(value, vars) {
  if (value == null) return null;
  const rendered = interpolateRequired(value, vars).trim();
  return rendered === '' ? null : rendered;
}

/**
 * Resolve a named orchestration template into concrete steps.
 * templates: { name: { description?, project?, taskGroup?, agent?, profile?,
 *   worktree?, steps: [{ name?, task, agent?, profile?, worktree?, project?, taskGroup? }] } }
 */
function resolveOrchestrationTemplate(templates, profiles, name, vars = {}) {
  const template = templates && templates[name];
  if (!template) throw new Error(`Unknown orchestration template: ${name}`);
  if (!Array.isArray(template.steps) || template.steps.length === 0) {
    throw new Error(`orchestration template ${name} has no steps`);
  }

  const description = interpolateOptional(template.description, vars);
  const project = interpolateOptional(template.project, vars);
  const taskGroup = interpolateOptional(template.taskGroup, vars);
  const defaultAgent = interpolateOptional(template.agent, vars);
  const defaultProfile = interpolateOptional(template.profile, vars);
  if (defaultProfile) resolveAgentProfile(profiles, defaultProfile); // validate

  const steps = template.steps.map((step, index) => {
    let task;
    try {
      task = interpolateRequired(step.task, vars);
    } catch (err) {
      throw new Error(`resolve task for orchestration template ${name} step ${index + 1}: ${err.message}`);
    }
    const stepName = interpolateOptional(step.name, vars) || `step ${index + 1}`;
    const agent = interpolateOptional(step.agent != null ? step.agent : defaultAgent, vars);
    const profile = interpolateOptional(step.profile != null ? step.profile : defaultProfile, vars);
    if (profile) resolveAgentProfile(profiles, profile); // validate

    const worktree = step.worktree != null ? step.worktree
      : (template.worktree != null ? template.worktree : false);

    return {
      name: stepName,
      task,
      agent,
      profile,
      worktree,
      project: interpolateOptional(step.project != null ? step.project : project, vars),
      taskGroup: interpolateOptional(step.taskGroup != null ? step.taskGroup : taskGroup, vars),
    };
  });

  return { templateName: name, description, project, taskGroup, steps };
}

module.exports = { resolveAgentProfile, resolveOrchestrationTemplate, interpolateRequired };
