'use strict';

const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function replaceIfPlaceholder(content, placeholder, value, keyName) {
  if (content.includes(placeholder)) {
    return {
      content: content.replace(placeholder, value),
      changed: true,
      msg: `  ✅ ${keyName} configured`,
    };
  }
  if (!content.includes(value)) {
    return {
      content,
      changed: false,
      msg: `  ⏭️  ${keyName} already configured — not overwriting`,
    };
  }
  return { content, changed: false, msg: null };
}

async function writeIntegrationsConfig(config) {
  const configPath = '.mindforge/org/integrations/INTEGRATIONS-CONFIG.md';
  ensureDir(path.dirname(configPath));

  if (!fs.existsSync(configPath)) {
    console.log('  ⏭️  INTEGRATIONS-CONFIG.md not found — skipping integration write');
    return;
  }

  let content = fs.readFileSync(configPath, 'utf8');
  const logs = [];

  if (config.jira) {
    let out = replaceIfPlaceholder(
      content,
      'JIRA_BASE_URL=https://your-org.atlassian.net',
      `JIRA_BASE_URL=${config.jira.baseUrl}`,
      'JIRA_BASE_URL'
    );
    content = out.content; if (out.msg) logs.push(out.msg);

    out = replaceIfPlaceholder(
      content,
      'JIRA_PROJECT_KEY=ENG',
      `JIRA_PROJECT_KEY=${config.jira.projectKey}`,
      'JIRA_PROJECT_KEY'
    );
    content = out.content; if (out.msg) logs.push(out.msg);
  }

  if (config.slack) {
    const out = replaceIfPlaceholder(
      content,
      'SLACK_CHANNEL_ID=C01234ABCDE',
      `SLACK_CHANNEL_ID=${config.slack.channelId}`,
      'SLACK_CHANNEL_ID'
    );
    content = out.content; if (out.msg) logs.push(out.msg);
  }

  if (config.github) {
    let out = replaceIfPlaceholder(
      content,
      'GITHUB_REPO=your-org/your-repo',
      `GITHUB_REPO=${config.github.repo}`,
      'GITHUB_REPO'
    );
    content = out.content; if (out.msg) logs.push(out.msg);

    out = replaceIfPlaceholder(
      content,
      'GITHUB_DEFAULT_REVIEWERS=senior-engineer-1,senior-engineer-2',
      `GITHUB_DEFAULT_REVIEWERS=${config.github.reviewers}`,
      'GITHUB_DEFAULT_REVIEWERS'
    );
    content = out.content; if (out.msg) logs.push(out.msg);
  }

  fs.writeFileSync(configPath, content);
  logs.forEach((l) => console.log(l));
}

async function writeGovernanceConfig(team) {
  const configPath = '.mindforge/governance/GOVERNANCE-CONFIG.md';
  ensureDir(path.dirname(configPath));
  if (!fs.existsSync(configPath)) return;

  let content = fs.readFileSync(configPath, 'utf8');
  if (team.tier2Approvers && content.includes('TIER2_APPROVERS=senior-engineer-1,senior-engineer-2')) {
    content = content.replace(
      'TIER2_APPROVERS=senior-engineer-1,senior-engineer-2',
      `TIER2_APPROVERS=${team.tier2Approvers}`
    );
  }
  if (team.tier3Approvers && content.includes('TIER3_APPROVERS=security-officer,compliance-officer,cto')) {
    content = content.replace(
      'TIER3_APPROVERS=security-officer,compliance-officer,cto',
      `TIER3_APPROVERS=${team.tier3Approvers}`
    );
  }

  fs.writeFileSync(configPath, content);
}

module.exports = { writeIntegrationsConfig, writeGovernanceConfig };
