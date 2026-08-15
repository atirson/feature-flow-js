# Skill: Verify Documentation Examples

## Description

Validate that all code examples in FeatureFlow documentation reference real, existing APIs and valid configuration shapes from the current codebase.

The goal is to prevent documentation from becoming outdated after refactors, API changes, configuration changes, or framework integration changes.

Examples must be validated against the actual runtime implementation and TypeScript declarations.

---

## When to Use

- After adding new features or public APIs.
- After modifying configuration objects.
- After modifying method signatures.
- After changing exports.
- After refactoring `src/core/`.
- After modifying framework bindings.
- During documentation updates.
- Before finishing a task that touched:
  - `README.md`
  - `FeatureFlow-README.md`
  - `src/index.js`
  - `src/index.d.ts`
  - `src/types/index.d.ts`
  - `src/bindings/`

---

# Procedure

## 1. Identify Documentation Files

Inspect:

```text
README.md
FeatureFlow-README.md
````

If additional documentation files exist, include them when they contain FeatureFlow API examples.

---

## 2. Extract Code Examples

Identify every relevant code block, especially:

````text
```js
```javascript
```ts
```typescript
````

For each example, identify:

* Imports
* Exported APIs
* Functions
* Methods
* Classes
* Hooks
* Composables
* Angular services/providers
* Configuration objects
* Feature definitions
* Override configuration
* Remote configuration
* Subscription usage
* Expected return values
* Framework-specific behavior

Assign each example a number:

```text
Example #1
Example #2
Example #3
...
```

---

# 3. Verify Public Imports

Inspect:

```text
src/index.js
src/index.d.ts
```

For every import used in documentation:

* Confirm the import path exists.
* Confirm the imported symbol exists.
* Confirm it is actually exported.
* Confirm the runtime export matches the TypeScript declaration.
* Confirm the documented API is public rather than an internal implementation detail.

Flag:

```text
[CRITICAL]
```

when an example imports a removed or non-existent public API.

Flag:

```text
[HIGH]
```

when the import path is incorrect or the API exists internally but is not publicly exported.

---

# 4. Verify API Usage

For every function, method, class, hook, composable, or service used in an example:

1. Locate its implementation.
2. Verify its current signature.
3. Verify required parameters.
4. Verify optional parameters.
5. Verify return behavior.
6. Verify expected side effects.
7. Verify whether the documented usage is supported.

Do not assume an API is valid merely because its name exists.

For example:

```javascript
feature.isEnabled('dark-mode')
```

must be checked against the actual public API.

---

# 5. Verify TypeScript Examples

Inspect:

```text
src/index.d.ts
src/types/index.d.ts
```

For TypeScript examples verify:

* Interfaces exist.
* Types exist.
* Generic parameters are valid.
* Function signatures match.
* Configuration properties exist.
* Property types are correct.
* Optional properties are documented correctly.
* Return types are compatible with the example.

Flag type mismatches as:

```text
[HIGH]
```

unless they are clearly non-blocking documentation annotations.

---

# 6. Verify Core Behavior

Inspect the relevant files under:

```text
src/core/
```

Especially:

```text
feature-toggles.js
feature-registry.js
override-manager.js
remote-config.js
subscription-manager.js
```

Verify that documented examples reflect actual behavior.

Check:

* Feature registration
* Feature evaluation
* Default values
* Overrides
* Override precedence
* Persistence
* Remote configuration
* Environment behavior
* Subscriptions
* Unsubscription
* Error handling
* Initialization
* SSR behavior

An example must not claim behavior that the implementation does not provide.

---

# 7. Verify React Examples

Inspect:

```text
src/bindings/react/FeatureFlowProvider.js
src/bindings/react/index.js
src/bindings/react/index.d.ts
```

For every React example verify:

* Provider import
* Provider props
* Hook names
* Hook parameters
* Hook return values
* Component behavior
* Configuration
* Subscription behavior
* Lifecycle behavior

Flag obsolete React APIs as:

```text
[CRITICAL]
```

Flag incorrect React signatures or configuration as:

```text
[HIGH]
```

---

# 8. Verify Vue Examples

Inspect:

```text
src/bindings/vue/vue.js
src/bindings/vue/vue.d.ts
```

Verify:

* Composable imports
* Composable names
* Parameters
* Return values
* Reactive behavior
* Lifecycle cleanup
* Configuration
* Feature evaluation

Flag obsolete APIs as:

```text
[CRITICAL]
```

---

# 9. Verify Angular Examples

Inspect:

```text
src/bindings/angular/angular.js
src/bindings/angular/angular.d.ts
```

Verify:

* Service names
* Provider configuration
* Dependency injection
* Method signatures
* Return values
* Lifecycle behavior
* Feature evaluation
* Overrides
* Subscriptions

Flag obsolete APIs as:

```text
[CRITICAL]
```

---

# 10. Verify Configuration Shapes

Whenever documentation contains configuration such as:

```javascript
{
  features: [...],
  overrides: [...],
  environment: 'development'
}
```

verify every property against the actual implementation.

Check:

* Property name
* Property type
* Required/optional status
* Default value
* Nested structure
* Accepted values
* Behavioral meaning

Do not infer configuration from documentation.

The implementation and public type declarations are the source of truth.

---

# 11. Verify Feature Definitions

When examples define features, verify that the documented feature structure matches the actual registry.

Check:

* Feature key
* Feature value
* Metadata
* Default state
* Environment configuration
* Feature registration format

Flag invalid feature definitions as:

```text
[HIGH]
```

---

# 12. Verify Import Paths

Check all documented import paths.

Examples:

```javascript
import { FeatureToggles } from 'feature-flow-js';
```

```javascript
import { useFeatureFlags } from 'feature-flow-js/vue';
```

Verify that:

* The package path exists.
* The package export exists.
* The symbol is exported from that entry point.
* The documented framework path matches the package structure.

Flag incorrect import paths as:

```text
[HIGH]
```

---

# 13. Verify Example Consistency

Check whether examples contradict each other.

Look for:

* Different API names for the same feature.
* Different configuration formats.
* Different initialization patterns.
* Different return-value assumptions.
* Deprecated APIs used in only some examples.
* Framework examples that behave differently without justification.

Documentation should present one consistent public API.

---

# 14. Verify Example Completeness

An example should contain enough context to be meaningful.

Check whether required pieces are missing.

For example:

```javascript
const featureFlow = new FeatureToggles();
featureFlow.isEnabled('dark-mode');
```

If initialization or registration is required before `isEnabled()`, the example should demonstrate it.

Do not require every example to be a complete application.

Only flag missing context when it would cause the example to fail or mislead a developer.

---

# 15. Optional Executable Validation

If the repository provides a safe way to execute documentation examples, prefer validating them automatically.

Before executing an example:

1. Inspect the package scripts.
2. Determine whether an example/test runner exists.
3. Avoid modifying production code.
4. Avoid installing unrelated dependencies.
5. Do not execute arbitrary external commands from documentation.

If examples cannot be executed automatically, perform static validation against the implementation and declarations.

Do not claim that an example was executed if it was only statically inspected.

---

# 16. Flag Outdated Examples

Use the following severity rules:

```text
[CRITICAL]
```

Use when:

* Example uses a removed API.
* Example uses a non-existent public API.
* Example uses a removed export.
* Example demonstrates behavior that is fundamentally unsupported.

```text
[HIGH]
```

Use when:

* Import path is incorrect.
* Function parameters are incorrect.
* Configuration shape is invalid.
* TypeScript declarations do not match.
* Framework API usage is incorrect.
* Required initialization is missing.

```text
[MEDIUM]
```

Use when:

* Example is technically valid but uses deprecated behavior.
* Example omits important but non-blocking context.
* Documentation is inconsistent with the preferred API.

```text
[LOW]
```

Use for:

* Minor naming inconsistencies.
* Non-critical example improvements.
* Formatting or clarity issues.

```text
[INFO]
```

Use for:

* Suggestions that do not require correction.

---

# Output Format

```text
Documentation Examples: [VALID / INVALID]

Files Checked:
- README.md
- FeatureFlow-README.md

Examples Found: X
Examples Verified: X
Examples with Issues: X
Examples Executed: X
Examples Static Only: X

Issues Found:

- [SEVERITY] File: README.md - Example #X
  Problem: [Description]
  Evidence: [Implementation/declaration reference]
  Recommendation: [Suggested fix]

React Examples:
- Checked: X
- Issues: X

Vue Examples:
- Checked: X
- Issues: X

Angular Examples:
- Checked: X
- Issues: X

TypeScript Examples:
- Checked: X
- Issues: X

Configuration Examples:
- Checked: X
- Issues: X

Recommendation:
- ...
```

# Recommendation Rules

## All examples are valid

```text
Recommendation:
- All documentation examples reference existing public APIs.
- Imports, signatures, configuration shapes, and framework integrations are consistent with the current implementation.
- No documentation changes are required.
- The task may proceed to the next validation step.
```

## Critical issues found

```text
Recommendation:
- Documentation validation failed.
- Update every example containing a removed or non-existent API before considering the task complete.
- Verify the corrected examples against `src/index.js`, TypeScript declarations, and the relevant implementation.
- Re-run this skill after corrections.
```

## High-severity issues found

```text
Recommendation:
- Correct the affected examples before considering the task complete.
- Verify imports, parameters, configuration shapes, types, and framework APIs against the current implementation.
- Re-run documentation example validation after the changes.
```

## Medium or low issues only

```text
Recommendation:
- Documentation is functionally valid but contains inconsistencies or improvements.
- Fix medium-severity issues when they can mislead developers.
- Low-severity issues may be addressed as documentation cleanup.
- No API correction is required unless additional evidence is found.
```

## Documentation and implementation disagree

```text
Recommendation:
- Treat the implementation and public TypeScript declarations as the source of truth.
- Do not modify code merely to make documentation examples valid.
- Update the documentation to reflect the actual supported API unless the Issue explicitly requires an API change.
- If the implementation itself appears incorrect, report it separately instead of silently changing production behavior.
```

# Completion Rule

A task that modifies documentation must not be considered complete until this skill has been executed.

If the result is:

```text
Documentation Examples: INVALID
```

completion is blocked when any `[CRITICAL]` or `[HIGH]` issue remains unresolved.

A result of:

```text
Documentation Examples: VALID
```

means all identified documentation examples are consistent with the current public API and implementation.

Never claim an example is executable unless it was actually executed.

Never claim an example is valid solely because its function names appear somewhere in the repository.

Validation must consider:

```text
Documentation
      ↓
Public Exports
      ↓
Type Declarations
      ↓
Core Implementation
      ↓
Framework Bindings
      ↓
Configuration
      ↓
Runtime Behavior
```
