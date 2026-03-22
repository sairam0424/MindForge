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
            
            // Basic cost calculation (GPT-4o prices)
            const cost = (inputTokens * 0.000005) + (outputTokens * 0.000015);

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
}

module.exports = OpenAIProvider;
