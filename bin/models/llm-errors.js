/**
 * MindForge — Typed cross-provider LLM error taxonomy.
 *
 * Adapted from ECC (src/llm/core/interface.py LLMError hierarchy). Named error
 * classes carrying { provider, code, retryable } so the model-client fallback /
 * circuit breaker can branch on error TYPE instead of a raw count:
 *   - ContextLengthError -> escalate to a larger-context model
 *   - AuthenticationError -> skip this provider permanently (bad/missing key)
 *   - RateLimitError      -> circuit-break + back off, retryable
 *   - ModelNotFoundError  -> skip the model, try fallback
 *
 * mapHttpStatus() turns a provider HTTP status into the right typed error so all
 * providers classify failures consistently.
 */
'use strict';

class LLMError extends Error {
  constructor(message, { provider = null, code = null, retryable = false, status = null } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.provider = provider;
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

class AuthenticationError extends LLMError {
  constructor(message, opts = {}) { super(message, { ...opts, retryable: false }); }
}
class RateLimitError extends LLMError {
  constructor(message, opts = {}) { super(message, { ...opts, retryable: true }); }
}
class ContextLengthError extends LLMError {
  constructor(message, opts = {}) { super(message, { ...opts, retryable: false }); }
}
class ModelNotFoundError extends LLMError {
  constructor(message, opts = {}) { super(message, { ...opts, retryable: false }); }
}
class ServiceUnavailableError extends LLMError {
  constructor(message, opts = {}) { super(message, { ...opts, retryable: true }); }
}

/**
 * Classify a provider failure into a typed error. Prefers HTTP status, then
 * falls back to string heuristics on the message (ECC astraflow.py approach) for
 * providers that don't surface a clean status.
 */
function classifyError(message, { provider = null, status = null } = {}) {
  const msg = String(message || '');
  const lower = msg.toLowerCase();

  if (status === 401 || status === 403 || /\b401\b|\b403\b|unauthorized|invalid api key|authentication/.test(lower)) {
    return new AuthenticationError(msg, { provider, code: 'auth', status });
  }
  if (status === 429 || /\b429\b|rate.?limit|too many requests/.test(lower)) {
    return new RateLimitError(msg, { provider, code: 'rate_limit', status });
  }
  if (status === 404 || /\b404\b|model.*not.*found|no such model/.test(lower)) {
    return new ModelNotFoundError(msg, { provider, code: 'model_not_found', status });
  }
  if (/context.*length|maximum context|context window|too long|token limit/.test(lower)) {
    return new ContextLengthError(msg, { provider, code: 'context_length', status });
  }
  if (status === 503 || status === 502 || status === 408 || /\b50[23]\b|timeout|unavailable|connection/.test(lower)) {
    return new ServiceUnavailableError(msg, { provider, code: 'unavailable', status });
  }
  return new LLMError(msg, { provider, code: 'unknown', status, retryable: false });
}

module.exports = {
  LLMError,
  AuthenticationError,
  RateLimitError,
  ContextLengthError,
  ModelNotFoundError,
  ServiceUnavailableError,
  classifyError,
};
