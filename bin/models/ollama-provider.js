/**
 * MindForge — Ollama / local-model Provider
 *
 * Adapted from ECC (src/llm/providers/ollama.py). Talks to a local Ollama
 * server (default http://localhost:11434) so the sovereign `llama-3-70b-local`
 * entry in revops.market_registry is actually reachable — previously a dead
 * link the MIR cost-arbitrage math could pick but never execute.
 *
 * Mirrors AnthropicProvider.complete() return shape so it drops into
 * model-client.js unchanged. GATED on OLLAMA_BASE_URL: model-client only
 * constructs this provider when OLLAMA_BASE_URL is set, so cloud routing is
 * unchanged unless the operator explicitly opts in.
 */
'use strict';

const http = require('http');
const { URL } = require('url');

class OllamaProvider {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  async complete(params) {
    const { model, systemPrompt, userMessage, temperature = 0.7 } = params;

    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userMessage });

    const payload = JSON.stringify({
      model,
      messages,
      stream: false,
      options: temperature !== 1.0 ? { temperature } : undefined,
    });

    const url = new URL('/api/chat', this.baseUrl);

    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: url.hostname,
        port: url.port || 11434,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 120_000,
      }, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              return reject(Object.assign(
                new Error(`Ollama API error (${res.statusCode})`),
                { status: res.statusCode }
              ));
            }
            const json = JSON.parse(body);
            const content = json.message?.content || '';

            // Ollama reports token counts as prompt_eval_count / eval_count.
            const inputTokens = json.prompt_eval_count || 0;
            const outputTokens = json.eval_count || 0;

            // Price via the registry id (e.g. llama-3-70b-local). Local models
            // are effectively free, but we still record for MIR/ROI accounting.
            let cost = 0;
            try {
              const { priceCall } = require('./pricing-registry');
              cost = priceCall(model, { input_tokens: inputTokens, output_tokens: outputTokens });
            } catch (_e) {
              cost = 0;
            }

            resolve({
              model,
              content,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              cost_usd: cost,
              provider: 'ollama',
            });
          } catch (e) {
            reject(new Error('Failed to parse Ollama response: ' + e.message));
          }
        });
      });

      req.on('error', err => {
        // Connection refused = local server not running. Surface as a clear,
        // retryable-by-fallback error rather than a cryptic ECONNREFUSED.
        reject(Object.assign(
          new Error(`Ollama connection failed (${this.baseUrl}): ${err.message}`),
          { status: 503 }
        ));
      });
      req.on('timeout', () => {
        req.destroy();
        reject(Object.assign(new Error('Ollama timeout'), { status: 408 }));
      });
      req.write(payload);
      req.end();
    });
  }

  validateConfig() {
    return Boolean(this.baseUrl);
  }
}

module.exports = OllamaProvider;
