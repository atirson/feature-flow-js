#!/usr/bin/env node
/**
 * prepare-changelog.mjs
 *
 * Generates/updates the "## [Unreleased]" section of CHANGELOG.md from the
 * Conventional Commit history since the last git tag (or the full history,
 * if no tag exists yet). Used exclusively by the `claude-release.yml`
 * "Prepare Release" workflow — it never publishes, tags, or touches
 * package.json.
 *
 * Zero new runtime dependencies: only Node built-ins (`child_process`,
 * `fs`) are used, per this repo's scope-control principle (CLAUDE.md) —
 * adding a full commit-parsing library is not justified for this narrow,
 * mechanical task.
 *
 * Categorization mirrors the rules already documented by this repo's
 * `generate-smart-changelog` skill (Added / Changed / Fixed / Deprecated /
 * Breaking) and mirrors @semantic-release/commit-analyzer's default Angular
 * preset for deciding which commits are "release-worthy" at all
 * (feat/fix/perf/BREAKING CHANGE). Any commit whose type is not feat/fix/perf
 * and that has no BREAKING CHANGE marker is excluded entirely — this
 * naturally excludes chore/docs/style/test/refactor/build/ci commits with no
 * user-facing effect, matching the skill's stated exclusion list, without
 * needing a separate exclusion table.
 *
 * KNOWN, INTENTIONAL LIMITATION: the section this script writes/updates is
 * always titled "## [Unreleased]", never a concrete version number (e.g.
 * "## [1.2.0]"). The exact next version is only known once
 * @semantic-release/commit-analyzer computes it, which happens AFTER the
 * Release PR produced by this script is reviewed and merged — this script
 * runs strictly before that point, so it cannot correctly know or predict
 * the version. This is accepted as-is; no post-publish rewrite mechanism
 * (e.g. @semantic-release/exec renaming the section) has been added, to
 * avoid over-engineering a narrow CI script.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const changelogPath = path.join(repoRoot, "CHANGELOG.md");

const CATEGORY_ORDER = ["Added", "Changed", "Fixed", "Deprecated", "Breaking"];

const RECORD_SEP = "\x1e";
const FIELD_SEP = "\x1f";

function sh(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    ...opts,
  });
}

function getLatestTag() {
  try {
    return sh("git describe --tags --abbrev=0", { stdio: ["pipe", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function getCommits(range) {
  const raw = sh(
    `git log ${range} --no-merges --pretty=format:"%H${FIELD_SEP}%s${FIELD_SEP}%b${RECORD_SEP}"`
  );
  return raw
    .split(RECORD_SEP)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [hash, subject = "", body = ""] = chunk.split(FIELD_SEP);
      return { hash, subject: subject.trim(), body: body.trim() };
    });
}

// type(scope)?!: description
const CONVENTIONAL_HEADER = /^(\w+)(\(([^)]+)\))?(!)?:\s*(.+)$/;
const BREAKING_BODY = /BREAKING[ -]CHANGE:\s*(.+)/is;

function classifyCommit({ subject, body }) {
  const match = subject.match(CONVENTIONAL_HEADER);
  if (!match) {
    // Not a Conventional Commit subject (e.g. "Initial commit") — cannot be
    // categorized safely, so it is excluded entirely.
    return null;
  }

  const [, rawType, , scope, bang, description] = match;
  const type = rawType.toLowerCase();

  const breakingBodyMatch = body.match(BREAKING_BODY);
  const isBreaking = Boolean(bang) || Boolean(breakingBodyMatch);

  const releaseWorthy = isBreaking || ["feat", "fix", "perf"].includes(type);
  if (!releaseWorthy) {
    return null;
  }

  let category;
  if (isBreaking) {
    category = "Breaking";
  } else if (type === "feat") {
    category = /deprecat/i.test(description) ? "Deprecated" : "Added";
  } else if (type === "fix") {
    category = "Fixed";
  } else if (type === "perf") {
    category = "Changed";
  } else {
    return null;
  }

  let text = description.trim();
  if (isBreaking && breakingBodyMatch) {
    text = breakingBodyMatch[1].trim();
  }
  if (scope) {
    text = `**${scope}:** ${text}`;
  }
  // Normalize to a single trailing period for consistency.
  text = text.replace(/\.*$/, ".");

  return { category, text };
}

function loadExistingChangelog() {
  if (!existsSync(changelogPath)) {
    return null;
  }
  return readFileSync(changelogPath, "utf8");
}

function extractUnreleasedBullets(changelogContent) {
  const bullets = new Map(CATEGORY_ORDER.map((c) => [c, []]));
  if (!changelogContent) {
    return bullets;
  }

  const unreleasedMatch = changelogContent.match(
    /## \[Unreleased\]\n([\s\S]*?)(?=\n## \[|$)/
  );
  if (!unreleasedMatch) {
    return bullets;
  }

  const section = unreleasedMatch[1];
  const categoryBlocks = section.split(/^### /m).filter(Boolean);
  for (const block of categoryBlocks) {
    const [headingLine, ...rest] = block.split("\n");
    const category = headingLine.trim();
    if (!CATEGORY_ORDER.includes(category)) continue;
    const lines = rest
      .join("\n")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "));
    bullets.set(category, lines);
  }
  return bullets;
}

function buildUnreleasedSection(bullets) {
  const lines = ["## [Unreleased]", ""];
  for (const category of CATEGORY_ORDER) {
    const entries = bullets.get(category);
    if (!entries || entries.length === 0) continue;
    lines.push(`### ${category}`, "");
    for (const entry of entries) {
      lines.push(entry);
    }
    lines.push("");
  }
  // Trim trailing blank line duplication.
  while (lines.length && lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines.join("\n") + "\n";
}

function upsertUnreleasedSection(existingContent, unreleasedSection) {
  const header =
    "# Changelog\n\n" +
    "All notable changes to this project will be documented in this file.\n\n" +
    "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),\n" +
    "and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n\n";

  if (!existingContent) {
    return header + unreleasedSection + "\n";
  }

  if (/## \[Unreleased\]/.test(existingContent)) {
    return existingContent.replace(
      /## \[Unreleased\]\n[\s\S]*?(?=\n## \[|$)/,
      unreleasedSection + "\n"
    );
  }

  // No existing Unreleased section: insert right after the top-level header,
  // before the first release heading (or at the end if none exists yet).
  const firstReleaseHeadingIndex = existingContent.search(/^## \[\d/m);
  if (firstReleaseHeadingIndex === -1) {
    return existingContent.replace(/\n*$/, "\n\n") + unreleasedSection + "\n";
  }
  return (
    existingContent.slice(0, firstReleaseHeadingIndex) +
    unreleasedSection +
    "\n" +
    existingContent.slice(firstReleaseHeadingIndex)
  );
}

function main() {
  const tag = getLatestTag();
  const range = tag ? `${tag}..HEAD` : "HEAD";

  const commits = getCommits(range);
  const classified = commits.map(classifyCommit).filter(Boolean);

  if (classified.length === 0) {
    console.log(
      `No release-worthy commits found ${tag ? `since ${tag}` : "in repository history"}. CHANGELOG.md left unchanged.`
    );
    return;
  }

  const existingContent = loadExistingChangelog();
  const bullets = extractUnreleasedBullets(existingContent);

  let addedCount = 0;
  for (const { category, text } of classified) {
    const bulletLine = `- ${text}`;
    const existingLines = bullets.get(category);
    const alreadyPresent = existingLines.some(
      (line) => line.trim().toLowerCase() === bulletLine.trim().toLowerCase()
    );
    if (!alreadyPresent) {
      existingLines.push(bulletLine);
      addedCount += 1;
    }
  }

  if (addedCount === 0) {
    console.log("All release-worthy commits are already reflected in CHANGELOG.md. No changes made.");
    return;
  }

  const unreleasedSection = buildUnreleasedSection(bullets);
  const updatedContent = upsertUnreleasedSection(existingContent, unreleasedSection);

  writeFileSync(changelogPath, updatedContent, "utf8");
  console.log(`Updated CHANGELOG.md with ${addedCount} new entr${addedCount === 1 ? "y" : "ies"} under [Unreleased].`);
}

main();
