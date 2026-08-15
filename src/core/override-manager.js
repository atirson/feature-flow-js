class OverrideManager {
  constructor({ storagePrefix = 'feature-toggles', environment = 'dev' } = {}) {
    this.storagePrefix = storagePrefix;
    this.environment = environment;
    this.overrides = new Map();
  }

  get storageKey() {
    return `${this.storagePrefix}-overrides:${this.environment}`;
  }

  setOverride(key, enabled) {
    this.overrides.set(key, enabled);
    this.saveToStorage();
  }

  clearOverride(key) {
    this.overrides.delete(key);
    this.saveToStorage();
  }

  clearAll() {
    this.overrides.clear();
    this.saveToStorage();
  }

  getOverride(key) {
    return this.overrides.get(key);
  }

  hasOverride(key) {
    return this.overrides.has(key);
  }

  getAll() {
    return new Map(this.overrides);
  }

  pruneStale(hasFeature) {
    const removed = [];

    for (const key of this.overrides.keys()) {
      if (!hasFeature(key)) {
        this.overrides.delete(key);
        removed.push(key);
      }
    }

    if (removed.length) this.saveToStorage();

    return removed;
  }

  loadFromStorage() {
    if (typeof window === 'undefined') return;
  
    this.overrides.clear();
  
    try {
      const raw = localStorage.getItem(this.storageKey);
  
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.entries(parsed).forEach(([key, value]) => {
          this.overrides.set(key, value);
        });
      }
    } catch (e) {
      console.warn('Erro ao carregar overrides do localStorage:', e);
    }
  }

  saveToStorage() {
    if (typeof window === 'undefined') return;

    try {
      if (this.overrides.size === 0) {
        localStorage.removeItem(this.storageKey);
        return;
      }

      const obj = Object.fromEntries(this.overrides);
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch {}
  }

  switchEnvironment(environment) {
    this.environment = environment;
    this.overrides.clear();
    this.loadFromStorage();
  }

  clearAllStorage() {
    const keys = [];

    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);

        if (key && key.startsWith(this.storagePrefix)) {
          keys.push(key);
        }
      }

      keys.forEach(key => localStorage.removeItem(key));
    }

    this.overrides.clear();

    return keys;
  }
}

export { OverrideManager };
export default OverrideManager;
