// tests/subscription-manager.test.mjs
//
// Behavioral coverage for src/core/subscription-manager.js: subscribe /
// notify / unsubscribe lifecycle, listener isolation, and leak-prone
// repeated subscribe/unsubscribe cycles.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SubscriptionManager } from '../src/core/subscription-manager.js';

describe('SubscriptionManager: subscribe/notify', () => {
  test('subscribe() registers a listener that receives the notified payload', () => {
    const manager = new SubscriptionManager();
    const received = [];

    manager.subscribe((payload) => received.push(payload));
    manager.notify({ some: 'state' });

    assert.deepEqual(received, [{ some: 'state' }]);
  });

  test('multiple listeners are all notified with the same payload', () => {
    const manager = new SubscriptionManager();
    const a = [];
    const b = [];

    manager.subscribe((payload) => a.push(payload));
    manager.subscribe((payload) => b.push(payload));
    manager.notify('state-1');

    assert.deepEqual(a, ['state-1']);
    assert.deepEqual(b, ['state-1']);
  });

  test('notify() with no listeners does not throw', () => {
    const manager = new SubscriptionManager();

    assert.doesNotThrow(() => manager.notify('anything'));
  });

  test('repeated notify() calls deliver every update to a listener', () => {
    const manager = new SubscriptionManager();
    const received = [];
    manager.subscribe((payload) => received.push(payload));

    manager.notify(1);
    manager.notify(2);
    manager.notify(3);

    assert.deepEqual(received, [1, 2, 3]);
  });
});

describe('SubscriptionManager: unsubscribe', () => {
  test('the function returned by subscribe() removes the listener', () => {
    const manager = new SubscriptionManager();
    const received = [];
    const unsubscribe = manager.subscribe((payload) => received.push(payload));

    manager.notify('before');
    unsubscribe();
    manager.notify('after');

    assert.deepEqual(received, ['before']);
  });

  test('calling the unsubscribe function multiple times is safe (idempotent)', () => {
    const manager = new SubscriptionManager();
    const unsubscribe = manager.subscribe(() => {});

    assert.doesNotThrow(() => {
      unsubscribe();
      unsubscribe();
      unsubscribe();
    });
  });

  test('unsubscribing one listener does not affect other active listeners', () => {
    const manager = new SubscriptionManager();
    const a = [];
    const b = [];
    const unsubscribeA = manager.subscribe((p) => a.push(p));
    manager.subscribe((p) => b.push(p));

    unsubscribeA();
    manager.notify('state');

    assert.deepEqual(a, []);
    assert.deepEqual(b, ['state']);
  });

  test('repeated subscribe/unsubscribe cycles do not leak entries', () => {
    const manager = new SubscriptionManager();

    for (let i = 0; i < 50; i++) {
      const unsubscribe = manager.subscribe(() => {});
      unsubscribe();
    }

    assert.equal(manager.listeners.size, 0);
  });
});

describe('SubscriptionManager: listener isolation', () => {
  test('a throwing listener does not prevent other listeners from being notified', () => {
    const manager = new SubscriptionManager();
    const received = [];
    manager.subscribe(() => {
      throw new Error('boom');
    });
    manager.subscribe((payload) => received.push(payload));

    const originalConsoleError = console.error;
    console.error = () => {};
    try {
      assert.doesNotThrow(() => manager.notify('payload'));
    } finally {
      console.error = originalConsoleError;
    }

    assert.deepEqual(received, ['payload'], 'the well-behaved listener must still run despite the other one throwing');
  });

  test('a throwing listener error is logged via console.error rather than swallowed silently', () => {
    const manager = new SubscriptionManager();
    manager.subscribe(() => {
      throw new Error('boom');
    });

    const calls = [];
    const originalConsoleError = console.error;
    console.error = (...args) => calls.push(args);
    try {
      manager.notify('payload');
    } finally {
      console.error = originalConsoleError;
    }

    assert.equal(calls.length, 1);
    assert.match(String(calls[0][0]), /Error in feature toggle listener/);
  });
});

describe('SubscriptionManager: clear()', () => {
  test('clear() removes all listeners so no further notifications are delivered', () => {
    const manager = new SubscriptionManager();
    const received = [];
    manager.subscribe((p) => received.push(p));
    manager.subscribe((p) => received.push(p));

    manager.clear();
    manager.notify('after-clear');

    assert.deepEqual(received, []);
    assert.equal(manager.listeners.size, 0);
  });
});
