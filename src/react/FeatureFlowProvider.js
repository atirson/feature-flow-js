/** @jsxImportSource react */
import React, {
  createContext, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { featureToggles } from '../core/feature-toggles.js';

const FeatureFlowContext = createContext(null);

/**
 * @param {object}   props
 * @param {import('../types/index.js').FeatureFlowConfig} props.config
 *        Objeto único com toda a config (ponto 4).
 * @param {object}   [props.context]  contexto do usuario (user, region...)
 * @param {object|boolean} [props.remoteResponse]
 *        (Ponto 3) response JA pronto que o dev buscou (fetch/axios).
 *        Passe null enquanto carrega; ao chegar, os valores sobrescrevem os defaults.
 */
export function FeatureFlowProvider({ config, context, remoteResponse, children }) {
  const {
    environment = 'local',
    environments = {},
    featuresByEnv = {},
    features: flatFeatures,       // alternativa: lista unica sem ambientes
    ui = false,
  } = config || {};

  const [features, setFeatures] = useState([]);
  const [ready, setReady] = useState(false);
  const initialized = useRef(false);

  // Bootstrap (defaults + ambiente + UI) — roda uma vez por ambiente
  useEffect(() => {
    let unsub = () => {};

    const envMeta = environments[environment] || {};
    featureToggles.setEnvironment(environment, envMeta);
    featureToggles.setContext({ environment, ...(context || {}) });

    // (Ponto 1 e 4) registra os defaults do conjunto do ambiente
    const defaults = featuresByEnv[environment] || flatFeatures || [];
    featureToggles.registerFeatures(defaults);

    unsub = featureToggles.subscribe(setFeatures);
    setFeatures(featureToggles.getAllFeatures());
    setReady(true);

    if (ui) featureToggles.initUI(typeof ui === 'object' ? ui : {});
    initialized.current = true;

    return () => {
      unsub();
      if (ui) featureToggles.destroyUI();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environment]);

  // Atualiza contexto do usuario quando mudar
  useEffect(() => {
    if (context) featureToggles.setContext(context);
  }, [context]);

  // (Ponto 3) quando o dev entrega o response, aplica com preferencia
  useEffect(() => {
    if (initialized.current && remoteResponse) {
      featureToggles.applyRemoteFeatures(remoteResponse);
    }
  }, [remoteResponse]);

  const value = useMemo(() => ({
    environment,
    ready,
    features,
    isEnabled: (key, ctx) => featureToggles.isEnabled(key, ctx),
    applyRemoteFeatures: (r) => featureToggles.applyRemoteFeatures(r),
    setOverride: (k, v) => featureToggles.setOverride(k, v),
    clearOverride: (k) => featureToggles.clearOverride(k),
    clearAllOverrides: () => featureToggles.clearAllOverrides(),
    setContext: (c) => featureToggles.setContext(c),
    instance: featureToggles,
  }), [environment, ready, features]);

  return (
    <FeatureFlowContext.Provider value={value}>
      {children}
    </FeatureFlowContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlowContext);
  if (!ctx) throw new Error('useFeatureFlags deve estar dentro de <FeatureFlowProvider>');
  return ctx;
}

export function useFeatureFlag(key, context) {
  const { isEnabled, features } = useFeatureFlags();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => isEnabled(key, context), [key, context, features]);
}

export function FeatureGate({ flag, context, children, fallback = null }) {
  return useFeatureFlag(flag, context) ? children : fallback;
}