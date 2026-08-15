/** @jsxImportSource react */
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { featureToggles } from '../../core/feature-toggles.js';

const FeatureFlowContext = createContext(null);

export function FeatureFlowProvider({
  config,
  context,
  remoteResponse,
  children,
}) {
  const {
    environment = 'local',
    environments = {},
    featuresByEnv = {},
    features: flatFeatures,
    ui = false,
  } = config || {};

  const [features, setFeatures] = useState([]);
  const [ready, setReady] = useState(false);

  const remoteRef = useRef(null);
  const uiInitialized = useRef(false);

  const syncFeatures = () => {
    const updated = featureToggles.getAllFeatures?.() || [];
    setFeatures(updated);

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const overlay = document.getElementById('ft-overlay');
      const search = document.getElementById('ft-search');

      if (overlay?.classList.contains('open')) {
        if (search?.value && typeof featureToggles._filterFeatures === 'function') {
          featureToggles._filterFeatures(search.value);
        } else if (typeof featureToggles._renderFeatures === 'function') {
          featureToggles._renderFeatures();
        }
      }
    }
  };

  useEffect(() => {
    setReady(false);
  
    const envMeta = environments[environment] || {};
    const featureList = featuresByEnv[environment] || flatFeatures || [];
  
    featureToggles.setEnvironment(environment, envMeta);
  
    if (typeof featureToggles.clearFeatures === 'function') {
      featureToggles.clearFeatures();
    }
    featureToggles.registerFeatures(featureList);
  
    if (remoteResponse?.features || remoteResponse?.remoteFeature) {
      const serialized = JSON.stringify(remoteResponse);
      remoteRef.current = serialized;
      featureToggles.applyRemoteFeatures(remoteResponse);
    }
  
    featureToggles.overrideManager.loadFromStorage();
    featureToggles.pruneStaleOverrides();
  
    if (ui && !uiInitialized.current && typeof window !== 'undefined') {
      featureToggles.initUI(typeof ui === 'object' ? ui : {});
      uiInitialized.current = true;
    }
  
    syncFeatures();
    setReady(true);
  
    const unsub = featureToggles.subscribe(() => {
      syncFeatures();
    });
  
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [
    environment,
    environments,
    featuresByEnv,
    flatFeatures,
    ui,
  ]);
  
  useEffect(() => {
    if (!remoteResponse) return;
  
    const serialized = JSON.stringify(remoteResponse);
    if (remoteRef.current === serialized) return;
    remoteRef.current = serialized;
  
    featureToggles.applyRemoteFeatures(remoteResponse);
    featureToggles.overrideManager.loadFromStorage();
    
    syncFeatures();
  }, [remoteResponse]);

  useEffect(() => {
    if (!context) return;
    featureToggles.setContext(context);
    syncFeatures();
  }, [context]);


  const value = useMemo(
    () => ({
      environment,
      ready,
      features,

      isEnabled: (key, ctx) => featureToggles.isEnabled(key, ctx),

      applyRemoteFeatures: (response) => {
        const result = featureToggles.applyRemoteFeatures(response);
        featureToggles.pruneStaleOverrides();
        syncFeatures();
        return result;
      },

      setOverride: (key, value) => {
        const result = featureToggles.setOverride(key, value);
        syncFeatures();
        return result;
      },

      clearOverride: (key) => {
        const result = featureToggles.clearOverride(key);
        syncFeatures();
        return result;
      },

      clearAllOverrides: () => {
        const result = featureToggles.clearAllOverrides();
        syncFeatures();
        return result;
      },

      clearStorage: () => {
        const result = featureToggles.clearStorage();
        syncFeatures();
        return result;
      },

      pruneStaleOverrides: () => {
        const result = featureToggles.pruneStaleOverrides();
        syncFeatures();
        return result;
      },

      setContext: (ctx) => {
        const result = featureToggles.setContext(ctx);
        syncFeatures();
        return result;
      },

      instance: featureToggles,
    }),
    [environment, ready, features],
  );

  return (
    <FeatureFlowContext.Provider value={value}>
      {children}
    </FeatureFlowContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlowContext);

  if (!ctx) {
    throw new Error('useFeatureFlags deve estar dentro de <FeatureFlowProvider>');
  }

  return ctx;
}

export function useFeatureFlag(key, context) {
  const { isEnabled, features } = useFeatureFlags();

  return useMemo(() => isEnabled(key, context), [key, context, features]);
}

export function FeatureGate({
  flag,
  context,
  children,
  fallback = null,
}) {
  return useFeatureFlag(flag, context) ? children : fallback;
}