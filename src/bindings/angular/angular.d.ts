import type { FeatureFlowConfig, FeatureContext, FeatureState, DefaultUser } from '../../types';

export declare function createFeatureFlow<TUser extends object = DefaultUser>(
  config: FeatureFlowConfig<TUser>,
  context?: FeatureContext<TUser>
): typeof import('../../index').featureToggles;

export declare class FeatureFlowService<TUser extends object = DefaultUser> {
  isEnabled(key: string, context?: FeatureContext<TUser>): boolean;
  setOverride(key: string, value: boolean): void;
  clearOverride(key: string): void;
  clearAllOverrides(): void;
  clearStorage(): string[];
  pruneStaleOverrides(): string[];
  getAllFeatures(): FeatureState<TUser>[];
  subscribe(fn: () => void): () => void;
  readonly environment: string;
}

export declare function provideFeatureFlow<TUser extends object = DefaultUser>(
  config: FeatureFlowConfig<TUser>,
  context?: FeatureContext<TUser>
): FeatureFlowService<TUser>;