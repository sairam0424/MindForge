'use strict';

const path = require('path');
const fs = require('fs');

function findProjectRoot(startDir = process.cwd()) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'MINDFORGE.md')) ||
        fs.existsSync(path.join(dir, '.mindforge'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

const PROJECT_ROOT = findProjectRoot();

module.exports = {
  PROJECT_ROOT,
  PLANNING_DIR: path.join(PROJECT_ROOT, '.planning'),
  MINDFORGE_DIR: path.join(PROJECT_ROOT, '.mindforge'),
  AUDIT_LOG: path.join(PROJECT_ROOT, '.planning', 'AUDIT.jsonl'),
  STATE_FILE: path.join(PROJECT_ROOT, '.planning', 'STATE.md'),
  HANDOFF_FILE: path.join(PROJECT_ROOT, '.planning', 'HANDOFF.json'),
  AUTO_STATE_FILE: path.join(PROJECT_ROOT, '.planning', 'auto-state.json'),
  CONFIG_FILE: path.join(PROJECT_ROOT, '.mindforge', 'config.json'),
  DB_PATH: path.join(PROJECT_ROOT, '.mindforge', 'celestial.db'),
  HISTORY_DIR: path.join(PROJECT_ROOT, '.mindforge', 'history'),
  METRICS_DIR: path.join(PROJECT_ROOT, '.mindforge', 'metrics'),
  resolve(...segments) { return path.join(PROJECT_ROOT, ...segments); }
};
