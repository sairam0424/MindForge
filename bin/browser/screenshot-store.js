/**
 * MindForge v2 — Screenshot Store
 * Saves / lists / cleans up browser screenshots.
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const STORE = path.join(process.cwd(), '.planning', 'screenshots');
const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

function save(base64Png, phaseNum, planId, filename = 'screenshot.png') {
  const dir = path.join(STORE, `phase-${phaseNum}`, String(planId));
  ensureDir(dir);
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/\.png$/i, '') + '.png';
  const dest = path.join(dir, safe);
  fs.writeFileSync(dest, Buffer.from(base64Png, 'base64'));
  return dest;
}

function list(phaseNum, planId) {
  const dir = planId
    ? path.join(STORE, `phase-${phaseNum}`, String(planId))
    : path.join(STORE, `phase-${phaseNum}`);
  if (!fs.existsSync(dir)) return [];
  const walk = d => fs.readdirSync(d, { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : path.join(d, e.name))
    .filter(p => p.endsWith('.png'));
  return walk(dir);
}

function cleanup(phaseNum) {
  const dir = path.join(STORE, `phase-${phaseNum}`);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function diskUsage() {
  if (!fs.existsSync(STORE)) return 0;
  let total = 0;
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p) : (total += fs.statSync(p).size);
  }};
  walk(STORE);
  return total;
}

module.exports = { save, list, cleanup, diskUsage };
