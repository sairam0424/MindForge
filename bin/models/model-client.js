/**
 * MindForge v2 — Model Client
 * Unified client with routing, fallbacks, and cost tracking.
 */
'use strict';

const Router = require('./model-router');
const CostTracker = require('./cost-tracker');
const AnthropicProvider = require('./anthropic-provider');
const OpenAIProvider = require('./openai-provider');
const GeminiProvider = require('./gemini-provider');
const OllamaProvider = require('./ollama-provider');

// v9: Fallback chains aligned to Claude 4.x family.
// llama-3-70b-local is the sovereign last-resort — only reachable when
// OLLAMA_BASE_URL is set (see _getProvider); otherwise _getProvider returns
// null and the chain skips it, leaving cloud routing unchanged.
const FALLBACK_CHAINS = {
  'claude-opus-4-7': ['claude-sonnet-4-6', 'gemini-2.5-pro'],
  'claude-sonnet-4-6': ['claude-haiku-4-5', 'gemini-2.5-pro', 'llama-3-70b-local'],
  'gemini-2.5-pro': ['claude-sonnet-4-6'],
};

class ModelClient {
  static async complete(params) {
    const {
      persona = 'developer',
      tier = 1,
      maxTokens,
      temperature,
      taskName = 'unknown',
      sessionId = 'unknown',
      phaseNum = 0
    } = params;

    // 1. Route to model
    const routing = Router.route(persona, tier);
    let modelId = routing.model;

    // 2. Pre-flight cost check
    try {
      await CostTracker.preflight(0.05); // Conservative estimate
    } catch (e) {
      if (e.code === 'COST_LIMIT_REACHED') throw e;
    }

    // 3. Execute with fallbacks
    let result = null;
    let attempts = [modelId, ...(FALLBACK_CHAINS[modelId] || [])];

    for (const currentModel of attempts) {
      try {
        const provider = this._getProvider(currentModel);
        if (!provider) continue;

        result = await provider.complete({
          model: currentModel,
          systemPrompt: params.systemPrompt,
          userMessage: params.userMessage,
          maxTokens,
          temperature
        });

        // Add metadata
        result.task_name = taskName;
        result.session_id = sessionId;
        result.phase = phaseNum;

        if (currentModel !== modelId) {
          result.content = `[FALLBACK NOTICE: ${modelId} unavailable — used ${currentModel} instead.]\n\n${result.content}`;
        }

        // 4. Record cost
        await CostTracker.record(result);
        return result;

      } catch (err) {
        const safeMsg = (err.message || '').replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-***').replace(/key-[a-zA-Z0-9_-]+/g, 'key-***');
        process.stderr.write(`[model-client] ${currentModel} failed: ${safeMsg}\n`);
        if (attempts.indexOf(currentModel) === attempts.length - 1) {
          const safeErr = new Error(safeMsg);
          safeErr.code = err.code;
          throw safeErr;
        }
      }
    }
  }

  static async streamComplete(params) {
    const {
      persona = 'developer',
      tier = 1,
      messages,
      maxTokens,
      taskName = 'unknown',
    } = params;

    const routing = Router.route(persona, tier);
    const modelId = routing.model;
    const provider = this._getProvider(modelId);

    if (!provider || !provider.streamComplete) {
      throw new Error(`Streaming not supported for model: ${modelId}`);
    }

    return provider.streamComplete(messages, { ...params, model: modelId });
  }

  static _getProvider(modelId) {
    if (modelId.startsWith('claude') || modelId.startsWith('anthropic.claude')) {
      if (!process.env.ANTHROPIC_API_KEY) return null;
      return new AnthropicProvider(process.env.ANTHROPIC_API_KEY);
    }
    if (modelId.startsWith('gpt') || modelId.startsWith('o1') || modelId.startsWith('o3')) {
      if (!process.env.OPENAI_API_KEY) return null;
      return new OpenAIProvider(process.env.OPENAI_API_KEY);
    }
    if (modelId.startsWith('gemini')) {
      if (!process.env.GOOGLE_API_KEY) return null;
      return new GeminiProvider(process.env.GOOGLE_API_KEY);
    }
    // Sovereign local models (e.g. llama-3-70b-local). Gated on OLLAMA_BASE_URL
    // being explicitly set, so cloud routing is unchanged unless opted in.
    if (modelId.includes('local') || modelId.includes('llama')) {
      if (!process.env.OLLAMA_BASE_URL) return null;
      return new OllamaProvider(process.env.OLLAMA_BASE_URL);
    }
    return null;
  }
}

module.exports = ModelClient;
