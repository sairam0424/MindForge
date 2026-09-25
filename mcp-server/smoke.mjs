// MCP server smoke test — proves the bundled server runs with ZERO runtime node_modules.
// Usage: node mcp-server/smoke.mjs <path-to-dist/index.js> <projectRoot>
// Spawns the server with NODE_PATH pointed at a nonexistent dir (the clean-install
// condition that the lazy-install build failed under) and asserts tools/list returns 8
// tools, prompts/list includes the project-health-briefing prompt, and
// mindforge_memory_remember declines safely (isError, not a silent write) when the
// calling client hasn't advertised elicitation support.
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
req({ jsonrpc: '2.0', id: 3, method: 'prompts/list', params: {} });
// Schema-valid args (type must be one of KNOWLEDGE_TYPES; topic is required) — this
// isolates the assertion below to the elicitation gate itself, not incidental input
// validation, which the bare test client has no way to distinguish from a real decline.
req({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'mindforge_memory_remember', arguments: { content: 'smoke-test-entry', type: 'domain_knowledge', topic: 'smoke-test' } } });

setTimeout(() => {
  srv.kill();
  const lines = out.trim().split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const toolsList = lines.find((l) => l.id === 2);
  const promptsList = lines.find((l) => l.id === 3);
  const rememberCall = lines.find((l) => l.id === 4);
  const toolNames = toolsList?.result?.tools?.map((t) => t.name) ?? [];
  const promptNames = promptsList?.result?.prompts?.map((p) => p.name) ?? [];
  console.log(`OK tools(${toolNames.length}): ${toolNames.join(', ')}`);
  console.log(`OK prompts(${promptNames.length}): ${promptNames.join(', ')}`);
  const toolsOk = toolNames.length === 8;
  const promptsOk = promptNames.includes('project-health-briefing');
  // Without elicitation support advertised by this bare test client, the server
  // must decline gracefully (isError, not a crash, not a silent unconfirmed write).
  const rememberDeclinedSafely = rememberCall?.result?.isError === true;
  console.log(`OK remember-without-elicitation-declines-safely: ${rememberDeclinedSafely}`);
  if (!toolsOk || !promptsOk || !rememberDeclinedSafely) {
    console.log('FAIL — stderr:', err.slice(0, 500));
  }
  process.exit(toolsOk && promptsOk && rememberDeclinedSafely ? 0 : 1);
}, 1500);
