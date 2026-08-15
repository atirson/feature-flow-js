class RemoteConfigManager {
  constructor({ featureRegistry, overrideManager, warningDelay = 2000 } = {}) {
    this.featureRegistry = featureRegistry;
    this.overrideManager = overrideManager;
    this.warningDelay = warningDelay;

    this.remoteConfigApplied = false;
    this.pendingUnknownKeys = new Set();
    this.warnedUnknownKeys = new Set();
    this.flushTimer = null;
  }

  apply(response) {
    const appliedKeys = this.featureRegistry.applyRemoteFeatures(response);

    appliedKeys.forEach(key => this.pendingUnknownKeys.delete(key));

    this.markApplied();
    this.flushWarnings();

    if (this.overrideManager && typeof this.overrideManager.loadFromStorage === 'function') {
      this.overrideManager.loadFromStorage();
    }

    return appliedKeys;
  }

  markApplied() {
    this.remoteConfigApplied = true;
  }

  reportUnknownKey(key) {
    if (typeof window === 'undefined') return;

    if (this.featureRegistry.hasFeature(key)) return;

    if (this.remoteConfigApplied) {
      this.warnUnknownOnce(key);
      return;
    }

    this.pendingUnknownKeys.add(key);
    this.scheduleUnknownKeysFlush();
  }

  resolveFeature(key) {
    this.pendingUnknownKeys.delete(key);
  }

  warnUnknownOnce(key) {
    if (this.warnedUnknownKeys.has(key)) return;

    this.warnedUnknownKeys.add(key);

    const message =
      `[feature-toggles] Feature "${key}" not registered: ` +
      'does not exist in the local registry or remote payload.';

    if (typeof window === 'undefined') {
      console.warn('\x1b[33m%s\x1b[0m', message);
    } else {
      console.warn(message);
    }
  }

  scheduleUnknownKeysFlush() {
    if (this.flushTimer) return;

    const delay = typeof window === 'undefined' ? 50 : this.warningDelay;

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushWarnings();
    }, delay);
  }

  flushWarnings() {
    for (const key of this.pendingUnknownKeys) {
      if (!this.featureRegistry.hasFeature(key)) {
        this.warnUnknownOnce(key);
      }
    }

    this.pendingUnknownKeys.clear();
  }

  shouldPruneAfterRemote() {
    return this.remoteConfigApplied;
  }

  clear() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    this.pendingUnknownKeys.clear();
    this.warnedUnknownKeys.clear();
    this.remoteConfigApplied = false;
  }
}

export { RemoteConfigManager };
export default RemoteConfigManager;