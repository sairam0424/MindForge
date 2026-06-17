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
        // Diagnostic goes to stderr (not stdout) so it never pollutes JSON that a
        // consumer parses from this process's stdout. Matches the warn/error lines below.
        console.error(`[ConfigManager] Loaded configuration from ${this.configPath}`);
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

  set(key, value) {
    const keys = key.split('.');
    let target = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!target[k]) target[k] = {};
      target = target[k];
    }
    target[keys[keys.length - 1]] = value;
    
    this._save();
    return value;
  }

  _save() {
    try {
      if (!fs.existsSync(path.dirname(this.configPath))) {
        fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (err) {
      console.error(`[ConfigManager] Failed to save config: ${err.message}`);
    }
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
