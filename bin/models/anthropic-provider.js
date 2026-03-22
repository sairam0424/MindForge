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
      system: systemPrompt,
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
            
            // Basic cost calculation (Sonnet 3.5 prices)
            const cost = (inputTokens * 0.000003) + (outputTokens * 0.000015);

            resolve({
              model: json.model,
              content: json.content[0].text,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
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
}

module.exports = AnthropicProvider;
