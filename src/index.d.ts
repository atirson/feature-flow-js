import {
  FeatureConfig,
  FeatureState,
  UIConfig,
  EnvMeta,
  FeatureContext,
  RemoteConfig,
  RemoteFeature
} from './types/index.js';

export * from './types/index.js';

export class FeatureToggles {
  constructor();

  setEnvironment(env: string, config?: EnvMeta): void;
  registerFeature(config: FeatureConfig): void;
  registerFeatures(configs: FeatureConfig[]): void;
  isEnabled(key: string, context?: FeatureContext): boolean;
  applyRemoteFeatures(response: RemoteConfig | RemoteFeature[]): this;
  setOverride(key: string, enabled: boolean): void;
  clearOverride(key: string): void;
  clearAllOverrides(): void;
  clearStorage(): string[];
  pruneStaleOverrides(): string[];
  setContext(context: Record<string, any>): void;
  getAllFeatures(): FeatureState[];
  subscribe(fn: (features: FeatureState[]) => void): () => void;

  // UI
  initUI(config?: UIConfig): void;
  setUIVisible(visible: boolean): this;
  toggleUIVisible(): this;
  destroyUI(): void;
}

export const featureToggles: FeatureToggles;
export default featureToggles;