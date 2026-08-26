---
description: Regenerate .claude/context/PROJECT_CONTEXT.md from the current state of the repository.
---

# Update Project Context

Regenerate `.claude/context/PROJECT_CONTEXT.md` so it reflects the repository's *current* state.
This command is safe to re-run repeatedly: it only reads the repository and rewrites that single
file — it must not modify any other file, and must not modify library behavior, public APIs, or
existing agents/skills.

## Steps

1. Re-inspect the repository directly — do not assume anything from a prior run of this command:
   - `package.json` (description, `exports`, `scripts`, dependencies) — the source of truth for
     which commands exist. Never document a script that isn't actually defined there.
   - Repository structure under `src/` (`core/`, `bindings/`, `types/`, `ui/`), `tests/`, `scripts/`.
   - `src/index.js` and `src/index.d.ts` — current public exports and method signatures.
   - `src/types/index.d.ts` — shared public types.
   - Each `src/core/*.js` file — confirm class name and responsibility are still accurate
     (a one-line grep for the class declaration plus a skim is enough; don't re-derive behavior
     that `CLAUDE.md` already documents).
   - `src/bindings/react/`, `src/bindings/vue/`, `src/bindings/angular/` — confirm the exported
     functions/classes and their current signatures.
   - `README.md` for user-facing behavior notes (evaluation order, SSR guarantees, dev-UI behavior)
     — cross-check against the implementation rather than copying it uncritically.
   - `CHANGELOG.md` and `.releaserc.json` / release workflow for release conventions.
   - `.claude/agents/*.md` and `.claude/skills/*/SKILL.md` for the current agent/skill inventory.
2. Compare each section of the existing `.claude/context/PROJECT_CONTEXT.md` against what you just
   observed. Update only the sections that drifted (renamed/added/removed exports, changed scripts,
   new/removed core modules, new/removed agents or skills, changed testing conventions, etc.).
3. Rewrite `.claude/context/PROJECT_CONTEXT.md` in full, preserving its existing section structure
   (Overview, Repository Structure, Core Module Responsibilities, Public API Surface, Framework
   Bindings Overview, Commands, Testing Conventions, Release/Changelog Conventions, Agent & Skill
   Inventory, Conventions Worth Preserving). Update the "Last generated" date at the top to today's
   date.
4. Keep this file complementary to `CLAUDE.md`, not a duplicate of it — this file should hold the
   more detailed, *derived* snapshot (actual current exports, actual current scripts, current
   module line counts/responsibilities); defer to `CLAUDE.md` for architecture rules, agent
   responsibilities, and workflow policy rather than restating them at length.
5. Do not touch library source code, tests, `CLAUDE.md`, README, or any other file. This command's
   only allowed write is `.claude/context/PROJECT_CONTEXT.md`.
6. Report a short summary of what changed in the regenerated file (or state that nothing changed).
