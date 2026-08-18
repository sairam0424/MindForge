#!/usr/bin/env node
'use strict';
/**
 * Audit what a CONSUMER actually gets, not what the maintainer's checkout has.
 *
 * THE DEFECT THIS CLOSES. `npm run harness:gate` runs
 *
 *     node bin/harness-audit.js --min-score 76 --fail-on-findings
 *
 * with no --root, so it audits the cwd — the MindForge source checkout. That checkout has
 * .claude/settings.json (2516 B) and .agent/settings.json (1963 B) hand-maintained in git, and
 * bin/harness-audit.js:426-431 requires trust-gate wired into BOTH with command paths that resolve
 * from the audited root. So the gate asks for exactly the wiring the installer never produces, and
 * then asks the one directory where that wiring exists.
 *
 * Measured, same tree, same rubric:
 *
 *     repo checkout              76/76   exit 0
 *     fresh --claude --local     36/76   Security Guardrails 1/10, 17 of 31 checks failing
 *
 * Neither settings file is in package.json `files`, so a consumer receives neither. The gate was
 * real, wired into CI, and passing — while validating the only artifact that could pass. That is why
 * a production dry run found 15 open critical findings behind a green pipeline.
 *
 * FLOOR HISTORY, so a rubric correction is never mistaken for an enforcement gain:
 *   36  initial, measured against the pre-fix rubric
 *   41  after the layout fix to bin/harness-audit.js. NOT an enforcement improvement — five
 *       checks had hardcoded the source-repo layout (.agent/hooks/, bin/), so an install failed
 *       checks whose files it already contained. +3 context-monitor-hook, +2
 *       security-block-no-verify. The repo score stayed 76/76 across that change, which is what
 *       makes the +5 attributable to the correction rather than to a loosened rubric — pinned by
 *       tests/harness-audit-layout.test.js.
 *
 * WHY THE FLOOR IS NOT 76. Setting it to 76 today would turn every unrelated PR red until
 * REG-01 (installer-side hook registration) lands, which buys nothing and trains people to ignore
 * the check. 36 is the measured current reality, so this is a RATCHET: the shipped score can never
 * silently drop, and the number in CI is finally the consumer's number rather than the maintainer's.
 * Raise INSTALL_SCORE_FLOOR as fixes land — tests/harness-gate-install.test.js asserts the floor
 * matches what a real install actually scores, so a stale floor fails rather than rotting.
 *
 * Deliberately NOT passing --fail-on-findings: 17 checks fail today, all of them known and recorded.
 * A blanket findings gate here would be an unsatisfiable threshold, which bin/harness-audit.js
 * itself treats as a failure worth naming rather than a red check nobody can act on.
 *
 * HOME is confined to the scratch project. bin/installer-core.js:253 resolves its project registry
 * through os.homedir(), so an unconfined install appends to the developer's real
 * ~/.mindforge/registry.json — measured once at 237 junk entries out of 245. See
 * tests/no-home-leak.test.js.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

/** Raise this as installer-side registration lands. Pinned by tests/harness-gate-install.test.js. */
const INSTALL_SCORE_FLOOR = 41;

const REPO_ROOT = fs.realpathSync(path.join(__dirname, '..', '..'));
const AUDIT = path.join(REPO_ROOT, 'bin', 'harness-audit.js');
const INSTALLER = path.join(REPO_ROOT, 'bin', 'install.js');

function main() {
  const scratch = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'mf-gate-install-')));
  const project = path.join(scratch, 'project');
  const home = path.join(scratch, 'home');
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(project, 'package.json'),
    JSON.stringify({ name: 'harness-gate-probe', version: '1.0.0' }, null, 2));

  try {
    const install = spawnSync(process.execPath, [INSTALLER, '--claude', '--local'], {
      cwd: project,
      encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: home, CI: '1' },
    });
    if (install.status !== 0) {
      console.error('❌ harness gate (install root): the installer itself failed, so the audit would ' +
        'measure an incomplete tree.');
      console.error((install.stderr || install.stdout || '').slice(0, 800));
      return 1;
    }

    const audit = spawnSync(process.execPath,
      [AUDIT, '--root', project, '--min-score', String(INSTALL_SCORE_FLOOR)],
      { cwd: REPO_ROOT, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home } });

    // Print the audit verbatim — the whole point is that CI shows the CONSUMER's score.
    process.stdout.write(audit.stdout || '');
    if (audit.stderr) process.stderr.write(audit.stderr);

    if (audit.status !== 0) {
      console.error('');
      console.error(`❌ harness gate (install root): below the ratchet floor of ${INSTALL_SCORE_FLOOR}/76.`);
      console.error('   A real install scores WORSE than the last measured baseline. Something that a');
      console.error('   consumer receives got worse — this is not the repo checkout, so a green');
      console.error('   `npm run harness:gate` does not contradict it.');
      return 1;
    }

    console.log('');
    console.log(`✅ harness gate (install root): at or above the ratchet floor of ${INSTALL_SCORE_FLOOR}/76.`);
    console.log('   NOTE: this floor is far below the repo\'s 76/76 because no install channel');
    console.log('   registers any hook. That gap is the finding, not a passing grade — raise');
    console.log('   INSTALL_SCORE_FLOOR in this file as installer-side registration lands.');
    return 0;
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { INSTALL_SCORE_FLOOR, main };
