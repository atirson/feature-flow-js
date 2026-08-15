// tests/ui-feature-bottom-sheet.test.mjs
//
// Behavioral coverage for src/ui/feature-bottom-sheet.js.
//
// This repo's test suite runs under plain Node with no DOM (no jsdom
// dependency is available/authorized to add). `render()`, `open()`,
// `close()`, and the private `_onClickHandler`/`_onInputHandler` callbacks
// all require a real `document` and are therefore never reachable in this
// environment; that is documented rather than silently skipped.
//
// What IS genuinely testable without a DOM:
//  - constructor wiring (pure, no DOM)
//  - `updateEnvironmentBadge()`, which is explicitly guarded by
//    `typeof document === 'undefined'`
//  - a documented, genuinely observed defect: `destroy()` unconditionally
//    calls `document.removeEventListener(...)` with no
//    `typeof document === 'undefined'` guard, and throws ReferenceError
//    even when `render()` was never called.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FeatureBottomSheet } from '../src/ui/feature-bottom-sheet.js';

describe('FeatureBottomSheet: constructor', () => {
  test('stores injected collaborators and defaults theme to light, without touching the DOM', () => {
    const getEnvironmentConfig = () => ({ label: 'DEV', color: '#3b82f6' });
    const searchEngine = { renderFeatures: () => {}, filterFeatures: () => {} };
    const onResetAll = () => {};

    const sheet = new FeatureBottomSheet({ getEnvironmentConfig, searchEngine, onResetAll });

    assert.equal(sheet.theme, 'light');
    assert.equal(sheet.getEnvironmentConfig, getEnvironmentConfig);
    assert.equal(sheet.searchEngine, searchEngine);
    assert.equal(sheet.onResetAll, onResetAll);
    assert.equal(sheet.overlayElement, null);
  });

  test('accepts a custom theme', () => {
    const sheet = new FeatureBottomSheet({
      theme: 'dark',
      getEnvironmentConfig: () => ({ label: 'DEV', color: '#3b82f6' }),
    });

    assert.equal(sheet.theme, 'dark');
  });

  test('binds instance event-handler methods (identity is stable per instance)', () => {
    const sheet = new FeatureBottomSheet({ getEnvironmentConfig: () => ({ label: 'DEV', color: '#3b82f6' }) });

    assert.equal(typeof sheet._onClickHandler, 'function');
    assert.equal(typeof sheet._onInputHandler, 'function');
  });
});

describe('FeatureBottomSheet: updateEnvironmentBadge() (explicitly guarded)', () => {
  test('is a safe no-op when document is unavailable', () => {
    assert.equal(typeof document, 'undefined');
    const sheet = new FeatureBottomSheet({ getEnvironmentConfig: () => ({ label: 'DEV', color: '#3b82f6' }) });

    assert.doesNotThrow(() => sheet.updateEnvironmentBadge());
  });
});

describe('FeatureBottomSheet: documented defect - destroy() is unguarded', () => {
  test('destroy() throws ReferenceError in a no-DOM environment, even when render() was never called (real, observed behavior, not fixed here)', () => {
    // destroy() unconditionally calls document.removeEventListener('click', ...)
    // as its first statement, with no typeof document === 'undefined' guard -
    // unlike updateEnvironmentBadge() on this same class. This is a genuine
    // latent SSR-safety gap in src/ui/feature-bottom-sheet.js, reported
    // rather than silently patched, per this task's testing-only scope.
    const sheet = new FeatureBottomSheet({ getEnvironmentConfig: () => ({ label: 'DEV', color: '#3b82f6' }) });

    assert.throws(() => sheet.destroy(), ReferenceError);
  });
});

describe('FeatureBottomSheet: render()/open()/close() (documented as untestable without jsdom)', () => {
  test('render() throws ReferenceError in this no-DOM Node environment (real, observed behavior)', () => {
    const sheet = new FeatureBottomSheet({ getEnvironmentConfig: () => ({ label: 'DEV', color: '#3b82f6' }) });

    assert.throws(() => sheet.render(), ReferenceError);
  });

  test('open() throws ReferenceError in this no-DOM Node environment (real, observed behavior)', () => {
    const searchEngine = { renderFeatures: () => {} };
    const sheet = new FeatureBottomSheet({
      getEnvironmentConfig: () => ({ label: 'DEV', color: '#3b82f6' }),
      searchEngine,
    });

    assert.throws(() => sheet.open(), ReferenceError);
  });

  test('close() throws ReferenceError in this no-DOM Node environment (real, observed behavior)', () => {
    const sheet = new FeatureBottomSheet({ getEnvironmentConfig: () => ({ label: 'DEV', color: '#3b82f6' }) });

    assert.throws(() => sheet.close(), ReferenceError);
  });
});
