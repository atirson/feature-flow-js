// tests/feature-toggles.test.mjs
//
// Behavioral coverage for src/core/feature-toggles.js - the main
// orchestrator that wires together FeatureRegistry, OverrideManager,
// RemoteConfigManager and SubscriptionManager behind the public
// FeatureToggles class.
//
// These tests instantiate `new FeatureToggles()` directly (rather than
// importing the shared `featureToggles` singleton) so every test starts
// from a clean, isolated instance. This repo has no window/localStorage
// under plain Node; where persistence/window-dependent integration needs to
// be exercised, we install a minimal in-memory window/localStorage shim,
// matching the pattern already established in tests/core.test.mjs and
// tests/override-manager.test.mjs.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FeatureToggles } from '../src/core/feature-toggles.js';

function installWindowShim() {
  const store = new Map();
  const fakeLocalStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    get length() {
      return store.size;
    },
    key: (i) => Array.from(store.keys())[i],
  };

  const hadWindow = 'window' in globalThis;
  const hadLocalStorage = 'localStorage' in globalThis;
  const prevWindow = globalThis.window;
  const prevLocalStorage = globalThis.localStorage;

  globalThis.window = {};
  globalThis.localStorage = fakeLocalStorage;

  return {
    store,
    restore() {
      if (hadWindow) globalThis.window = prevWindow;
      else delete globalThis.window;
      if (hadLocalStorage) globalThis.localStorage = prevLocalStorage;
      else delete globalThis.localStorage;
    },
  };
}

describe('FeatureToggles: initialization', () => {
  test('constructs with documented defaults and empty state', () => {
    const toggles = new FeatureToggles();

    assert.equal(toggles.environment, 'dev');
    assert.equal(toggles.storagePrefix, 'feature-toggles');
    assert.deepEqual(toggles.context, {});
    assert.equal(toggles.ui, null);
    assert.deepEqual(toggles.getAllFeatures(), []);
    assert.deepEqual(Object.keys(toggles.environments).sort(), ['dev', 'hml', 'prod']);
    assert.equal(toggles.environments.dev.label, 'DEV');
    assert.equal(toggles.environments.prod.label, 'PROD');
  });

  test('collaborators are wired together (registry/overrides/remote/subscriptions)', () => {
    const toggles = new FeatureToggles();

    assert.ok(toggles.featureRegistry);
    assert.ok(toggles.overrideManager);
    assert.ok(toggles.remoteConfig);
    assert.ok(toggles.subscriptionManager);
    assert.equal(toggles.remoteConfig.featureRegistry, toggles.featureRegistry);
    assert.equal(toggles.remoteConfig.overrideManager, toggles.overrideManager);
    assert.equal(toggles.overrideManager.environment, 'dev');
  });
});

describe('FeatureToggles: registration', () => {
  test('registerFeature() delegates to featureRegistry and is queryable via getAllFeatures()', () => {
    const toggles = new FeatureToggles();

    toggles.registerFeature({ key: 'flag-a', defaultEnabled: true });

    const all = toggles.getAllFeatures();
    assert.equal(all.length, 1);
    assert.equal(all[0].key, 'flag-a');
    assert.equal(all[0].defaultEnabled, true);
  });

  test('registerFeatures() registers every config in the array', () => {
    const toggles = new FeatureToggles();

    toggles.registerFeatures([{ key: 'a' }, { key: 'b' }, { key: 'c' }]);

    assert.deepEqual(
      toggles.getAllFeatures().map((f) => f.key).sort(),
      ['a', 'b', 'c']
    );
  });

  test('registerFeatures(undefined) is a safe no-op', () => {
    const toggles = new FeatureToggles();

    assert.doesNotThrow(() => toggles.registerFeatures(undefined));
    assert.deepEqual(toggles.getAllFeatures(), []);
  });

  test('registerFeature() triggers a subscriber notification', () => {
    const toggles = new FeatureToggles();
    const received = [];
    toggles.subscribe((features) => received.push(features));

    toggles.registerFeature({ key: 'flag-a' });

    assert.equal(received.length, 1);
    assert.equal(received[0][0].key, 'flag-a');
  });
});

describe('FeatureToggles: isEnabled() evaluation order', () => {
  test('an unregistered key evaluates to false', () => {
    const toggles = new FeatureToggles();

    assert.equal(toggles.isEnabled('never-registered'), false);
  });

  test('defaultEnabled is used when there is no rolloutRule and no override', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'on', defaultEnabled: true });
    toggles.registerFeature({ key: 'off', defaultEnabled: false });

    assert.equal(toggles.isEnabled('on'), true);
    assert.equal(toggles.isEnabled('off'), false);
  });

  test('rolloutRule takes precedence over defaultEnabled when there is no override', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({
      key: 'rule-flag',
      defaultEnabled: false,
      rolloutRule: (ctx) => ctx.isBeta === true,
    });

    assert.equal(toggles.isEnabled('rule-flag'), false, 'default context has no isBeta');
    assert.equal(toggles.isEnabled('rule-flag', { isBeta: true }), true, 'per-call context is merged in');
  });

  test('setContext() merges into the persistent context used by every isEnabled() call', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({
      key: 'rule-flag',
      defaultEnabled: false,
      rolloutRule: (ctx) => ctx.isBeta === true,
    });

    toggles.setContext({ isBeta: true });

    assert.equal(toggles.isEnabled('rule-flag'), true, 'persistent context alone satisfies the rule');
  });

  test('a rolloutRule that throws falls back to defaultEnabled', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({
      key: 'broken-rule',
      defaultEnabled: true,
      rolloutRule: () => {
        throw new Error('boom');
      },
    });

    assert.equal(toggles.isEnabled('broken-rule'), true, 'falls back to defaultEnabled=true on throw');

    toggles.registerFeature({
      key: 'broken-rule-2',
      defaultEnabled: false,
      rolloutRule: () => {
        throw new Error('boom');
      },
    });
    assert.equal(toggles.isEnabled('broken-rule-2'), false, 'falls back to defaultEnabled=false on throw');
  });

  test('an override takes precedence over both rolloutRule and defaultEnabled', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({
      key: 'flag',
      defaultEnabled: false,
      rolloutRule: () => false,
    });
    assert.equal(toggles.isEnabled('flag'), false);

    toggles.setOverride('flag', true);
    assert.equal(toggles.isEnabled('flag'), true, 'override wins over rolloutRule/defaultEnabled');
  });

  test('an override is honored even for a key that was never registered', () => {
    const toggles = new FeatureToggles();

    toggles.setOverride('ghost-flag', true);

    assert.equal(toggles.isEnabled('ghost-flag'), true, 'override precedence is checked before the registry lookup');
  });
});

describe('FeatureToggles: overrides via the public API', () => {
  test('setOverride()/clearOverride() round-trip through isEnabled()', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'flag', defaultEnabled: false });

    toggles.setOverride('flag', true);
    assert.equal(toggles.isEnabled('flag'), true);

    toggles.clearOverride('flag');
    assert.equal(toggles.isEnabled('flag'), false, 'reverts to defaultEnabled once the override is cleared');
  });

  test('clearAllOverrides() removes every active override', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'a', defaultEnabled: false });
    toggles.registerFeature({ key: 'b', defaultEnabled: false });
    toggles.setOverride('a', true);
    toggles.setOverride('b', true);

    toggles.clearAllOverrides();

    assert.equal(toggles.isEnabled('a'), false);
    assert.equal(toggles.isEnabled('b'), false);
  });

  test('setOverride()/clearOverride()/clearAllOverrides() each trigger a subscriber notification', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'flag', defaultEnabled: false });
    let notifyCount = 0;
    toggles.subscribe(() => {
      notifyCount += 1;
    });

    toggles.setOverride('flag', true);
    toggles.clearOverride('flag');
    toggles.clearAllOverrides();

    assert.equal(notifyCount, 3);
  });
});

describe('FeatureToggles: setEnvironment()', () => {
  test('switching to a different environment clears in-memory overrides (no window persistence available)', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'flag', defaultEnabled: false });
    toggles.setOverride('flag', true);
    assert.equal(toggles.isEnabled('flag'), true);

    toggles.setEnvironment('prod');

    assert.equal(toggles.environment, 'prod');
    assert.equal(toggles.isEnabled('flag'), false, 'override does not carry over to a new environment scope');
  });

  test('setting the same environment again does not clear existing overrides', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'flag', defaultEnabled: false });
    toggles.setOverride('flag', true);

    toggles.setEnvironment('dev'); // already 'dev' -> previousEnv === env

    assert.equal(toggles.isEnabled('flag'), true, 'override survives a same-environment no-op call');
  });

  test('passing a label/color config registers or updates the environments map', () => {
    const toggles = new FeatureToggles();

    toggles.setEnvironment('staging', { label: 'Staging', color: '#123456' });

    assert.deepEqual(toggles.environments.staging, { label: 'Staging', color: '#123456' });
  });

  test('an environment config without label/color falls back to defaults derived from the env name', () => {
    const toggles = new FeatureToggles();

    toggles.setEnvironment('qa', { color: '#abcdef' });

    assert.equal(toggles.environments.qa.label, 'QA');
    assert.equal(toggles.environments.qa.color, '#abcdef');
  });

  test('does not throw when no UI has been initialized', () => {
    const toggles = new FeatureToggles();

    assert.doesNotThrow(() => toggles.setEnvironment('prod'));
  });

  test('refreshes the UI badge/visibility hooks when a UI has been initialized', () => {
    const toggles = new FeatureToggles();
    toggles.initUI(); // constructs toggles.ui (no-DOM: init() itself bails out early, but ui exists)

    assert.ok(toggles.ui);
    assert.doesNotThrow(() => toggles.setEnvironment('prod'));
  });
});

describe('FeatureToggles: applyRemoteFeatures()', () => {
  test('merges remote features into the registry and returns `this` for chaining', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'local-flag', defaultEnabled: false });

    const result = toggles.applyRemoteFeatures({
      features: [{ key: 'local-flag', defaultEnabled: true }, { key: 'remote-only', defaultEnabled: true }],
    });

    assert.equal(result, toggles, 'applyRemoteFeatures() returns the instance for chaining');
    assert.equal(toggles.isEnabled('local-flag'), true);
    assert.equal(toggles.isEnabled('remote-only'), true);
    assert.equal(toggles.getAllFeatures().find((f) => f.key === 'remote-only').remote, true);
  });

  test('applyRemoteFeatures() triggers a subscriber notification', () => {
    const toggles = new FeatureToggles();
    let notifyCount = 0;
    toggles.subscribe(() => {
      notifyCount += 1;
    });

    toggles.applyRemoteFeatures({ features: [{ key: 'remote-flag' }] });

    assert.equal(notifyCount, 1);
  });
});

describe('FeatureToggles: getAllFeatures() computed fields', () => {
  test('currentState reflects isEnabled() for each feature', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'on', defaultEnabled: true });
    toggles.registerFeature({ key: 'off', defaultEnabled: false });

    const all = toggles.getAllFeatures();
    assert.equal(all.find((f) => f.key === 'on').currentState, true);
    assert.equal(all.find((f) => f.key === 'off').currentState, false);
  });

  test('hasOverride/overrideValue reflect the override manager state', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'flag', defaultEnabled: false });

    let feature = toggles.getAllFeatures()[0];
    assert.equal(feature.hasOverride, false);
    assert.equal(feature.overrideValue, undefined);

    toggles.setOverride('flag', false); // deliberately a falsy override value
    feature = toggles.getAllFeatures()[0];
    assert.equal(feature.hasOverride, true);
    assert.equal(feature.overrideValue, false, 'a falsy override (false) must not be coerced to undefined by ??');

    toggles.setOverride('flag', true);
    feature = toggles.getAllFeatures()[0];
    assert.equal(feature.overrideValue, true);
  });

  test('isExpired is computed from expiredAt relative to now', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'past', expiredAt: '2000-01-01T00:00:00Z' });
    toggles.registerFeature({ key: 'future', expiredAt: '2999-01-01T00:00:00Z' });
    toggles.registerFeature({ key: 'no-expiry' });

    const all = toggles.getAllFeatures();
    assert.equal(all.find((f) => f.key === 'past').isExpired, true);
    assert.equal(all.find((f) => f.key === 'future').isExpired, false);
    assert.equal(all.find((f) => f.key === 'no-expiry').isExpired, false);
  });
});

describe('FeatureToggles: clearFeatures() / clearStorage() / pruneStaleOverrides()', () => {
  test('clearFeatures() empties the registry', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'a' });
    toggles.registerFeature({ key: 'b' });

    toggles.clearFeatures();

    assert.deepEqual(toggles.getAllFeatures(), []);
  });

  test('clearStorage() clears in-memory overrides, notifies subscribers, and returns the removed key list', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'flag', defaultEnabled: false });
    toggles.setOverride('flag', true);

    let notifyCount = 0;
    toggles.subscribe(() => {
      notifyCount += 1;
    });

    const removedKeys = toggles.clearStorage();

    assert.deepEqual(removedKeys, [], 'no window/localStorage is available in this environment');
    assert.equal(toggles.isEnabled('flag'), false, 'in-memory overrides are cleared regardless of window availability');
    assert.equal(notifyCount, 1);
  });

  test('pruneStaleOverrides() removes overrides for keys no longer present in the registry', () => {
    const toggles = new FeatureToggles();
    toggles.registerFeature({ key: 'known', defaultEnabled: false });
    toggles.setOverride('known', true);
    toggles.setOverride('stale', true); // never registered

    const removed = toggles.pruneStaleOverrides();

    assert.deepEqual(removed, ['stale']);
    assert.equal(toggles.overrideManager.hasOverride('known'), true);
    assert.equal(toggles.overrideManager.hasOverride('stale'), false);
  });
});

describe('FeatureToggles: subscribe()', () => {
  test('subscribe() returns an unsubscribe function that stops further notifications', () => {
    const toggles = new FeatureToggles();
    const received = [];
    const unsubscribe = toggles.subscribe((features) => received.push(features));

    toggles.registerFeature({ key: 'a' });
    unsubscribe();
    toggles.registerFeature({ key: 'b' });

    assert.equal(received.length, 1, 'no notification is delivered after unsubscribe()');
  });

  test('multiple subscribers are all notified with the same computed feature list', () => {
    const toggles = new FeatureToggles();
    const a = [];
    const b = [];
    toggles.subscribe((features) => a.push(features));
    toggles.subscribe((features) => b.push(features));

    toggles.registerFeature({ key: 'flag' });

    assert.equal(a.length, 1);
    assert.equal(b.length, 1);
    assert.deepEqual(a[0], b[0]);
  });
});

describe('FeatureToggles: core-to-core integration (registry <-> remote-config)', () => {
  test('registerFeature() resolves any pending "unknown key" warning tracked by remoteConfig', () => {
    const shim = installWindowShim();
    try {
      const toggles = new FeatureToggles();

      try {
        // Evaluating an unregistered key queues it as a pending unknown key.
        toggles.isEnabled('late-flag');
        assert.equal(toggles.remoteConfig.pendingUnknownKeys.has('late-flag'), true);

        // Registering the feature must resolve (dequeue) it before the
        // deferred warning flush fires.
        toggles.registerFeature({ key: 'late-flag', defaultEnabled: false });
        assert.equal(toggles.remoteConfig.pendingUnknownKeys.has('late-flag'), false);

        const calls = [];
        const originalWarn = console.warn;
        console.warn = (...args) => calls.push(args);
        try {
          toggles.remoteConfig.flushWarnings();
        } finally {
          console.warn = originalWarn;
        }
        assert.equal(calls.length, 0, 'a resolved key must not be warned about once flushed');
      } finally {
        toggles.remoteConfig.clear(); // cancel the pending flush timer so it doesn't leak past the test
      }
    } finally {
      shim.restore();
    }
  });

  test('applyRemoteFeatures() reloads overrides from storage via overrideManager integration', () => {
    const shim = installWindowShim();
    try {
      const writerPrefix = 'feature-toggles';
      shim.store.set(`${writerPrefix}-overrides:dev`, JSON.stringify({ 'remote-flag': true }));

      const toggles = new FeatureToggles(); // constructor already calls loadFromStorage() once
      assert.equal(toggles.overrideManager.hasOverride('remote-flag'), true, 'sanity: constructor loaded the persisted override');

      // Simulate another tab/process changing localStorage, then a remote
      // sync should pick up the latest persisted overrides again.
      shim.store.set(`${writerPrefix}-overrides:dev`, JSON.stringify({ 'remote-flag': false, 'another-flag': true }));

      toggles.applyRemoteFeatures({ features: [{ key: 'remote-flag', defaultEnabled: false }] });

      assert.equal(toggles.overrideManager.getOverride('remote-flag'), false);
      assert.equal(toggles.overrideManager.getOverride('another-flag'), true);
    } finally {
      shim.restore();
    }
  });
});
