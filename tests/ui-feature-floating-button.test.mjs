// tests/ui-feature-floating-button.test.mjs
//
// Behavioral coverage for src/ui/feature-floating-button.js.
//
// This repo's test suite runs under plain Node with no DOM (no jsdom
// dependency is available/authorized to add). `render()` calls
// `document.createElement(...)` unconditionally and is therefore never
// reachable in this environment - every drag/resize/position-persistence
// behavior that depends on a rendered `this.element` is consequently
// untestable here and is documented rather than silently skipped.
//
// What IS genuinely testable without a DOM:
//  - constructor wiring (pure, no DOM)
//  - `_loadButtonPosition()` / `_saveButtonPosition()` (localStorage-gated,
//    `this.element` is null so the save path safely no-ops)
//  - `_onResize()` / `keepInViewport()` (both null-guard on `this.element`,
//    which is always null before `render()`)
//  - a documented, genuinely observed defect: `destroy()` unconditionally
//    calls `window.removeEventListener(...)` with no
//    `typeof window === 'undefined'` guard, and throws ReferenceError even
//    when `render()` was never called.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FeatureFloatingButton } from '../src/ui/feature-floating-button.js';

describe('FeatureFloatingButton: constructor', () => {
  test('stores injected options and initializes drag/position state without touching the DOM', () => {
    const onClick = () => {};

    const btn = new FeatureFloatingButton({ positionKey: 'pos-key', onClick });

    assert.equal(btn.positionKey, 'pos-key');
    assert.equal(btn.position, 'bottom-right', 'default position');
    assert.deepEqual(btn.customStyles, {});
    assert.equal(btn.onClick, onClick);
    assert.equal(btn.element, null);
    assert.equal(btn.dragging, false);
    assert.equal(btn.wasDragged, false);
    assert.equal(btn.dragThreshold, 5);
  });

  test('accepts a custom position and customStyles', () => {
    const btn = new FeatureFloatingButton({
      positionKey: 'pos-key',
      position: 'top-left',
      customStyles: { zIndex: '9999' },
    });

    assert.equal(btn.position, 'top-left');
    assert.deepEqual(btn.customStyles, { zIndex: '9999' });
  });

  test('binds instance event-handler methods (identity is stable per instance)', () => {
    const btn = new FeatureFloatingButton({ positionKey: 'pos-key' });

    assert.equal(typeof btn._onResize, 'function');
    assert.equal(typeof btn._onMouseDown, 'function');
    assert.equal(typeof btn._onMouseMove, 'function');
    assert.equal(typeof btn._onMouseUp, 'function');
    assert.equal(typeof btn._onTouchMove, 'function');
    assert.equal(typeof btn._onTouchEnd, 'function');
  });
});

describe('FeatureFloatingButton: no-op guards before render() (this.element is null)', () => {
  test('_onResize() is a safe no-op when there is no rendered element', () => {
    const btn = new FeatureFloatingButton({ positionKey: 'pos-key' });
    assert.doesNotThrow(() => btn._onResize());
  });

  test('keepInViewport() is a safe no-op when there is no rendered element', () => {
    const btn = new FeatureFloatingButton({ positionKey: 'pos-key' });
    assert.doesNotThrow(() => btn.keepInViewport());
  });

  test('_saveButtonPosition() is a safe no-op when there is no rendered element', () => {
    const btn = new FeatureFloatingButton({ positionKey: 'pos-key' });
    assert.doesNotThrow(() => btn._saveButtonPosition());
  });
});

describe('FeatureFloatingButton: _loadButtonPosition() (localStorage-gated)', () => {
  test('returns null when localStorage is unavailable', () => {
    assert.equal(typeof localStorage, 'undefined');
    const btn = new FeatureFloatingButton({ positionKey: 'pos-key' });

    assert.equal(btn._loadButtonPosition(), null);
  });

  test('returns the parsed persisted position when localStorage is available', () => {
    const store = new Map();
    const hadLocalStorage = 'localStorage' in globalThis;
    const prevLocalStorage = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    };

    try {
      const btn = new FeatureFloatingButton({ positionKey: 'pos-key' });
      assert.equal(btn._loadButtonPosition(), null, 'nothing persisted yet');

      store.set('pos-key', JSON.stringify({ x: 10, y: 20 }));
      assert.deepEqual(btn._loadButtonPosition(), { x: 10, y: 20 });
    } finally {
      if (hadLocalStorage) globalThis.localStorage = prevLocalStorage;
      else delete globalThis.localStorage;
    }
  });

  test('degrades gracefully (returns null) on malformed persisted JSON', () => {
    const store = new Map();
    const hadLocalStorage = 'localStorage' in globalThis;
    const prevLocalStorage = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    };
    store.set('pos-key', '{not valid json');

    try {
      const btn = new FeatureFloatingButton({ positionKey: 'pos-key' });
      assert.doesNotThrow(() => btn._loadButtonPosition());
      assert.equal(btn._loadButtonPosition(), null);
    } finally {
      if (hadLocalStorage) globalThis.localStorage = prevLocalStorage;
      else delete globalThis.localStorage;
    }
  });
});

describe('FeatureFloatingButton: documented defect - destroy() is unguarded', () => {
  test('destroy() throws ReferenceError in a no-DOM/no-window environment, even when render() was never called (real, observed behavior, not fixed here)', () => {
    // destroy() unconditionally calls window.removeEventListener('resize', ...)
    // as its first statement, with no typeof window === 'undefined' guard -
    // unlike FeatureStyles.remove() or the guarded methods on
    // FeatureTogglesUI. This is a genuine latent SSR-safety gap in
    // src/ui/feature-floating-button.js, reported rather than silently
    // patched, per this task's testing-only scope.
    assert.equal(typeof window, 'undefined');
    const btn = new FeatureFloatingButton({ positionKey: 'pos-key' });

    assert.throws(() => btn.destroy(), ReferenceError);
  });
});

describe('FeatureFloatingButton: render()/drag/resize behavior (documented as untestable without jsdom)', () => {
  test('render() throws ReferenceError in this no-DOM Node environment (real, observed behavior)', () => {
    const btn = new FeatureFloatingButton({ positionKey: 'pos-key' });

    assert.throws(() => btn.render(), ReferenceError);
  });
});
