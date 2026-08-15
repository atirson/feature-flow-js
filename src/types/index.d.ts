export type DefaultUser = Record<string, any>;

export interface FeatureContext<TUser extends object = DefaultUser> {
  user?: TUser;
  environment?: string;
  flags?: Record<string, any>;
  payload?: Record<string, any>;
  [key: string]: any;
}

export interface FeatureConfig<TUser extends object = DefaultUser> {
  key: string;
  name?: string;
  description?: string;
  defaultEnabled?: boolean;
  rolloutRule?: (context: FeatureContext<TUser>) => boolean;
  createdAt?: string;
  expiredAt?: string;
}

export interface RemoteFeature {
  key: string;
  name?: string;
  description?: string;
  defaultEnabled?: boolean;
  createdAt?: string;
  expiredAt?: string;
}

export interface RemoteConfig {
  features?: RemoteFeature[];
  remoteFeature?: RemoteFeature[];
}

export interface FeatureState<TUser extends object = DefaultUser> {
  key: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  rolloutRule: ((context: FeatureContext<TUser>) => boolean) | null;
  remote: boolean;
  currentState: boolean;
  hasOverride: boolean;
  overrideValue?: boolean;
  createdAt?: string | null;
  expiredAt?: string | null;
  isExpired: boolean;
}

export interface EnvMeta {
  label?: string;
  color?: string;
}

export interface UIConfig {
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  theme?: 'light' | 'dark';
  styles?: Record<string, string | number>;
  hiddenInEnvironments?: string[];
  enableShortcut?: boolean;
}

export interface FeatureFlowConfig<TUser extends object = DefaultUser> {
  environment: string;
  environments?: Record<string, EnvMeta>;
  featuresByEnv?: Record<string, FeatureConfig<TUser>[]>;
  features?: FeatureConfig<TUser>[];
  ui?: boolean | UIConfig;
}