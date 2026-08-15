# Skill: Validate Public API

## Description
Verify that changes to the codebase do not break or silently alter the public API of FeatureFlow. This skill must be used before any task is considered complete if production code was modified.

## When to Use
- After refactoring, renaming, or moving files in `src/core/`, `src/index.js`, or `src/bindings/`.
- Before finishing a task that touches exports, function signatures, or configuration objects.
- During code review to validate backward compatibility.

## Procedure

1. Inspect `src/index.js`
   - List all named exports.
   - Verify that no export was removed unless explicitly requested as a breaking change.
   - Verify that no export was renamed without a deprecation strategy.

2. Inspect `src/index.d.ts`
   - Compare every exported function/class name with `src/index.js`.
   - Verify that parameter types match the runtime implementation.
   - Verify that return types are consistent.
   - Ensure new parameters are optional to preserve backward compatibility.

3. Inspect `src/types/index.d.ts`
   - Verify that shared interfaces or configuration types are still exported correctly.
   - Check for renamed or removed type properties.

4. Inspect framework bindings
   - Check `src/bindings/react/index.js` and `src/bindings/react/index.d.ts`.
   - Check `src/bindings/vue/vue.js` and `src/bindings/vue/vue.d.ts`.
   - Check `src/bindings/angular/angular.js` and `src/bindings/angular/angular.d.ts`.
   - Ensure their public surface (hooks, composables, services) still matches the core API.

5. Inspect `README.md` and `FeatureFlow-README.md`
   - Verify that documented public functions still exist in the exports.
   - Flag any documented function that is no longer exported.

6. Final check
   - If any breaking change was found, stop and report it as `[BREAKING]`.
   - If any export was removed accidentally, flag it as `[CRITICAL]`.
   - If type declarations are out of sync, flag it as `[HIGH]`.

## Output Format

```text
Public API Validation: [PASSED / FAILED]

Exports Verified:
- src/index.js: X exports
- src/index.d.ts: X declarations
- Framework bindings: X exports

Issues Found:
- [SEVERITY] Description + File + Line

Recommendation:
- If PASSED: Confirm that the public API remains backward compatible and no action is required.
- If `[BREAKING]`: Do not consider the task complete until the breaking change is explicitly approved and documented.
- If `[CRITICAL]`: Restore the removed or altered public export before considering the task complete.
- If `[HIGH]`: Synchronize the TypeScript declarations with the runtime public API before considering the task complete.
- If `[MEDIUM]` or `[LOW]`: Fix the issue when it affects API consistency; otherwise document it as a follow-up.
- If documentation is out of sync: update `README.md` and/or `FeatureFlow-README.md` to reflect the actual public API.

## Completion Rule

Production code changes must not be considered complete until this validation has been executed.

A result of `Public API Validation: FAILED` blocks completion unless the failure is explicitly identified as an intentional breaking change approved by the task requirements.