/**
 * MindForge v2 — OpenAI-compatible Provider
 *
 * Wave 3 (3.6): parameterized for an arbitrary OpenAI-compatible base URL, so a
 * single class backs OpenAI + Azure OpenAI + Together / Groq / OpenRouter / vLLM.
 * baseUrl/apiKeyEnv are driven from an optional `base_url` field per model in
 * revops.market_registry; default stays api.openai.com so existing behavior is
 * unchanged. Errors are classified via the typed llm-errors taxonomy.
 */
'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { classifyError } = require('./llm-errors');

class OpenAIProvider {
  /**
   * @param {string} apiKey
   * @param {object} [opts]
   * @param {string} [opts.baseUrl] e.g. "https://api.groq.com/openai/v1". Defaults
   *   to OpenAI. Accepts with or without a trailing /v1.
   */
  constructor(apiKey, opts = {}) {
    this.apiKey = apiKey;
    this.baseUrl = opts.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  _endpoint(pathSuffix) {
    const base = this.baseUrl.replace(/\/+$/, '');
    // Allow base with or without /v1; chat path is appended after the base.
    const full = /\/v\d+$/.test(base) ? `${base}${pathSuffix}` : `${base}/v1${pathSuffix}`;
    return new URL(full);
  }

  async complete(params) {
    const { model, systemPrompt, userMessage, maxTokens = 4096, temperature = 0.7 } = params;

    const data = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: maxTokens,
      temperature,
    });

    const url = this._endpoint('/chat/completions');
    const transport = url.protocol === 'http:' ? http : https;

    return new Promise((resolve, reject) => {
      const req = transport.request({
        hostname: url.hostname,
        port: url.port || undefined,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
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
              return reject(classifyError(json.error?.message || 'OpenAI API error', { provider: 'openai', status: res.statusCode }));
            }

            const inputTokens = json.usage.prompt_tokens;
            const outputTokens = json.usage.completion_tokens;

            const { priceCall } = require('./pricing-registry');
            const cost = priceCall(json.model, {
              input_tokens: inputTokens,
              output_tokens: outputTokens,
            });

            resolve({
              model: json.model,
              content: json.choices[0].message.content,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              cost_usd: cost,
              provider: 'openai'
            });
          } catch (e) {
            reject(new Error('Failed to parse OpenAI response: ' + e.message));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(Object.assign(new Error('OpenAI timeout'), { status: 408 }));
      });
      req.write(data);
      req.end();
    });
  }

  async streamComplete(messages, options = {}) {
    const model = options.model || 'gpt-4o';
    const maxTokens = options.maxTokens || 4096;

    const data = JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      stream: true,
    });

    const url = this._endpoint('/chat/completions');
    const transport = url.protocol === 'http:' ? http : https;

    return new Promise((resolve, reject) => {
      const req = transport.request({
        hostname: url.hostname,
        port: url.port || undefined,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 300_000,
      }, res => {
        if (res.statusCode !== 200) {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            reject(new Error(`OpenAI streaming failed: ${res.statusCode}`));
          });
          return;
        }
        resolve(res);
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('OpenAI stream timeout'));
      });
      req.write(data);
      req.end();
    });
  }
}

module.exports = OpenAIProvider;
