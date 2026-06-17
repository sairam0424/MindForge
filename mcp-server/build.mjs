// MindForge MCP server — single-file bundle build.
// Bundles the server + ALL runtime deps (@modelcontextprotocol/sdk, zod, and their
// transitive tree) into one self-contained dist/index.js, so the installed plugin needs
// NO node_modules at runtime. This is what makes the MCP server work on a clean install /
// first session / offline — the earlier lazy-npm-install-into-CLAUDE_PLUGIN_DATA pattern
// failed because Claude Code auto-starts the stdio server before any install could run.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'dist/index.js',
  // Single shebang via esbuild banner ONLY (the source file has none). This makes the
  // standalone npm `bin` (mindforge-mcp / npx mindforge-mcp) directly executable, while the
  // plugin path (`node dist/index.js`, per .mcp.json) is unaffected — Node ignores the
  // shebang line. Never add a source-level shebang too: two shebangs => the second parses
  // as code (SyntaxError), which is the failure this comment originally guarded against.
  banner: { js: '#!/usr/bin/env node' },
  // Node built-ins are external by default on platform:node; nothing else is external,
  // so the two deps + their tree are inlined into the single output file.
  logLevel: 'info',
});
console.log('Bundled mcp-server -> dist/index.js (self-contained, no runtime node_modules)');
