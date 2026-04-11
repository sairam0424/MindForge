/**
 * MindForge v7 — Core Governance
 * Component: Config Manager
 * 
 * Centralized configuration loader for MindForge system parameters.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

class ConfigManager {
  constructor() {
    this.configPath = path.join(process.cwd(), '.mindforge', 'config.json');
    this.config = null;
    this._loadConfig();
  }

  _loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(raw);
        console.log(`[ConfigManager] Loaded configuration from ${this.configPath}`);
      } else {
        console.warn(`[ConfigManager] Config file not found at ${this.configPath}. Using defaults.`);
        this.config = { env: 'default' };
      }
    } catch (err) {
      console.error(`[ConfigManager] Failed to load config: ${err.message}`);
      this.config = { error: err.message };
    }
  }

  get(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value && Object.prototype.hasOwnProperty.call(value, k)) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    return value;
  }

  getAll() {
    return this.config;
  }

  reload() {
    this._loadConfig();
    return this.config;
  }
}

module.exports = new ConfigManager();
