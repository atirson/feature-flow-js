// src/types/index.d.ts
export interface FeatureContext {
  user?: { id?: string; email?: string; role?: string; region?: string; [k: string]: any };
  environment?: string;
  flags?: Record<string, any>;
  payload?: Record<string, any>;
  [k: string]: any;
}

export interface FeatureConfig {
  key: string;
  name?: string;
  description?: string;
  defaultEnabled: boolean;
  /** Exceção: retorna true para quem respeita a regra, mesmo com default false. */
  rolloutRule?: (context: FeatureContext) => boolean;
}

export interface RemoteConfig {
  features?: Array<{ key: string; defaultEnabled?: boolean }>;
}

export interface EnvMeta { label?: string; color?: string; }

export interface UIConfig {
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  theme?: 'light' | 'dark';
  styles?: Partial<CSSStyleDeclaration>;
}

/** Objeto unico de configuracao (ponto 4). */
export interface FeatureFlowConfig {
  environment: string;
  environments?: Record<string, EnvMeta>;
  /** conjuntos por ambiente (ponto: DEV/HML/PROD) */
  featuresByEnv?: Record<string, FeatureConfig[]>;
  /** alternativa: lista unica sem ambientes */
  features?: FeatureConfig[];
  ui?: boolean | UIConfig;
}