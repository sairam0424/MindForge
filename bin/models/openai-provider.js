/**
 * MindForge v2 — OpenAI Provider
 */
'use strict';

const https = require('https');

class OpenAIProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
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

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
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
              return reject(Object.assign(new Error(json.error?.message || 'OpenAI API error'), { status: res.statusCode }));
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

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
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
