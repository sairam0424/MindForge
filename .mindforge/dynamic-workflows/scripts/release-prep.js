export const meta = {
  name: 'release-prep',
  description: 'Automated release pipeline: tests → changelog → version bump → PR → announcement draft',
  whenToUse: 'When preparing a production release and need all release artifacts generated',
  phases: [
    { title: 'Check', detail: 'Verify tests pass, no uncommitted changes, CI status' },
    { title: 'Changelog', detail: 'Generate changelog from commits since last release' },
    { title: 'Bump', detail: 'Identify next version using semver conventions' },
    { title: 'PR', detail: 'Draft release PR description and announcement' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const READINESS_SCHEMA = {
    type: 'object',
    properties: {
      ready: { type: 'boolean' },
      blockers: { type: 'array', items: { type: 'string' } },
      warnings: { type: 'array', items: { type: 'string' } },
      testSummary: { type: 'string' },
    },
    required: ['ready', 'blockers', 'warnings', 'testSummary'],
  };

  const CHANGELOG_SCHEMA = {
    type: 'object',
    properties: {
      breaking: { type: 'array', items: { type: 'string' } },
      features: { type: 'array', items: { type: 'string' } },
      fixes: { type: 'array', items: { type: 'string' } },
      chores: { type: 'array', items: { type: 'string' } },
      highlights: { type: 'string' },
    },
    required: ['breaking', 'features', 'fixes', 'chores', 'highlights'],
  };

  const VERSION_SCHEMA = {
    type: 'object',
    properties: {
      current: { type: 'string' },
      next: { type: 'string' },
      bumpType: { type: 'string', enum: ['major', 'minor', 'patch'] },
      rationale: { type: 'string' },
      filesToUpdate: { type: 'array', items: { type: 'string' } },
    },
    required: ['current', 'next', 'bumpType', 'rationale', 'filesToUpdate'],
  };

  const PR_SCHEMA = {
    type: 'object',
    properties: {
      prTitle: { type: 'string' },
      prBody: { type: 'string' },
      announcementDraft: { type: 'string' },
      releaseNotes: { type: 'string' },
    },
    required: ['prTitle', 'prBody', 'announcementDraft', 'releaseNotes'],
  };

  const context = args || 'current repository (run from repo root)';

  phase('Check');
  log(`Preparing release for: ${context}`);
  const readiness = await agent(
    `Check release readiness for: "${context}"\n\nVerify: are there uncommitted changes? Any failing tests? Any security vulnerabilities in dependencies? Any open critical bugs that should block release? List any blockers and warnings.`,
    { schema: READINESS_SCHEMA, label: 'check' }
  );
  if (!readiness.ready && readiness.blockers.length > 0) {
    log(`BLOCKED: ${readiness.blockers.join(', ')}`);
  }
  log(`Readiness: ${readiness.ready ? 'GO' : 'BLOCKED'} — ${readiness.blockers.length} blockers, ${readiness.warnings.length} warnings`);

  phase('Changelog');
  const changelog = await agent(
    `Generate a changelog for this release of: "${context}"\n\nAnalyze recent commits (look for conventional commit format: feat/fix/chore/refactor/docs/test/perf/ci). Separate into: breaking changes, new features, bug fixes, chores. Write a highlights summary (2-3 sentences).`,
    { schema: CHANGELOG_SCHEMA, label: 'changelog' }
  );
  log(`Changelog: ${changelog.breaking.length} breaking, ${changelog.features.length} features, ${changelog.fixes.length} fixes`);

  phase('Bump');
  const changelogSummary = `Breaking: ${changelog.breaking.length}, Features: ${changelog.features.length}, Fixes: ${changelog.fixes.length}`;
  const version = await agent(
    `Determine the next semantic version for: "${context}"\nChanges: ${changelogSummary}\nHighlights: ${changelog.highlights}\n\nUse semver rules: breaking change = major bump, new features = minor bump, fixes only = patch bump. List all files that need version updated.`,
    { schema: VERSION_SCHEMA, label: 'bump' }
  );
  log(`Version: ${version.current} → ${version.next} (${version.bumpType})`);

  phase('PR');
  const releaseContext = `Version: ${version.current} → ${version.next}\nHighlights: ${changelog.highlights}\nFeatures: ${changelog.features.slice(0, 5).join(', ')}\nFixes: ${changelog.fixes.slice(0, 5).join(', ')}`;
  const pr = await agent(
    `Draft the release PR and announcement for: "${context}"\n${releaseContext}\n\nWrite: a PR title and body (markdown), a 280-char social announcement draft, and full release notes (markdown, suitable for GitHub Releases).`,
    { schema: PR_SCHEMA, label: 'pr' }
  );

  return {
    context,
    readiness,
    changelog,
    version,
    pr,
  };
}
