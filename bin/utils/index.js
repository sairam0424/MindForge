'use strict';

class LRUMap {
  constructor(maxSize, options = {}) {
    this._max = maxSize;
    this._onEvict = options.onEvict || null;
    this._map = new Map();
  }

  get(key) {
    if (!this._map.has(key)) return undefined;
    const value = this._map.get(key);
    this._map.delete(key);
    this._map.set(key, value);
    return value;
  }

  set(key, value) {
    if (this._map.has(key)) {
      this._map.delete(key);
    } else if (this._map.size >= this._max) {
      const oldest = this._map.keys().next().value;
      const oldestValue = this._map.get(oldest);
      this._map.delete(oldest);
      if (this._onEvict) this._onEvict(oldest, oldestValue);
    }
    this._map.set(key, value);
  }

  has(key) {
    return this._map.has(key);
  }

  delete(key) {
    return this._map.delete(key);
  }

  clear() {
    this._map.clear();
  }

  get size() {
    return this._map.size;
  }

  keys() {
    return this._map.keys();
  }

  values() {
    return this._map.values();
  }

  entries() {
    return this._map.entries();
  }
}

module.exports = {
  LRUMap,
  ...require('./paths'),
  ...require('./file-io'),
  ...require('./errors')
};
