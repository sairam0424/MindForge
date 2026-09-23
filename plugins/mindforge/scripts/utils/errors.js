'use strict';

class MindForgeError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'MindForgeError';
    this.code = code;
    this.context = context;
  }
}

class ConfigError extends MindForgeError {
  constructor(message, context) {
    super(message, 'CONFIG_ERROR', context);
    this.name = 'ConfigError';
  }
}

class GovernanceError extends MindForgeError {
  constructor(message, context) {
    super(message, 'GOVERNANCE_ERROR', context);
    this.name = 'GovernanceError';
  }
}

class SecurityError extends MindForgeError {
  constructor(message, context) {
    super(message, 'SECURITY_ERROR', context);
    this.name = 'SecurityError';
  }
}

class ValidationError extends MindForgeError {
  constructor(message, fields = []) {
    super(message, 'VALIDATION_ERROR', { fields });
    this.name = 'ValidationError';
  }
}

module.exports = { MindForgeError, ConfigError, GovernanceError, SecurityError, ValidationError };
