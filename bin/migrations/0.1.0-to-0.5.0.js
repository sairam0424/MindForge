// bin/migrations/0.1.0-to-0.5.0.js
//
// THE DEFECT this replaces: this file used to carry a SECOND module.exports assignment below this
// one, a near-duplicate of bin/migrations/0.5.0-to-0.6.0.js's own export. In CommonJS the second
// assignment silently wins, so require('./0.1.0-to-0.5.0') actually returned the 0.5.0->0.6.0
// migration object -- the real 0.1.0->0.5.0 fields below were dead code, never applied to any
// genuine 0.1.0 install upgrading through migrate.js's allMigrations(). Deleted the duplicate
// block entirely; this file now exports only its own migration.
'use strict';
const fs = require('fs');
module.exports = {
  fromVersion: '0.1.0',
  toVersion:   '0.5.0',
  description: 'Add decisions_made, discoveries, implicit_knowledge, quality_signals to HANDOFF.json',
  async run(paths) {
    if (!fs.existsSync(paths.handoff)) return;
    const handoff = JSON.parse(fs.readFileSync(paths.handoff, 'utf8'));
    if (!handoff.decisions_made)     handoff.decisions_made     = [];
    if (!handoff.discoveries)        handoff.discoveries        = [];
    if (!handoff.implicit_knowledge) handoff.implicit_knowledge = [];
    if (!handoff.quality_signals)    handoff.quality_signals    = [];
    fs.writeFileSync(paths.handoff, JSON.stringify(handoff, null, 2) + '\n');
    console.log('    • HANDOFF.json: added intelligence layer fields');
  },
};
