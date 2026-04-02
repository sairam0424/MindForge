/**
 * MindForge v2 — Skill Generator
 * Uses AI models to convert documentation into validated SKILL.md files.
 *
 * Pipeline:
 *   1. Extract patterns (10 structured rules from source)
 *   2. Generate trigger keywords (15-25 specific keywords)
 *   3. Write full SKILL.md
 *   4. Score with skill-scorer.js
 *   5. Return result for user review
 */
'use strict';

const fs          = require('fs');
const path        = require('path');
const ModelClient = require('../models/model-client');
const Router      = require('../models/model-router');

// ── Model selection ───────────────────────────────────────────────────────────
// Default: RESEARCH_MODEL (Gemini 2.5 Pro with 1M context) for large docs
// Fallback: EXECUTOR_MODEL when content < 50K chars
function selectModel(contentLength) {
  const settings = Router.getAllSettings();
  if (contentLength > 50_000) {
    return settings.RESEARCH_MODEL || 'gemini-1.5-pro';
  }
  return settings.EXECUTOR_MODEL || 'claude-3-5-sonnet';
}

// ── System prompts ────────────────────────────────────────────────────────────
const PATTERN_EXTRACTION_SYSTEM = `You are an expert software engineer who specialises in
reading technical documentation and extracting the most valuable engineering rules and patterns.

Your goal: identify the 10 most important, actionable patterns from the provided documentation.

Requirements for each pattern:
1. The rule must be specific and actionable (not vague like "follow best practices")
2. Include a concrete code example showing correct usage
3. If there's a common mistake/anti-pattern, include it
4. Rate importance as CRITICAL, HIGH, MEDIUM, or LOW

Output ONLY valid JSON. No markdown, no preamble, no explanation.
JSON format: [
  {
    "title": "Short title (≤ 60 chars)",
    "rule": "Actionable rule statement (≤ 200 chars)",
    "example_good": "// TypeScript/JavaScript code showing correct usage",
    "example_bad": "// Code showing the anti-pattern (or null if none)",
    "importance": "CRITICAL|HIGH|MEDIUM|LOW",
    "applies_when": "Brief description of when this rule applies"
  }
]`;

const TRIGGER_EXTRACTION_SYSTEM = `You are an expert at creating precise, specific keyword triggers
for an AI skill loading system. The trigger system works by text-matching task descriptions and
file paths against trigger keywords.

Requirements for good triggers:
- 2-4 words each (not single words — too broad)
- Technology-specific (not generic like "database" or "api")
- Cover: package names, import paths, file extensions, config file names, function names, concepts
- Both noun and verb forms where helpful
- A task description like "set up Prisma schema with relations" should match several triggers

Output ONLY a JSON array of strings. No markdown, no preamble.
["trigger keyword one", "trigger keyword two", ...]`;

const SKILL_WRITING_SYSTEM = `You are writing a MindForge SKILL.md file — a structured knowledge
document that an AI agent reads before working with a specific technology.

Your writing style:
- Precise and actionable (every rule starts with a verb: "Use", "Always", "Never", "Prefer")
- Include working code examples (not pseudocode)
- A developer should be able to follow these rules without reading the source docs
- Include a self-check checklist they can use to verify their implementation

Output ONLY the complete SKILL.md content. Start with the frontmatter. No preamble.`;

// ── Pattern extraction ────────────────────────────────────────────────────────
async function extractPatterns(content, model, sessionId) {
  const truncated = content.length > 400_000
    ? content.slice(0, 400_000) + '\n\n[Content truncated at 400K chars for processing]'
    : content;

  const result = await ModelClient.complete({
    model,
    systemPrompt: PATTERN_EXTRACTION_SYSTEM,
    userMessage:  `Extract the 10 most important patterns from this documentation:\n\n${truncated}`,
    maxTokens:    4096,
    temperature:  0.1,
    taskName:     'skill-learn-extract-patterns',
    sessionId,
  });

  const text = result.content.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
  try {
    const patterns = JSON.parse(text);
    if (!Array.isArray(patterns)) throw new Error('Not an array');
    return patterns.slice(0, 10); // Enforce max 10
  } catch (err) {
    throw new Error(`Pattern extraction returned invalid JSON: ${err.message}\n\nRaw: ${text.slice(0, 500)}`);
  }
}

// ── Trigger extraction ────────────────────────────────────────────────────────
async function extractTriggers(content, patterns, model, sessionId) {
  const patternSummary = patterns
    .map(p => `- ${p.title}: ${p.rule}`)
    .join('\n');

  const result = await ModelClient.complete({
    model,
    systemPrompt: TRIGGER_EXTRACTION_SYSTEM,
    userMessage: `Technology documentation context:\n${content.slice(0, 5000)}\n\nKey patterns:\n${patternSummary}\n\nGenerate 15-25 specific trigger keywords for this technology/skill.`,
    maxTokens:   1024,
    temperature: 0.1,
    taskName:    'skill-learn-extract-triggers',
    sessionId,
  });

  const text = result.content.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
  try {
    const triggers = JSON.parse(text);
    if (!Array.isArray(triggers)) throw new Error('Not an array');
    return triggers.slice(0, 30).filter(t => typeof t === 'string' && t.trim().length > 0);
  } catch (err) {
    throw new Error(`Trigger extraction returned invalid JSON: ${err.message}`);
  }
}

// ── SKILL.md writer ───────────────────────────────────────────────────────────
async function writeSkillMd(skillName, patterns, triggers, sourceMetadata, model, sessionId) {
  const userMessage = `Write a complete MindForge SKILL.md for the skill named "${skillName}".

Triggers (${triggers.length} keywords — include ALL of these in the triggers array):
${JSON.stringify(triggers)}

Key patterns to cover (include ALL 10 in the "Key Rules" section):
${patterns.map((p, i) => `${i+1}. [${p.importance}] ${p.title}\n   Rule: ${p.rule}\n   Good: ${p.example_good || 'N/A'}\n   Bad: ${p.example_bad || 'N/A'}`).join('\n\n')}

Source: ${sourceMetadata.url || sourceMetadata.path || sourceMetadata.name || 'session analysis'}

Required SKILL.md structure:
\`\`\`
---
name: ${skillName}
version: 1.0.0
status: stable
triggers:
  - [list all ${triggers.length} triggers here]
description: [2-sentence description]
---

# ${skillName} Skill

## Purpose
[Why this skill exists — 2-3 sentences]

## Key Rules

[For each of the 10 patterns:]
### [N]. [Title] ([importance])
**Rule:** [Rule statement]
\`\`\`typescript
// ✅ Correct
[good example code]

// ❌ Avoid
[bad example code or explanation]
\`\`\`

## Anti-Patterns to Avoid
[List 5+ specific anti-patterns with explanations]

## Complete Examples
[3+ complete, working code examples showing real-world usage]

## Self-Check Checklist
Before completing any task involving [technology], verify:
- [ ] [10+ specific checklist items]

## Version History
### v1.0.0
- Initial skill — learned from [source]
\`\`\``;

  const result = await ModelClient.complete({
    model,
    systemPrompt: SKILL_WRITING_SYSTEM,
    userMessage,
    maxTokens:    8192,
    temperature:  0.1,
    taskName:     'skill-learn-write-skill',
    sessionId,
  });

  return result.content.trim();
}

// ── Save to filesystem ────────────────────────────────────────────────────────
function saveSkill(skillName, skillContent) {
  // Sanitize skill name: only alphanumeric and hyphens
  const safeName = skillName.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').toLowerCase();
  const skillDir = path.join(process.cwd(), '.mindforge', 'skills', safeName);

  fs.mkdirSync(skillDir, { recursive: true });
  const skillPath = path.join(skillDir, 'SKILL.md');
  fs.writeFileSync(skillPath, skillContent);
  return { skillPath, skillDir, safeName };
}

// ── Main generate function ────────────────────────────────────────────────────
/**
 * Generate a SKILL.md from loaded source content.
 *
 * @param {object} params
 * @param {string} params.skillName      - Name for the skill
 * @param {string} params.content        - Source content (from source-loader.js)
 * @param {object} params.sourceMetadata - Metadata about source
 * @param {string} params.sessionId      - For cost tracking
 * @returns {{ skillContent, patterns, triggers, skillPath, metadata }}
 */
async function generate(params) {
  const { skillName, content, sourceMetadata, sessionId = 'skill-learn' } = params;

  const model = selectModel(content.length);
  console.log(`\n  🧠 Skill generator (${model}, ${content.length.toLocaleString()} chars)`);

  // Step 1: Extract patterns
  process.stdout.write('  Step 1/3 — Extracting patterns... ');
  const patterns = await extractPatterns(content, model, sessionId);
  console.log(`done (${patterns.length} patterns)`);

  // Step 2: Extract triggers
  process.stdout.write('  Step 2/3 — Generating triggers... ');
  const triggers = await extractTriggers(content, patterns, model, sessionId);
  console.log(`done (${triggers.length} triggers)`);

  // Step 3: Write SKILL.md
  process.stdout.write('  Step 3/3 — Writing SKILL.md... ');
  const skillContent = await writeSkillMd(skillName, patterns, triggers, sourceMetadata, model, sessionId);
  console.log('done');

  // Step 4: Save
  const { skillPath, safeName } = saveSkill(skillName, skillContent);

  return {
    skillContent,
    skillPath,
    skillName: safeName,
    patterns,
    triggers,
    model,
    metadata: { content_length: content.length, source: sourceMetadata },
  };
}

module.exports = { generate, extractPatterns, extractTriggers, writeSkillMd, saveSkill, selectModel };
