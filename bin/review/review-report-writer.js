/**
 * MindForge v2 — Review Report Writer
 */
'use strict';

const fs = require('fs');
const path = require('path');

function write(phaseNum, result) {
  const dir = path.join(process.cwd(), '.planning', 'phases', String(phaseNum));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const reportPath = path.join(dir, `CROSS-REVIEW-${phaseNum}.md`);

  let content = [
    `# Cross-Model Code Review — Phase ${phaseNum}`,
    `**Verdict:** ${result.synthesis.overall_verdict === 'APPROVE' ? '✅ APPROVE' : '❌ REQUEST_CHANGES'}`,
    `**Total Cost:** $${result.total_cost_usd.toFixed(4)}`,
    `**Models:** ${result.reviews.map(r => r.model).join(', ')}`,
    `**Date:** ${new Date(result.timestamp).toLocaleString()}`,
    '',
    '## Consensus Findings (High Confidence)',
    result.synthesis.consensus.length > 0
      ? result.synthesis.consensus.map(f => `- **[${f.severity}]** \`${f.location}\` — ${f.description} (Models: ${f.models.join(', ')})`).join('\n')
      : '_No consensus issues found._',
    '',
    '## Model-Specific Findings',
  ].join('\n');

  for (const model in result.synthesis.model_specific) {
    const findings = result.synthesis.model_specific[model];
    content += `\n### ${model}\n`;
    if (findings.length === 0) {
      content += '_No specific issues found._\n';
    } else {
      content += findings.map(f => `- **[${f.severity}]** \`${f.location}\` — ${f.description}`).join('\n') + '\n';
    }
  }

  content += '\n## Full Model Outputs\n';
  for (const review of result.reviews) {
    content += `\n### ${review.model} (${review.role})\n\n${review.content}\n\n---\n`;
  }

  fs.writeFileSync(reportPath, content);
  return reportPath;
}

module.exports = { write };
