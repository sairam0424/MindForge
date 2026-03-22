/**
 * MindForge v2 — Visual Verify Executor
 * Parses <verify-visual> blocks and runs them against the daemon.
 */
'use strict';

const fs          = require('fs');
const path        = require('path');
const DaemonMgr   = require('./daemon-manager');
const ScreenStore = require('./screenshot-store');

const DEV_SERVER  = process.env.DEV_SERVER_URL || 'http://localhost:3000';

function extractBlock(planContent) {
  const m = planContent.match(/<verify-visual([^>]*)>([\s\S]*?)<\/verify-visual>/);
  if (!m) return null;
  const sessionM = m[1].match(/session\s*=\s*["']([^"']+)["']/);
  return { content: m[2].trim(), session: sessionM?.[1] ?? 'default' };
}

function parseDirectives(content) {
  return content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(line => {
    const colon = line.indexOf(':');
    if (colon === -1) return null;
    const directive = line.slice(0, colon).trim();
    const rawArgs   = line.slice(colon + 1).trim();
    const args = [];
    const re   = /"([^"]*)"|\S+/g;
    let m;
    while ((m = re.exec(rawArgs)) !== null) args.push(m[1] !== undefined ? m[1] : m[0]);
    return { directive, args };
  }).filter(Boolean);
}

async function executeBlock(phaseNum, planId, planContent) {
  const block = extractBlock(planContent);
  if (!block) return { passed: true, steps: [], skipped: true };

  await DaemonMgr.ensureRunning();
  const directives = parseDirectives(block.content);
  const steps = [];
  const screenshots = [];
  let passed = true;

  for (const { directive, args } of directives) {
    const step = { directive: `${directive}: ${args.join(' ')}`, status: 'pass', detail: '' };
    try {
      let r;
      switch (directive) {
        case 'navigate':
          r = await DaemonMgr.request('POST', '/navigate', { url: args[0].startsWith('http') ? args[0] : `${DEV_SERVER}${args[0]}`, session: block.session });
          step.detail = `${r.status_code} OK`;
          break;
        case 'wait':
          await new Promise(res => setTimeout(res, parseInt(args[0]) || 500));
          break;
        case 'assert-visible':
          r = await DaemonMgr.request('POST', '/assert', { type: 'visible', selector: args[0], expected_text: args[1], session: block.session });
          if (!r.passed) { step.status = 'fail'; passed = false; }
          break;
        case 'screenshot':
          r = await DaemonMgr.request('POST', '/screenshot', { session: block.session });
          if (r.success) screenshots.push(ScreenStore.save(r.screenshot_b64, phaseNum, planId, args[0]));
          break;
        case 'click':
          r = await DaemonMgr.request('POST', '/click', { selector: args[0], session: block.session });
          if (!r.success) { step.status = 'fail'; passed = false; }
          break;
      }
    } catch (err) {
      step.status = 'fail'; step.detail = err.message; passed = false;
    }
    steps.push(step);
    if (!passed) break;
  }
  return { passed, steps, screenshots, session: block.session };
}

function writeReport(phaseNum, planId, result) {
  const dir = path.join(process.cwd(), '.planning', 'phases', String(phaseNum));
  fs.mkdirSync(dir, { recursive: true });
  const content = `# Visual Verify Result\nStatus: ${result.passed ? '✅ PASS' : '❌ FAIL'}\n\n` +
    result.steps.map(s => `- ${s.directive} [${s.status}] ${s.detail}`).join('\n');
  const file = path.join(dir, `VISUAL-VERIFY-${phaseNum}-${planId}.md`);
  fs.writeFileSync(file, content);
  return file;
}

module.exports = { executeBlock, writeReport };
