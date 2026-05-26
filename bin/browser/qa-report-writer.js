/**
 * MindForge v2 — QA Report Writer
 */
'use strict';

const fs    = require('fs');
const path  = require('path');

function write(phaseNum, qaResult) {
  const dir = path.join(process.cwd(), '.planning', 'phases', String(phaseNum));
  fs.mkdirSync(dir, { recursive: true });

  const lines = [
    `# QA Report — Phase ${phaseNum}`,
    `Generated: ${new Date().toISOString()}`,
    `Total: ${qaResult.surfaces} | Passed: ${qaResult.passed} | Failed: ${qaResult.failed}`,
    '',
    '## Results',
    '| Surface | Result |',
    '|---|---|',
    ...qaResult.results.map(r => `| ${r.surface} | ${r.passed ? '✅ Pass' : '❌ Fail'} |`),
    '',
    '## Bugs found',
    ...qaResult.bugs.map((b, i) => `### Bug ${i + 1}: ${b.surface}\n- Error: ${b.error}\n- Screenshot: ${b.screenshot}\n`)
  ];

  const file = path.join(dir, `QA-REPORT-${phaseNum}.md`);
  fs.writeFileSync(file, lines.join('\n'));
  return file;
}

module.exports = { write };
