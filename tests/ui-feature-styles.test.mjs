// tests/ui-feature-styles.test.mjs
//
// Behavioral coverage for src/ui/feature-styles.js.
//
// FeatureStyles.inject()/remove() are the only UI-module methods in this
// codebase that are explicitly, correctly guarded for a no-DOM/SSR
// environment (`typeof document === 'undefined'`), so both are fully
// testable here as safe no-ops.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FeatureStyles } from '../src/ui/feature-styles.js';

describe('FeatureStyles: inject()/remove() (guarded for no-DOM/SSR environments)', () => {
  test('inject() is a safe no-op when document is unavailable', () => {
    assert.equal(typeof document, 'undefined');

    assert.doesNotThrow(() => FeatureStyles.inject());
  });

  test('remove() is a safe no-op when document is unavailable', () => {
    assert.equal(typeof document, 'undefined');

    assert.doesNotThrow(() => FeatureStyles.remove());
  });

  test('STYLE_ID is a stable, documented identifier used to dedupe injected styles', () => {
    assert.equal(FeatureStyles.STYLE_ID, 'feature-toggles-styles');
  });

  test('calling inject() then remove() repeatedly is safe (idempotent no-ops without a DOM)', () => {
    assert.doesNotThrow(() => {
      FeatureStyles.inject();
      FeatureStyles.inject();
      FeatureStyles.remove();
      FeatureStyles.remove();
    });
  });
});
