'use strict';
const fs = require('fs');
module.exports = {
  fromVersion: '0.5.0',
  toVersion:   '0.6.0',
  description: 'Add developer_id, session_id, recent_commits, recent_files to HANDOFF.json',
  async run(paths) {
    if (!fs.existsSync(paths.handoff)) return;
    const handoff = JSON.parse(fs.readFileSync(paths.handoff, 'utf8'));
    if (!handoff.developer_id)   handoff.developer_id   = null;
    if (!handoff.session_id)     handoff.session_id     = null;
    if (!Array.isArray(handoff.recent_commits)) handoff.recent_commits = [];
    if (!Array.isArray(handoff.recent_files))   handoff.recent_files   = [];
    fs.writeFileSync(paths.handoff, JSON.stringify(handoff, null, 2) + '\n');
    console.log('    • HANDOFF.json: added distribution platform fields');
  },
};
