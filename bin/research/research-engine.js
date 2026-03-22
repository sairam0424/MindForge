/**
 * MindForge v2 — Research Engine
 * Leverages Gemini 1M context for deep research.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const dns = require('dns').promises;
const ModelClient = require('../models/model-client');
const Router = require('../models/model-router');

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

const SYSTEM_PROMPTS = {
  general: `You are a thorough technical researcher. Analyze the provided context deeply and answer the question comprehensively. Cite specific evidence.`,
  library_comparison: `You are a senior engineer evaluating libraries. Analyze: API design, maintenance, performance, security, and community.`,
  codebase_analysis: `You are a senior architect auditing a codebase. Identify patterns, debt, security issues, and bottlenecks.`,
  compliance: `You are a compliance engineer reviewing implementation against regulations. Identify gaps and remediation steps.`,
};

async function isSafeUrl(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const { address } = await dns.lookup(parsed.hostname);
    return !PRIVATE_RANGES.some(r => r.test(address));
  } catch {
    return false;
  }
}

async function fetchUrl(url) {
  if (!await isSafeUrl(url)) throw new Error(`URL blocked: ${url}`);
  
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => { req.destroy(); reject(new Error('Timeout')); }, 30_000);

    const req = protocol.get(url, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { clearTimeout(timeout); resolve(body.slice(0, 500_000)); });
    });
    req.on('error', e => { clearTimeout(timeout); reject(e); });
  });
}

function packageLocalContext(paths) {
  let content = '';
  for (const p of paths) {
    const fullPath = path.resolve(process.cwd(), p);
    if (!fs.existsSync(fullPath)) continue;
    
    if (fs.statSync(fullPath).isDirectory()) {
      content += walkDir(fullPath);
    } else {
      content += `\n\n### File: ${p}\n${fs.readFileSync(fullPath, 'utf8')}\n`;
    }
  }
  return content;
}

function walkDir(dir) {
  let content = '';
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (f.startsWith('.') || f === 'node_modules') continue;
    if (fs.statSync(full).isDirectory()) content += walkDir(full);
    else if (['.js', '.ts', '.md', '.json'].some(ext => f.endsWith(ext))) {
      content += `\n\n### File: ${full}\n${fs.readFileSync(full, 'utf8')}\n`;
    }
  }
  return content;
}

async function research(params) {
  const { topic, question, type = 'general', contextPaths = [], urls = [] } = params;
  
  let context = packageLocalContext(contextPaths);
  for (const url of urls) {
    try {
      const html = await fetchUrl(url);
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      context += `\n\n### URL: ${url}\n${text.slice(0, 100_000)}`;
    } catch (e) {
      context += `\n\n### URL: ${url}\n[Failed to fetch: ${e.message}]`;
    }
  }

  const result = await ModelClient.complete({
    persona: 'research-agent',
    systemPrompt: SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.general,
    userMessage: `Topic: ${topic}\n\nContext:\n${context}\n\nQuestion: ${question}`,
    taskName: `research-${topic}`,
    maxTokens: 8192
  });

  return { ...result, context_length: context.length };
}

module.exports = { research, packageLocalContext, fetchUrl };
