export const meta = {
  name: 'accessibility-audit',
  description: 'WCAG 2.2 parallel per-criterion audit → 3-vote adversarial verify failures → remediation spec',
  whenToUse: 'When auditing a UI for WCAG 2.2 compliance before launch, legal review, or accessibility certification',
  phases: [
    { title: 'Scope', detail: 'Define target UI and map components/pages to audit' },
    { title: 'Audit', detail: '6 parallel WCAG principle auditors (Perceivable/Operable/Understandable/Robust + ARIA + Keyboard)' },
    { title: 'Verify', detail: '3-vote adversarial verification of all Level A and AA failures' },
    { title: 'Spec', detail: 'Remediation spec with exact ARIA attributes, HTML fixes, and WCAG references' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const AUDIT_SCHEMA = {
    type: 'object',
    properties: {
      principle: { type: 'string' },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            wcagCriterion: { type: 'string' },
            level: { type: 'string', enum: ['A', 'AA', 'AAA'] },
            severity: { type: 'string', enum: ['blocker', 'critical', 'major', 'minor'] },
            component: { type: 'string' },
            description: { type: 'string' },
            fix: { type: 'string' },
          },
          required: ['wcagCriterion', 'level', 'severity', 'description', 'fix'],
        },
      },
    },
    required: ['principle', 'issues'],
  };

  const VERDICT_SCHEMA = {
    type: 'object',
    properties: {
      isRealIssue: { type: 'boolean' },
      affectsRealUsers: { type: 'boolean' },
      reason: { type: 'string' },
    },
    required: ['isRealIssue', 'affectsRealUsers', 'reason'],
  };

  const REMEDIATION_SCHEMA = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      wcagLevel: { type: 'string', enum: ['Level A non-compliant', 'Level AA non-compliant', 'Level AA compliant', 'Level AAA compliant'] },
      criticalFixes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            issue: { type: 'string' },
            wcagRef: { type: 'string' },
            fix: { type: 'string' },
            codeExample: { type: 'string' },
          },
          required: ['issue', 'wcagRef', 'fix', 'codeExample'],
        },
      },
    },
    required: ['summary', 'wcagLevel', 'criticalFixes'],
  };

  const target = args || 'current UI codebase (run from repo root)';

  phase('Scope');
  log(`Accessibility audit target: ${target}`);

  const AUDITORS = [
    { label: 'perceivable', prompt: `Audit WCAG 2.2 Perceivable criteria for: "${target}". Check: 1.1.1 Non-text content (alt text), 1.2.x captions/transcripts, 1.3.x info/structure (semantic HTML, labels), 1.4.x distinguishable (contrast ratio ≥4.5:1, resize text, no reliance on color alone). List every failure with WCAG criterion, level (A/AA/AAA), severity, and exact fix.` },
    { label: 'operable', prompt: `Audit WCAG 2.2 Operable criteria for: "${target}". Check: 2.1.x keyboard accessible (all functionality via keyboard, no traps), 2.2.x enough time (no time limits, pause/stop/hide), 2.3.x seizures (no flashing ≥3Hz), 2.4.x navigable (skip links, page titles, focus order, link purpose), 2.5.x input modalities (touch target ≥24×24px). List every failure with criterion, level, and fix.` },
    { label: 'understandable', prompt: `Audit WCAG 2.2 Understandable criteria for: "${target}". Check: 3.1.x readable (lang attribute, unusual words), 3.2.x predictable (no context changes on focus, consistent navigation), 3.3.x input assistance (error identification, labels/instructions, error suggestion, error prevention). List every failure with criterion, level, and fix.` },
    { label: 'robust', prompt: `Audit WCAG 2.2 Robust criteria for: "${target}". Check: 4.1.2 Name/Role/Value (all UI components have accessible name, role, state/value), 4.1.3 Status messages (announced to AT without focus). Also check for valid, parseable HTML. List every failure with criterion, level, and fix.` },
    { label: 'aria', prompt: `Audit ARIA usage for: "${target}". Check: roles match actual element behavior, required aria-* properties present, aria-labelledby/describedby IDs exist, no aria-hidden on interactive elements, no redundant role+element, proper live region usage. List every failure with fix showing correct ARIA attributes.` },
    { label: 'keyboard', prompt: `Audit keyboard navigation for: "${target}". Check: tab order is logical, visible focus indicator present (not just outline:none), modals trap focus and release on close, custom widgets (accordions, tabs, dropdowns, sliders) follow ARIA authoring practices keyboard patterns, no keyboard traps. List every failure with fix.` },
  ];

  phase('Audit');
  const audits = await parallel(
    AUDITORS.map(a => () => agent(a.prompt, { schema: AUDIT_SCHEMA, label: `audit:${a.label}`, phase: 'Audit' }))
  );

  phase('Verify');
  const allIssues = audits.filter(Boolean).flatMap(a => (a.issues || []).map(i => ({ ...i, principle: a.principle })));
  const levelAandAA = allIssues.filter(i => i.level === 'A' || i.level === 'AA');
  log(`${allIssues.length} total issues, ${levelAandAA.length} Level A/AA → 3-vote verify`);

  const verified = await parallel(
    levelAandAA.map(issue => () =>
      parallel([
        () => agent(`Is this WCAG ${issue.level} accessibility issue real, or a false positive? Try to REFUTE it. Issue: "${issue.description}" (${issue.wcagCriterion}). Default isRealIssue=false only if clearly not applicable.`, { schema: VERDICT_SCHEMA, label: `v1:${issue.wcagCriterion}`, phase: 'Verify' }),
        () => agent(`Would a real assistive technology user (screen reader, keyboard-only, low-vision) actually encounter this issue? Issue: "${issue.description}" (${issue.wcagCriterion}). Be specific about which user group is affected.`, { schema: VERDICT_SCHEMA, label: `v2:${issue.wcagCriterion}`, phase: 'Verify' }),
        () => agent(`Is the WCAG criterion reference accurate for this issue? "${issue.description}" cited as ${issue.wcagCriterion} Level ${issue.level}. Confirm or correct the WCAG reference.`, { schema: VERDICT_SCHEMA, label: `v3:${issue.wcagCriterion}`, phase: 'Verify' }),
      ]).then(votes => {
        if (!votes) return { ...issue, confirmed: false };
        const confirmed = votes.filter(Boolean).filter(v => v.isRealIssue).length;
        return { ...issue, confirmed: confirmed >= 2 };
      })
    )
  );

  const confirmedIssues = verified.filter(Boolean).filter(i => i.confirmed);
  log(`${confirmedIssues.length}/${levelAandAA.length} Level A/AA issues confirmed`);

  phase('Spec');
  const issueSummary = confirmedIssues.slice(0, 15).map(i => `[${i.level}/${i.severity}] ${i.wcagCriterion}: ${i.description} → Fix: ${i.fix}`).join('\n');
  const remediation = await agent(
    `Create an accessibility remediation spec for: "${target}"\n\nConfirmed WCAG issues:\n${issueSummary}\n\nFor each critical/blocker issue provide: WCAG reference, exact fix description, and a code example (HTML/ARIA/CSS) showing the corrected implementation. Determine the overall WCAG compliance level.`,
    { schema: REMEDIATION_SCHEMA, label: 'remediation-spec' }
  );
  if (!remediation) { return { target, confirmedIssues, error: 'remediation-agent-null', stats: { total: allIssues.length, levelAAFailures: levelAandAA.length, confirmed: confirmedIssues.length } }; }

  return { target, audits: audits.filter(Boolean), confirmedIssues, remediation, stats: { total: allIssues.length, levelAAFailures: levelAandAA.length, confirmed: confirmedIssues.length } };
}
