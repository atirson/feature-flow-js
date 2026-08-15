// tests/override-manager.test.mjs
//
// Behavioral coverage for src/core/override-manager.js: in-memory override
// CRUD, localStorage persistence (guarded by `typeof window`), invalid
// persisted JSON, environment switching, and clearAllStorage/pruneStale.
//
// This repo has no window/localStorage under plain Node. Where persistence
// needs to be exercised, we install a minimal in-memory window/localStorage
// shim, reusing the exact pattern already established in tests/core.test.mjs
// (save/restore globalThis.window and globalThis.localStorage around each
// test that needs them).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OverrideManager } from '../src/core/override-manager.js';

function installLocalStorageShim() {
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

  // NOTE: clearAllStorage() specifically checks `window.localStorage`
  // (unlike loadFromStorage()/saveToStorage(), which check the bare global
  // `localStorage`). In a real browser these are the same object, so the
  // shim must expose it on both `window.localStorage` and the bare global
  // to faithfully emulate that environment.
  globalThis.window = { localStorage: fakeLocalStorage };
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

describe('OverrideManager: in-memory CRUD (no window required)', () => {
  test('setOverride()/getOverride()/hasOverride() round-trip', () => {
    const manager = new OverrideManager();

    assert.equal(manager.hasOverride('flag'), false);

    manager.setOverride('flag', true);

    assert.equal(manager.hasOverride('flag'), true);
    assert.equal(manager.getOverride('flag'), true);
  });

  test('clearOverride() removes a single override', () => {
    const manager = new OverrideManager();
    manager.setOverride('a', true);
    manager.setOverride('b', false);

    manager.clearOverride('a');

    assert.equal(manager.hasOverride('a'), false);
    assert.equal(manager.hasOverride('b'), true);
  });

  test('clearAll() removes every override', () => {
    const manager = new OverrideManager();
    manager.setOverride('a', true);
    manager.setOverride('b', false);

    manager.clearAll();

    assert.equal(manager.hasOverride('a'), false);
    assert.equal(manager.hasOverride('b'), false);
  });

  test('getAll() returns an independent copy of the overrides map', () => {
    const manager = new OverrideManager();
    manager.setOverride('a', true);

    const copy = manager.getAll();
    copy.set('b', true);

    assert.equal(manager.hasOverride('b'), false, 'mutating the returned map must not affect internal state');
  });

  test('storageKey is derived from storagePrefix and environment', () => {
    const manager = new OverrideManager({ storagePrefix: 'custom-prefix', environment: 'hml' });

    assert.equal(manager.storageKey, 'custom-prefix-overrides:hml');
  });
});

describe('OverrideManager: pruneStale()', () => {
  test('removes overrides for keys the predicate reports as no-longer-registered', () => {
    const manager = new OverrideManager();
    manager.setOverride('known', true);
    manager.setOverride('stale', true);

    const removed = manager.pruneStale((key) => key === 'known');

    assert.deepEqual(removed, ['stale']);
    assert.equal(manager.hasOverride('known'), true);
    assert.equal(manager.hasOverride('stale'), false);
  });

  test('returns an empty array and does not touch state when nothing is stale', () => {
    const manager = new OverrideManager();
    manager.setOverride('known', true);

    const removed = manager.pruneStale(() => true);

    assert.deepEqual(removed, []);
    assert.equal(manager.hasOverride('known'), true);
  });
});

describe('OverrideManager: no-window (SSR/Node) persistence behavior', () => {
  test('loadFromStorage() is a safe no-op without window and leaves existing in-memory overrides untouched', () => {
    const manager = new OverrideManager();
    manager.setOverride('flag', true);

    assert.doesNotThrow(() => manager.loadFromStorage());
    assert.equal(manager.hasOverride('flag'), true, 'loadFromStorage() returns before clearing when there is no window');
  });

  test('saveToStorage() is a safe no-op without window', () => {
    const manager = new OverrideManager();
    manager.setOverride('flag', true);

    assert.doesNotThrow(() => manager.saveToStorage());
  });

  test('clearAllStorage() still clears in-memory overrides and returns an empty key list without window', () => {
    const manager = new OverrideManager();
    manager.setOverride('flag', true);

    const removedKeys = manager.clearAllStorage();

    assert.deepEqual(removedKeys, []);
    assert.equal(manager.hasOverride('flag'), false, 'in-memory overrides are cleared regardless of window availability');
  });

  test('switchEnvironment() clears in-memory overrides even without window persistence available', () => {
    const manager = new OverrideManager({ environment: 'dev' });
    manager.setOverride('flag', true);

    manager.switchEnvironment('prod');

    assert.equal(manager.environment, 'prod');
    assert.equal(manager.hasOverride('flag'), false);
  });
});

describe('OverrideManager: with window/localStorage present', () => {
  test('setOverride() persists to localStorage under the environment-scoped key', () => {
    const shim = installLocalStorageShim();
    try {
      const manager = new OverrideManager({ storagePrefix: 'feature-toggles', environment: 'dev' });
      manager.setOverride('flag', true);

      assert.ok(shim.store.has('feature-toggles-overrides:dev'));
      assert.deepEqual(JSON.parse(shim.store.get('feature-toggles-overrides:dev')), { flag: true });
    } finally {
      shim.restore();
    }
  });

  test('clearOverride()/clearAll() remove the localStorage entry once no overrides remain', () => {
    const shim = installLocalStorageShim();
    try {
      const manager = new OverrideManager({ environment: 'dev' });
      manager.setOverride('flag', true);
      assert.ok(shim.store.has(manager.storageKey));

      manager.clearOverride('flag');

      assert.equal(shim.store.has(manager.storageKey), false, 'saveToStorage() removes the key when the override set becomes empty');
    } finally {
      shim.restore();
    }
  });

  test('loadFromStorage() loads previously persisted overrides, replacing in-memory state', () => {
    const shim = installLocalStorageShim();
    try {
      const writer = new OverrideManager({ environment: 'dev' });
      writer.setOverride('flag-a', true);
      writer.setOverride('flag-b', false);

      const reader = new OverrideManager({ environment: 'dev' });
      // Seed an in-memory-only override directly on the internal map rather
      // than via setOverride(), since setOverride() always persists
      // (saveToStorage()) as a side effect and would otherwise clobber the
      // writer's already-persisted data (both instances share the same
      // storageKey: 'feature-toggles-overrides:dev') before loadFromStorage()
      // is even called.
      reader.overrides.set('stale-in-memory-only', true);
      reader.loadFromStorage();

      assert.equal(reader.hasOverride('flag-a'), true);
      assert.equal(reader.getOverride('flag-b'), false);
      assert.equal(reader.hasOverride('stale-in-memory-only'), false, 'loadFromStorage() clears existing in-memory overrides first');
    } finally {
      shim.restore();
    }
  });

  test('loadFromStorage() degrades gracefully (does not throw) on malformed persisted JSON', () => {
    const shim = installLocalStorageShim();
    try {
      shim.store.set('feature-toggles-overrides:dev', '{not valid json');
      const manager = new OverrideManager({ environment: 'dev' });

      const originalConsoleWarn = console.warn;
      console.warn = () => {};
      try {
        assert.doesNotThrow(() => manager.loadFromStorage());
      } finally {
        console.warn = originalConsoleWarn;
      }

      assert.equal(manager.overrides.size, 0, 'overrides remain empty (already cleared) after a failed parse');
    } finally {
      shim.restore();
    }
  });

  test('clearAllStorage() removes only keys matching storagePrefix and returns the removed keys', () => {
    const shim = installLocalStorageShim();
    try {
      shim.store.set('feature-toggles-overrides:dev', '{}');
      shim.store.set('feature-toggles-overrides:prod', '{}');
      shim.store.set('unrelated-app-key', 'keep-me');

      const manager = new OverrideManager({ storagePrefix: 'feature-toggles', environment: 'dev' });
      manager.setOverride('flag', true);

      const removedKeys = manager.clearAllStorage();

      assert.ok(removedKeys.includes('feature-toggles-overrides:dev'));
      assert.ok(removedKeys.includes('feature-toggles-overrides:prod'));
      assert.ok(!removedKeys.includes('unrelated-app-key'));
      assert.equal(shim.store.has('unrelated-app-key'), true, 'keys outside the storagePrefix must survive clearAllStorage()');
      assert.equal(shim.store.has('feature-toggles-overrides:dev'), false);
      assert.equal(manager.hasOverride('flag'), false);
    } finally {
      shim.restore();
    }
  });

  test('pruneStale() only calls saveToStorage (persists) when something was actually removed', () => {
    const shim = installLocalStorageShim();
    try {
      const manager = new OverrideManager({ environment: 'dev' });
      manager.setOverride('known', true);
      assert.ok(shim.store.has(manager.storageKey));

      shim.store.delete(manager.storageKey);
      manager.pruneStale(() => true); // nothing stale -> should not re-persist

      assert.equal(shim.store.has(manager.storageKey), false, 'no save should happen when pruneStale() removes nothing');

      const removed = manager.pruneStale(() => false); // now everything is stale
      assert.deepEqual(removed, ['known']);
      assert.equal(shim.store.has(manager.storageKey), false, 'the override set is now empty, so saveToStorage() removes rather than writes the key');
    } finally {
      shim.restore();
    }
  });

  test('switchEnvironment() scopes overrides per environment independently', () => {
    const shim = installLocalStorageShim();
    try {
      const manager = new OverrideManager({ environment: 'dev' });
      manager.setOverride('flag', true);

      manager.switchEnvironment('prod');
      assert.equal(manager.hasOverride('flag'), false, 'no prod-scoped data exists yet');

      manager.setOverride('flag', false);
      manager.switchEnvironment('dev');

      assert.equal(manager.getOverride('flag'), true, 'dev-scoped override persists independently of prod');
    } finally {
      shim.restore();
    }
  });
});
