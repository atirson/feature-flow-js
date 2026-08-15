# Contributing to FeatureFlow

Thanks for taking the time to contribute. FeatureFlow is a small library used as a dependency by other projects, so **API stability and backward compatibility matter more than speed** — please read this guide before opening an issue or a pull request.

---

## Before you start

- Search [existing issues](https://github.com/atirson/feature-flow-js/issues) (open and closed) to avoid duplicates.
- For questions or ideas you're not sure about yet, open an issue first — don't jump straight to a large pull request. This avoids wasted work if the approach needs discussion.
- Read [`CLAUDE.md`](./CLAUDE.md) if you're touching `src/core` or `src/bindings` — it documents the layered architecture (core / bindings / UI) and the rules around framework independence.

---

## Reporting Issues

Open an issue at: https://github.com/atirson/feature-flow-js/issues/new

Pick a title prefix that matches the issue type:

| Prefix | Use for |
| --- | --- |
| `[Bug]` | Something doesn't behave as documented |
| `[Feature]` | A new capability or API |
| `[Docs]` | README/documentation is missing or wrong |
| `[Question]` | Usage questions that aren't a bug |

### Bug reports

Include:

1. **Package version** (`feature-flow-js` version from your `package.json`/lockfile).
2. **Environment**: Node.js version, browser (if relevant), and framework binding used (`core`, `react`, `vue`, or `angular`) with its version.
3. **Minimal reproduction**: the smallest code snippet (or repo link) that reproduces the issue — ideally your `registerFeature`/`registerFeatures` call, the `isEnabled`/binding call, and any config involved.
4. **Expected behavior** vs **actual behavior**.
5. Relevant console output/errors, if any.

Issues without a reproduction may be closed or converted to a `[Question]` until one is provided.

### Feature requests

Include:

1. The problem you're trying to solve (not just the API you want).
2. A proposed shape for the API/config, if you have one in mind.
3. Whether it affects the core, a specific framework binding, or the development UI.
4. Confirmation that it can be added **without breaking existing public APIs** — or, if it can't, say so explicitly and explain why it's still worth it.

### Security issues

Do not open a public issue for a security vulnerability (e.g. anything involving stored/persisted data, XSS via the development UI, or similar). Instead, email the maintainer directly at the address listed in [`package.json`](./package.json) (`author`) with details and a reproduction.

---

## Contributing Code

### Development setup

```bash
git clone https://github.com/atirson/feature-flow-js.git
cd feature-flow-js
yarn install   # or npm install
yarn test      # or npm test
```

> Check `package.json` → `scripts` for the current, authoritative list of commands — this guide may lag behind.

### Workflow

1. **Fork** the repository and create a branch off `main`:
   - `fix/<short-description>` for bug fixes
   - `feat/<short-description>` for new features
   - `docs/<short-description>` for documentation-only changes
2. **Scope your change** to the linked issue. Avoid unrelated refactors, formatting-only diffs, or drive-by changes in the same PR — open a separate issue/PR for those instead.
3. **Respect the architecture** described in `CLAUDE.md`:
   - `src/core/` must stay framework-agnostic — no React/Vue/Angular imports, no unconditional DOM/browser API usage.
   - Framework-specific code belongs in `src/bindings/<framework>/`.
   - Development-UI-only concerns belong in `src/ui/`.
4. **Preserve public API compatibility.** Unless the issue explicitly asks for a breaking change:
   - Don't rename, remove, or change the signature of an exported method.
   - Don't change default behavior or configuration semantics.
   - Update `src/index.d.ts` and `src/types/index.d.ts` alongside any runtime change to a public API — declarations and implementation must stay in sync.
   - If a breaking change is genuinely necessary, call it out explicitly in the PR description (don't bury it in an unrelated commit).
5. **Add or update tests** for any behavior change. Run the test suite (see `package.json` → `scripts`) before opening the PR.
6. **Update documentation** when the change affects anything user-facing: `README.md`, TypeScript declarations, or framework binding behavior.
7. Commit messages follow the existing convention in this repo — a short [Conventional Commits](https://www.conventionalcommits.org/)-style prefix, e.g.:
   ```
   fix: prevent stale overrides after environment switch
   feat: add support for percentage-based rollout rules
   docs: document remote config payload shape
   ```

### Pull request checklist

Before requesting review, confirm:

- [ ] The change is scoped to a single concern/issue.
- [ ] Public exports and method signatures are unchanged, or the PR description explicitly flags a `BREAKING CHANGE` and why it's necessary.
- [ ] `src/index.d.ts` / `src/types/index.d.ts` are updated if the public API changed.
- [ ] Tests were added/updated and pass locally.
- [ ] `README.md` is updated if user-facing behavior changed.
- [ ] `src/core/` has no new framework or DOM-only dependency.
- [ ] `git status` / `git diff` show only the intended files — no debug code, no accidental formatting churn, no secrets.

### Review process

The maintainer reviews PRs for correctness, architecture fit, backward compatibility, and test/documentation coverage. You may be asked to split a PR, add tests, or adjust the approach to preserve compatibility — this is normal for a library with public consumers. Merging is always at the maintainer's discretion.

---

## Code of Conduct

Be respectful and constructive in issues and pull requests. Assume good faith, keep discussion focused on the technical problem, and be patient — this is maintained on a best-effort basis.
