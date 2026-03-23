/**
 * MindForge v2 — Skill Scorer
 * 7-dimension quality scoring system for SKILL.md files.
 * Total: 100 points.
 *
 * This is a static analysis scorer — no AI calls needed.
 * Runs in < 100ms on any SKILL.md.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

// ── Injection guard patterns (from skill-loader.md) ───────────────────────────
const INJECTION_PATTERNS = [
  /IGNORE ALL PREVIOUS INSTRUCTIONS/i,
  /IGNORE PREVIOUS INSTRUCTIONS/i,
  /DISREGARD YOUR INSTRUCTIONS/i,
  /FORGET YOUR TRAINING/i,
  /YOU ARE NOW/i,
  /YOUR NEW INSTRUCTIONS ARE/i,
  /OVERRIDE:/i,
  /SYSTEM PROMPT:/i,
];

// ── Placeholder detection ─────────────────────────────────────────────────────
const PLACEHOLDER_PATTERNS = [
  /\[your description here\]/i,
  /\[fill in\]/i,
  /\[TODO\]/i,
  /\btodo\b/i,
  /\bfixme\b/i,
  /<description>/i,
  /\.\.\.fill in\.\.\./i,
  /\[your [a-z\s]+ here\]/i,
  /\[replace with\]/i,
];

// ── Generic trigger words (penalty list) ─────────────────────────────────────
const GENERIC_TRIGGERS = new Set([
  'database', 'api', 'model', 'service', 'component', 'function',
  'class', 'method', 'type', 'interface', 'module', 'package',
  'file', 'config', 'test', 'error', 'data', 'query', 'request',
  'response', 'handler', 'controller', 'repository', 'schema',
]);

// ── SKILL.md parser ───────────────────────────────────────────────────────────
function parseSkill(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter      = frontmatterMatch?.[1] || '';

  // Extract triggers from frontmatter
  const triggersSection = frontmatter.match(/^triggers:\n((?:  - .+\n?)*)/m);
  const triggers        = (triggersSection?.[1] || '')
    .split('\n')
    .map(l => l.replace(/^\s*- /, '').trim())
    .filter(Boolean);

  // Count code blocks with ≥ 3 lines (meaningful examples, not one-liners)
  const codeBlockMatches = content.match(/```[\s\S]*?```/g) || [];
  const codeBlocks       = codeBlockMatches.length;
  const meaningfulBlocks = codeBlockMatches.filter(block => {
    const lines = block.split('\n').length;
    return lines >= 4; // ``` + at least 3 content lines + ```
  }).length;

  // Count checklist items (both checked and unchecked)
  const checklistItems = (content.match(/^- \[[ xX]\] /gm) || []).length;

  // Has version history?
  const hasVersionHistory = /## Version History/i.test(content);
  const versionEntries    = (content.match(/^### v\d+\.\d+\.\d+/gm) || []).length;

  // Mandatory action counts
  const alwaysRules  = (content.match(/\b(Always|Must|Required|mandatory|MUST)\b/gi) || []).length;
  const neverRules   = (content.match(/\b(Never|Don't|Do not|Avoid|NEVER)\b/gi) || []).length;
  const hasSecuritySection  = /security|auth|SECURITY|AUTH/i.test(content);
  const hasPerformanceSection = /performance|perf|optimiz|PERFORMANCE/i.test(content);
  const hasErrorSection    = /error handling|exception|catch|Error/i.test(content);

  return {
    triggers, codeBlocks, meaningfulBlocks, checklistItems,
    hasVersionHistory, versionEntries,
    alwaysRules, neverRules,
    hasSecuritySection, hasPerformanceSection, hasErrorSection,
    content,
  };
}

// ── Dimension scorers ─────────────────────────────────────────────────────────
function scoreTriggerCoverage(parsed) {
  const { triggers } = parsed;
  let score = 0;

  if (triggers.length >= 25) score = 30;
  else if (triggers.length >= 20) score = 24;
  else if (triggers.length >= 15) score = 18;
  else if (triggers.length >= 10) score = 12;
  else if (triggers.length >= 5)  score = 6;

  // Penalty for generic triggers
  const genericCount = triggers.filter(t => GENERIC_TRIGGERS.has(t.toLowerCase())).length;
  const penalty      = genericCount * 2;

  return {
    score: Math.max(0, score - penalty),
    max: 30,
    details: `${triggers.length} triggers, ${genericCount} generic (penalty: -${penalty})`,
  };
}

function scoreMandatoryActions(parsed) {
  const { alwaysRules, neverRules, hasSecuritySection, hasPerformanceSection, hasErrorSection } = parsed;
  let score = 0;

  if (alwaysRules >= 5)           score += 5;
  else if (alwaysRules >= 3)      score += 3;
  else if (alwaysRules >= 1)      score += 1;

  if (neverRules >= 3)            score += 5;
  else if (neverRules >= 2)       score += 3;
  else if (neverRules >= 1)       score += 2;

  if (hasSecuritySection)         score += 5;
  if (hasPerformanceSection)      score += 5;
  if (hasErrorSection)            score += 5;

  return {
    score: Math.min(25, score),
    max: 25,
    details: `${alwaysRules} always-rules, ${neverRules} never-rules, security:${hasSecuritySection}, perf:${hasPerformanceSection}, errors:${hasErrorSection}`,
  };
}

function scoreCodeExamples(parsed) {
  const { meaningfulBlocks, content } = parsed;
  let score = 0;

  if (meaningfulBlocks >= 5)      score = 20;
  else if (meaningfulBlocks >= 3) score = 14;
  else if (meaningfulBlocks >= 1) score = 7;

  // Bonus: side-by-side correct/incorrect examples
  const hasSideBySide = content.includes('✅') && content.includes('❌');
  if (hasSideBySide) score = Math.min(20, score + 2);

  return { score: Math.min(20, score), max: 20, details: `${meaningfulBlocks} meaningful code blocks, side-by-side:${hasSideBySide}` };
}

function scoreSelfCheck(parsed) {
  const { checklistItems } = parsed;
  let score = 0;

  if (checklistItems >= 10)     score = 15;
  else if (checklistItems >= 7) score = 10;
  else if (checklistItems >= 4) score = 7;
  else if (checklistItems >= 1) score = 3;

  return { score, max: 15, details: `${checklistItems} checklist items` };
}

function scoreInjectionSafe(parsed) {
  const hasInjection = INJECTION_PATTERNS.some(p => p.test(parsed.content));
  return {
    score: hasInjection ? 0 : 10,
    max: 10,
    details: hasInjection ? 'INJECTION PATTERN DETECTED — score 0' : 'clean',
    fail:    hasInjection,
  };
}

function scoreNoPlaceholders(parsed) {
  const placeholderCount = PLACEHOLDER_PATTERNS.filter(p => p.test(parsed.content)).length;
  let score = 0;
  if (placeholderCount === 0)      score = 10;
  else if (placeholderCount <= 2)  score = 5;

  return { score, max: 10, details: `${placeholderCount} placeholder patterns found` };
}

function scoreVersionHistory(parsed) {
  const { hasVersionHistory, versionEntries } = parsed;
  let score = 0;
  if (hasVersionHistory && versionEntries >= 1) score = 10;
  else if (versionEntries > 0) score = 5;

  const bonus = versionEntries > 1 ? 2 : 0;
  const MAX = 10;
  return { score: Math.min(MAX, score + bonus), max: MAX, details: `${versionEntries} version entries` };
}

// ── Main score function ───────────────────────────────────────────────────────
/**
 * Score a SKILL.md file.
 * @param {string} skillPathOrContent - Path to SKILL.md or content string
 * @returns {object} Full scoring result
 */
function score(skillPathOrContent) {
  let content;
  if (typeof skillPathOrContent === 'string' && fs.existsSync(skillPathOrContent)) {
    content = fs.readFileSync(skillPathOrContent, 'utf8');
  } else {
    content = skillPathOrContent;
  }

  const parsed = parseSkill(content);

  const dimensions = {
    trigger_coverage:    scoreTriggerCoverage(parsed),
    mandatory_actions:   scoreMandatoryActions(parsed),
    code_examples:       scoreCodeExamples(parsed),
    self_check:          scoreSelfCheck(parsed),
    injection_safe:      scoreInjectionSafe(parsed),
    no_placeholders:     scoreNoPlaceholders(parsed),
    version_history:     scoreVersionHistory(parsed),
  };

  const total = Object.values(dimensions).reduce((s, d) => s + d.score, 0);

  // Determine thresholds
  let threshold_status = 'insufficient';
  if (total >= 90)      threshold_status = 'excellent';
  else if (total >= 80) threshold_status = 'good';
  else if (total >= 70) threshold_status = 'acceptable';
  else if (total >= 60) threshold_status = 'minimum';

  const can_register = total >= 60 && !dimensions.injection_safe.fail;
  const can_publish  = total >= 80 && !dimensions.injection_safe.fail;

  // Improvement suggestions
  const suggestions = [];
  if (dimensions.trigger_coverage.score < 24) {
    suggestions.push(`Add ${25 - parsed.triggers.length} more triggers to reach 25+ (currently ${parsed.triggers.length})`);
  }
  if (dimensions.mandatory_actions.score < 20) {
    if (!parsed.hasSecuritySection)     suggestions.push('Add a security considerations section');
    if (!parsed.hasPerformanceSection)  suggestions.push('Add a performance considerations section');
    if (!parsed.hasErrorSection)        suggestions.push('Add an error handling section');
  }
  if (dimensions.code_examples.score < 14) {
    suggestions.push(`Add ${5 - parsed.codeBlocks} more code examples (currently ${parsed.codeBlocks})`);
  }
  if (dimensions.self_check.score < 10) {
    suggestions.push(`Add ${10 - parsed.checklistItems} more checklist items (currently ${parsed.checklistItems})`);
  }
  if (!dimensions.version_history.score) {
    suggestions.push('Add a ## Version History section with a v1.0.0 entry');
  }

  return {
    quality_score:    total,
    threshold_status,
    can_register,
    can_publish,
    score_breakdown:  Object.fromEntries(Object.entries(dimensions).map(([k, v]) => [k, v.score])),
    dimension_details: Object.fromEntries(Object.entries(dimensions).map(([k, v]) => [k, v.details])),
    improvement_suggestions: suggestions,
    trigger_count:    parsed.triggers.length,
    injection_safe:   !dimensions.injection_safe.fail,
  };
}

module.exports = { score, parseSkill, INJECTION_PATTERNS, PLACEHOLDER_PATTERNS, GENERIC_TRIGGERS };
