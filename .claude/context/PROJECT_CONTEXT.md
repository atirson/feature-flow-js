# FeatureFlow — Project Context

> Generated/refreshed snapshot for agent sessions. Complements `CLAUDE.md` (architecture rules,
> agent responsibilities, workflow policy) with a more detailed, derived view of the current
> codebase. Regenerate with `/update-context`. Do not hand-edit sections that are marked as
> derived from source — re-run the command instead so this file stays accurate.
>
> Last generated: 2026-08-26

---

## 1. Project Overview

FeatureFlow (`feature-flow-js`) is a lightweight, framework-agnostic feature toggle / feature flag
library for JavaScript. It ships a framework-agnostic core, an optional built-in development UI,
and first-class bindings for React, Vue, and Angular. It is distributed as an npm package and
consumed as a dependency by other projects, so public API stability is a first-class constraint
(see `CLAUDE.md` → Backward Compatibility).

Capabilities (per `package.json` description and `README.md`):

- Feature registration and evaluation (`registerFeature(s)`, `isEnabled`)
- Runtime overrides with per-environment `localStorage` persistence
- Remote configuration merging (`applyRemoteFeatures`)
- Environment-aware configuration (`dev` / `hml` / `prod`, or custom names)
- Rollout rules driven by request/user context
- Subscriptions for reacting to feature-state changes
- SSR-safe core (no `window`/`document`/`localStorage` access unless present)
- Built-in development UI (floating button + bottom sheet, `initUI`)
- React, Vue, and Angular bindings sharing the same underlying singleton

## 2. Repository Structure (derived from current tree)

```text
.
├── .claude/
│   ├── agents/            feature-architect, feature-refactor, feature-reviewer,
│   │                       feature-tester, feature-documentation, feature-release
│   ├── commands/           /update-context (this file's refresh command)
│   ├── context/            PROJECT_CONTEXT.md (this file)
│   └── skills/             generate-smart-changelog, run-library-check,
│                            sync-framework-bindings, validate-public-api,
│                            verify-documentation-examples
├── src/
│   ├── bindings/
│   │   ├── angular/        angular.js, angular.d.ts
│   │   ├── react/          FeatureFlowProvider.js, index.js, index.d.ts
│   │   └── vue/             vue.js, vue.d.ts
│   ├── core/
│   │   ├── feature-toggles.js       (219 lines) — orchestration / public domain API
│   │   ├── feature-registry.js      (81 lines)  — registration & lookup
│   │   ├── override-manager.js      (115 lines) — runtime overrides & persistence
│   │   ├── remote-config.js         (103 lines) — remote configuration merging
│   │   └── subscription-manager.js  (27 lines)  — listener management
│   ├── types/index.d.ts    shared TypeScript types (FeatureConfig, FeatureState, ...)
│   ├── index.js             public entry point (default export + named exports)
│   ├── index.d.ts           public type declarations
│   └── ui/                  feature-toggles-ui.js, feature-floating-button.js,
│                             feature-bottom-sheet.js, feature-search.js, feature-styles.js
├── tests/                   node:test specs, one file per core/UI module (10 files)
├── scripts/
│   └── prepare-changelog.mjs   generates the "## [Unreleased]" section of CHANGELOG.md
│                                 from Conventional Commits; used only by the release workflow
├── README.md, CONTRIBUTING.md, CHANGELOG.md, CLAUDE.md, LICENSE
├── package.json, tsconfig.json, yarn.lock
```

## 3. Core Module Responsibilities (derived from `src/core/`)

| Module | Class | Responsibility |
| --- | --- | --- |
| `feature-toggles.js` | `FeatureToggles` | Orchestration layer; composes the registry, override manager, remote-config manager, and subscription manager into the public API. |
| `feature-registry.js` | `FeatureRegistry` | Stores feature definitions, registration, lookup/existence checks, metadata. No storage/HTTP/UI concerns. |
| `override-manager.js` | `OverrideManager` | Runtime override set/remove/precedence, persistence to `localStorage` scoped per environment, pruning of stale overrides. |
| `remote-config.js` | `RemoteConfigManager` | Merges remote feature configuration (`{ features: [...] }` or `{ remoteFeature: [...] }` shapes) into the registry. |
| `subscription-manager.js` | `SubscriptionManager` | Subscribe/notify/unsubscribe listeners; called whenever registration, overrides, context, or remote config change. |

Evaluation order (per README): **local override** → **rollout rule** → **`defaultEnabled`**.
Evaluating an unregistered key returns `false` and logs a one-time console warning (client-side
only). The core never touches `window`/`document`/`localStorage` unless those globals exist,
so it is safe to call on the server.

## 4. Public API Surface (derived from `src/index.js` + `src/index.d.ts`)

Entry point `src/index.js` exports:

- `default` / named `featureToggles` — singleton instance of `FeatureToggles`
- `FeatureToggles` — the class, for isolated instances
- `FeatureTogglesUI` — from `src/ui/feature-toggles-ui.js`

`FeatureToggles` public methods (`src/index.d.ts`):

```text
setEnvironment(env, config?)      registerFeature(config)         registerFeatures(configs)
isEnabled(key, context?)          applyRemoteFeatures(response)   setOverride(key, enabled)
clearOverride(key)                clearAllOverrides()             clearStorage()
pruneStaleOverrides()             setContext(context)             getAllFeatures()
subscribe(fn)                     initUI(config?)                 setUIVisible(visible)
toggleUIVisible()                 destroyUI()
```

Package export map (`package.json` → `exports`):

| Subpath | Types | Implementation |
| --- | --- | --- |
| `.` | `src/index.d.ts` | `src/index.js` |
| `./react` | `src/bindings/react/index.d.ts` | `src/bindings/react/index.js` |
| `./vue` | `src/bindings/vue/vue.d.ts` | `src/bindings/vue/vue.js` |
| `./angular` | `src/bindings/angular/angular.d.ts` | `src/bindings/angular/angular.js` |

Any change to these exports, method signatures, or return types is a potential breaking change
— see `CLAUDE.md` → Backward Compatibility before touching them.

## 5. Framework Bindings Overview

All three bindings read/write the same shared `featureToggles` singleton as the core API.

- **React** (`src/bindings/react/`): `FeatureFlowProvider`, `useFeatureFlags()`, `useFeatureFlag(key, context?)`,
  `FeatureGate`. The provider registers `featuresByEnv[environment]` (or `features` as a flat
  fallback) when `environment` changes, applies `remoteResponse` on value change, and applies
  `context` on change. `useFeatureFlags()` must be called under a `FeatureFlowProvider` or it throws.
- **Vue** (`src/bindings/vue/`): `createFeatureFlow(config, context?)`, `useFeatureFlags()`,
  `useFeatureFlag(key, context?)`. These are plain function calls (not refs/computed) — reactivity
  to later changes requires `featureToggles.subscribe(...)` or wrapping in `computed`/`watchEffect`.
- **Angular** (`src/bindings/angular/`): `provideFeatureFlow(config, context?)` returns a
  `FeatureFlowService` instance. `FeatureFlowService` is a plain class (not `@Injectable`-decorated);
  DI registration is manual (`useFactory`).

The core must never depend on these bindings (`CLAUDE.md` → Framework Independence).

## 6. Commands (sourced from `package.json` — do not assume others exist)

```bash
npm run test        # runs test:core → node --test tests/*.test.mjs
npm run test:core   # node --test tests/*.test.mjs
npm run typecheck   # tsc --noEmit
npm run semantic-release   # used by CI release workflow only
```

`prepublishOnly` runs `npm run test` automatically before `npm publish`. There is no separate
lint/build script defined in `package.json` as of this snapshot — verify again before assuming one.

## 7. Testing Conventions

- Test runner: Node's built-in `node --test`, files under `tests/*.test.mjs`.
- One test file per core module (`feature-registry`, `feature-toggles`, `override-manager`,
  `remote-config`, `subscription-manager`) and per UI module (`ui-feature-*`).
- Tests should verify behavior, not implementation details (`CLAUDE.md` → Testing).

## 8. Release / Changelog Conventions

- `CHANGELOG.md` follows Keep a Changelog + Semantic Versioning, with an `## [Unreleased]` section
  containing `### Added` / `### Fixed` / etc.
- `scripts/prepare-changelog.mjs` regenerates the `[Unreleased]` section from Conventional Commit
  history (feat/fix/perf/BREAKING CHANGE only) for the release workflow — it never publishes, tags,
  or edits `package.json`.
- The `.claude/skills/generate-smart-changelog` skill documents the categorization rules this
  script mirrors.
- Releases are automated via `semantic-release` (`.releaserc.json`), triggered by the release
  GitHub Actions workflow on push (not pull_request).

## 9. Agent & Skill Inventory (as of this snapshot)

Agents (`.claude/agents/`): `feature-architect` (read-only, architecture analysis),
`feature-refactor` (implementation), `feature-reviewer` (read-only review), `feature-tester`
(tests), `feature-documentation` (docs/changelog), `feature-release` (release prep).

Skills (`.claude/skills/`): `generate-smart-changelog`, `run-library-check`,
`sync-framework-bindings`, `validate-public-api`, `verify-documentation-examples`.

See `CLAUDE.md` → Agent Responsibilities for the recommended workflow ordering.

## 10. Conventions Worth Preserving

- Framework independence: no React/Vue/Angular imports in `src/core/` (enforced by architecture,
  not tooling — review carefully).
- Backward compatibility is a first-class requirement; public API changes require explicit
  justification (see `CLAUDE.md` → Backward Compatibility and → Public API).
- Scope control: do not fix unrelated problems inline — report them for a separate Issue
  (`CLAUDE.md` → Scope Control).
- Security: never commit secrets/API keys/credentials (`CLAUDE.md` → Security). Local, untracked
  operational files that appear in a working tree (e.g. `.env`, tooling config, worktree metadata)
  are not part of the library and must never be modified, read into documentation, or committed as
  part of library changes.

---

*This file is a derived snapshot, not a source of truth. When it disagrees with the actual code,
the code wins — regenerate this file with `/update-context` rather than trusting stale text here.*
