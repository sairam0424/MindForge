#!/usr/bin/env node

/**
 * MindForge Auto-PR Engine
 * Automates pull request creation after a commit.
 */

const { execSync } = require('child_process');

function run(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('🚀 Checking for Pull Request status...');

  // 1. Get current branch
  const branch = run('git rev-parse --abbrev-ref HEAD');
  if (!branch) {
    console.error('❌ Could not determine current branch.');
    process.exit(1);
  }

  // 2. Skip protected branches
  const protectedBranches = ['main', 'develop', 'master'];
  if (protectedBranches.includes(branch)) {
    console.log(`⏩ Skipping Auto-PR for protected branch: ${branch}`);
    process.exit(0);
  }

  // 3. Check if gh is installed (and search common paths on macOS)
  let ghPath = run('which gh');
  if (!ghPath) {
    const commonPaths = [
      '/opt/homebrew/bin/gh',
      '/usr/local/bin/gh',
      '/usr/bin/gh',
      '/bin/gh'
    ];
    for (const p of commonPaths) {
      if (run(`ls ${p}`)) {
        ghPath = p;
        break;
      }
    }
  }

  if (!ghPath) {
    console.warn('⚠️ GitHub CLI (gh) not found. Skipping Auto-PR creation.');
    console.warn('💡 Install gh and run "gh auth login" to enable this feature.');
    process.exit(0);
  }

  // 4. Check if PR already exists for this branch
  const existingPR = run(`${ghPath} pr list --head ${branch} --json url --jq ".[0].url"`);
  if (existingPR) {
    console.log(`✅ Pull Request already exists: ${existingPR}`);
    process.exit(0);
  }

  // 5. Create Draft PR
  console.log(`📝 Creating Draft Pull Request for ${branch}...`);
  const baseBranch = 'main'; // DEFAULT to main

  const createPRCmd = `${ghPath} pr create --base ${baseBranch} --fill --draft`;
  const prUrl = run(createPRCmd);

  if (prUrl) {
    console.log(`🎉 Pull Request created successfully: ${prUrl}`);
  } else {
    console.error('❌ Failed to create Pull Request. Ensure you have pushed the branch and are authenticated.');
  }
}

main().catch((err) => {
  console.error('❌ Auto-PR Error:', err.message);
  process.exit(1);
});
