// src/index.js
export {
  FeatureToggles,
  featureToggles,
  default as featureTogglesDefault,
} from './core/feature-toggles.js';

// Exports React (só use se tiver react instalado)
export {
  FeatureFlowProvider,
  useFeatureFlags,
  useFeatureFlag,
  FeatureGate,
} from './react/FeatureFlowProvider.js';