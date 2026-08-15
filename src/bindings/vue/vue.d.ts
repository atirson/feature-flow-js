import type { FeatureFlowConfig, FeatureContext, FeatureState, DefaultUser } from '../../types';

export declare function createFeatureFlow<TUser extends object = DefaultUser>(
  config: FeatureFlowConfig<TUser>,
  context?: FeatureContext<TUser>
): typeof import('../../index').featureToggles;

export declare function useFeatureFlags<TUser extends object = DefaultUser>(): {
  instance: typeof import('../../index').featureToggles;
  isEnabled: (key: string, ctx?: FeatureContext<TUser>) => boolean;
  setOverride: (key: string, value: boolean) => void;
  clearOverride: (key: string) => void;
  clearAllOverrides: () => void;
  clearStorage: () => string[];
  pruneStaleOverrides: () => string[];
  getAllFeatures: () => FeatureState<TUser>[];
  subscribe: (fn: () => void) => () => void;
  environment: string;
};

export declare function useFeatureFlag<TUser extends object = DefaultUser>(
  key: string,
  context?: FeatureContext<TUser>
): boolean;