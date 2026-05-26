/**
 * MindForge v2 — Skill Registrar
 * Registers a generated skill in the MANIFEST.md at the specified tier,
 * updates the trigger index, and writes an AUDIT entry.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(process.cwd(), '.mindforge', 'org', 'skills', 'MANIFEST.md');
const AUDIT_PATH    = path.join(process.cwd(), '.planning', 'AUDIT.jsonl');

const TIER_PATHS = {
  core:    path.join(process.cwd(), '.mindforge', 'skills'),
  org:     path.join(process.cwd(), '.mindforge', 'org', 'skills'),
  project: path.join(process.cwd(), '.mindforge', 'skills'),
};

const TIER_LABELS = { core: 'T1 Core', org: 'T2 Org', project: 'T3 Project' };

/**
 * Register a skill in MANIFEST.md.
 * @param {object} params
 * @param {string} params.skillName    - Kebab-case skill name
 * @param {string} params.skillPath    - Path to the SKILL.md file
 * @param {string} params.tier         - 'core' | 'org' | 'project'
 * @param {number} params.qualityScore - Quality score from skill-scorer
 * @param {string} params.sourceType   - 'url' | 'local' | 'session' | 'npm'
 * @param {string} params.source       - The source URL/path
 */
function register(params) {
  const {
    skillName,
    skillPath,
    tier        = 'project',
    qualityScore = 0,
    sourceType   = 'unknown',
    source       = '',
  } = params;

  const relativePath = path.relative(process.cwd(), skillPath).replace(/\\/g, '/');

  // Update MANIFEST.md
  if (fs.existsSync(MANIFEST_PATH)) {
    const content = fs.readFileSync(MANIFEST_PATH, 'utf8');

    // Check if skill already registered
    if (content.includes(skillName)) {
      process.stderr.write(`[skill-registrar] ⚠️  Skill "${skillName}" already in MANIFEST.md — skipping\n`);
    } else {
      // Find the right tier table and insert a new row
      const tierLabel  = TIER_LABELS[tier] || 'T3 Project';
      const newRow     = `| ${skillName} | ${tierLabel} | ${relativePath} | ${qualityScore}/100 | v1.0.0 |`;

      // Find the section and replace
      const sectionHeader = `## ${tierLabel === 'T1 Core' ? 'Core' : tierLabel === 'T2 Org' ? 'Org' : 'Project'} Skills`;
      if (content.includes(sectionHeader)) {
          // Find next header or end of file
          const regex = new RegExp(`(${sectionHeader}[\\s\\S]*?)(?=\\n## |$)`);
          const match = content.match(regex);
          if (match) {
              const updatedSection = match[1].trimEnd() + `\n${newRow}\n`;
              const updatedContent = content.replace(match[1], updatedSection);
              fs.writeFileSync(MANIFEST_PATH, updatedContent);
          } else {
              fs.appendFileSync(MANIFEST_PATH, `\n${newRow}\n`);
          }
      } else {
          fs.appendFileSync(MANIFEST_PATH, `\n${sectionHeader}\n\n| Skill | Tier | Path | Quality | Version |\n|---|---|---|---|---|\n${newRow}\n`);
      }
    }
  } else {
    // Create minimal MANIFEST.md
    fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
    fs.writeFileSync(MANIFEST_PATH,
      '# MindForge Skills Manifest\n\n' +
      '## Project Skills\n\n' +
      '| Skill | Tier | Path | Quality | Version |\n' +
      '|---|---|---|---|---|\n' +
      `| ${skillName} | ${TIER_LABELS[tier] || 'T3 Project'} | ${relativePath} | ${qualityScore}/100 | v1.0.0 |\n`
    );
  }

  // Write AUDIT entry
  if (fs.existsSync(path.dirname(AUDIT_PATH))) {
    const entry = {
      id:            require('crypto').randomBytes(8).toString('hex'),
      timestamp:     new Date().toISOString(),
      event:         'skill_learned',
      agent:         'mindforge-skills-builder',
      phase:         null,
      session_id:    'skill-learn',
      skill_name:    skillName,
      tier,
      quality_score: qualityScore,
      source_type:   sourceType,
      source:        String(source).slice(0, 200),
      skill_path:    relativePath,
    };
    fs.appendFileSync(AUDIT_PATH, JSON.stringify(entry) + '\n');
  }

  return { registered: true, skillName, tier, qualityScore };
}

module.exports = { register };
