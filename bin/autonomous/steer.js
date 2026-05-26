/**
 * MindForge — Steering Manager
 * Manages mid-execution guidance via steering-queue.jsonl.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const QUEUE_PATH = path.join(process.cwd(), '.planning/steering-queue.jsonl');

/**
 * Add guidance to the queue.
 */
function pushGuidance(instruction, scope = 'global', taskId = null) {
  const item = {
    id: `steer-${Date.now()}`,
    timestamp: new Date().toISOString(),
    instruction,
    scope,
    taskId
  };
  fs.appendFileSync(QUEUE_PATH, JSON.stringify(item) + '\n');
  return item.id;
}

/**
 * Get and remove all pending guidance for the current context.
 */
function popGuidance(taskId = null) {
  if (!fs.existsSync(QUEUE_PATH)) return [];

  const lines = fs.readFileSync(QUEUE_PATH, 'utf8').split('\n').filter(Boolean);
  const relevant = [];
  const remaining = [];

  for (const line of lines) {
    const item = JSON.parse(line);
    if (item.scope === 'global' || item.taskId === taskId) {
      relevant.push(item);
    } else {
      remaining.push(item);
    }
  }

  // Rewrite remaining
  fs.writeFileSync(QUEUE_PATH, remaining.map(JSON.stringify).join('\n') + (remaining.length ? '\n' : ''));
  return relevant;
}

/**
 * Inject steering guidance into a PLAN file content.
 */
function injectSteering(planContent, guidanceItems) {
  if (!guidanceItems || guidanceItems.length === 0) return planContent;

  const guidanceText = guidanceItems
    .map(g => `[STEERING GUIDANCE — DO NOT IGNORE] ${g.instruction}`)
    .join('\n');

  // Hardened injection: inject at beginning of <action> to ensure visibility
  return planContent.replace(/<action>([\s\S]*?)<\/action>/, (match, action) => {
    return `<action>\n${guidanceText}\n\nOriginal plan instructions:\n${action}\n</action>`;
  });
}

/**
 * Add human steering to the unified queue (v5 Pillar VII).
 */
function pushHumanSteering(instruction, bundleId = 'none') {
  const STEER_PATH = path.join(process.cwd(), '.planning', 'STEER.json');
  const item = {
    id: `human-${Date.now()}`,
    timestamp: new Date().toISOString(),
    bundle_id: bundleId,
    type: 'HUMAN_OVERRIDE',
    instruction,
    priority: 'CRITICAL'
  };
  fs.appendFileSync(STEER_PATH, JSON.stringify(item) + '\n');
  return item.id;
}

module.exports = {
  pushGuidance,
  popGuidance,
  injectSteering,
  pushHumanSteering
};
