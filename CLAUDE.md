# FeatureFlow Development Guide

## Project Overview

FeatureFlow is a lightweight, framework-agnostic feature toggle / feature flag library for JavaScript applications.

The library provides:

- Feature registration
- Feature evaluation
- Runtime overrides
- Local persistence
- Remote configuration
- Environment-aware configuration
- Subscriptions/listeners
- SSR-compatible behavior
- Development UI
- React integration
- Vue integration
- Angular integration
- Framework-agnostic JavaScript API

The project is designed as a reusable library rather than an application. Backward compatibility and API stability are therefore critical.

---

## Repository Structure

```plaintext
.
├── .claude/
│   └── agents/
│       ├── feature-architect.md
│       ├── feature-refactor.md
│       ├── feature-reviewer.md
│       ├── feature-tester.md
│       └── feature-documentation.md
│
├── src/
│   ├── bindings/
│   │   ├── angular/
│   │   │   ├── angular.d.ts
│   │   │   └── angular.js
│   │   ├── react/
│   │   │   ├── FeatureFlowProvider.js
│   │   │   ├── index.d.ts
│   │   │   └── index.js
│   │   └── vue/
│   │       ├── vue.d.ts
│   │       └── vue.js
│   │
│   ├── core/
│   │   ├── feature-registry.js
│   │   ├── feature-toggles.js
│   │   ├── override-manager.js
│   │   ├── remote-config.js
│   │   └── subscription-manager.js
│   │
│   ├── types/
│   │   └── index.d.ts
│   │
│   ├── index.js
│   ├── index.d.ts
│   │
│   └── ui/
│       ├── feature-bottom-sheet.js
│       ├── feature-floating-button.js
│       ├── feature-search.js
│       ├── feature-styles.js
│       └── feature-toggles-ui.js
│
├── tests/**
├── README.md
├── CLAUDE.md
├── package.json
└── yarn.lock
```

---

## Architecture

FeatureFlow follows a layered architecture.

```plaintext
┌───────────────────────────────────────────────┐
│                  Public API                    │
│                 src/index.js                   │
└───────────────────────┬───────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────┐
│                     Core                       │
│                                                 │
│ feature-toggles.js                             │
│ feature-registry.js                            │
│ override-manager.js                            │
│ remote-config.js                               │
│ subscription-manager.js                        │
└───────────────────────┬───────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
┌──────────────────────┐  ┌──────────────────────┐
│ Framework Bindings    │  │        UI             │
│                        │  │                       │
│ React                  │  │ Development UI        │
│ Vue                    │  │ Bottom Sheet          │
│ Angular                │  │ Floating Button       │
└──────────────────────┘  └──────────────────────┘
```

### Core Modules

The `src/core/` directory contains the framework-agnostic implementation.

#### `feature-toggles.js`

The main core orchestration layer and public domain API.

Responsibilities may include:

- Coordinating feature evaluation
- Coordinating registration
- Managing configuration
- Coordinating overrides
- Coordinating remote configuration
- Managing subscriptions

It should **not** contain unrelated implementation details that belong in specialized modules.

#### `feature-registry.js`

Responsible for feature registration and lookup.

Responsibilities:

- Register features
- Store feature definitions
- Retrieve features
- Check whether features exist
- Manage feature metadata

It should **not** manage:

- LocalStorage
- Remote HTTP requests
- UI
- Framework-specific behavior

#### `override-manager.js`

Responsible for runtime feature overrides.

Responsibilities:

- Set overrides
- Remove overrides
- Resolve override precedence
- Persist overrides when configured
- Load persisted overrides
- Clear persisted overrides

It should **not** contain framework-specific logic.

#### `remote-config.js`

Responsible for remote feature configuration.

Responsibilities:

- Load remote configuration
- Validate configuration when applicable
- Normalize remote configuration
- Handle remote configuration updates
- Handle remote loading failures

It should **not** directly depend on React, Vue, Angular, or UI code.

#### `subscription-manager.js`

Responsible for feature state listeners.

Responsibilities:

- Subscribe listeners
- Notify listeners
- Unsubscribe listeners
- Prevent listener leaks
- Manage subscription lifecycle

### Framework Bindings

Framework-specific integrations live under `src/bindings/`.

The core must **never** depend on these bindings.

#### React

Location: `src/bindings/react/`

React-specific behavior includes:

- `FeatureFlowProvider`
- React hooks
- React state synchronization
- React lifecycle integration

React code must not introduce React dependencies into `src/core`.

#### Vue

Location: `src/bindings/vue/`

Vue-specific behavior includes:

- Composables
- Reactive feature updates
- Vue lifecycle integration

#### Angular

Location: `src/bindings/angular/`

Angular-specific behavior includes:

- Angular services
- Dependency injection
- Angular lifecycle integration

### Development UI

The development UI lives under `src/ui/`.

Current components include:

- `feature-toggles-ui.js`
- `feature-floating-button.js`
- `feature-bottom-sheet.js`
- `feature-search.js`
- `feature-styles.js`

The UI is intended for development/debugging purposes.

Do not move UI concerns into the core.

---

## Public API

The primary public entry point is `src/index.js`.

Type declarations are provided through:

- `src/index.d.ts`
- `src/types/index.d.ts`

Any change to public exports must be treated as a potentially breaking change.

Before changing public APIs:

1. Inspect existing exports.
2. Inspect TypeScript declarations.
3. Inspect README examples.
4. Inspect framework bindings.
5. Inspect tests.
6. Evaluate backward compatibility.

Never remove or rename a public API casually.

---

## Framework Independence

The core must remain framework-agnostic.

The following must **never** be introduced into `src/core/`:

- React
- Vue
- Angular
- DOM-specific APIs, unless explicitly required by the core design
- Framework lifecycle APIs
- Framework-specific state management

Framework integrations belong under `src/bindings/`.

---

## Backward Compatibility

FeatureFlow is a library. Backward compatibility is a first-class requirement.

Unless explicitly requested by the Issue:

- Do not rename public methods.
- Do not remove public methods.
- Do not change method signatures.
- Do not change return types.
- Do not change configuration semantics.
- Do not change default behavior.
- Do not change public exports.

If a breaking change is unavoidable, clearly document it.

---

## Refactoring Rules

When refactoring:

1. Understand existing behavior first.
2. Identify responsibilities.
3. Extract functionality incrementally.
4. Preserve public interfaces.
5. Keep framework-specific code isolated.
6. Avoid unnecessary abstractions.
7. Avoid unrelated changes.
8. Add or update tests.
9. Run validation commands.
10. Review the final diff.

Never perform a large rewrite merely to make the code look cleaner. Prefer incremental changes.

---

## Testing

Every behavior-changing change should have tests.

Tests should verify behavior rather than implementation details.

Important areas include:

- Feature registration
- Feature evaluation
- Default values
- Overrides
- Override precedence
- Local persistence
- Remote configuration
- Subscriptions
- Listener cleanup
- SSR behavior
- React integration
- Vue integration
- Angular integration
- Public API behavior

Inspect `package.json` to determine the project's actual test commands. Never assume a script exists.

---

## Type Declarations

FeatureFlow provides TypeScript declarations despite the implementation being primarily JavaScript.

When changing public APIs, verify:

- `src/index.d.ts`
- `src/types/index.d.ts`

Type declarations must remain consistent with runtime behavior. A public API change is incomplete if the corresponding TypeScript declarations are not updated.

---

## Documentation

Documentation is part of the implementation.

Relevant documentation includes:

- `README.md`
- `FeatureFlow-README.md`

When public behavior changes, documentation must be evaluated. Documentation should be updated when changes affect:

- Public APIs
- Configuration
- Installation
- Usage
- Feature registration
- Feature evaluation
- Overrides
- Remote configuration
- Framework integrations
- SSR
- Development UI
- Breaking changes

The `feature-documentation` agent is responsible for this work.

---

## Changelog

Every meaningful user-facing change should be reflected in the changelog.

If a changelog does not currently exist, the documentation agent should determine whether one should be introduced based on the repository conventions.

Do not generate meaningless changelog entries for:

- Internal formatting
- Trivial refactoring
- Comment changes
- Non-user-visible implementation details

Meaningful changes include:

- New features
- Bug fixes
- API changes
- Breaking changes
- Framework behavior changes
- Configuration changes
- Important performance improvements

---

## GitHub Issue Workflow

GitHub Issues are treated as the source of requirements.

When working on an Issue:

1. Read the complete Issue description.
2. Inspect relevant comments if available.
3. Inspect the repository.
4. Read `CLAUDE.md`.
5. Determine the affected architecture.
6. Implement only the required scope.
7. Add/update tests.
8. Update documentation when required.
9. Review the final diff.
10. Validate the implementation.

Do not implement unrelated improvements.

---

## Agent Responsibilities

### `feature-architect`

Responsible for:

- Architecture analysis
- Dependency analysis
- Refactoring strategy
- Identifying responsibilities
- Identifying risks

The architect is read-only.

### `feature-refactor`

Responsible for:

- Production code changes
- Refactoring
- Feature implementation
- Backward-compatible implementation

### `feature-reviewer`

Responsible for:

- Code review
- Regression detection
- API compatibility
- Architecture validation
- Security review
- Test coverage review

The reviewer is read-only.

### `feature-tester`

Responsible for:

- Test implementation
- Regression tests
- Test execution
- Test coverage
- Framework integration testing

### `feature-documentation`

Responsible for:

- README updates
- API documentation
- Usage examples
- Changelog
- Documentation consistency

Documentation changes must reflect the actual implementation.

### Recommended Agent Workflow

For significant changes, prefer:

```plaintext
GitHub Issue
     │
     ▼
feature-architect
     │
     ▼
Architecture Plan
     │
     ▼
feature-refactor
     │
     ▼
Implementation
     │
     ▼
feature-tester
     │
     ▼
Tests
     │
     ▼
feature-reviewer
     │
     ▼
Code Review
     │
     ▼
feature-documentation
     │
     ▼
Documentation + Changelog
```

For simple changes, not every agent is required. Use the smallest workflow that provides sufficient confidence.

---

## Scope Control

Do not expand the scope of an Issue without a clear reason.

If you discover an unrelated problem:

1. Do not silently fix it.
2. Mention it in the final report.
3. Recommend creating a separate Issue.

This prevents uncontrolled changes and unnecessary token usage.

---

## Security

Never:

- Commit secrets.
- Expose API keys.
- Hardcode credentials.
- Add sensitive configuration.
- Disable security mechanisms merely to make tests pass.

If secrets are found, stop and report the problem.

---

## Git Rules

Before finishing a task:

```bash
git status
git diff
```

Verify:

- Only intended files changed.
- No secrets were added.
- No debugging code remains.
- No unrelated formatting changes were introduced.
- No generated artifacts were accidentally modified.

Do not merge Pull Requests automatically. The final decision to merge remains with the repository owner.

---

## Final Task Report

When completing a task, summarize:

**Changes**
What was implemented.

**Tests**
What was executed and the result.

**Documentation**
What documentation was updated.

**Risks**
Any remaining risks or assumptions.

**Files Changed**
List the relevant files.

Keep the final report concise and factual.
