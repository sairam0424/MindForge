# MindForge Integrations Configuration
# IMPORTANT: Never store API tokens, passwords, or private keys in this file.
# Credentials belong in environment variables or a managed secrets service.

## Jira Configuration
JIRA_BASE_URL=https://your-org.atlassian.net
JIRA_PROJECT_KEY=ENG
JIRA_EPIC_LABEL=mindforge-phase
JIRA_STORY_TYPE=Story
JIRA_BUG_TYPE=Bug
JIRA_STORY_POINTS_FIELD=story_points

## Confluence Configuration
CONFLUENCE_BASE_URL=https://your-org.atlassian.net/wiki
CONFLUENCE_SPACE_KEY=ENG
CONFLUENCE_ARCHITECTURE_PAGE_TITLE=MindForge Architecture
CONFLUENCE_ADR_PARENT_PAGE_TITLE=Architecture Decision Records
CONFLUENCE_PHASE_DOCS_PARENT_PAGE_TITLE=Sprint Documentation
CONFLUENCE_AUTO_PUBLISH=false

## Slack Configuration
SLACK_CHANNEL_ID=C01234ABCDE
SLACK_NOTIFY_ON=phase_complete,security_finding,approval_needed,blocker
SLACK_MENTION_ON_CRITICAL=@oncall
SLACK_USE_THREADS=true

## Governance Configuration
TIER2_APPROVERS=senior-engineer-1,senior-engineer-2,tech-lead
TIER3_APPROVERS=security-officer,compliance-officer,cto
EMERGENCY_APPROVERS=cto,vp-engineering
TIER2_SLA_HOURS=24
TIER3_SLA_HOURS=4
TIER2_ESCALATE_AFTER_HOURS=48
TIER3_ESCALATE_AFTER_HOURS=8
TIER2_EXPIRY_HOURS=48
TIER3_EXPIRY_HOURS=8
ESCALATION_CONTACT=engineering-lead@your-org.com
ESCALATION_SLACK_CHANNEL=C0ESCALATE

## GitHub Configuration
GITHUB_REPO=your-org/your-repo
GITHUB_DEFAULT_BRANCH=main
GITHUB_REQUIRED_REVIEWERS=2
GITHUB_DEFAULT_REVIEWERS=senior-engineer-1,senior-engineer-2
GITHUB_PR_TEMPLATE_PATH=.github/pull_request_template.md
GITHUB_DRAFT_BY_DEFAULT=false

## GitLab Configuration
GITLAB_PROJECT_ID=
GITLAB_DEFAULT_BRANCH=main
GITLAB_DEFAULT_REVIEWERS=

## Notification Preferences
NOTIFY_PHASE_COMPLETE=true
NOTIFY_SECURITY_CRITICAL=true
NOTIFY_APPROVAL_NEEDED=true
NOTIFY_MILESTONE_COMPLETE=true
NOTIFY_BLOCKER_ADDED=true
