/**
 * MindForge — AWS Bedrock Provider
 *
 * Implements the same complete() / streamComplete() interface as AnthropicProvider
 * but routes calls through the AWS Bedrock Converse API using boto3-style logic
 * ported from Trelix's BedrockBackend.
 *
 * Credential resolution order (mirrors Trelix):
 *   1. AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY env vars
 *   2. AWS_PROFILE env var (named profile from ~/.aws/credentials)
 *   3. Instance/task role (when running on EC2/ECS/Lambda — no env vars needed)
 *
 * Model ID format: Bedrock inference profile IDs with us.* prefix for on-demand:
 *   us.anthropic.claude-sonnet-4-6          (Sonnet 4.6)
 *   us.anthropic.claude-opus-4-8            (Opus 4.8)
 *   us.anthropic.claude-haiku-4-5-20251001-v1:0  (Haiku 4.5 — fallback)
 */
'use strict';

// Map MindForge short model IDs → Bedrock inference profile IDs
const BEDROCK_MODEL_MAP = {
  'claude-sonnet-4-6':  'us.anthropic.claude-sonnet-4-6',
  'claude-opus-4-7':    'us.anthropic.claude-opus-4-8',
  'claude-opus-4-8':    'us.anthropic.claude-opus-4-8',
  'claude-haiku-4-5':   'us.anthropic.claude-haiku-4-5-20251001-v1:0',
  // Pass-through: if already a Bedrock ID, use as-is
};

function resolveBedrockModelId(modelId) {
  return BEDROCK_MODEL_MAP[modelId] || modelId;
}

class BedrockProvider {
  constructor(opts = {}) {
    this._region    = opts.region    || process.env.AWS_REGION    || 'us-east-1';
    this._accessKey = opts.accessKey || process.env.AWS_ACCESS_KEY_ID;
    this._secretKey = opts.secretKey || process.env.AWS_SECRET_ACCESS_KEY;
    this._profile   = opts.profile   || process.env.AWS_PROFILE;
    this._client    = null; // lazy-init on first call
  }

  _getClient() {
    if (this._client) return this._client;

    let AWS;
    try {
      AWS = require('@aws-sdk/client-bedrock-runtime');
    } catch (e) {
      throw new Error(
        'AWS Bedrock provider requires @aws-sdk/client-bedrock-runtime. ' +
        'Run: npm install @aws-sdk/client-bedrock-runtime'
      );
    }

    const clientConfig = { region: this._region };

    if (this._accessKey && this._secretKey) {
      clientConfig.credentials = {
        accessKeyId:     this._accessKey,
        secretAccessKey: this._secretKey,
      };
    }
    // If neither key nor profile is set, the SDK uses the default credential
    // chain (instance role, ~/.aws/credentials default profile, etc.)

    this._client = new AWS.BedrockRuntimeClient(clientConfig);
    this._AWS    = AWS;
    return this._client;
  }

  async complete(params) {
    const {
      model,
      systemPrompt,
      userMessage,
      maxTokens   = 4096,
      temperature = 0.7,
    } = params;

    const client = this._getClient();
    const { ConverseCommand } = this._AWS;

    const bedrockModelId = resolveBedrockModelId(model);

    const request = {
      modelId: bedrockModelId,
      inferenceConfig: {
        maxTokens,
        temperature,
      },
      messages: [
        { role: 'user', content: [{ text: userMessage }] },
      ],
    };
    if (systemPrompt) {
      request.system = [{ text: systemPrompt }];
    }

    const start = Date.now();
    let response;
    try {
      response = await client.send(new ConverseCommand(request));
    } catch (err) {
      throw Object.assign(
        new Error(`Bedrock Converse error: ${err.message}`),
        { status: err.$metadata?.httpStatusCode || 500, provider: 'bedrock' }
      );
    }

    const output   = response.output?.message?.content?.[0]?.text || '';
    const usage    = response.usage || {};
    const latency  = Date.now() - start;

    const { priceCall } = require('./pricing-registry');
    const cost = priceCall(bedrockModelId, {
      input_tokens:  usage.inputTokens  || 0,
      output_tokens: usage.outputTokens || 0,
    });

    return {
      model:         bedrockModelId,
      content:       output,
      input_tokens:  usage.inputTokens  || 0,
      output_tokens: usage.outputTokens || 0,
      cost_usd:      cost,
      latency_ms:    latency,
      provider:      'bedrock',
    };
  }

  async streamComplete(messages, options = {}) {
    const client = this._getClient();
    const { ConverseStreamCommand } = this._AWS;

    const bedrockModelId = resolveBedrockModelId(options.model || 'claude-sonnet-4-6');

    // Separate system messages from the conversation
    const systemMessages = messages.filter(m => m.role === 'system');
    const convoMessages  = messages.filter(m => m.role !== 'system');

    const request = {
      modelId: bedrockModelId,
      inferenceConfig: { maxTokens: options.maxTokens || 4096 },
      messages: convoMessages.map(m => ({
        role:    m.role,
        content: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
      })),
    };
    if (systemMessages.length > 0) {
      request.system = [{ text: systemMessages.map(m => m.content).join('\n') }];
    }

    let streamResponse;
    try {
      streamResponse = await client.send(new ConverseStreamCommand(request));
    } catch (err) {
      throw Object.assign(
        new Error(`Bedrock stream error: ${err.message}`),
        { status: err.$metadata?.httpStatusCode || 500 }
      );
    }

    // Return an async iterable that yields SSE-style text chunks,
    // matching the shape callers of streamComplete expect.
    return streamResponse.stream;
  }
}

module.exports = BedrockProvider;
