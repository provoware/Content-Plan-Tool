(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    const exports = factory();
    root.HelperUtil = exports;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const memStore = Object.create(null);

  function hasLocalStorage() {
    try {
      if (typeof localStorage === 'undefined') return false;
      const testKey = '__helper_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (err) {
      return false;
    }
  }

  const supportsStorage = hasLocalStorage();

  function safeGet(key) {
    if (supportsStorage) {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) return value;
      } catch (err) {
        // Ignorieren und auf Memory-Fallback zurückgreifen
      }
    }
    return Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null;
  }

  function safeSet(key, value, options = {}) {
    const { onFallback } = options;
    if (supportsStorage) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (err) {
        memStore[key] = value;
        if (typeof onFallback === 'function') onFallback(err);
        return false;
      }
    }
    memStore[key] = value;
    if (typeof onFallback === 'function') onFallback(new Error('localStorage unavailable'));
    return false;
  }

  function safeRemove(key) {
    if (supportsStorage) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (err) {
        // Ignorieren und Fallback verwenden
      }
    }
    if (Object.prototype.hasOwnProperty.call(memStore, key)) {
      delete memStore[key];
      return true;
    }
    return false;
  }

  function $(selector, ctx) {
    if (typeof selector !== 'string') return null;
    const scope = ctx && typeof ctx.querySelector === 'function'
      ? ctx
      : (typeof document !== 'undefined' ? document : null);
    return scope ? scope.querySelector(selector) : null;
  }

  function $$(selector, ctx) {
    if (typeof selector !== 'string') return [];
    const scope = ctx && typeof ctx.querySelectorAll === 'function'
      ? ctx
      : (typeof document !== 'undefined' ? document : null);
    return scope ? Array.from(scope.querySelectorAll(selector)) : [];
  }

  function byId(id) {
    if (typeof document === 'undefined' || typeof document.getElementById !== 'function') {
      return null;
    }
    return document.getElementById(id);
  }

  function getFallbackStore() {
    return { ...memStore };
  }

  return { $, $$, byId, safeGet, safeSet, safeRemove, getFallbackStore };
});
