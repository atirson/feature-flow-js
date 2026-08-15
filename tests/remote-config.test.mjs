// tests/remote-config.test.mjs
//
// Behavioral coverage for src/core/remote-config.js.
//
// This module does NOT perform network requests itself - it only processes
// an already-fetched response object (delegating the actual merge to
// featureRegistry.applyRemoteFeatures). Tests below therefore use small
// stand-in featureRegistry/overrideManager collaborators rather than
// mocking fetch/network, matching the module's real responsibility.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RemoteConfigManager } from '../src/core/remote-config.js';

function makeFeatureRegistryStub(knownKeys = []) {
  const known = new Set(knownKeys);
  const applyCalls = [];
  return {
    known,
    applyCalls,
    hasFeature: (key) => known.has(key),
    applyRemoteFeatures: (response) => {
      applyCalls.push(response);
      const list = response?.features || response?.remoteFeature || [];
      const keys = list.map((i) => i.key).filter(Boolean);
      keys.forEach((k) => known.add(k));
      return keys;
    },
  };
}

describe('RemoteConfigManager: apply()', () => {
  test('delegates merging to featureRegistry.applyRemoteFeatures() and returns the applied keys', () => {
    const featureRegistry = makeFeatureRegistryStub();
    const manager = new RemoteConfigManager({ featureRegistry });

    const applied = manager.apply({ features: [{ key: 'a' }, { key: 'b' }] });

    assert.deepEqual(applied, ['a', 'b']);
    assert.equal(featureRegistry.applyCalls.length, 1);
  });

  test('apply() marks the manager as having applied remote config', () => {
    const featureRegistry = makeFeatureRegistryStub();
    const manager = new RemoteConfigManager({ featureRegistry });

    assert.equal(manager.shouldPruneAfterRemote(), false);
    manager.apply({ features: [] });
    assert.equal(manager.shouldPruneAfterRemote(), true);
  });

  test('apply() removes applied keys from the pending-unknown-keys set', () => {
    const featureRegistry = makeFeatureRegistryStub();
    const manager = new RemoteConfigManager({ featureRegistry });
    manager.pendingUnknownKeys.add('a');

    manager.apply({ features: [{ key: 'a' }] });

    assert.equal(manager.pendingUnknownKeys.has('a'), false);
  });

  test('apply() calls overrideManager.loadFromStorage() when an overrideManager is provided', () => {
    const featureRegistry = makeFeatureRegistryStub();
    let loadCalls = 0;
    const overrideManager = { loadFromStorage: () => { loadCalls += 1; } };
    const manager = new RemoteConfigManager({ featureRegistry, overrideManager });

    manager.apply({ features: [] });

    assert.equal(loadCalls, 1);
  });

  test('apply() does not throw when overrideManager is omitted or lacks loadFromStorage', () => {
    const featureRegistry = makeFeatureRegistryStub();
    const manager = new RemoteConfigManager({ featureRegistry });

    assert.doesNotThrow(() => manager.apply({ features: [] }));

    const manager2 = new RemoteConfigManager({ featureRegistry, overrideManager: {} });
    assert.doesNotThrow(() => manager2.apply({ features: [] }));
  });
});

describe('RemoteConfigManager: reportUnknownKey() / resolveFeature() (no window)', () => {
  test('reportUnknownKey() is a no-op in a non-browser (no window) environment', () => {
    // This repo's test suite runs under plain Node with no global `window`.
    assert.equal(typeof window, 'undefined');

    const featureRegistry = makeFeatureRegistryStub();
    const manager = new RemoteConfigManager({ featureRegistry });

    manager.reportUnknownKey('mystery-key');

    assert.equal(manager.pendingUnknownKeys.has('mystery-key'), false);
    assert.equal(manager.warnedUnknownKeys.has('mystery-key'), false);
  });

  test('resolveFeature() removes a key from pendingUnknownKeys regardless of environment', () => {
    const featureRegistry = makeFeatureRegistryStub();
    const manager = new RemoteConfigManager({ featureRegistry });
    manager.pendingUnknownKeys.add('key');

    manager.resolveFeature('key');

    assert.equal(manager.pendingUnknownKeys.has('key'), false);
  });
});

describe('RemoteConfigManager: reportUnknownKey() / warnUnknownOnce() (with window)', () => {
  function withWindow(fn) {
    const had = 'window' in globalThis;
    const prev = globalThis.window;
    globalThis.window = {};
    try {
      return fn();
    } finally {
      if (had) globalThis.window = prev;
      else delete globalThis.window;
    }
  }

  test('an unknown key reported before remote config was applied is queued, not warned immediately', () => {
    withWindow(() => {
      const featureRegistry = makeFeatureRegistryStub();
      const manager = new RemoteConfigManager({ featureRegistry, warningDelay: 10 });

      const calls = [];
      const originalWarn = console.warn;
      console.warn = (...args) => calls.push(args);
      try {
        manager.reportUnknownKey('mystery-key');
        assert.equal(manager.pendingUnknownKeys.has('mystery-key'), true);
        assert.equal(calls.length, 0, 'no warning is printed synchronously; it is deferred via scheduleUnknownKeysFlush()');
      } finally {
        console.warn = originalWarn;
        manager.clear(); // cancel the pending flush timer so it doesn't leak past the test
      }
    });
  });

  test('a known key (already registered) is never queued or warned about', () => {
    withWindow(() => {
      const featureRegistry = makeFeatureRegistryStub(['known-key']);
      const manager = new RemoteConfigManager({ featureRegistry });

      manager.reportUnknownKey('known-key');

      assert.equal(manager.pendingUnknownKeys.has('known-key'), false);
      manager.clear();
    });
  });

  test('once remote config has been applied, reportUnknownKey() warns immediately instead of queueing', () => {
    withWindow(() => {
      const featureRegistry = makeFeatureRegistryStub();
      const manager = new RemoteConfigManager({ featureRegistry });
      manager.markApplied();

      const calls = [];
      const originalWarn = console.warn;
      console.warn = (...args) => calls.push(args);
      try {
        manager.reportUnknownKey('late-key');
      } finally {
        console.warn = originalWarn;
      }

      assert.equal(calls.length, 1);
      assert.equal(manager.pendingUnknownKeys.has('late-key'), false);
      assert.equal(manager.warnedUnknownKeys.has('late-key'), true);
      manager.clear();
    });
  });

  test('warnUnknownOnce() only warns a given key a single time', () => {
    withWindow(() => {
      const featureRegistry = makeFeatureRegistryStub();
      const manager = new RemoteConfigManager({ featureRegistry });

      const calls = [];
      const originalWarn = console.warn;
      console.warn = (...args) => calls.push(args);
      try {
        manager.warnUnknownOnce('repeat-key');
        manager.warnUnknownOnce('repeat-key');
        manager.warnUnknownOnce('repeat-key');
      } finally {
        console.warn = originalWarn;
      }

      assert.equal(calls.length, 1);
      manager.clear();
    });
  });

  test('flushWarnings() (invoked synchronously by apply()) warns about keys still unknown after the remote merge', () => {
    withWindow(() => {
      const featureRegistry = makeFeatureRegistryStub();
      const manager = new RemoteConfigManager({ featureRegistry });
      manager.reportUnknownKey('never-registered');

      const calls = [];
      const originalWarn = console.warn;
      console.warn = (...args) => calls.push(args);
      try {
        manager.apply({ features: [{ key: 'some-other-key' }] });
      } finally {
        console.warn = originalWarn;
      }

      assert.equal(calls.length, 1, 'apply() synchronously flushes any still-unresolved pending unknown keys');
      assert.equal(manager.pendingUnknownKeys.size, 0);
      manager.clear();
    });
  });

  test('flushWarnings() does not warn about a key that was resolved (registered) before the flush', () => {
    withWindow(() => {
      const featureRegistry = makeFeatureRegistryStub();
      const manager = new RemoteConfigManager({ featureRegistry });
      manager.reportUnknownKey('will-be-registered');
      featureRegistry.known.add('will-be-registered');

      const calls = [];
      const originalWarn = console.warn;
      console.warn = (...args) => calls.push(args);
      try {
        manager.flushWarnings();
      } finally {
        console.warn = originalWarn;
      }

      assert.equal(calls.length, 0);
      manager.clear();
    });
  });
});

describe('RemoteConfigManager: clear()', () => {
  test('clear() resets remoteConfigApplied and clears pending/warned key sets', () => {
    const featureRegistry = makeFeatureRegistryStub();
    const manager = new RemoteConfigManager({ featureRegistry });
    manager.markApplied();
    manager.pendingUnknownKeys.add('a');
    manager.warnedUnknownKeys.add('b');

    manager.clear();

    assert.equal(manager.shouldPruneAfterRemote(), false);
    assert.equal(manager.pendingUnknownKeys.size, 0);
    assert.equal(manager.warnedUnknownKeys.size, 0);
  });

  test('clear() cancels a pending scheduled flush timer', () => {
    const had = 'window' in globalThis;
    const prev = globalThis.window;
    globalThis.window = {};
    try {
      const featureRegistry = makeFeatureRegistryStub();
      const manager = new RemoteConfigManager({ featureRegistry, warningDelay: 10000 });
      manager.reportUnknownKey('a');

      assert.ok(manager.flushTimer, 'a flush timer should have been scheduled');

      manager.clear();

      assert.equal(manager.flushTimer, null, 'clear() must cancel the pending timer so it does not fire/leak later');
    } finally {
      if (had) globalThis.window = prev;
      else delete globalThis.window;
    }
  });
});
