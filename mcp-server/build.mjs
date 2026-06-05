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
  // No shebang: the server is always launched as `node dist/index.js` (per .mcp.json), so a
  // shebang is unnecessary. We intentionally omit both an esbuild banner AND a source shebang
  // — having both produced two shebang lines, and the second parsed as code (SyntaxError).
  // Node built-ins are external by default on platform:node; nothing else is external,
  // so the two deps + their tree are inlined into the single output file.
  logLevel: 'info',
});
console.log('Bundled mcp-server -> dist/index.js (self-contained, no runtime node_modules)');
