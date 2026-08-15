import { FeatureRegistry } from './feature-registry.js';
import { OverrideManager } from './override-manager.js';
import { RemoteConfigManager } from './remote-config.js';
import { SubscriptionManager } from './subscription-manager.js';
import { FeatureTogglesUI } from '../ui/feature-toggles-ui.js';

/**
 * @template {Record<string, any>} [TUser=Record<string, any>]
 * @typedef {Object} FeatureConfig
 * @property {string} key
 * @property {string} [name]
 * @property {string} [description]
 * @property {boolean} [defaultEnabled]
 * @property {Function} [rolloutRule]
 * @property {string} [createdAt]
 * @property {string} [expiredAt]
 */

class FeatureToggles {
  constructor() {
    this.featureRegistry = new FeatureRegistry();

    this.environment = 'dev';
    this.storagePrefix = 'feature-toggles';

    this.overrideManager = new OverrideManager({
      storagePrefix: this.storagePrefix,
      environment: this.environment,
    });

    this.remoteConfig = new RemoteConfigManager({
      featureRegistry: this.featureRegistry,
      overrideManager: this.overrideManager,
    });

    this.subscriptionManager = new SubscriptionManager();

    this.context = {};

    this.environments = {
      dev: { label: 'DEV', color: '#3b82f6' },
      hml: { label: 'HML', color: '#f59e0b' },
      prod: { label: 'PROD', color: '#10b981' },
    };

    this.ui = null;

    this.overrideManager.loadFromStorage();
  }

  // ======================================================================
  // CORE
  // ======================================================================

  clearFeatures() {
    this.featureRegistry.clear?.();
  }

  setEnvironment(env, config = {}) {
    const previousEnv = this.environment;
    this.environment = env;

    if (previousEnv !== env) {
      this.overrideManager.switchEnvironment(env);
      this.overrideManager.loadFromStorage();
    }

    if (config.label || config.color) {
      this.environments[env] = {
        label: config.label || env.toUpperCase(),
        color: config.color || '#6b7280',
      };
    }

    if (this.ui) {
      this.ui.updateEnvironmentBadge?.();
      this.ui.applyButtonVisibility?.();
    }
  }

  registerFeature(config) {
    const feature = this.featureRegistry.registerFeature(config);
    this.remoteConfig.resolveFeature(feature.key);
    this._notify();
  }

  registerFeatures(configs) {
    (configs || []).forEach(config => this.registerFeature(config));
  }

  isEnabled(key, context = {}) {
    if (this.overrideManager.hasOverride(key)) {
      return this.overrideManager.getOverride(key);
    }
  
    const feature = this.featureRegistry.getFeature(key);
  
    if (!feature) {
      this.remoteConfig.reportUnknownKey(key);
      return false;
    }
  
    if (feature.rolloutRule) {
      try {
        const merged = { ...this.context, ...context };
        return !!feature.rolloutRule(merged);
      } catch {
        return feature.defaultEnabled;
      }
    }
  
    return feature.defaultEnabled;
  }
  
  getAllFeatures() {
    return this.featureRegistry.getAll().map(f => ({
      ...f,
      currentState: this.isEnabled(f.key),
      hasOverride: this.overrideManager.hasOverride(f.key),
      overrideValue: this.overrideManager.getOverride(f.key) ?? undefined,
      isExpired: f.expiredAt ? new Date(f.expiredAt) < new Date() : false,
    }));
  }

  applyRemoteFeatures(response) {
    this.remoteConfig.apply(response);
    this._notify();
    return this;
  }

  setOverride(key, enabled) {
    this.overrideManager.setOverride(key, enabled);
    this._notify();
  }

  clearOverride(key) {
    this.overrideManager.clearOverride(key);
    this._notify();
  }

  clearAllOverrides() {
    this.overrideManager.clearAll();
    this._notify();
  }

  clearStorage() {
    const keys = this.overrideManager.clearAllStorage();
    this._notify();
    return keys;
  }

  pruneStaleOverrides() {
    return this.overrideManager.pruneStale(key => this.featureRegistry.hasFeature(key));
  }

  setContext(context) {
    this.context = { ...this.context, ...context };
    this._notify();
  }

  subscribe(fn) {
    return this.subscriptionManager.subscribe(fn);
  }

  _notify() {
    this.subscriptionManager.notify(this.getAllFeatures());
  }

  // ======================================================================
  // UI FACADE
  // ======================================================================

  initUI(config = {}) {
    if (!this.ui) {
      this.ui = new FeatureTogglesUI({
        getFeatures: () => this.getAllFeatures(),
        setOverride: (key, enabled) => this.setOverride(key, enabled),
        clearAllOverrides: () => this.clearAllOverrides(),
        subscribe: (fn) => this.subscribe(fn),
        getEnvironment: () => this.environment,
        getEnvironments: () => this.environments,
        positionKey: 'feature-toggles-button-position',
        forceShowKey: 'feature-toggles-force-show',
      });
    }
    this.ui.init(config);
  }

  setUIVisible(visible) {
    if (this.ui) {
      this.ui.setVisible(visible);
    }
    return this;
  }

  toggleUIVisible() {
    if (this.ui) {
      this.ui.toggleVisible();
    }
    return this;
  }

  destroyUI() {
    if (this.ui) {
      this.ui.destroy();
    }
  }
}

// Singleton instance
const featureToggles = new FeatureToggles();

export { FeatureToggles, featureToggles };
export default featureToggles;

// Expose on window for manual browser debugging
if (typeof window !== 'undefined') {
  window.FeatureToggles = FeatureToggles;
  window.featureToggles = featureToggles;
}