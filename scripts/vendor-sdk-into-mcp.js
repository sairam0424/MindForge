#!/usr/bin/env node
/**
 * MindForge — vendor the SDK source into the MCP server.
 *
 * The MCP server (mcp-server/) WRAPS the MindForge SDK (MindForgeMemory + MindForgeClient)
 * rather than reimplementing it. The SDK has zero runtime npm dependencies (only Node
 * built-ins), so we vendor its TypeScript source into mcp-server/src/vendor/ and compile
 * it together with the server. This keeps the bundled plugin fully self-contained and
 * offline (no `npm install mindforge-sdk` at plugin-install time) and deterministic.
 *
 * Single source of truth: edit sdk/src/*, then re-run this script. Never hand-edit
 * mcp-server/src/vendor/ (it is generated). A header banner marks each vendored file.
 *
 * The vendored closure is the minimal set MindForgeClient + MindForgeMemory import:
 *   client.ts -> events.ts, types.ts ; memory.ts (standalone)
 *
 * Run: node scripts/vendor-sdk-into-mcp.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SDK_SRC = path.join(ROOT, 'sdk', 'src');
const VENDOR = path.join(ROOT, 'mcp-server', 'src', 'vendor');

// Files MindForgeClient + MindForgeMemory need (their import closure).
const FILES = ['types.ts', 'events.ts', 'client.ts', 'memory.ts'];

const BANNER =
  '/* eslint-disable */\n' +
  '// @generated — VENDORED from sdk/src by scripts/vendor-sdk-into-mcp.js. DO NOT EDIT.\n' +
  '// Edit the canonical file under sdk/src and re-run the vendoring script.\n\n';

function vendor() {
  fs.mkdirSync(VENDOR, { recursive: true });
  let n = 0;
  for (const f of FILES) {
    const src = path.join(SDK_SRC, f);
    if (!fs.existsSync(src)) {
      console.error(`  ⚠️  missing SDK source: ${f} — skipped`);
      continue;
    }
    fs.writeFileSync(path.join(VENDOR, f), BANNER + fs.readFileSync(src, 'utf8'), 'utf8');
    n++;
    console.log(`  vendored: sdk/src/${f} -> mcp-server/src/vendor/${f}`);
  }
  console.log(`Vendored ${n} SDK file(s) into the MCP server.`);
  return n;
}

// Behind a require.main guard so importing this module does not overwrite four tracked files as an
// import side effect. scripts/build-mindforge-plugin.js had the same shape and a bare require() of it
// wiped 526 tracked files; this one silently re-vendors, which is quieter and just as wrong. A test
// that wants to read FILES or BANNER must be able to do so without mutating the tree it is auditing.
if (require.main === module) {
  vendor();
}

module.exports = { vendor, FILES, BANNER };
