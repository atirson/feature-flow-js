import { FeatureStyles } from './feature-styles.js';
import { FeatureFloatingButton } from './feature-floating-button.js';
import { FeatureBottomSheet } from './feature-bottom-sheet.js';
import { FeatureSearch } from './feature-search.js';

export class FeatureTogglesUI {
  constructor({
    getFeatures,
    setOverride,
    clearAllOverrides,
    subscribe,
    getEnvironment,
    getEnvironments,
    positionKey = 'feature-toggles-button-position',
    forceShowKey = 'feature-toggles-force-show',
  }) {
    this.getFeatures = getFeatures;
    this.setOverride = setOverride;
    this.clearAllOverrides = clearAllOverrides;
    this.subscribe = subscribe;
    this.getEnvironment = getEnvironment;
    this.getEnvironments = getEnvironments;
    this.positionKey = positionKey;
    this.forceShowKey = forceShowKey;

    this.uiConfig = {
      position: 'bottom-right',
      theme: 'light',
      styles: {},
      hiddenInEnvironments: [],
      enableShortcut: true,
    };

    this.uiInitialized = false;
    this.floatingButton = null;
    this.bottomSheet = null;
    this.searchEngine = null;
    this.uiUnsub = null;
    this.revealHandler = null;
  }

  init(config = {}) {
    this.uiConfig = { ...this.uiConfig, ...config };

    if (typeof document === 'undefined') {
      console.warn('UI not available in this environment');
      return;
    }

    if (this.uiInitialized) return;

    this.searchEngine = new FeatureSearch({
      getFeatures: this.getFeatures,
      setOverride: this.setOverride,
    });

    FeatureStyles.inject();

    this.floatingButton = new FeatureFloatingButton({
      positionKey: this.positionKey,
      position: this.uiConfig.position,
      customStyles: this.uiConfig.styles,
      onClick: () => this.openBottomSheet(),
    });

    const buttonEl = this.floatingButton.render();
    document.body.appendChild(buttonEl);

    if (!this.shouldShowButton()) {
      buttonEl.style.display = 'none';
    }

    this.setupRevealShortcut();

    this.bottomSheet = new FeatureBottomSheet({
      theme: this.uiConfig.theme,
      getEnvironmentConfig: () => this.getEnvironmentConfig(),
      searchEngine: this.searchEngine,
      onResetAll: () => this.resetAllToggles(),
    });

    const sheetEl = this.bottomSheet.render();
    document.body.appendChild(sheetEl);

    this.subscribeUIHotReload();
    this.uiInitialized = true;
  }

  getEnvironmentConfig() {
    const currentEnv = this.getEnvironment();
    const envs = this.getEnvironments();
    return envs[currentEnv] || {
      label: String(currentEnv).toUpperCase(),
      color: '#6b7280',
    };
  }

  shouldShowButton() {
    const hidden = this.uiConfig.hiddenInEnvironments || [];
    if (!hidden.includes(this.getEnvironment())) return true;
    return this.isForceShowEnabled();
  }

  isForceShowEnabled() {
    if (typeof window !== 'undefined') {
      try {
        const p = new URLSearchParams(window.location.search).get('ff-ui');
        if (p === '1' || p === 'true') return true;
      } catch { /* noop */ }
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.forceShowKey) === 'true';
    }
    return false;
  }

  applyButtonVisibility() {
    if (typeof document === 'undefined') return;
    const btn = this.floatingButton?.element || document.querySelector('.ft-floating-button');
    if (!btn) return;
    btn.style.display = this.shouldShowButton() ? 'flex' : 'none';
  }

  setVisible(visible) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.forceShowKey, String(!!visible));
    }
    this.applyButtonVisibility();
  }

  toggleVisible() {
    const btn = this.floatingButton?.element || document.querySelector('.ft-floating-button');
    const isHidden = !btn || btn.style.display === 'none';
    this.setVisible(isHidden);
  }

  setupRevealShortcut() {
    if (this.uiConfig.enableShortcut === false || typeof document === 'undefined') return;
    this.revealHandler = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        this.toggleVisible();
      }
    };
    document.addEventListener('keydown', this.revealHandler);
  }

  subscribeUIHotReload() {
    if (this.uiUnsub) return;
    this.uiUnsub = this.subscribe(() => {
      const overlay = document.getElementById('ft-overlay');
      if (!overlay || !overlay.classList.contains('open')) return;
      const search = document.getElementById('ft-search');
      if (search && search.value) {
        this.searchEngine.filterFeatures(search.value);
      } else {
        this.searchEngine.renderFeatures();
      }
    });
  }

  updateEnvironmentBadge() {
    if (this.bottomSheet) {
      this.bottomSheet.updateEnvironmentBadge();
    }
  }

  openBottomSheet() {
    if (this.bottomSheet) {
      this.bottomSheet.open();
    }
  }

  resetAllToggles() {
    if (confirm('Are you sure you want to reset all manual configurations?')) {
      this.clearAllOverrides();

      const searchInput = document.getElementById('ft-search');
      if (searchInput) searchInput.value = '';

      if (this.searchEngine) {
        this.searchEngine.renderFeatures();
      }
    }
  }

  destroy() {
    if (this.floatingButton) {
      this.floatingButton.destroy();
      this.floatingButton = null;
    }

    if (this.bottomSheet) {
      this.bottomSheet.destroy();
      this.bottomSheet = null;
    }

    FeatureStyles.remove();

    if (this.revealHandler) {
      document.removeEventListener('keydown', this.revealHandler);
      this.revealHandler = null;
    }

    if (this.uiUnsub) {
      this.uiUnsub();
      this.uiUnsub = null;
    }

    this.searchEngine = null;
    this.uiInitialized = false;
  }
}