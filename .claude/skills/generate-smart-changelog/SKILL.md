# Skill: Generate Smart Changelog

## Description

Analyze the actual changes made to FeatureFlow and generate a concise, meaningful, user-facing changelog entry.

The skill must distinguish between:

- Public API changes
- New functionality
- Behavioral changes
- Bug fixes
- Breaking changes
- Deprecations
- Performance improvements
- Internal-only refactoring

The changelog must describe what changed for FeatureFlow consumers, not how the code was internally reorganized.

---

# When to Use

Use this skill:

- After completing a feature.
- After fixing a user-facing bug.
- After changing public APIs.
- After changing framework bindings.
- After changing configuration behavior.
- After meaningful performance improvements.
- Before creating a Pull Request when user-facing changes exist.
- Before releasing a new version.
- When updating `CHANGELOG.md`.
- After a refactor if there is uncertainty about whether it has user-facing impact.

Do not generate changelog entries for purely internal changes.

---

# Source of Truth

Determine changelog entries from the actual implementation.

Inspect, when relevant:

```text
src/index.js
src/index.d.ts
src/types/index.d.ts

src/core/
src/bindings/
src/ui/

README.md
FeatureFlow-README.md
package.json
````

The Git diff is the primary source for determining what changed.

Documentation alone must never be treated as evidence that a feature exists.

---

# Procedure

## 1. Inspect the Current Changes

Review:

```bash
git diff
```

and:

```bash
git status
```

Identify:

* Added files
* Modified files
* Deleted files
* Renamed files
* Public exports
* Function signatures
* Configuration changes
* Framework binding changes
* UI changes
* Type declaration changes
* Documentation changes
* Dependency changes

Do not assume that every changed file represents a user-facing change.

---

# 2. Determine User-Facing Impact

For every meaningful code change, answer:

```text
Does this change affect FeatureFlow consumers?
```

Consider:

* Can users call a new API?
* Can existing APIs behave differently?
* Can existing configuration behave differently?
* Does a previously broken scenario now work?
* Does a framework integration behave differently?
* Does TypeScript now expose or reject something differently?
* Does performance materially improve?
* Does the package support a new environment?
* Does the change require consumers to modify their code?

If the answer is no, classify the change as internal.

---

# 3. Classify Changes

Each user-facing change must belong to one of the following categories.

## Added

Use for:

* New public APIs
* New features
* New configuration options
* New framework capabilities
* New supported use cases
* New public exports

Example:

```text
### Added
- Added support for configuring feature overrides through the public API.
```

Do not write:

```text
- Added override-manager.js.
```

The latter describes implementation rather than user value.

---

## Changed

Use for:

* Existing behavior changes that are not breaking
* Configuration improvements
* Performance improvements
* Improved framework behavior
* Changes to default behavior that remain backward compatible

Example:

```text
### Changed
- Improved remote configuration handling to update registered features without requiring reinitialization.
```

---

## Fixed

Use for:

* User-facing bugs
* Incorrect runtime behavior
* SSR bugs
* Framework integration bugs
* Incorrect TypeScript declarations
* Persistence bugs
* Subscription cleanup bugs

Example:

```text
### Fixed
- Fixed feature subscriptions not being released correctly when the framework component was unmounted.
```

Do not use `Fixed` for internal cleanup that did not correct a user-visible problem.

---

## Deprecated

Use when:

* An existing public API remains available.
* Consumers are explicitly encouraged to stop using it.
* A replacement API exists or is planned.

Example:

```text
### Deprecated
- Deprecated the legacy feature configuration format in favor of the new configuration API.
```

Do not mark something deprecated unless the codebase actually maintains the old API.

---

## Breaking

Use when consumers must change their code.

Examples:

* Removed public API
* Renamed public API
* Changed required parameters
* Changed return types incompatibly
* Changed configuration shape incompatibly
* Removed framework functionality
* Changed behavior in a way that requires consumer changes

Example:

```text
### Breaking
- Renamed `isFeatureEnabled()` to `isEnabled()`; consumers using the previous method must update their integrations.
```

Never hide breaking changes under `Changed` or `Fixed`.

---

# 4. Public API Verification

When a change potentially affects the public API, inspect:

```text
src/index.js
src/index.d.ts
src/types/index.d.ts
```

Also inspect the affected framework bindings:

```text
src/bindings/react/
src/bindings/vue/
src/bindings/angular/
```

Determine whether the change:

* Adds an export
* Removes an export
* Renames an export
* Changes a signature
* Changes configuration
* Changes return behavior
* Changes TypeScript declarations

If a public API was removed or changed incompatibly, it MUST be classified as:

```text
### Breaking
```

unless the project explicitly defines the change as non-breaking.

---

# 5. Framework Changes

When changes affect:

```text
src/bindings/react/
src/bindings/vue/
src/bindings/angular/
```

determine whether the change is actually visible to framework consumers.

Examples of user-facing changes:

```text
Added
- Added a new React hook for evaluating feature flags.

Changed
- Improved Vue feature reactivity when remote configuration changes.

Fixed
- Fixed Angular feature subscriptions not being cleaned up correctly.
```

Do not generate an entry merely because an internal binding file was reorganized.

---

# 6. Core Refactoring

Changes under:

```text
src/core/
```

must be treated carefully.

Internal refactoring alone is NOT a changelog entry.

For example:

```text
feature-toggles.js
    ↓
feature-registry.js
```

If public behavior remains unchanged:

```text
Changelog Entry: SKIPPED
Reason: Internal architectural refactoring with no user-facing behavior change.
```

However, if the refactor changes behavior, document the behavior.

Example:

```text
### Fixed
- Fixed feature registration so duplicate registrations no longer overwrite existing configuration unexpectedly.
```

Never document:

```text
- Refactored feature registration into feature-registry.js.
```

unless the project explicitly wants internal engineering changes documented.

---

# 7. UI Changes

Inspect:

```text
src/ui/
```

Generate a changelog entry only when the development UI changes in a meaningful way for users.

Examples:

```text
### Added
- Added feature search to the development UI.
```

```text
### Changed
- Improved the feature toggle development panel to make active overrides easier to identify.
```

Pure CSS cleanup, file organization, or internal DOM refactoring should not generate entries.

---

# 8. TypeScript Changes

Inspect:

```text
src/index.d.ts
src/types/index.d.ts
```

Generate an entry when TypeScript consumers are affected.

Examples:

```text
### Fixed
- Fixed TypeScript declarations for feature configuration options.
```

```text
### Added
- Added TypeScript definitions for the new feature override API.
```

If a type-only change is internal and does not affect consumers, do not create an entry.

---

# 9. Dependency Changes

Inspect:

```text
package.json
yarn.lock
```

Do not automatically generate changelog entries for dependency updates.

Only document dependency changes when they create meaningful user-facing impact, such as:

* New framework support
* Dropped framework support
* Minimum Node.js version change
* Browser compatibility change
* Security fix affecting consumers
* Significant runtime behavior change

Example:

```text
### Breaking
- Dropped support for Node.js 16; FeatureFlow now requires Node.js 18 or newer.
```

Do not document:

```text
- Updated lodash.
```

unless it materially affects consumers.

---

# 10. Documentation-Only Changes

Do not generate a changelog entry for:

* README formatting
* Typo fixes
* Grammar corrections
* Example formatting
* Internal documentation restructuring

However, documentation changes that expose or describe a new user-facing capability should correspond to an actual implementation change.

Never create a changelog entry based solely on a README claim.

---

# 11. Test-Only Changes

Do not generate changelog entries for:

* New unit tests
* Refactored tests
* Increased coverage
* Test utilities
* Test fixtures

Exception:

If the test change accompanies a user-facing bug fix, document the bug fix rather than the test.

Example:

```text
### Fixed
- Fixed feature overrides not persisting correctly between sessions.
```

Not:

```text
### Changed
- Added tests for override persistence.
```

---

# 12. Performance Improvements

Performance improvements should only be documented when they are meaningful to consumers.

Examples:

```text
### Changed
- Improved feature evaluation performance for applications with large feature registries.
```

Do not document micro-optimizations that have no meaningful consumer impact.

---

# 13. Breaking Change Detection

Before finalizing the changelog, explicitly check:

```text
Were any public APIs removed?
Were any public APIs renamed?
Were any required parameters added?
Were configuration shapes changed incompatibly?
Were return values changed incompatibly?
Were framework APIs changed incompatibly?
Were supported environments removed?
```

If yes, the change MUST appear under:

```text
### Breaking
```

Do not classify a breaking change as:

```text
Changed
```

or:

```text
Fixed
```

---

# 14. Changelog File

Check whether:

```text
CHANGELOG.md
```

exists.

If it exists:

* Follow its existing structure.
* Preserve existing formatting.
* Add the new entry under `## [Unreleased]` when appropriate.
* Do not rewrite historical entries.
* Do not reorder previous releases unnecessarily.

If there is no changelog:

```text
Do not automatically create CHANGELOG.md unless:
- The task explicitly requires it, or
- The project's existing release conventions indicate that a changelog should exist.
```

Otherwise report:

```text
Changelog file: Not present
Recommendation: Consider introducing CHANGELOG.md before the next release.
```

---

# 15. Entry Writing Rules

Each changelog entry should:

* Describe the user-facing result.
* Be concise.
* Use clear technical language.
* Avoid internal implementation details.
* Mention affected APIs when relevant.
* Mention migration requirements for breaking changes.

Prefer:

```text
- Added support for runtime feature overrides through the public API.
```

Avoid:

```text
- Created override-manager.js and moved override logic from feature-toggles.js.
```

Prefer:

```text
- Fixed remote configuration updates not notifying subscribed consumers.
```

Avoid:

```text
- Refactored subscription-manager.js.
```

---

# 16. Avoid Duplicate Entries

Before creating an entry:

1. Check the existing `CHANGELOG.md`.
2. Check whether the same change has already been documented.
3. Avoid duplicating entries under multiple categories.
4. Combine closely related changes when appropriate.

Each meaningful user-facing change should normally appear once.

---

# 17. Validate Entries

Before finalizing:

Verify that every changelog entry corresponds to a real code change.

For each entry answer:

```text
Evidence:
- Which file changed?
- What behavior changed?
- Is the change publicly observable?
```

Do not create entries based on assumptions.

Do not claim:

```text
Added feature X
```

if no implementation exists.

---

# 18. Final Classification Check

Before writing the final result, verify:

```text
Internal refactor → SKIPPED
Documentation-only → SKIPPED
Test-only → SKIPPED
Formatting-only → SKIPPED

New public capability → ADDED
Non-breaking behavior change → CHANGED
User-facing bug fix → FIXED
Existing API discouraged → DEPRECATED
Incompatible public change → BREAKING
```

---

# Output Format

If meaningful user-facing changes exist:

```text
Changelog Entry: [GENERATED]

## [Unreleased]

### Added
- [Description]

### Changed
- [Description]

### Fixed
- [Description]

### Deprecated
- [Description]

### Breaking
- [Description]

Evidence:
- [File/change supporting the entry]

Documentation Impact:
- [README / FeatureFlow-README.md / None]

Recommendation:
- [Next action]
```

Only include categories that contain entries.

Do not output empty sections.

---

# No User-Facing Changes

If no meaningful user-facing changes exist:

```text
Changelog Entry: [SKIPPED]

Reason:
- No user-facing changes detected.
- Changes are limited to internal refactoring, tests, formatting, documentation, or other non-user-visible modifications.

Recommendation:
- No changelog entry is required.
- Keep the current changelog unchanged.
```

---

# Breaking Change Detected

If a breaking change exists:

```text
Changelog Entry: [GENERATED]

## [Unreleased]

### Breaking
- [Description of the incompatible change]
- [Required migration action]

Recommendation:
- Treat this as a breaking release.
- Update README.md and FeatureFlow-README.md with migration instructions.
- Verify `src/index.d.ts` and framework bindings.
- Run Public API Validation before completing the task.
```

---

# Completion Rules

The changelog task is complete only when:

* Every meaningful user-facing change has been classified.
* Internal refactoring has not been incorrectly exposed as a feature.
* Breaking changes are explicitly identified.
* Entries correspond to real code changes.
* Existing changelog history is preserved.
* Documentation impact has been identified.
* No duplicate entries were introduced.

If there are no meaningful user-facing changes, the correct result is:

```text
Changelog Entry: [SKIPPED]
```

Do not manufacture changelog entries merely because production files were modified.

---

# Recommendation Rules

## User-facing changes detected

```text
Recommendation:
- Add the generated entry to `CHANGELOG.md` under `## [Unreleased]`.
- Verify that affected public APIs and documentation are synchronized.
- Run Public API Validation and Verify Documentation Examples before finalizing the task.
```

## Breaking change detected

```text
Recommendation:
- Treat the change as breaking.
- Add migration guidance to `README.md` and/or `FeatureFlow-README.md`.
- Validate all public exports and TypeScript declarations.
- Review React, Vue, and Angular bindings when applicable.
- Do not release without explicitly documenting the migration impact.
```

## No user-facing changes

```text
Recommendation:
- No changelog entry is required.
- Keep `CHANGELOG.md` unchanged.
- Continue with the remaining validation steps.
```

