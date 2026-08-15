// tests/ui-feature-toggles-ui.test.mjs
//
// Behavioral coverage for src/ui/feature-toggles-ui.js (FeatureTogglesUI),
// the facade constructed by FeatureToggles.initUI().
//
// This repo's test suite runs under plain Node with no DOM (no jsdom
// dependency is available/authorized to add). Full rendering (`init()`
// actually building the button/sheet, `openBottomSheet()` showing content,
// etc.) requires a real `document` and is therefore NOT exercised here.
//
// What IS genuinely testable and asserted below:
//  - constructor wiring (pure, no DOM)
//  - init()'s documented SSR/no-DOM guard: it must not throw, must warn,
//    and must leave uiInitialized === false without constructing
//    floatingButton/bottomSheet
//  - getEnvironmentConfig() (pure logic over injected callbacks)
//  - shouldShowButton() / isForceShowEnabled() (pure logic gated by
//    typeof window / typeof localStorage)
//  - applyButtonVisibility() / setVisible() / updateEnvironmentBadge() /
//    openBottomSheet() / destroy(): documented as safe no-ops in this
//    environment because they are internally guarded by
//    `typeof document === 'undefined'` or by null-checking UI parts that
//    were never constructed
//  - a documented, genuinely observed defect: toggleVisible() is NOT
//    guarded and throws ReferenceError in a no-DOM environment even when
//    the UI was never rendered - see the dedicated describe block below.
//  - core<->ui integration: FeatureToggles.initUI() wires real, live
//    closures (getFeatures/setOverride/clearAllOverrides/subscribe/
//    getEnvironment/getEnvironments) into FeatureTogglesUI that reflect
//    actual core state, not static snapshots.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FeatureTogglesUI } from '../src/ui/feature-toggles-ui.js';
import { FeatureToggles } from '../src/core/feature-toggles.js';

function makeCollaborators(overrides = {}) {
  return {
    getFeatures: () => [],
    setOverride: () => {},
    clearAllOverrides: () => {},
    subscribe: () => () => {},
    getEnvironment: () => 'dev',
    getEnvironments: () => ({ dev: { label: 'DEV', color: '#3b82f6' } }),
    ...overrides,
  };
}

describe('FeatureTogglesUI: constructor', () => {
  test('stores injected collaborators and starts with a clean, un-initialized internal state', () => {
    const collaborators = makeCollaborators();

    const ui = new FeatureTogglesUI(collaborators);

    assert.equal(ui.getFeatures, collaborators.getFeatures);
    assert.equal(ui.setOverride, collaborators.setOverride);
    assert.equal(ui.clearAllOverrides, collaborators.clearAllOverrides);
    assert.equal(ui.subscribe, collaborators.subscribe);
    assert.equal(ui.getEnvironment, collaborators.getEnvironment);
    assert.equal(ui.getEnvironments, collaborators.getEnvironments);
    assert.equal(ui.uiInitialized, false);
    assert.equal(ui.floatingButton, null);
    assert.equal(ui.bottomSheet, null);
    assert.equal(ui.searchEngine, null);
    assert.equal(ui.uiUnsub, null);
    assert.equal(ui.revealHandler, null);
  });

  test('positionKey/forceShowKey default when not provided', () => {
    const ui = new FeatureTogglesUI(makeCollaborators());

    assert.equal(ui.positionKey, 'feature-toggles-button-position');
    assert.equal(ui.forceShowKey, 'feature-toggles-force-show');
  });

  test('positionKey/forceShowKey are overridable', () => {
    const ui = new FeatureTogglesUI(makeCollaborators({}));
    const custom = new FeatureTogglesUI({
      ...makeCollaborators(),
      positionKey: 'custom-position',
      forceShowKey: 'custom-force-show',
    });

    assert.equal(custom.positionKey, 'custom-position');
    assert.equal(custom.forceShowKey, 'custom-force-show');
    assert.notEqual(custom.positionKey, ui.positionKey);
  });

  test('default uiConfig matches documented defaults', () => {
    const ui = new FeatureTogglesUI(makeCollaborators());

    assert.deepEqual(ui.uiConfig, {
      position: 'bottom-right',
      theme: 'light',
      styles: {},
      hiddenInEnvironments: [],
      enableShortcut: true,
    });
  });
});

describe('FeatureTogglesUI: init() SSR/no-DOM guard', () => {
  test('does not throw, warns, and leaves the UI un-constructed when document is unavailable', () => {
    const ui = new FeatureTogglesUI(makeCollaborators());

    const calls = [];
    const originalWarn = console.warn;
    console.warn = (...args) => calls.push(args);
    try {
      assert.doesNotThrow(() => ui.init());
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(calls.length, 1);
    assert.match(String(calls[0][0]), /UI not available in this environment/);
    assert.equal(ui.uiInitialized, false);
    assert.equal(ui.floatingButton, null, 'floatingButton must not be constructed when document is unavailable');
    assert.equal(ui.bottomSheet, null, 'bottomSheet must not be constructed when document is unavailable');
  });

  test('merges the provided config into uiConfig even when the DOM guard short-circuits the rest of init()', () => {
    const ui = new FeatureTogglesUI(makeCollaborators());
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      ui.init({ theme: 'dark', position: 'top-left' });
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(ui.uiConfig.theme, 'dark');
    assert.equal(ui.uiConfig.position, 'top-left');
  });
});

describe('FeatureTogglesUI: getEnvironmentConfig()', () => {
  test('returns the configured environment entry when present', () => {
    const ui = new FeatureTogglesUI(
      makeCollaborators({
        getEnvironment: () => 'prod',
        getEnvironments: () => ({ prod: { label: 'PROD', color: '#10b981' } }),
      })
    );

    assert.deepEqual(ui.getEnvironmentConfig(), { label: 'PROD', color: '#10b981' });
  });

  test('falls back to an uppercased-name/gray default when the environment is not in the map', () => {
    const ui = new FeatureTogglesUI(
      makeCollaborators({
        getEnvironment: () => 'staging',
        getEnvironments: () => ({}),
      })
    );

    assert.deepEqual(ui.getEnvironmentConfig(), { label: 'STAGING', color: '#6b7280' });
  });
});

describe('FeatureTogglesUI: shouldShowButton() / isForceShowEnabled() (no window/localStorage)', () => {
  test('shows the button by default when the current environment is not hidden', () => {
    const ui = new FeatureTogglesUI(makeCollaborators({ getEnvironment: () => 'dev' }));
    ui.uiConfig.hiddenInEnvironments = [];

    assert.equal(ui.shouldShowButton(), true);
  });

  test('hides the button when the current environment is in hiddenInEnvironments and force-show is not enabled', () => {
    const ui = new FeatureTogglesUI(makeCollaborators({ getEnvironment: () => 'prod' }));
    ui.uiConfig.hiddenInEnvironments = ['prod'];

    assert.equal(ui.shouldShowButton(), false);
  });

  test('isForceShowEnabled() is false when neither window nor localStorage exist', () => {
    assert.equal(typeof window, 'undefined');
    assert.equal(typeof localStorage, 'undefined');

    const ui = new FeatureTogglesUI(makeCollaborators());

    assert.equal(ui.isForceShowEnabled(), false);
  });

  test('isForceShowEnabled() reads the forceShowKey from localStorage when available', () => {
    const store = new Map();
    const hadLocalStorage = 'localStorage' in globalThis;
    const prevLocalStorage = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    };

    try {
      const ui = new FeatureTogglesUI(makeCollaborators({}));
      assert.equal(ui.isForceShowEnabled(), false, 'nothing persisted yet');

      store.set(ui.forceShowKey, 'true');
      assert.equal(ui.isForceShowEnabled(), true);
    } finally {
      if (hadLocalStorage) globalThis.localStorage = prevLocalStorage;
      else delete globalThis.localStorage;
    }
  });
});

describe('FeatureTogglesUI: guarded no-op methods in a no-DOM environment', () => {
  test('applyButtonVisibility() is a safe no-op without document', () => {
    const ui = new FeatureTogglesUI(makeCollaborators());
    assert.doesNotThrow(() => ui.applyButtonVisibility());
  });

  test('setVisible() is a safe no-op without document/localStorage', () => {
    const ui = new FeatureTogglesUI(makeCollaborators());
    assert.doesNotThrow(() => ui.setVisible(true));
    assert.doesNotThrow(() => ui.setVisible(false));
  });

  test('updateEnvironmentBadge() is a safe no-op without document', () => {
    const ui = new FeatureTogglesUI(makeCollaborators());
    assert.doesNotThrow(() => ui.updateEnvironmentBadge());
  });

  test('openBottomSheet() is a safe no-op when bottomSheet was never constructed', () => {
    const ui = new FeatureTogglesUI(makeCollaborators());
    assert.equal(ui.bottomSheet, null);
    assert.doesNotThrow(() => ui.openBottomSheet());
  });

  test('destroy() is a safe no-op when nothing was ever constructed', () => {
    const ui = new FeatureTogglesUI(makeCollaborators());
    assert.doesNotThrow(() => ui.destroy());
    assert.equal(ui.uiInitialized, false);
  });
});

describe('FeatureTogglesUI: documented defect - toggleVisible() is unguarded', () => {
  test('toggleVisible() throws ReferenceError in a no-DOM environment (real, observed behavior, not fixed here)', () => {
    // Unlike applyButtonVisibility()/setVisible()/updateEnvironmentBadge(),
    // toggleVisible() has no `typeof document === 'undefined'` guard: when
    // `this.floatingButton` is null (as it always is here, since init()
    // bails out before constructing it), it falls through to
    // `document.querySelector(...)`, which throws because `document` is not
    // declared at all under plain Node/SSR. This is a genuine latent gap in
    // src/ui/feature-toggles-ui.js, reported rather than silently patched,
    // per this task's testing-only scope.
    const ui = new FeatureTogglesUI(makeCollaborators());

    assert.throws(() => ui.toggleVisible(), ReferenceError);
  });
});

describe('FeatureTogglesUI: core<->ui integration via FeatureToggles.initUI()', () => {
  test('initUI() wires live closures over real core state (getFeatures/getEnvironment reflect the core instance, not a snapshot)', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'flag', defaultEnabled: true });

    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      toggles.initUI();
    } finally {
      console.warn = originalWarn;
    }

    assert.ok(toggles.ui instanceof FeatureTogglesUI);

    // getFeatures() must be a live closure, not a one-time snapshot.
    assert.deepEqual(
      toggles.ui.getFeatures().map((f) => f.key),
      ['flag']
    );
    toggles.registerFeature({ key: 'flag-2', defaultEnabled: false });
    assert.deepEqual(
      toggles.ui.getFeatures().map((f) => f.key).sort(),
      ['flag', 'flag-2']
    );

    // getEnvironment() reflects live core state after setEnvironment().
    assert.equal(toggles.ui.getEnvironment(), 'dev');
    toggles.setEnvironment('prod');
    assert.equal(toggles.ui.getEnvironment(), 'prod');

    // getEnvironments() reflects the same object the core exposes.
    assert.equal(toggles.ui.getEnvironments(), toggles.environments);
  });

  test('initUI() wires setOverride()/clearAllOverrides() closures that actually mutate core state', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'flag', defaultEnabled: false });
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      toggles.initUI();
    } finally {
      console.warn = originalWarn;
    }

    toggles.ui.setOverride('flag', true);
    assert.equal(toggles.isEnabled('flag'), true, 'the UI-wired setOverride closure mutates real core override state');

    toggles.ui.clearAllOverrides();
    assert.equal(toggles.isEnabled('flag'), false, 'the UI-wired clearAllOverrides closure mutates real core override state');
  });

  test('initUI() wires a subscribe() closure that delivers real core notifications', () => {
    const toggles = new FeatureToggles();
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      toggles.initUI();
    } finally {
      console.warn = originalWarn;
    }

    const received = [];
    const unsubscribe = toggles.ui.subscribe((features) => received.push(features));

    toggles.registerFeature({ key: 'flag' });

    assert.equal(received.length, 1);
    assert.equal(received[0][0].key, 'flag');

    unsubscribe();
    toggles.registerFeature({ key: 'flag-2' });
    assert.equal(received.length, 1, 'unsubscribing via the UI-wired closure stops delivery');
  });

  test('initUI() is idempotent: a second call does not reconstruct or rewire the ui instance', () => {
    const toggles = new FeatureToggles();
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      toggles.initUI();
      const firstUiRef = toggles.ui;

      toggles.initUI();

      assert.equal(toggles.ui, firstUiRef);
    } finally {
      console.warn = originalWarn;
    }
  });
});
