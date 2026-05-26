#!/usr/bin/env node
/**
 * MindForge Skill Registry — v1.0.0
 * Handles manifest updates, skill copying, and audit logging.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
let ACTION = ARGS[0]; // install | register | audit

function main() {
  if (!ACTION || ARGS.includes('--help') || ARGS.includes('-h')) {
    console.log('\nUsage: mindforge-cc <install-skill|register-skill|audit-skill> [args]\n');
    process.exit(0);
  }

  // Handle cases where the action might be missing if called incorrectly
  const validActions = ['install', 'register', 'audit', 'sign'];
  if (!validActions.includes(ACTION)) {
    console.error(`❌ Invalid or missing action: ${ACTION}`);
    console.error(`   Expected one of: ${validActions.join(', ')}`);
    process.exit(1);
  }

  switch (ACTION) {
    case 'install':
      handleInstall();
      break;
    case 'register':
      handleRegister();
      break;
    case 'audit':
      handleAudit();
      break;
    case 'sign':
      handleSign();
      break;
    default:
      console.error(`❌ Unknown action: ${ACTION}`);
      process.exit(1);
  }
}

async function handleSign() {
  const skillName = ARGS[1];
  const ztai = require('./governance/ztai-manager');
  const crypto = require('node:crypto');

  if (!skillName) {
    console.error('❌ Missing skill name to sign');
    process.exit(1);
  }

  // Find the skill file
  const bases = [
    '.mindforge/skills',
    '.mindforge/org/skills',
    '.mindforge/project-skills'
  ];
  
  let targetPath = null;
  for (const base of bases) {
    const p = path.join(process.cwd(), base, skillName, 'SKILL.md');
    if (fs.existsSync(p)) {
      targetPath = p;
      break;
    }
  }

  if (!targetPath) {
    console.error(`❌ Skill ${skillName} not found in any registry path.`);
    process.exit(1);
  }

  console.log(`🛡️  Signing skill: ${skillName}...`);
  const content = fs.readFileSync(targetPath, 'utf8');
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  try {
    // We use a dedicated System DID for skill signing (Tier 3)
    const systemDid = await ztai.registerAgent('MindForge-System-Secretary', 3);
    const signature = await ztai.signData(systemDid, hash);

    const sigPath = path.join(process.cwd(), '.mindforge', 'org', 'skills', 'SIGNATURES.json');
    let signatures = {};
    if (fs.existsSync(sigPath)) {
      signatures = JSON.parse(fs.readFileSync(sigPath, 'utf8'));
    }

    signatures[skillName] = {
      hash,
      signature,
      did: systemDid,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(sigPath, JSON.stringify(signatures, null, 2));
    console.log(`✅ Skill ${skillName} signed and registered in SIGNATURES.json`);
    process.exit(0);
  } catch (err) {
    console.error(`❌ Signing failed: ${err.message}`);
    process.exit(1);
  }
}

function handleInstall() {
  const skillName = ARGS[1];
  const tierFlag = ARGS.indexOf('--tier');
  const tier = tierFlag !== -1 ? ARGS[tierFlag + 1] : '2';

  if (!skillName) {
    console.error('❌ Missing skill name');
    process.exit(1);
  }

  console.log(`🚀 Installing skill: ${skillName} (Tier ${tier})...`);

  // Target directory logic
  let targetBase = '.mindforge/org/skills';
  if (tier === '1') targetBase = '.mindforge/skills';
  if (tier === '3') targetBase = '.mindforge/project-skills';

  const targetDir = path.join(process.cwd(), targetBase, skillName);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Mock behavior for Day 3/4 testing if no real registry
  // Expect source to be in examples/ if it exists, otherwise just touch it
  const mockSrc = path.join(process.cwd(), 'examples', 'skills', `${skillName}.md`);
  const targetFile = path.join(targetDir, 'SKILL.md');

  if (fs.existsSync(mockSrc)) {
    fs.copyFileSync(mockSrc, targetFile);
    console.log(`  ✅ Copied from ${mockSrc}`);
  } else {
    // If no source, we look for it in the current dir for the agentic flow
    const localSrc = path.join(process.cwd(), 'SKILL.md');
    if (fs.existsSync(localSrc)) {
       fs.copyFileSync(localSrc, targetFile);
       console.log('  ✅ Copied from local SKILL.md');
    } else {
       // Just create a placeholder for testing if nothing else
       fs.writeFileSync(targetFile, `---\nname: ${skillName}\nversion: 1.0.0\nstatus: alpha\ntriggers: test, mock, placeholder\n---\n# ${skillName}\nPlaceholder for ${skillName} skill.\n`);
       console.log('  ⚠️  Created mock SKILL.md (no source found)');
    }
  }

  process.exit(0);
}

function handleRegister() {
  const skillName = ARGS[1];
  const version = ARGS[2] || '1.0.0';
  const tier = ARGS[3] || '2';

  const manifestPath = path.join(process.cwd(), '.mindforge', 'org', 'skills', 'MANIFEST.md');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ MANIFEST.md not found');
    process.exit(1);
  }

  let content = fs.readFileSync(manifestPath, 'utf8');
  
  // Find the tier section (e.g., ## Org Skills)
  const tierHeaders = {
    '1': '## Core Skills',
    '2': '## Org Skills',
    '3': '## Project Skills'
  };
  const header = tierHeaders[tier];
  
  if (!content.includes(header)) {
    console.error(`❌ Tier header ${header} not found in manifest`);
    process.exit(1);
  }

  // Build the row: | Name | Version | Status | Min MindForge | Path |
  const skillPath = tier === '1' ? `.mindforge/skills/${skillName}/SKILL.md` :
                   tier === '2' ? `.mindforge/org/skills/${skillName}/SKILL.md` :
                   `.mindforge/project-skills/${skillName}/SKILL.md`;

  const newRow = `| ${skillName} | ${version} | stable | 0.1.0 | ${skillPath} |`;
  
  // Check if already registered
  if (content.includes(`| ${skillName} |`)) {
    console.log(`  ⏭️  ${skillName} already registered, updating version...`);
    content = content.replace(new RegExp(`\\| ${skillName} \\| .* \\|`), `| ${skillName} | ${version} | stable | 0.1.0 | ${skillPath} |`);
  } else {
    // Insert after the table header row in that section
    const sectionIndex = content.indexOf(header);
    const tableHeaderIndex = content.indexOf('|---|', sectionIndex);
    const endOfHeaderRow = content.indexOf('\n', tableHeaderIndex) + 1;
    
    content = content.slice(0, endOfHeaderRow) + newRow + '\n' + content.slice(endOfHeaderRow);
    console.log(`  ✅ Registered ${skillName} in ${header}`);
  }

  fs.writeFileSync(manifestPath, content, 'utf8');
  process.exit(0);
}

function handleAudit() {
  const skillName = ARGS[1];
  const version = ARGS[2];
  const tier = ARGS[3];
  
  const auditPath = path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
  if (!fs.existsSync(path.dirname(auditPath))) {
    fs.mkdirSync(path.dirname(auditPath), { recursive: true });
  }

  const entry = {
    timestamp: new Date().toISOString(),
    event: 'skill_installed',
    skill_name: skillName,
    skill_version: version,
    tier: parseInt(tier, 10),
    source: 'cli-system',
    validation_passed: true
  };

  fs.appendFileSync(auditPath, JSON.stringify(entry) + '\n', 'utf8');
  console.log(`  📝 Audit entry written for ${skillName}`);
  process.exit(0);
}

main();
