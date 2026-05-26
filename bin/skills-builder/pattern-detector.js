/**
 * MindForge v2 — Pattern Detector
 * Analyses phase SUMMARY files to find patterns that appeared
 * across 2+ tasks and are worth capturing as skills.
 *
 * Used by the AUTO_CAPTURE_SKILLS=true hook in execute-phase.
 */
'use strict';

const fs          = require('fs');
const path        = require('path');
const ModelClient = require('../models/model-client');
const Router      = require('../models/model-router');

const PLANNING_DIR = path.join(process.cwd(), '.planning');

const PATTERN_DETECTION_SYSTEM = `You are an expert at analysing software development sessions
to find reusable patterns worth capturing as team knowledge.

You will receive SUMMARY files from a completed development phase.
Find patterns that:
1. Appeared in 2+ tasks (frequency = evidence of importance)
2. Are technology-specific (not generic like "wrote tests" or "handled errors")
3. Would be hard to know without having done this before
4. Would meaningfully help future agents starting similar work

For each pattern found, provide:
- pattern_name: Short name (≤ 50 chars, kebab-case)
- display_name: Human-readable name
- frequency: Number of tasks where this pattern appeared
- generality: "high"|"medium"|"low" (would this help in other projects?)
- difficulty: "high"|"medium"|"low" (hard to get right without knowing it?)
- evidence: List of which plan files show this pattern
- summary: 2-3 sentence description of the pattern
- suggested_skill_name: Kebab-case name for the skill (e.g., "prisma-relations")

Return ONLY valid JSON. Array of pattern objects. Maximum 5 patterns.
Minimum capture bar: frequency >= 2 OR (frequency == 1 AND difficulty == "high" AND generality != "low")`;

async function detectPatterns(phaseNum, options = {}) {
  const { sessionId = 'pattern-detect', minFrequency = 2 } = options;

  const phaseDir = path.join(PLANNING_DIR, 'phases', String(phaseNum));
  if (!fs.existsSync(phaseDir)) return { patterns: [], phase: phaseNum };

  // Load all SUMMARY files
  const summaryFiles = fs.readdirSync(phaseDir)
    .filter(f => f.startsWith('SUMMARY-') && f.endsWith('.md'))
    .sort();

  if (summaryFiles.length < 2) {
    return { patterns: [], phase: phaseNum, reason: 'Need at least 2 SUMMARY files for pattern detection' };
  }

  let combinedContent = `# Phase ${phaseNum} SUMMARY Analysis\n\n`;
  for (const f of summaryFiles) {
    const text = fs.readFileSync(path.join(phaseDir, f), 'utf8');
    combinedContent += `## ${f}\n${text.slice(0, 8_000)}\n\n`;
  }

  // Also include HANDOFF.json implicit knowledge if available
  const handoffPath = path.join(PLANNING_DIR, 'HANDOFF.json');
  if (fs.existsSync(handoffPath)) {
    try {
      const handoff  = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
      const implicit = (handoff.implicit_knowledge || []).filter(i => (i.confidence || 0) >= 0.7);
      if (implicit.length > 0) {
        combinedContent += '## Implicit Knowledge (from compaction)\n';
        implicit.forEach(i => { combinedContent += `- ${i.topic || ''}: ${i.content || i.text || ''}\n`; });
      }
    } catch { /* ignore */ }
  }

  const model = Router.getAllSettings()?.EXECUTOR_MODEL || 'claude-3-5-sonnet';
  process.stdout.write(`  🔍 Detecting patterns in Phase ${phaseNum} (${summaryFiles.length} tasks)... `);

  const result = await ModelClient.complete({
    model,
    systemPrompt: PATTERN_DETECTION_SYSTEM,
    userMessage:  combinedContent.slice(0, 100_000),
    maxTokens:    2048,
    temperature:  0.1,
    taskName:     `pattern-detect-phase${phaseNum}`,
    sessionId,
  });

  console.log('done');

  const text = result.content.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
  let patterns;
  try {
    patterns = JSON.parse(text);
    if (!Array.isArray(patterns)) throw new Error('Not an array');
  } catch (err) {
    return { patterns: [], phase: phaseNum, error: `Pattern detection returned invalid JSON: ${err.message}` };
  }

  // Filter to minimum bar
  const filtered = patterns
    .filter(p => {
      const freq       = p.frequency || 1;
      const generality = p.generality || 'low';
      const difficulty = p.difficulty || 'medium';
      return freq >= minFrequency || (freq >= 1 && difficulty === 'high' && generality !== 'low');
    })
    .slice(0, 5);

  return { patterns: filtered, phase: phaseNum, tasks_analysed: summaryFiles.length };
}

/**
 * Format detected patterns for user presentation.
 */
function formatForPresentation(detectionResult) {
  const { patterns, phase, tasks_analysed } = detectionResult;

  if (!patterns || patterns.length === 0) {
    return `\n🔍 Auto-capture: No reusable patterns found in Phase ${phase}\n` +
      `   (${tasks_analysed} tasks analysed — need patterns appearing in 2+ tasks)\n`;
  }

  const lines = [
    `\n🎯 Auto-capture: ${patterns.length} reusable pattern${patterns.length > 1 ? 's' : ''} found in Phase ${phase}`,
    `   (${tasks_analysed} tasks analysed)\n`,
  ];

  patterns.forEach((p, i) => {
    const stars  = p.generality === 'high' ? '★★★' : p.generality === 'medium' ? '★★' : '★';
    const freq   = p.frequency > 1 ? `appeared in ${p.frequency} tasks` : '1 task (high difficulty)';
    lines.push(`  ${i + 1}. ${p.display_name || p.pattern_name} (${stars} ${p.generality} generality)`);
    lines.push(`     ${freq}`);
    lines.push(`     "${p.summary?.slice(0, 120) || ''}"`);
    lines.push('');
  });

  const choices = patterns.length === 1
    ? '[ y=save ] [ n=skip ]'
    : `[ y=all ] [ ${patterns.map((_, i) => `${i+1}=only #${i+1}`).join(' ] [ ')} ] [ n=skip ]`;

  lines.push(`Save as skills? ${choices}`);
  return lines.join('\n');
}

module.exports = { detectPatterns, formatForPresentation };
