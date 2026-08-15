import { featureToggles } from '../../index.js';

export function createFeatureFlow(config, context) {
  const env = config.environment || 'dev';
  const features = config.featuresByEnv?.[env] ?? config.features ?? [];

  featureToggles.setEnvironment(env);
  featureToggles.registerFeatures(features);
  if (context) featureToggles.setContext(context);
  if (config.remoteResponse) {
    featureToggles.applyRemoteFeatures(config.remoteResponse);
  }

  return featureToggles;
}

export class FeatureFlowService {
  constructor() {
    this._instance = featureToggles;
  }

  isEnabled(key, context) {
    return this._instance.isEnabled(key, context);
  }

  setOverride(key, value) {
    this._instance.setOverride(key, value);
  }

  clearOverride(key) {
    this._instance.clearOverride(key);
  }

  clearAllOverrides() {
    this._instance.clearAllOverrides();
  }

  clearStorage() {
    return this._instance.clearStorage();
  }

  pruneStaleOverrides() {
    return this._instance.pruneStaleOverrides();
  }

  getAllFeatures() {
    return this._instance.getAllFeatures();
  }

  subscribe(fn) {
    return this._instance.subscribe(fn);
  }

  get environment() {
    return this._instance.environment;
  }
}

export function provideFeatureFlow(config, context) {
  createFeatureFlow(config, context);
  return new FeatureFlowService();
}