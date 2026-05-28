/**
 * MindForge v2 — Gemini Provider
 * Using header-based auth for security.
 */
'use strict';

const https = require('https');

class GeminiProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async complete(params) {
    const { model, systemPrompt, userMessage, maxTokens = 8192, temperature = 0.2 } = params;

    const data = JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    });

    const modelId = model.startsWith('models/') ? model : `models/${model}`;

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/${modelId}:generateContent`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey, // Header auth
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 180_000,
      }, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (res.statusCode !== 200) {
              return reject(Object.assign(new Error(json.error?.message || 'Gemini API error'), { status: res.statusCode }));
            }

            // Gemini 1.5 Pro billing is complex; using $1.25 / 1M input as baseline
            const inputTokens = json.usageMetadata.promptTokenCount;
            const outputTokens = json.usageMetadata.candidatesTokenCount;
            const cost = (inputTokens * 0.00000125) + (outputTokens * 0.00000375);

            resolve({
              model: modelId,
              content: json.candidates[0].content.parts[0].text,
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              cost_usd: cost,
              provider: 'google'
            });
          } catch (e) {
            reject(new Error('Failed to parse Gemini response: ' + e.message));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(Object.assign(new Error('Gemini timeout'), { status: 408 }));
      });
      req.write(data);
      req.end();
    });
  }

  async streamComplete(messages, options = {}) {
    const model = options.model || 'gemini-2.5-pro';
    const maxTokens = options.maxTokens || 8192;

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const data = JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
      },
    });

    const modelId = model.startsWith('models/') ? model : `models/${model}`;

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/${modelId}:streamGenerateContent?alt=sse`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 300_000,
      }, res => {
        if (res.statusCode !== 200) {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            reject(new Error(`Gemini streaming failed: ${res.statusCode}`));
          });
          return;
        }
        resolve(res);
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Gemini stream timeout'));
      });
      req.write(data);
      req.end();
    });
  }
}

module.exports = GeminiProvider;
