// tests/feature-registry.test.mjs
//
// Behavioral coverage for src/core/feature-registry.js: registration,
// lookup, duplicate-registration overwrite semantics, defaults, and the
// applyRemoteFeatures() merge-vs-add contract.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FeatureRegistry } from '../src/core/feature-registry.js';

describe('FeatureRegistry: registration', () => {
  test('registerFeature() stores a feature and applies documented defaults', () => {
    const registry = new FeatureRegistry();

    const feature = registry.registerFeature({ key: 'my-flag' });

    assert.equal(feature.key, 'my-flag');
    assert.equal(feature.name, 'my-flag', 'name should fall back to key when not provided');
    assert.equal(feature.description, '');
    assert.equal(feature.defaultEnabled, false);
    assert.equal(feature.rolloutRule, null);
    assert.equal(feature.remote, false);
    assert.equal(feature.createdAt, null);
    assert.equal(feature.expiredAt, null);
  });

  test('registerFeature() preserves all explicitly provided fields', () => {
    const registry = new FeatureRegistry();
    const rule = () => true;

    const feature = registry.registerFeature({
      key: 'full-flag',
      name: 'Full Flag',
      description: 'A fully specified flag',
      defaultEnabled: true,
      rolloutRule: rule,
      createdAt: '2024-01-01',
      expiredAt: '2030-01-01',
    });

    assert.equal(feature.name, 'Full Flag');
    assert.equal(feature.description, 'A fully specified flag');
    assert.equal(feature.defaultEnabled, true);
    assert.equal(feature.rolloutRule, rule);
    assert.equal(feature.createdAt, '2024-01-01');
    assert.equal(feature.expiredAt, '2030-01-01');
  });

  test('registerFeature() throws when key is missing', () => {
    const registry = new FeatureRegistry();

    assert.throws(() => registry.registerFeature({}), /Feature key is required/);
  });

  test('registerFeature() throws when key is an empty string (falsy)', () => {
    const registry = new FeatureRegistry();

    assert.throws(() => registry.registerFeature({ key: '' }), /Feature key is required/);
  });

  test('registerFeature() called twice with the same key overwrites the previous definition entirely', () => {
    const registry = new FeatureRegistry();

    registry.registerFeature({
      key: 'flag',
      name: 'First Name',
      rolloutRule: () => true,
      defaultEnabled: true,
    });
    // Simulate the feature having been marked remote by a prior remote sync.
    registry.applyRemoteFeatures({ features: [{ key: 'flag', defaultEnabled: true }] });
    assert.equal(registry.getFeature('flag').remote, true);

    // Re-registering locally with a bare config overwrites the whole record.
    registry.registerFeature({ key: 'flag' });
    const feature = registry.getFeature('flag');

    assert.equal(feature.name, 'flag', 'name reverts to the key when not specified on re-registration');
    assert.equal(feature.rolloutRule, null, 'rolloutRule is not preserved across re-registration');
    assert.equal(feature.remote, false, 'remote flag is not preserved across re-registration');
    assert.equal(feature.defaultEnabled, false);
  });

  test('registerFeatures() registers every config in the array', () => {
    const registry = new FeatureRegistry();

    registry.registerFeatures([{ key: 'a' }, { key: 'b' }, { key: 'c' }]);

    assert.deepEqual(
      registry.getAll().map((f) => f.key).sort(),
      ['a', 'b', 'c']
    );
  });

  test('registerFeatures(null) and registerFeatures(undefined) are safe no-ops', () => {
    const registry = new FeatureRegistry();

    assert.doesNotThrow(() => registry.registerFeatures(null));
    assert.doesNotThrow(() => registry.registerFeatures(undefined));
    assert.equal(registry.getAll().length, 0);
  });

  test('registerFeatures([]) is a no-op', () => {
    const registry = new FeatureRegistry();

    registry.registerFeatures([]);

    assert.equal(registry.getAll().length, 0);
  });
});

describe('FeatureRegistry: lookup', () => {
  test('hasFeature()/getFeature() reflect registration state', () => {
    const registry = new FeatureRegistry();

    assert.equal(registry.hasFeature('missing'), false);
    assert.equal(registry.getFeature('missing'), undefined);

    registry.registerFeature({ key: 'present' });

    assert.equal(registry.hasFeature('present'), true);
    assert.ok(registry.getFeature('present'));
  });

  test('getAll() returns every registered feature as an array', () => {
    const registry = new FeatureRegistry();
    registry.registerFeatures([{ key: 'a' }, { key: 'b' }]);

    const all = registry.getAll();

    assert.equal(all.length, 2);
    assert.ok(Array.isArray(all));
  });

  test('clear() removes every registered feature', () => {
    const registry = new FeatureRegistry();
    registry.registerFeatures([{ key: 'a' }, { key: 'b' }]);

    registry.clear();

    assert.equal(registry.getAll().length, 0);
    assert.equal(registry.hasFeature('a'), false);
  });
});

describe('FeatureRegistry: applyRemoteFeatures()', () => {
  test('accepts the { features: [...] } response shape', () => {
    const registry = new FeatureRegistry();

    const applied = registry.applyRemoteFeatures({
      features: [{ key: 'remote-a', defaultEnabled: true }],
    });

    assert.deepEqual(applied, ['remote-a']);
    assert.equal(registry.getFeature('remote-a').defaultEnabled, true);
    assert.equal(registry.getFeature('remote-a').remote, true);
  });

  test('accepts the { remoteFeature: [...] } response shape', () => {
    const registry = new FeatureRegistry();

    const applied = registry.applyRemoteFeatures({
      remoteFeature: [{ key: 'remote-b', defaultEnabled: true }],
    });

    assert.deepEqual(applied, ['remote-b']);
    assert.equal(registry.getFeature('remote-b').remote, true);
  });

  test('accepts a bare array response shape', () => {
    const registry = new FeatureRegistry();

    const applied = registry.applyRemoteFeatures([{ key: 'remote-c' }]);

    assert.deepEqual(applied, ['remote-c']);
  });

  test('merges into an existing local feature rather than replacing it wholesale', () => {
    const registry = new FeatureRegistry();
    const rule = () => true;
    registry.registerFeature({ key: 'flag', name: 'Local Name', rolloutRule: rule, defaultEnabled: false });

    registry.applyRemoteFeatures({ features: [{ key: 'flag', defaultEnabled: true }] });

    const feature = registry.getFeature('flag');
    assert.equal(feature.defaultEnabled, true, 'defaultEnabled is updated from the remote payload');
    assert.equal(feature.remote, true, 'remote flag flips to true once a remote payload references the key');
    assert.equal(feature.name, 'Local Name', 'name is left untouched when the remote item omits it');
    assert.equal(feature.rolloutRule, rule, 'rolloutRule (a purely local concept) is preserved on merge');
  });

  test('merge only overwrites name/description/createdAt/expiredAt when the remote item actually provides them', () => {
    const registry = new FeatureRegistry();
    registry.registerFeature({ key: 'flag', name: 'Keep Me', description: 'Keep too' });

    registry.applyRemoteFeatures({ features: [{ key: 'flag', name: 'New Name' }] });

    const feature = registry.getFeature('flag');
    assert.equal(feature.name, 'New Name');
    assert.equal(feature.description, 'Keep too', 'description is left untouched when omitted from the remote item');
  });

  test('creates a new feature (remote: true) when the key does not exist locally', () => {
    const registry = new FeatureRegistry();

    registry.applyRemoteFeatures({
      features: [{ key: 'brand-new', name: 'Brand New', defaultEnabled: true }],
    });

    const feature = registry.getFeature('brand-new');
    assert.ok(feature);
    assert.equal(feature.remote, true);
    assert.equal(feature.name, 'Brand New');
    assert.equal(feature.defaultEnabled, true);
    assert.equal(feature.rolloutRule, null, 'rolloutRule can never come from a remote-only feature');
  });

  test('skips items that have no key', () => {
    const registry = new FeatureRegistry();

    const applied = registry.applyRemoteFeatures({
      features: [{ name: 'no key here' }, { key: 'valid' }],
    });

    assert.deepEqual(applied, ['valid']);
    assert.equal(registry.getAll().length, 1);
  });

  test('handles empty/malformed payloads without throwing', () => {
    const registry = new FeatureRegistry();

    assert.deepEqual(registry.applyRemoteFeatures(undefined), []);
    assert.deepEqual(registry.applyRemoteFeatures(null), []);
    assert.deepEqual(registry.applyRemoteFeatures({}), []);
    assert.deepEqual(registry.applyRemoteFeatures({ features: [] }), []);
  });
});
