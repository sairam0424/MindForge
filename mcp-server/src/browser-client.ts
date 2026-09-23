/**
 * MindForge MCP Server — Browser Daemon Client.
 *
 * Thin proxy to the already-running MindForge browser daemon (bin/browser/browser-daemon.js,
 * ADR-024). Zero new dependencies — Node built-ins only, consistent with mcp-server's
 * self-contained esbuild bundle (mcp-server/build.mjs). This module NEVER spawns the daemon:
 * that would require bin/browser/daemon-manager.js's spawn logic (which resolves paths via
 * __dirname relative to bin/browser/, incompatible with this package's single-file bundle)
 * and would assume a full `npx mindforge-cc` install exists at CLAUDE_PROJECT_DIR, which the
 * other 7 tools in this server deliberately never assume. Start the daemon with
 * `/mindforge:browse --start` first.
 */
'use strict';

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const BROWSER_PORT = Number(process.env.BROWSER_PORT) || 7338;

function readDaemonToken(projectRoot: string): string | null {
  const tokenPath = path.join(projectRoot, '.mindforge', '.browser-daemon-token');
  try {
    return fs.readFileSync(tokenPath, 'utf8').trim();
  } catch {
    return null;
  }
}

export function browserRequest(
  projectRoot: string,
  method: string,
  endpoint: string,
  body: Record<string, unknown> | null = null
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const token = readDaemonToken(projectRoot);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = http.request(
      { hostname: '127.0.0.1', port: BROWSER_PORT, path: endpoint, method, headers },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve({ success: false, error: 'Invalid JSON response' }); }
        });
      }
    );
    req.setTimeout(10000, () => req.destroy(new Error('Browser daemon request timed out')));
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function isDaemonRunning(projectRoot: string): Promise<boolean> {
  try {
    const result = await browserRequest(projectRoot, 'GET', '/status');
    return result.alive === true;
  } catch {
    return false;
  }
}

const DAEMON_NOT_RUNNING_HINT =
  'The MindForge browser daemon is not running. Start it first with `/mindforge:browse --start` ' +
  '(requires a full `npx mindforge-cc@latest --claude --local` install in this project — this MCP ' +
  'tool never spawns the daemon itself).';

export async function ensureDaemonRunning(projectRoot: string): Promise<void> {
  if (!(await isDaemonRunning(projectRoot))) {
    throw new Error(DAEMON_NOT_RUNNING_HINT);
  }
}
