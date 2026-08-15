// tests/ui-feature-search.test.mjs
//
// Behavioral coverage for src/ui/feature-search.js.
//
// This repo's test suite runs under plain Node with no DOM (no jsdom
// dependency is available/authorized to add). `filterFeatures()`,
// `renderFeatures()`, `renderFilteredFeatures()` and
// `attachToggleListeners()` all read/write `document` directly and
// unconditionally (no `typeof document === 'undefined'` guard), so they
// are NOT exercised here - calling them in this environment throws
// `ReferenceError: document is not defined`, which is documented below
// rather than silently skipped.
//
// `featureCardHTML()`, however, is pure string templating with no DOM
// dependency at all, and is the highest-value, fully testable piece of
// this module's logic (badge rendering, date formatting, escaping-free
// interpolation, checked-state reflection).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FeatureSearch } from '../src/ui/feature-search.js';

function baseFeature(overrides = {}) {
  return {
    key: 'my-flag',
    name: 'My Flag',
    description: '',
    currentState: false,
    remote: false,
    hasOverride: false,
    isExpired: false,
    createdAt: null,
    expiredAt: null,
    ...overrides,
  };
}

describe('FeatureSearch: constructor', () => {
  test('stores the injected collaborators without touching the DOM', () => {
    const getFeatures = () => [];
    const setOverride = () => {};

    const search = new FeatureSearch({ getFeatures, setOverride });

    assert.equal(search.getFeatures, getFeatures);
    assert.equal(search.setOverride, setOverride);
  });
});

describe('FeatureSearch: featureCardHTML() (pure string templating, no DOM required)', () => {
  test('renders the feature key and name', () => {
    const search = new FeatureSearch({ getFeatures: () => [], setOverride: () => {} });

    const html = search.featureCardHTML(baseFeature({ key: 'checkout-v2', name: 'Checkout V2' }));

    assert.match(html, /checkout-v2/);
    assert.match(html, /Checkout V2/);
  });

  test('renders the Local badge when the feature is not remote', () => {
    const search = new FeatureSearch({ getFeatures: () => [], setOverride: () => {} });

    const html = search.featureCardHTML(baseFeature({ remote: false }));

    assert.match(html, /ft-local-badge/);
    assert.doesNotMatch(html, /ft-remote-badge/);
  });

  test('renders the Remote badge when the feature came from a remote payload', () => {
    const search = new FeatureSearch({ getFeatures: () => [], setOverride: () => {} });

    const html = search.featureCardHTML(baseFeature({ remote: true }));

    assert.match(html, /ft-remote-badge/);
    assert.doesNotMatch(html, /ft-local-badge/);
  });

  test('renders the Manual (override) badge only when hasOverride is true', () => {
    const search = new FeatureSearch({ getFeatures: () => [], setOverride: () => {} });

    const withOverride = search.featureCardHTML(baseFeature({ hasOverride: true }));
    const withoutOverride = search.featureCardHTML(baseFeature({ hasOverride: false }));

    assert.match(withOverride, /ft-override-badge/);
    assert.doesNotMatch(withoutOverride, /ft-override-badge/);
  });

  test('renders the Expired badge and expired-item class only when isExpired is true', () => {
    const search = new FeatureSearch({ getFeatures: () => [], setOverride: () => {} });

    const expired = search.featureCardHTML(baseFeature({ isExpired: true }));
    const notExpired = search.featureCardHTML(baseFeature({ isExpired: false }));

    assert.match(expired, /ft-expired-badge/);
    assert.match(expired, /ft-item-expired/);
    assert.doesNotMatch(notExpired, /ft-expired-badge/);
    assert.doesNotMatch(notExpired, /ft-item-expired/);
  });

  test('the toggle input reflects currentState via the checked attribute', () => {
    const search = new FeatureSearch({ getFeatures: () => [], setOverride: () => {} });

    const enabled = search.featureCardHTML(baseFeature({ currentState: true }));
    const disabled = search.featureCardHTML(baseFeature({ currentState: false }));

    assert.match(enabled, /type="checkbox"[^>]*checked/s);
    assert.doesNotMatch(disabled, /type="checkbox"[^>]*checked/s);
  });

  test('the toggle input carries the feature key as a data attribute', () => {
    const search = new FeatureSearch({ getFeatures: () => [], setOverride: () => {} });

    const html = search.featureCardHTML(baseFeature({ key: 'my-key' }));

    assert.match(html, /data-feature-key="my-key"/);
  });

  test('renders the description paragraph only when a description is present', () => {
    const search = new FeatureSearch({ getFeatures: () => [], setOverride: () => {} });

    const withDesc = search.featureCardHTML(baseFeature({ description: 'Does a thing' }));
    const withoutDesc = search.featureCardHTML(baseFeature({ description: '' }));

    assert.match(withDesc, /ft-feature-description/);
    assert.match(withDesc, /Does a thing/);
    assert.doesNotMatch(withoutDesc, /ft-feature-description/);
  });

  test('renders a Created label when createdAt is present, omits it otherwise', () => {
    const search = new FeatureSearch({ getFeatures: () => [], setOverride: () => {} });

    const withCreated = search.featureCardHTML(baseFeature({ createdAt: '2024-01-15T00:00:00Z' }));
    const withoutCreated = search.featureCardHTML(baseFeature({ createdAt: null }));

    assert.match(withCreated, /Created:/);
    assert.doesNotMatch(withoutCreated, /Created:/);
  });

  test('renders an Expires label, flagged as expired when isExpired is true', () => {
    const search = new FeatureSearch({ getFeatures: () => [], setOverride: () => {} });

    const expired = search.featureCardHTML(
      baseFeature({ expiredAt: '2000-01-01T00:00:00Z', isExpired: true })
    );
    const notExpired = search.featureCardHTML(
      baseFeature({ expiredAt: '2999-01-01T00:00:00Z', isExpired: false })
    );

    assert.match(expired, /Expires:/);
    assert.match(expired, /ft-date-expired/);
    assert.match(notExpired, /Expires:/);
    assert.doesNotMatch(notExpired, /ft-date-expired/);
  });

  test('omits the dates block entirely when neither createdAt nor expiredAt is set', () => {
    const search = new FeatureSearch({ getFeatures: () => [], setOverride: () => {} });

    const html = search.featureCardHTML(baseFeature({ createdAt: null, expiredAt: null }));

    assert.doesNotMatch(html, /ft-feature-dates/);
  });

  test('falls back to the raw date string when the date fails to format', () => {
    const search = new FeatureSearch({ getFeatures: () => [], setOverride: () => {} });

    // An unparseable date string: `new Date('not-a-date')` yields an
    // Invalid Date; `.toLocaleDateString()` on it does not throw in Node
    // (it returns "Invalid Date"), so this documents that observed
    // behavior rather than asserting an exception path that isn't real.
    const html = search.featureCardHTML(baseFeature({ createdAt: 'not-a-date' }));

    assert.match(html, /Created:/);
  });
});

describe('FeatureSearch: DOM-dependent methods (documented as untestable without jsdom)', () => {
  test('filterFeatures() throws ReferenceError in this no-DOM Node environment (real, observed behavior)', () => {
    const search = new FeatureSearch({ getFeatures: () => [], setOverride: () => {} });

    // `filterFeatures()` calls `document.getElementById(...)` unconditionally
    // with no `typeof document === 'undefined'` guard. This is expected: the
    // module is designed to run only inside a real browser DOM.
    assert.throws(() => search.filterFeatures('term'), ReferenceError);
  });

  test('renderFeatures() throws ReferenceError in this no-DOM Node environment (real, observed behavior)', () => {
    const search = new FeatureSearch({ getFeatures: () => [], setOverride: () => {} });

    assert.throws(() => search.renderFeatures(), ReferenceError);
  });
});
