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

export function useFeatureFlags() {
  return {
    instance: featureToggles,
    isEnabled: (key, ctx) => featureToggles.isEnabled(key, ctx),
    setOverride: (k, v) => featureToggles.setOverride(k, v),
    clearOverride: (k) => featureToggles.clearOverride(k),
    clearAllOverrides: () => featureToggles.clearAllOverrides(),
    clearStorage: () => featureToggles.clearStorage(),
    pruneStaleOverrides: () => featureToggles.pruneStaleOverrides(),
    getAllFeatures: () => featureToggles.getAllFeatures(),
    subscribe: (fn) => featureToggles.subscribe(fn),
    environment: featureToggles.environment,
  };
}

export function useFeatureFlag(key, context) {
  return featureToggles.isEnabled(key, context);
}