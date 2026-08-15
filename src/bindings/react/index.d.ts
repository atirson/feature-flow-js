import * as React from 'react';
import type {
  FeatureFlowConfig,
  FeatureContext,
  RemoteConfig,
  FeatureState,
  DefaultUser,
} from '../../types';

export interface FeatureFlowProviderProps<TUser extends object = DefaultUser> {
  config: FeatureFlowConfig<TUser>;
  context?: FeatureContext<TUser>;
  remoteResponse?: RemoteConfig | null;
  children?: React.ReactNode;
}

export function FeatureFlowProvider<TUser extends object = DefaultUser>(
  props: FeatureFlowProviderProps<TUser>
): React.JSX.Element;

export interface FeatureFlowContextValue<TUser extends object = DefaultUser> {
  environment: string;
  ready: boolean;
  features: FeatureState<TUser>[];
  isEnabled: (key: string, ctx?: FeatureContext<TUser>) => boolean;
  applyRemoteFeatures: (r: RemoteConfig) => void;
  setOverride: (k: string, v: boolean) => void;
  clearOverride: (k: string) => void;
  clearAllOverrides: () => void;
  clearStorage: () => string[];
  pruneStaleOverrides: () => string[];
  setContext: (c: FeatureContext<TUser>) => void;
  instance: any;
}

export function useFeatureFlags<TUser extends object = DefaultUser>(): FeatureFlowContextValue<TUser>;

export function useFeatureFlag<TUser extends object = DefaultUser>(
  key: string, 
  context?: FeatureContext<TUser>
): boolean;

export interface FeatureGateProps<TUser extends object = DefaultUser> {
  flag: string;
  context?: FeatureContext<TUser>;
  children?: React.ReactNode;
  fallback?: React.ReactNode;
}
export function FeatureGate<TUser extends object = DefaultUser>(
  props: FeatureGateProps<TUser>
): React.ReactNode;