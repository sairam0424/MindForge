'use strict';

/**
 * MindForge install-state provenance contract.
 *
 * Writes/reads/validates .mindforge/install-state.json — a provenance record
 * (who installed, from which source commit, for which runtimes/scope, when, and
 * the operation log). Sibling to .agent/file-manifest.json (content hashes).
 *
 * Adapted from ECC's install-state lib: keeps the robust ajv-with-fallback
 * validation pattern (works in bare checkouts without ajv installed), but the
 * data model is MindForge-native — runtimes/scope/ownership instead of ECC's
 * profile/module/component vocabulary. Additive: writing this file changes no
 * copy behavior.
 */

const fs = require('fs');
const path = require('path');

let Ajv = null;
try {
  const ajvModule = require('ajv');
  Ajv = ajvModule.default || ajvModule;
} catch (_error) {
  Ajv = null;
}

const SCHEMA_VERSION = 'mindforge.install.v1';
const SCHEMA_PATH = path.join(__dirname, '..', '..', '.mindforge', 'schemas', 'install-state.schema.json');

let cachedValidator = null;

function cloneJsonValue(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read ${label}: ${error.message}`);
  }
}

function getValidator() {
  if (cachedValidator) return cachedValidator;

  if (Ajv) {
    const schema = readJson(SCHEMA_PATH, 'install-state schema');
    const ajv = new Ajv({ allErrors: true });
    cachedValidator = ajv.compile(schema);
    return cachedValidator;
  }

  cachedValidator = createFallbackValidator();
  return cachedValidator;
}

/**
 * Schema-free validator for bare checkouts where ajv is not installed. Mirrors
 * the draft-07 schema's required fields and enums.
 */
function createFallbackValidator() {
  const validate = state => {
    const errors = [];
    validate.errors = errors;

    const pushError = (instancePath, message) => errors.push({ instancePath, message });
    const isNonEmptyString = v => typeof v === 'string' && v.length > 0;

    const noAdditional = (value, instancePath, allowedKeys) => {
      for (const key of Object.keys(value)) {
        if (!allowedKeys.includes(key)) {
          pushError(`${instancePath}/${key}`, 'must NOT have additional properties');
        }
      }
    };

    const stringArray = (value, instancePath) => {
      if (!Array.isArray(value)) { pushError(instancePath, 'must be array'); return; }
      value.forEach((item, index) => {
        if (!isNonEmptyString(item)) pushError(`${instancePath}/${index}`, 'must be non-empty string');
      });
    };

    const optionalNullableString = (value, instancePath) => {
      if (value !== null && !isNonEmptyString(value)) pushError(instancePath, 'must be string or null');
    };

    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      pushError('/', 'must be object');
      return false;
    }

    noAdditional(state, '', ['schemaVersion', 'installedAt', 'lastValidatedAt', 'target', 'request', 'source', 'operations']);

    if (state.schemaVersion !== SCHEMA_VERSION) {
      pushError('/schemaVersion', `must equal ${SCHEMA_VERSION}`);
    }
    if (!isNonEmptyString(state.installedAt)) {
      pushError('/installedAt', 'must be non-empty string');
    }
    if (state.lastValidatedAt !== undefined && !isNonEmptyString(state.lastValidatedAt)) {
      pushError('/lastValidatedAt', 'must be non-empty string');
    }

    const target = state.target;
    if (!target || typeof target !== 'object' || Array.isArray(target)) {
      pushError('/target', 'must be object');
    } else {
      noAdditional(target, '/target', ['scope', 'root', 'installStatePath']);
      if (!['global', 'local'].includes(target.scope)) {
        pushError('/target/scope', 'must be one of global|local');
      }
      if (!isNonEmptyString(target.root)) pushError('/target/root', 'must be non-empty string');
      if (target.installStatePath !== undefined && !isNonEmptyString(target.installStatePath)) {
        pushError('/target/installStatePath', 'must be non-empty string');
      }
    }

    const request = state.request;
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      pushError('/request', 'must be object');
    } else {
      noAdditional(request, '/request', ['runtimes', 'withUtils', 'minimal']);
      stringArray(request.runtimes, '/request/runtimes');
      if (request.withUtils !== undefined && typeof request.withUtils !== 'boolean') {
        pushError('/request/withUtils', 'must be boolean');
      }
      if (request.minimal !== undefined && typeof request.minimal !== 'boolean') {
        pushError('/request/minimal', 'must be boolean');
      }
    }

    const source = state.source;
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      pushError('/source', 'must be object');
    } else {
      noAdditional(source, '/source', ['repoVersion', 'repoCommit']);
      optionalNullableString(source.repoVersion, '/source/repoVersion');
      optionalNullableString(source.repoCommit, '/source/repoCommit');
    }

    if (!Array.isArray(state.operations)) {
      pushError('/operations', 'must be array');
    } else {
      state.operations.forEach((operation, index) => {
        const instancePath = `/operations/${index}`;
        if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
          pushError(instancePath, 'must be object');
          return;
        }
        if (!isNonEmptyString(operation.kind)) pushError(`${instancePath}/kind`, 'must be non-empty string');
        if (!isNonEmptyString(operation.destinationPath)) pushError(`${instancePath}/destinationPath`, 'must be non-empty string');
        if (!isNonEmptyString(operation.ownership)) pushError(`${instancePath}/ownership`, 'must be non-empty string');
      });
    }

    return errors.length === 0;
  };

  validate.errors = [];
  return validate;
}

function formatValidationErrors(errors = []) {
  return errors.map(error => `${error.instancePath || '/'} ${error.message}`).join('; ');
}

function validateInstallState(state) {
  const validator = getValidator();
  const valid = validator(state);
  return { valid, errors: validator.errors || [] };
}

function assertValidInstallState(state, label) {
  const result = validateInstallState(state);
  if (!result.valid) {
    throw new Error(`Invalid install-state${label ? ` (${label})` : ''}: ${formatValidationErrors(result.errors)}`);
  }
}

/**
 * Build a validated install-state object.
 * @param {object} options
 * @param {string} [options.installedAt] ISO timestamp; defaults to now.
 * @param {string} [options.lastValidatedAt] ISO timestamp.
 * @param {{scope:string, root:string, installStatePath?:string}} options.target
 * @param {{runtimes:string[], withUtils?:boolean, minimal?:boolean}} options.request
 * @param {{repoVersion?:string|null, repoCommit?:string|null}} options.source
 * @param {Array<object>} [options.operations]
 */
function createInstallState(options) {
  const installedAt = options.installedAt || new Date().toISOString();
  const state = {
    schemaVersion: SCHEMA_VERSION,
    installedAt,
    target: {
      scope: options.target.scope,
      root: options.target.root,
    },
    request: {
      runtimes: Array.isArray(options.request.runtimes) ? [...options.request.runtimes] : [],
    },
    source: {
      repoVersion: options.source.repoVersion || null,
      repoCommit: options.source.repoCommit || null,
    },
    operations: Array.isArray(options.operations)
      ? options.operations.map(operation => cloneJsonValue(operation))
      : [],
  };

  if (options.target.installStatePath) state.target.installStatePath = options.target.installStatePath;
  if (typeof options.request.withUtils === 'boolean') state.request.withUtils = options.request.withUtils;
  if (typeof options.request.minimal === 'boolean') state.request.minimal = options.request.minimal;
  if (options.lastValidatedAt) state.lastValidatedAt = options.lastValidatedAt;

  assertValidInstallState(state, 'create');
  return state;
}

function readInstallState(filePath) {
  const state = readJson(filePath, 'install-state');
  assertValidInstallState(state, filePath);
  return state;
}

function writeInstallState(filePath, state) {
  assertValidInstallState(state, filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

module.exports = {
  SCHEMA_VERSION,
  createInstallState,
  readInstallState,
  validateInstallState,
  writeInstallState,
};
