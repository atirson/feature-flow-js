// src/react/index.d.ts
import * as React from 'react';
import type { FeatureFlowConfig, FeatureContext, RemoteConfig } from '../types';

export interface FeatureFlowProviderProps {
  config: FeatureFlowConfig;
  context?: FeatureContext;
  remoteResponse?: RemoteConfig | null;
  children?: React.ReactNode;
}

export function FeatureFlowProvider(props: FeatureFlowProviderProps): JSX.Element;

export function useFeatureFlags(): {
  environment: string;
  ready: boolean;
  features: any[];
  isEnabled: (key: string, ctx?: FeatureContext) => boolean;
  applyRemoteFeatures: (r: RemoteConfig) => void;
  setOverride: (k: string, v: boolean) => void;
  clearOverride: (k: string) => void;
  clearAllOverrides: () => void;
  setContext: (c: FeatureContext) => void;
  instance: any;
};

export function useFeatureFlag(key: string, context?: FeatureContext): boolean;

export interface FeatureGateProps {
  flag: string;
  context?: FeatureContext;
  children?: React.ReactNode;
  fallback?: React.ReactNode;
}
export function FeatureGate(props: FeatureGateProps): JSX.Element | null;