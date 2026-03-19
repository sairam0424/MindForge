/**
 * MindForge Skills Platform Tests
 * Run: node tests/skills-platform.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ── Skill frontmatter parser ──────────────────────────────────────────────────
function parseSkillFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.startsWith('---')) {
    throw new Error(`${filePath}: missing frontmatter (must start with ---)`);
  }
  const end = content.indexOf('---', 3);
  if (end === -1) throw new Error(`${filePath}: unclosed frontmatter`);
  const fm = content.slice(3, end).trim();

  const result = {};
  fm.split('\n').forEach(line => {
    const colon = line.indexOf(':');
    if (colon === -1) return;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    result[key] = val;
  });
  return result;
}

// ── Semver validator ──────────────────────────────────────────────────────────
function isValidSemver(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

// ── Skills directory scanner ──────────────────────────────────────────────────
function getAllSkillPaths() {
  const skillsDir = '.mindforge/skills';
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir)
    .map(dir => path.join(skillsDir, dir, 'SKILL.md'))
    .filter(p => fs.existsSync(p));
}

// ── Manifest parser ───────────────────────────────────────────────────────────
function parseManifest() {
  const manifestPath = '.mindforge/org/skills/MANIFEST.md';
  if (!fs.existsSync(manifestPath)) return { skills: [] };
  const content = fs.readFileSync(manifestPath, 'utf8');
  const rows = content.match(/\|\s+(\S+)\s+\|\s+(\d+\.\d+\.\d+)\s+\|\s+(\w+)\s+\|\s+(\d+\.\d+\.\d+)\s+\|/g) || [];
  return {
    skills: rows.map(row => {
      const parts = row.split('|').map(p => p.trim()).filter(Boolean);
      return { name: parts[0], version: parts[1], status: parts[2] };
    })
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

console.log('\nMindForge Day 3 — Skills Platform Tests\n');

console.log('Skills directory structure:');

test('skills directory exists', () => {
  assert.ok(fs.existsSync('.mindforge/skills'), 'Missing .mindforge/skills/');
});

test('all 10 skill directories exist', () => {
  const required = [
    'security-review', 'code-quality', 'api-design', 'testing-standards',
    'documentation', 'performance', 'accessibility', 'data-privacy',
    'incident-response', 'database-patterns'
  ];
  required.forEach(skill => {
    const p = `.mindforge/skills/${skill}/SKILL.md`;
    assert.ok(fs.existsSync(p), `Missing: ${p}`);
  });
});

test('engine skills directory has all 4 engine files', () => {
  const required = ['registry.md', 'loader.md', 'versioning.md', 'conflict-resolver.md'];
  required.forEach(f => {
    const p = `.mindforge/engine/skills/${f}`;
    assert.ok(fs.existsSync(p), `Missing: ${p}`);
  });
});

console.log('\nSkill frontmatter validation:');

const skillPaths = getAllSkillPaths();
test(`found ${skillPaths.length} skill files to validate`, () => {
  assert.ok(skillPaths.length >= 10, `Expected >= 10 skill files, found ${skillPaths.length}`);
});

skillPaths.forEach(skillPath => {
  const skillName = skillPath.split('/').slice(-2)[0];

  test(`${skillName}: has valid frontmatter`, () => {
    const fm = parseSkillFrontmatter(skillPath);
    assert.ok(fm.name, 'Missing name field');
    assert.ok(fm.version, 'Missing version field');
    assert.ok(fm.status, 'Missing status field');
    assert.ok(fm.triggers, 'Missing triggers field');
  });

  test(`${skillName}: name matches directory`, () => {
    const fm = parseSkillFrontmatter(skillPath);
    assert.strictEqual(fm.name, skillName, `Skill name "${fm.name}" doesn't match directory "${skillName}"`);
  });

  test(`${skillName}: version is valid semver`, () => {
    const fm = parseSkillFrontmatter(skillPath);
    assert.ok(isValidSemver(fm.version), `Invalid semver: "${fm.version}"`);
  });

  test(`${skillName}: has at least 5 trigger keywords`, () => {
    const fm = parseSkillFrontmatter(skillPath);
    const triggers = fm.triggers.split(',').map(t => t.trim()).filter(Boolean);
    assert.ok(triggers.length >= 5, `Too few triggers: ${triggers.length} (min 5)`);
  });

  test(`${skillName}: status is a valid value`, () => {
    const fm = parseSkillFrontmatter(skillPath);
    const validStatuses = ['stable', 'beta', 'alpha', 'deprecated'];
    assert.ok(validStatuses.includes(fm.status), `Invalid status: "${fm.status}"`);
  });

  test(`${skillName}: has mandatory actions section`, () => {
    const content = fs.readFileSync(skillPath, 'utf8');
    assert.ok(
      content.includes('## Mandatory actions') || content.includes('mandatory actions'),
      'Missing mandatory actions section'
    );
  });

  test(`${skillName}: has self-check or checklist section`, () => {
    const content = fs.readFileSync(skillPath, 'utf8');
    assert.ok(
      content.includes('checklist') || content.includes('self-check') || content.includes('- [ ]'),
      'Missing checklist or self-check section'
    );
  });
});

console.log('\nManifest validation:');

test('MANIFEST.md exists', () => {
  assert.ok(fs.existsSync('.mindforge/org/skills/MANIFEST.md'), 'Missing MANIFEST.md');
});

test('MANIFEST.md registers all 10 core skills', () => {
  const content = fs.readFileSync('.mindforge/org/skills/MANIFEST.md', 'utf8');
  const requiredSkills = [
    'security-review', 'code-quality', 'api-design', 'testing-standards',
    'documentation', 'performance', 'accessibility', 'data-privacy',
    'incident-response', 'database-patterns'
  ];
  requiredSkills.forEach(skill => {
    assert.ok(content.includes(skill), `MANIFEST.md missing skill: ${skill}`);
  });
});

test('MANIFEST.md has schema version header', () => {
  const content = fs.readFileSync('.mindforge/org/skills/MANIFEST.md', 'utf8');
  assert.ok(content.includes('Schema version') || content.includes('schema version:'), 'Missing schema version');
});

console.log('\nTrigger keyword uniqueness (within Tier 1):');

test('no duplicate triggers between Tier 1 skills at exact match', () => {
  const triggerMap = {};
  const conflicts = [];

  getAllSkillPaths().forEach(skillPath => {
    const fm = parseSkillFrontmatter(skillPath);
    const skillName = fm.name;
    const triggers = fm.triggers.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    triggers.forEach(trigger => {
      if (triggerMap[trigger] && triggerMap[trigger] !== skillName) {
        conflicts.push(`"${trigger}": ${triggerMap[trigger]} vs ${skillName}`);
      } else {
        triggerMap[trigger] = skillName;
      }
    });
  });

  // Conflicts are allowed (Type 1 in conflict-resolver.md) but should be minimal
  // Flag if more than 5 conflicts exist (suggests poor trigger hygiene)
  assert.ok(
    conflicts.length <= 5,
    `Too many trigger conflicts (${conflicts.length} > 5): ${conflicts.slice(0, 3).join(', ')}`
  );
});

console.log('\nPersona override system:');

test('personas/overrides directory exists', () => {
  assert.ok(fs.existsSync('.mindforge/personas/overrides'), 'Missing personas/overrides directory');
});

test('personas/overrides/README.md exists and has content', () => {
  const p = '.mindforge/personas/overrides/README.md';
  assert.ok(fs.existsSync(p), 'Missing overrides README.md');
  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.length > 200, 'README.md too short');
  assert.ok(content.includes('override'), 'README.md should explain overrides');
});

console.log('\nNew commands (15 total):');

const allCommands = [
  'help', 'init-project', 'plan-phase', 'execute-phase', 'verify-phase', 'ship',  // Day 1
  'next', 'quick', 'status', 'debug',                                               // Day 2
  'skills', 'review', 'security-scan', 'map-codebase', 'discuss-phase'             // Day 3
];

test('all 15 commands exist in .claude/commands/mindforge/', () => {
  allCommands.forEach(cmd => {
    const p = `.claude/commands/mindforge/${cmd}.md`;
    assert.ok(fs.existsSync(p), `Missing command: ${p}`);
  });
});

test('all 15 commands mirrored to .agent/mindforge/', () => {
  allCommands.forEach(cmd => {
    const p = `.agent/mindforge/${cmd}.md`;
    assert.ok(fs.existsSync(p), `Missing mirrored command: ${p}`);
  });
});

test('command files are not empty', () => {
  allCommands.forEach(cmd => {
    const p = `.claude/commands/mindforge/${cmd}.md`;
    if (fs.existsSync(p)) {
      const size = fs.statSync(p).size;
      assert.ok(size > 200, `Command file too small (${size} bytes): ${cmd}.md`);
    }
  });
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All skills platform tests passed.\n`);
}
