# Skill: Run Library Check

## Description

Execute the standard validation pipeline for the FeatureFlow library to guarantee that the package is installable, testable, lintable, type-safe, and buildable before any delivery or final review.

## When to Use

- After finishing code changes (refactor, feature, or bugfix).
- Before committing changes that affect `package.json`, build scripts, or dependencies.
- Before creating a Pull Request.
- Before finishing a GitHub Issue.
- Before considering production code changes complete.

## Procedure

1. Inspect `package.json`
   - Identify the test command.
   - Identify the build command.
   - Identify the lint command.
   - Identify the type-check command.
   - Prefer the scripts explicitly defined by the project.
   - Do not assume a command exists.

2. Install dependencies

   Use the package manager defined by the repository.

   If the project uses Yarn:

   ```bash
   yarn install
   ```

If the project uses npm:

```bash
npm install
```

Do not switch package managers unless explicitly requested.

3. Run tests

   Execute the project's configured test command.

   Examples:

   ```bash
   yarn test
   ```

   or:

   ```bash
   npm test
   ```

   * Capture failures.
   * If tests fail, stop the validation pipeline.
   * Do not continue to build or release until failures are resolved or explicitly accepted.

4. Run linter

   If a lint script exists, execute it.

   Example:

   ```bash
   yarn lint
   ```

   * Capture warnings and errors.
   * Errors block completion.
   * Style-only warnings may be reported without blocking unless the project configuration treats them as errors.

5. Run build

   If a build script exists, execute it.

   Example:

   ```bash
   yarn build
   ```

   * Ensure the build completes without errors.
   * Verify that the expected output directory is generated when applicable.
   * Do not modify build configuration simply to make the build pass.

6. Run type check

   If a type-check script exists, execute it.

   Example:

   ```bash
   yarn typecheck
   ```

   If no typecheck script exists but TypeScript declarations are part of the project, consider:

   ```bash
   npx tsc --noEmit
   ```

   only when the repository configuration supports it.

   * Ensure there are no type errors.
   * Do not weaken or remove types to make validation pass.

7. Check repository state

   Run:

   ```bash
   git status
   ```

   Verify:

   * No temporary files.
   * No debug logs.
   * No `npm-debug.log`.
   * No `yarn-error.log`.
   * No local-only configuration.
   * No unexpected generated files.
   * No unrelated changes.

8. Final validation

   Determine the overall result from all executed checks.

   A command that was not available must be reported as `N/A`, not as a failure.

## Output Format

```text
Library Check: [PASSED / FAILED]

Commands Executed:
- install: [OK / FAIL]
- test: [OK / FAIL]
- lint: [OK / FAIL / N/A]
- build: [OK / FAIL / N/A]
- typecheck: [OK / FAIL / N/A]

Failures:
- [Command] Error summary
- None

Stray Files Found:
- [List or "None"]

Recommendation:
- ...
```

## Recommendation Rules

Use the following rules when generating the `Recommendation`:

### All checks passed

```text
Recommendation:
- Library validation completed successfully.
- No blocking issues were found.
- The implementation is ready for the next review or delivery step.
```

### Installation failed

```text
Recommendation:
- Resolve the dependency installation failure before considering the task complete.
- Verify package manager configuration, dependency versions, lockfile consistency, and package registry access.
- Do not proceed with delivery while the project cannot be installed successfully.
```

### Tests failed

```text
Recommendation:
- Resolve the failing tests before considering the task complete.
- Investigate whether the failure is caused by the implementation, a regression, an outdated test, or the environment.
- Do not modify or weaken tests merely to make the pipeline pass.
```

### Lint failed

```text
Recommendation:
- Resolve lint errors before considering the task complete.
- Fix the underlying code or configuration issue.
- Style-only warnings may remain non-blocking when they do not violate project rules.
```

### Build failed

```text
Recommendation:
- Resolve the build failure before delivery.
- Inspect the build error and affected modules.
- Verify that exports, entry points, dependencies, and build configuration remain valid.
```

### Type check failed

```text
Recommendation:
- Resolve all type errors before considering the task complete.
- Verify runtime implementation and TypeScript declarations are consistent.
- Do not remove or weaken type definitions merely to bypass the error.
```

### Stray files found

```text
Recommendation:
- Remove or explicitly justify unexpected files before delivery.
- Ensure temporary files, logs, local configuration, generated artifacts, or unrelated modifications are not included in the final change.
```

### Multiple failures

```text
Recommendation:
- The library validation failed.
- Resolve all blocking failures before considering the task complete.
- Fix failures in dependency order: installation, tests, lint, build, and type-check.
- Re-run the complete validation pipeline after corrections.
```

## Completion Rule

Production code changes must not be considered complete until this validation has been executed.

A result of:

```text
Library Check: FAILED
```

blocks completion unless the failure is explicitly identified as an accepted environmental issue by the task requirements.

A result of:

```text
Library Check: PASSED
```

means the standard library validation pipeline completed successfully for all applicable commands.

`N/A` commands do not block completion when the corresponding script or validation is genuinely not configured in the repository.

Never claim `PASSED` if any applicable validation command failed.

```
