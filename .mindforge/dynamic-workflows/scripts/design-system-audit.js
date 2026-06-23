export const meta = {
  name: 'design-system-audit',
  description: '5 parallel dimension auditors (spacing/color/typography/icons/a11y) → consistency score',
  whenToUse: 'When auditing a UI codebase for design system consistency before a design review, refactor, or component library update',
  phases: [
    { title: 'Inventory', detail: 'Discover design tokens, component files, and styling approach' },
    { title: 'Audit', detail: '5 parallel dimension auditors: spacing, color, typography, icons, accessibility' },
    { title: 'Score', detail: 'Aggregate consistency scores per dimension and overall' },
    { title: 'Report', detail: 'Design system health report with specific violation fixes' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const INVENTORY_SCHEMA = {
    type: 'object',
    properties: {
      stylingApproach: { type: 'string' },
      tokenFiles: { type: 'array', items: { type: 'string' } },
      componentFiles: { type: 'array', items: { type: 'string' } },
      designSystem: { type: 'string' },
    },
    required: ['stylingApproach', 'componentFiles'],
  };

  const DIM_SCHEMA = {
    type: 'object',
    properties: {
      dimension: { type: 'string' },
      score: { type: 'number' },
      violations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            file: { type: 'string' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            description: { type: 'string' },
            fix: { type: 'string' },
          },
          required: ['severity', 'description', 'fix'],
        },
      },
      positives: { type: 'array', items: { type: 'string' } },
    },
    required: ['dimension', 'score', 'violations'],
  };

  const REPORT_SCHEMA = {
    type: 'object',
    properties: {
      overallScore: { type: 'number' },
      summary: { type: 'string' },
      dimensionScores: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            dimension: { type: 'string' },
            score: { type: 'number' },
            topIssue: { type: 'string' },
          },
          required: ['dimension', 'score', 'topIssue'],
        },
      },
      topFixes: { type: 'array', items: { type: 'string' } },
      tokenizationGaps: { type: 'array', items: { type: 'string' } },
    },
    required: ['overallScore', 'summary', 'dimensionScores', 'topFixes'],
  };

  const target = args || 'current codebase (run from repo root)';

  phase('Inventory');
  log(`Design system audit target: ${target}`);
  const inventory = await agent(
    `Inventory the design system foundations of: "${target}". Identify: (1) styling approach (CSS modules, Tailwind, styled-components, CSS-in-JS, etc.), (2) design token files (variables, theme files, constants), (3) component files (UI components, primitives), (4) which design system library is used if any (shadcn, MUI, Chakra, etc.).`,
    { schema: INVENTORY_SCHEMA, label: 'inventory' }
  );
  if (!inventory) { log('Warning: agent returned null for inventory, skipping'); return { target, error: 'agent-null' }; }
  log(`Styling: ${inventory.stylingApproach}, ${inventory.componentFiles.length} component files`);

  phase('Audit');
  const ctx = `Styling: ${inventory.stylingApproach}. Design system: ${inventory.designSystem || 'custom'}. Token files: ${(inventory.tokenFiles || []).join(', ')}`;

  const DIMENSIONS = [
    { label: 'spacing', prompt: `Audit SPACING CONSISTENCY in: "${target}". ${ctx}. Check: Are spacing values taken from a defined scale (4px/8px/16px etc.)? Are there magic numbers (arbitrary pixel values)? Is padding/margin/gap consistent for similar components? Are layout spacings reusing tokens? Score 0-100 (100=perfectly consistent) and list all violations with fixes.` },
    { label: 'color', prompt: `Audit COLOR USAGE in: "${target}". ${ctx}. Check: Are colors from the defined palette/tokens only? Are there hardcoded hex values that bypass tokens? Is color used for meaning (red=error, green=success) consistently? Are brand colors consistent? Score 0-100 and list all violations.` },
    { label: 'typography', prompt: `Audit TYPOGRAPHY SCALE in: "${target}". ${ctx}. Check: Are font sizes from a defined type scale? Are font weights consistent for similar hierarchy levels? Are line-heights defined? Is the heading hierarchy (h1>h2>h3) visually consistent? Score 0-100 and list violations.` },
    { label: 'icons', prompt: `Audit ICON CONSISTENCY in: "${target}". ${ctx}. Check: Is a single icon library used consistently? Are icon sizes consistent for the same context (nav icons vs inline icons)? Are icon meanings consistent (same icon for same action everywhere)? Are there mixed icon styles (outline vs filled)? Score 0-100 and list violations.` },
    { label: 'accessibility', prompt: `Audit ACCESSIBILITY in the design system of: "${target}". ${ctx}. Check: Do color combinations meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large)? Are interactive elements at least 44x44px touch targets? Are focus states visible? Are disabled states visually distinct? Score 0-100 and list violations.` },
  ];

  const auditResults = await parallel(
    DIMENSIONS.map(d => () => agent(d.prompt, { schema: DIM_SCHEMA, label: `audit:${d.label}`, phase: 'Audit' }))
  );

  phase('Score');
  const validAudits = auditResults.filter(Boolean);
  const avgScore = validAudits.length > 0
    ? Math.round(validAudits.reduce((sum, a) => sum + (a.score || 0), 0) / validAudits.length)
    : 0;
  log(`Dimension scores: ${validAudits.map(a => `${a.dimension}=${a.score}`).join(', ')} | Overall: ${avgScore}`);

  phase('Report');
  const dimSummary = validAudits.map(a => `${a.dimension}: ${a.score}/100, top issue: ${(a.violations[0] || {}).description || 'none'}`).join('\n');
  const allViolations = validAudits.flatMap(a => a.violations.map(v => `[${a.dimension}/${v.severity}] ${v.description}`)).slice(0, 15).join('\n');

  const report = await agent(
    `Generate a design system health report for: "${target}"\n\nDimension scores:\n${dimSummary}\n\nTop violations:\n${allViolations}\n\nOverall consistency score: ${avgScore}/100\n\nProvide: executive summary, dimension score table with top issue each, top 5 priority fixes, and which values should be tokenized but aren't.`,
    { schema: REPORT_SCHEMA, label: 'report' }
  );
  if (!report) { return { target, inventory, audits: validAudits, error: 'report-agent-null' }; }

  return { target, inventory, audits: validAudits, report };
}
