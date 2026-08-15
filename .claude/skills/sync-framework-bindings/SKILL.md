Sim. Eu manteria a mesma lógica dos outros skills: `Recommendation` com regras claras por cenário e uma **Completion Rule** para impedir que uma alteração no `core` seja considerada concluída enquanto os bindings estiverem inconsistentes.

````text"
# Skill: Sync Framework Bindings

## Description

Ensure that framework-specific integrations (React, Vue, Angular) remain consistent with the FeatureFlow core whenever changes are made to `src/core/`.

The goal is to prevent framework bindings from silently diverging from the core API, configuration, state management, or subscription behavior.

## When to Use

- After modifying `src/core/feature-toggles.js`.
- After modifying `src/core/feature-registry.js`.
- After modifying `src/core/override-manager.js`.
- After modifying `src/core/remote-config.js`.
- After modifying `src/core/subscription-manager.js`.
- After changing public APIs.
- After changing configuration shapes.
- After changing feature evaluation behavior.
- After changing event or subscription behavior.
- After changing initialization or lifecycle requirements.
- Before finalizing any task that affects shared interfaces between core and bindings.

## Procedure

### 1. Identify Core Changes

Review the current diff involving:

```text
src/core/
````

Identify:

* New methods.
* Removed methods.
* Renamed methods.
* Changed method signatures.
* Changed return values.
* New configuration properties.
* Removed configuration properties.
* Changed configuration semantics.
* Changed feature evaluation behavior.
* Changed override behavior.
* Changed remote configuration behavior.
* Changed subscription behavior.
* Changed initialization requirements.
* Changed lifecycle or cleanup behavior.

Do not assume that an internal refactor has no binding impact. Verify the actual interfaces used by the bindings.

---

### 2. Inspect React Binding

Inspect:

```text
src/bindings/react/FeatureFlowProvider.js
src/bindings/react/index.js
src/bindings/react/index.d.ts
```

Verify:

* Provider initialization uses the current core API.
* Provider configuration matches the current core configuration.
* Feature evaluation uses the correct core methods.
* Overrides use the correct core methods.
* Remote configuration uses the correct core methods.
* Subscriptions use the current subscription API.
* Cleanup/unsubscribe behavior is correct.
* React lifecycle behavior remains safe.
* Public hooks/components expose behavior consistent with the core.
* Type declarations match runtime behavior.

If the core API changed, explicitly verify every affected React call site.

---

### 3. Inspect Vue Binding

Inspect:

```text
src/bindings/vue/vue.js
src/bindings/vue/vue.d.ts
```

Verify:

* Composables use the current core API.
* Configuration matches the current core configuration.
* Feature evaluation is consistent with the core.
* Overrides behave consistently.
* Remote configuration behavior is consistent.
* Subscriptions use the current subscription API.
* Unsubscription happens correctly during lifecycle cleanup.
* Reactive updates are triggered correctly.
* Type declarations match runtime behavior.

---

### 4. Inspect Angular Binding

Inspect:

```text
src/bindings/angular/angular.js
src/bindings/angular/angular.d.ts
```

Verify:

* Services use the current core API.
* Providers/configuration match the current core configuration.
* Feature evaluation is consistent.
* Overrides are consistent.
* Remote configuration is consistent.
* Subscriptions use the current subscription API.
* Lifecycle cleanup is correct.
* Dependency injection behavior remains valid.
* Type declarations match runtime behavior.

---

### 5. Check Shared Assumptions

Verify that all bindings correctly handle changes to:

* Initialization.
* Configuration.
* Feature registration.
* Feature evaluation.
* Override precedence.
* Remote configuration.
* Subscriptions.
* Listener cleanup.
* State updates.
* SSR behavior.
* Error handling.

If the core introduced a new requirement, verify that:

```text
React
Vue
Angular
```

all satisfy that requirement.

If the core changed subscription cleanup, verify that all framework lifecycles unsubscribe correctly.

---

### 6. Check Public Surface

Compare the bindings against:

```text
src/index.js
src/index.d.ts
src/types/index.d.ts
```

Verify that:

* Public framework APIs still exist.
* Renamed core APIs are reflected in bindings.
* Removed core APIs are not still referenced.
* New required APIs are exposed when appropriate.
* Type declarations remain consistent.
* Documentation examples do not reference obsolete binding APIs.

---

### 7. Check for Silent Divergence

Look specifically for situations where:

```text
Core behavior
      ≠
React behavior
      ≠
Vue behavior
      ≠
Angular behavior
```

Examples:

* Core returns a new default value but a binding assumes the old default.
* Core changes subscription behavior but a binding still uses the old unsubscribe mechanism.
* Core changes configuration names but a binding still reads the old property.
* Core changes override precedence but a binding bypasses the new behavior.
* Core requires initialization but a binding does not initialize it.
* Core changes feature evaluation semantics but a binding caches the previous behavior.

These inconsistencies must be reported even if the binding code does not currently produce an obvious runtime error.

---

## Output Format

```text
Framework Bindings Sync: [SYNCED / OUT OF SYNC]

Core Changes Detected:
- [List]
- None

React Binding:
- Status: [SYNCED / NEEDS UPDATE]
- Required changes: [List or "None"]

Vue Binding:
- Status: [SYNCED / NEEDS UPDATE]
- Required changes: [List or "None"]

Angular Binding:
- Status: [SYNCED / NEEDS UPDATE]
- Required changes: [List or "None"]

Type Declarations:
- React: [SYNCED / NEEDS UPDATE]
- Vue: [SYNCED / NEEDS UPDATE]
- Angular: [SYNCED / NEEDS UPDATE]

Issues Found:
- [SEVERITY] Description + File + Line
- None

Recommendation:
- ...
```

## Recommendation Rules

### All bindings are synchronized

```text
Recommendation:
- All framework bindings are synchronized with the current core API.
- React, Vue, and Angular use compatible core behavior.
- Type declarations are consistent.
- No binding changes are required.
- The task may proceed to the next validation step.
```

### One or more bindings require changes

```text
Recommendation:
- Update every binding marked as NEEDS UPDATE before considering the task complete.
- Apply the required changes without changing unrelated framework behavior.
- Update the corresponding TypeScript declarations when necessary.
- Re-run this skill after the changes.
- Run the framework-specific tests when available.
```

### Core API changed but bindings were not updated

```text
Recommendation:
- The task must not be considered complete.
- Synchronize React, Vue, and Angular with the changed core API.
- Verify method signatures, configuration, return values, subscriptions, and lifecycle cleanup.
- Add or update regression tests for affected bindings.
- Re-run Framework Bindings Sync after implementation.
```

### Subscription or lifecycle behavior changed

```text
Recommendation:
- Treat this as a high-risk synchronization issue.
- Verify subscription creation, updates, and cleanup in React, Vue, and Angular.
- Add regression tests for listener cleanup and repeated updates.
- Do not consider the task complete until all affected bindings are validated.
```

### Type declarations are out of sync

```text
Recommendation:
- Synchronize the affected `.d.ts` files with the runtime binding APIs.
- Verify parameter types, return types, configuration types, and exported symbols.
- Re-run Public API Validation after updating the declarations.
```

### Documentation is out of sync

```text
Recommendation:
- Update `README.md` and/or `FeatureFlow-README.md` when the binding API or behavior is user-facing.
- Ensure framework examples use the current APIs.
- Run the `feature-documentation` agent after implementation.
```

### No core changes detected

```text
Recommendation:
- No changes were detected in `src/core/`.
- Framework synchronization is not required unless the task modifies shared public interfaces or binding behavior directly.
- Proceed to the next applicable validation step.
```

## Severity Rules

Use:

```text
[CRITICAL]
```

when a binding references a removed core API or has behavior that can cause a major runtime failure.

Use:

```text
[HIGH]
```

when a binding is incompatible with a changed core API, configuration, subscription model, or public interface.

Use:

```text
[MEDIUM]
```

when behavior is inconsistent but does not immediately break normal usage.

Use:

```text
[LOW]
```

for minor inconsistencies or maintainability issues.

Use:

```text
[INFO]
```

for observations that do not require changes.

---

# Completion Rule

If production code under `src/core/` was modified, this skill must be executed before the task is considered complete.

A result of:

```text
Framework Bindings Sync: OUT OF SYNC
```

blocks completion unless the identified inconsistency is explicitly documented as intentional by the task requirements.

The task may only proceed when:

```text
Framework Bindings Sync: SYNCED
```

or when a documented exception has been explicitly approved.

After fixing binding inconsistencies, re-run:

1. Framework Bindings Sync.
2. Public API Validation.
3. Run Library Check.
4. Feature Documentation, when the change is user-facing.

Never claim that framework synchronization passed if any React, Vue, or Angular binding remains incompatible with the current core behavior.

````

### Eu faria ainda uma pequena mudança na arquitetura dos seus skills

Agora você tem uma cadeia de validação bem interessante:

```text
                 Production Code Changed
                         │
                         ▼
              ┌─────────────────────┐
              │ Sync Framework      │
              │ Bindings            │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ Validate Public API │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ Run Library Check   │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ Documentation       │
              │ + Changelog         │
              └─────────────────────┘
````
