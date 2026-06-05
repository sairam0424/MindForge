// MCP server smoke test — proves the bundled server runs with ZERO runtime node_modules.
// Usage: node mcp-server/smoke.mjs <path-to-dist/index.js> <projectRoot>
// Spawns the server with NODE_PATH pointed at a nonexistent dir (the clean-install
// condition that the lazy-install build failed under) and asserts tools/list returns 7 tools.
import { spawn } from 'node:child_process';

const [entry, projectRoot] = process.argv.slice(2);
const srv = spawn('node', [entry], {
  env: { PATH: process.env.PATH, NODE_PATH: '/nonexistent', CLAUDE_PROJECT_DIR: projectRoot },
  stdio: ['pipe', 'pipe', 'pipe'],
});

let out = '';
let err = '';
srv.stdout.on('data', (d) => { out += d; });
srv.stderr.on('data', (d) => { err += d; });

const req = (obj) => srv.stdin.write(JSON.stringify(obj) + '\n');
req({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '1' } } });
req({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });

setTimeout(() => {
  srv.kill();
  const lines = out.trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const list = lines.find((l) => l.id === 2);
  if (list && list.result && Array.isArray(list.result.tools)) {
    const names = list.result.tools.map((t) => t.name);
    console.log(`OK tools(${names.length}): ${names.join(', ')}`);
    process.exit(names.length === 7 ? 0 : 1);
  }
  console.log('FAIL — no tools/list result. stderr:', err.slice(0, 500));
  process.exit(1);
}, 1500);
