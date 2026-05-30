/**
 * MindForge v2 — Anthropic Provider
 */
'use strict';

const https = require('https');

class AnthropicProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async complete(params) {
    const { model, systemPrompt, userMessage, maxTokens = 4096, temperature = 0.7 } = params;

    const data = JSON.stringify({
      model,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: maxTokens,
      temperature,
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 120_000,
      }, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (res.statusCode !== 200) {
              return reject(Object.assign(new Error(json.error?.message || 'Anthropic API error'), { status: res.statusCode }));
            }

            const inputTokens = json.usage.input_tokens;
            const outputTokens = json.usage.output_tokens;
            const cacheRead = json.usage.cache_read_input_tokens || 0;
            const cacheCreate = json.usage.cache_creation_input_tokens || 0;

            const { priceCall } = require('./pricing-registry');
            const cost = priceCall(json.model, {
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              cache_read_input_tokens: cacheRead,
              cache_creation_input_tokens: cacheCreate,
            });

            resolve({
              model: json.model,
              content: json.content[0].text,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              cache_read_input_tokens: cacheRead,
              cache_creation_input_tokens: cacheCreate,
              cost_usd: cost,
              provider: 'anthropic'
            });
          } catch (e) {
            reject(new Error('Failed to parse Anthropic response: ' + e.message));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(Object.assign(new Error('Anthropic timeout'), { status: 408 }));
      });
      req.write(data);
      req.end();
    });
  }

  async streamComplete(messages, options = {}) {
    const model = options.model || 'claude-sonnet-4-6';
    const maxTokens = options.maxTokens || 4096;

    const data = JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      stream: true,
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 300_000,
      }, res => {
        if (res.statusCode !== 200) {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            reject(new Error(`Anthropic streaming failed: ${res.statusCode}`));
          });
          return;
        }
        resolve(res);
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Anthropic stream timeout'));
      });
      req.write(data);
      req.end();
    });
  }
}

module.exports = AnthropicProvider;
