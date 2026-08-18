# FeatureFlow

A lightweight, framework-agnostic feature toggle / feature flag library for JavaScript applications, with a built-in debug UI and first-class integrations for React, Vue, and Angular.

- Framework-agnostic core — works in plain JavaScript, Node.js, or any UI framework
- Local overrides with persistence (`localStorage`), scoped per environment
- Remote configuration support
- Environment-aware configuration (dev / hml / prod, or your own)
- Rollout rules driven by request/user context
- Subscriptions for reacting to feature-state changes
- SSR-safe (no `window`/`localStorage` access on the server)
- Built-in development UI (floating button + bottom sheet) for toggling features at runtime
- React, Vue, and Angular bindings

---

### Demo

Link Page: [Atirson Linktree](https://www.atirson.com/linktree)

## Installation

```bash
npm install feature-flow-js
# or
yarn add feature-flow-js
```

React, Vue, and Angular are optional peer dependencies — only required if you use the matching binding (`feature-flow-js/react`, `feature-flow-js/vue`, `feature-flow-js/angular`).

---

## Quick Start

```js
import featureToggles from 'feature-flow-js';

featureToggles.setEnvironment('prod', { label: 'Production', color: '#10b981' });

featureToggles.registerFeatures([
  { key: 'new-dashboard', name: 'New Dashboard', defaultEnabled: false },
  {
    key: 'beta-checkout',
    name: 'Beta Checkout',
    defaultEnabled: false,
    rolloutRule: (context) => context.user?.plan === 'pro',
  },
]);

featureToggles.setContext({ user: { id: '123', plan: 'pro' } });

if (featureToggles.isEnabled('beta-checkout')) {
  // show the new checkout flow
}
```

`featureToggles` is a singleton instance of `FeatureToggles`. You can also import the class directly if you need an isolated instance:

```js
import { FeatureToggles } from 'feature-flow-js';

const myToggles = new FeatureToggles();
```

---

## Core Concepts

### Registering features

```js
featureToggles.registerFeature({
  key: 'new-dashboard',
  name: 'New Dashboard',
  description: 'Redesigned analytics dashboard',
  defaultEnabled: false,
  rolloutRule: (context) => context.flags?.betaUser === true,
  createdAt: '2026-01-01',
  expiredAt: '2026-12-31',
});

featureToggles.registerFeatures([/* array of the same shape */]);
```

Only `key` is required. `rolloutRule` receives the merged context (see [Context](#context)) and must return a boolean; if it throws, `defaultEnabled` is used as a fallback.

### Evaluating features

```js
featureToggles.isEnabled('new-dashboard'); // uses stored context
featureToggles.isEnabled('new-dashboard', { user: { id: '123' } }); // merged with stored context
```

Evaluation order: **local override** (if set) → **rollout rule** (if defined) → **`defaultEnabled`**. Evaluating an unregistered key returns `false` and logs a one-time console warning (client-side only).

### Context

```js
featureToggles.setContext({ user: { id: '123', plan: 'pro' } });
```

Context set here is merged with any per-call context passed to `isEnabled`, and is available to every `rolloutRule`.

### Overrides

Runtime overrides always win over rollout rules and defaults, and persist to `localStorage` per environment.

```js
featureToggles.setOverride('beta-checkout', true);
featureToggles.clearOverride('beta-checkout');
featureToggles.clearAllOverrides();

featureToggles.clearStorage();        // removes all persisted override keys, returns the removed keys
featureToggles.pruneStaleOverrides(); // removes overrides for features no longer registered
```

### Remote configuration

```js
// server.js
import http from 'http';

const flags = [
  { key: 'hidden-bio',   
    name: 'Hidden Bio', 
    description: 'Hidden bio in home page for example using ternary condition',
    defaultEnabled: false, 
    createdAt: '2023-07-20T10:00:00Z',
    expiredAt: '2028-07-20T12:00:00Z', 
  },
];

http.createServer((req, res) => {
  if (req.url === '/api/feature-flags' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ remoteFeature: flags }));
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(3001, () => console.log('🚀 http://localhost:3001/api/feature-flags'));
```

```js
const response = await fetch('/api/feature-flags').then((r) => r.json());

// Accepts either { features: [...] } or { remoteFeature: [...] }
featureToggles.applyRemoteFeatures(response);
```

Remote features merge into the registry: existing features are updated in place (`defaultEnabled`, `name`, `description`, `createdAt`, `expiredAt`), unknown keys are added as new, remote-sourced features.

### Environments

```js
featureToggles.setEnvironment('hml', { label: 'Staging', color: '#f59e0b' });
```

Switching environments reloads persisted overrides scoped to that environment. Built-in environments are `dev`, `hml`, and `prod`; any other name is accepted and treated as custom.

### Subscriptions

```js
const unsubscribe = featureToggles.subscribe((features) => {
  console.log('Features updated:', features);
});

// later
unsubscribe();
```

The listener is called with the result of `getAllFeatures()` whenever registration, overrides, context, or remote configuration change.

### Reading all features

```js
featureToggles.getAllFeatures();
// FeatureState[]: { key, name, description, defaultEnabled, rolloutRule, remote,
//                    currentState, hasOverride, overrideValue, createdAt, expiredAt, isExpired }
```

---

## Development UI

An optional floating button + bottom sheet for inspecting and overriding features at runtime.

```js
featureToggles.initUI({
  position: 'bottom-right',   // 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  theme: 'light',              // 'light' | 'dark'
  styles: {},                  // custom CSS overrides for the floating button
  hiddenInEnvironments: ['prod'],
  enableShortcut: true,        // Ctrl+Shift+E toggles visibility
});

featureToggles.setUIVisible(true);
featureToggles.toggleUIVisible();
featureToggles.destroyUI();
```

- `initUI` is a no-op outside the browser (no `document`).
- When the current environment is in `hiddenInEnvironments`, the button stays hidden unless force-shown via the `?ff-ui=1` query string or `localStorage` (set by `setUIVisible(true)`).
- `Ctrl+Shift+E` toggles the button's visibility, unless `enableShortcut: false`.

---

## Framework Integrations

### React

```jsx
import {
  FeatureFlowProvider,
  useFeatureFlags,
  useFeatureFlag,
  FeatureGate,
} from 'feature-flow-js/react';

function App() {
  return (
    <FeatureFlowProvider
      config={{
        environment: 'prod',
        environments: { prod: { label: 'Production', color: '#10b981' } },
        featuresByEnv: {
          prod: [{ key: 'beta-checkout', defaultEnabled: false }],
        },
        ui: true, // or a UIConfig object
      }}
      context={{ user: { plan: 'pro' } }}
      remoteResponse={remoteResponse} // optional, from your data-fetching layer
    >
      <Checkout />
    </FeatureFlowProvider>
  );
}

function Checkout() {
  const isBeta = useFeatureFlag('beta-checkout');
  const { features, setOverride, applyRemoteFeatures } = useFeatureFlags();

  return (
    <FeatureGate flag="beta-checkout" fallback={<LegacyCheckout />}>
      <NewCheckout />
    </FeatureGate>
  );
}
```

- `FeatureFlowProvider` registers `featuresByEnv[environment]` (or `features` as a flat fallback) whenever `environment` changes, applies `remoteResponse` when it changes (by value, via a serialized comparison), and applies `context` whenever it changes.
- `useFeatureFlags()` must be called under a `FeatureFlowProvider`; it throws otherwise.
- `useFeatureFlag(key, context?)` and `FeatureGate` re-evaluate whenever the provider's feature list changes.

### Vue

```js
import { createFeatureFlow, useFeatureFlags, useFeatureFlag } from 'feature-flow-js/vue';

createFeatureFlow(
  {
    environment: 'prod',
    features: [{ key: 'beta-checkout', defaultEnabled: false }],
  },
  { user: { plan: 'pro' } }, // optional context
);

// inside a component
const { isEnabled, setOverride, getAllFeatures } = useFeatureFlags();
const betaEnabled = useFeatureFlag('beta-checkout');
```

`useFeatureFlags()` and `useFeatureFlag()` read from the shared `featureToggles` singleton and evaluate once, at call time — they are plain function calls, not Vue refs/computed values. To react to changes (overrides, remote updates), call `featureToggles.subscribe(...)` yourself, or re-invoke `useFeatureFlag`/`isEnabled` inside your own reactive wrapper (`computed`, `watchEffect`, etc.).

### Angular

```ts
import { provideFeatureFlow, FeatureFlowService } from 'feature-flow-js/angular';

const featureFlow: FeatureFlowService = provideFeatureFlow({
  environment: 'prod',
  features: [{ key: 'beta-checkout', defaultEnabled: false }],
});

featureFlow.isEnabled('beta-checkout');
```

`FeatureFlowService` is a plain class (not `@Injectable`-decorated). To use it through Angular's dependency injection, register it explicitly, e.g.:

```ts
providers: [
  {
    provide: FeatureFlowService,
    useFactory: () => provideFeatureFlow({ environment: 'prod', features: [] }),
  },
],
```

All three bindings (`createFeatureFlow`/`useFeatureFlags`/`useFeatureFlag` for Vue and Angular) share the same underlying `featureToggles` singleton as the core API.

---

## SSR

The core never touches `window`, `document`, or `localStorage` unless those globals exist, so `registerFeature(s)`, `isEnabled`, `setContext`, `applyRemoteFeatures`, and `subscribe` are safe to call on the server. Overrides simply don't persist server-side, and `initUI` is a no-op without `document`.

---

## API Reference

### `FeatureToggles` (default export / `featureToggles` singleton)

| Method | Description |
| --- | --- |
| `setEnvironment(env, config?)` | Switch environment; reloads persisted overrides for it. `config: { label?, color? }` |
| `registerFeature(config)` | Register a single feature. See `FeatureConfig`. |
| `registerFeatures(configs)` | Register multiple features. |
| `isEnabled(key, context?)` | Evaluate a feature: override → rollout rule → default. |
| `applyRemoteFeatures(response)` | Merge remote feature configuration. Returns `this`. |
| `setOverride(key, enabled)` | Force a feature on/off locally (persisted). |
| `clearOverride(key)` | Remove a single override. |
| `clearAllOverrides()` | Remove all overrides for the current environment. |
| `clearStorage()` | Remove all persisted override keys for this app. Returns removed keys. |
| `pruneStaleOverrides()` | Remove overrides for features no longer registered. Returns removed keys. |
| `setContext(context)` | Merge additional context used by rollout rules. |
| `getAllFeatures()` | Return the current `FeatureState[]`. |
| `subscribe(fn)` | Subscribe to feature-state changes; returns an unsubscribe function. |
| `initUI(config?)` | Mount the development UI. See `UIConfig`. |
| `setUIVisible(visible)` | Force-show/hide the development UI button. |
| `toggleUIVisible()` | Toggle the development UI button. |
| `destroyUI()` | Unmount the development UI and clean up listeners. |

### Types

```ts
interface FeatureConfig {
  key: string;
  name?: string;
  description?: string;
  defaultEnabled?: boolean;
  rolloutRule?: (context: FeatureContext) => boolean;
  createdAt?: string;
  expiredAt?: string;
}

interface FeatureState extends FeatureConfig {
  remote: boolean;
  currentState: boolean;
  hasOverride: boolean;
  overrideValue?: boolean;
  isExpired: boolean;
}

interface UIConfig {
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  theme?: 'light' | 'dark';
  styles?: Record<string, string | number>;
  hiddenInEnvironments?: string[];
  enableShortcut?: boolean;
}
```

Full declarations: [`src/index.d.ts`](./src/index.d.ts) and [`src/types/index.d.ts`](./src/types/index.d.ts).

---

## Contributing

Bug reports, feature requests, and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to open an issue and how to submit a fix.

## License

MIT © [Atirson Fabiano Barbosa de Oliveira](https://github.com/atirson)
