#!/usr/bin/env node
/**
 * Ownership checker for the 24-hour Detective Track build.
 *
 * Compares the files changed on a branch against the path ownership declared in
 * ops/workplan.json, and fails if the branch touched paths it does not own.
 *
 * No npm dependencies. Node 22+, ESM. Run it locally before you open a PR; CI
 * runs the same script on every pull request.
 *
 *   node ops/scripts/check-ownership.mjs --help
 *
 * Exit codes:
 *   0  every changed path is owned by this branch (or the branch is exempt)
 *   1  ownership violation, or a secret-looking file was added
 *   2  usage error, or the checker could not work out what to compare
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const WORKPLAN = resolve(REPO_ROOT, "ops", "workplan.json");

const HELP = `
check-ownership.mjs — enforce branch path ownership from ops/workplan.json

USAGE
  node ops/scripts/check-ownership.mjs [options]

OPTIONS
  --branch <name>      Branch to check. Default: the current branch.
  --base <ref|sha>     Compare against this ref instead of origin/main.
  --files <a,b,c>      Check this explicit comma-separated list instead of
                       asking git. Useful for testing the rules themselves.
  --no-working-tree    Ignore uncommitted and untracked changes.
  --json               Emit a machine-readable result on stdout.
  --quiet              Only print on failure.
  -h, --help           Show this text.

EXAMPLES
  node ops/scripts/check-ownership.mjs
  node ops/scripts/check-ownership.mjs --branch feat/world-ui
  node ops/scripts/check-ownership.mjs --base origin/main --branch feat/world-ui
  node ops/scripts/check-ownership.mjs --branch chore/game-contracts \\
      --files src/game/world/types.ts,src/game/state/types.ts

HOW OWNERSHIP IS RESOLVED
  1. main and release/* are exempt (the release captain owns them).
  2. chore/game-contracts may change only the six shared contract files.
  3. A branch listed in workplan.agents may change only its allowedPaths, and
     never its forbiddenPaths (those are shared contracts).
  4. docs/*, chore/* and ops/* branches may change only docs/**, ops/** and
     .github/**.
  5. Anything else is an unknown branch and fails, so a typo in a branch name
     cannot quietly bypass the rules.

  Files that look like secrets (.env, keys, certificates) fail on any branch.
`;

function parseArgs(argv) {
  const opts = { workingTree: true, json: false, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") return { help: true };
    else if (a === "--branch") opts.branch = argv[++i];
    else if (a === "--base") opts.base = argv[++i];
    else if (a === "--files") opts.files = argv[++i];
    else if (a === "--no-working-tree") opts.workingTree = false;
    else if (a === "--json") opts.json = true;
    else if (a === "--quiet") opts.quiet = true;
    else return { error: `Unknown option: ${a}` };
  }
  return opts;
}

/**
 * `raw: true` skips trimming. Needed for `git status --porcelain`, whose first
 * column is significant and may legitimately be a space (" M path") - trimming
 * the output would shift the path by one character.
 */
function git(args, { allowFailure = false, raw = false } = {}) {
  try {
    const out = execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (raw) return out;
    return out.trim();
  } catch (err) {
    if (allowFailure) return null;
    throw new Error(`git ${args.join(" ")} failed: ${String(err.stderr || err.message).trim()}`);
  }
}

/**
 * Glob to RegExp. Supports `**` (any characters, including /) and `*` (any
 * characters except /). Everything else is literal. Patterns are anchored.
 */
function globToRegExp(pattern) {
  let out = "^";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        // `dir/**` should also match `dir` itself having no trailing content.
        out += ".*";
        i++;
        if (pattern[i + 1] === "/") i++;
      } else {
        out += "[^/]*";
      }
    } else if ("\\^$.|?+()[]{}".includes(c)) {
      out += `\\${c}`;
    } else {
      out += c;
    }
  }
  return new RegExp(out + "$");
}

const matchesAny = (file, patterns) => patterns.some((p) => globToRegExp(p).test(file));

function loadWorkplan() {
  let raw;
  try {
    raw = readFileSync(WORKPLAN, "utf8");
  } catch {
    throw new Error(`Could not read ${WORKPLAN}. Run this from inside the repository.`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`ops/workplan.json is not valid JSON: ${err.message}`);
  }
}

function currentBranch() {
  const name = git(["rev-parse", "--abbrev-ref", "HEAD"], { allowFailure: true });
  if (!name || name === "HEAD") return null;
  return name;
}

/** Resolve the ref we diff against, preferring an explicit --base. */
function resolveBase(explicit, baseBranch) {
  const candidates = explicit ? [explicit] : [`origin/${baseBranch}`, baseBranch];
  for (const c of candidates) {
    const sha = git(["rev-parse", "--verify", "--quiet", `${c}^{commit}`], { allowFailure: true });
    if (sha) return { ref: c, sha };
  }
  throw new Error(
    `Could not resolve a base to compare against (tried: ${candidates.join(", ")}).\n` +
      `Fetch the base branch first:  git fetch origin ${baseBranch}\n` +
      `Or pass one explicitly:       --base <ref-or-sha>`,
  );
}

function changedFiles(base, includeWorkingTree) {
  // merge-base keeps this correct both for a local branch and for the merge
  // commit GitHub checks out on a pull request.
  const mergeBase = git(["merge-base", base.sha, "HEAD"], { allowFailure: true }) ?? base.sha;
  const committed = git(["diff", "--name-only", "--no-renames", `${mergeBase}`, "HEAD"]);
  const files = new Set(committed ? committed.split("\n").filter(Boolean) : []);

  if (includeWorkingTree) {
    const porcelain = git(["status", "--porcelain=v1", "--untracked-files=all"], {
      allowFailure: true,
      raw: true,
    });
    for (const line of (porcelain ?? "").split("\n")) {
      // Exactly two status columns, a space, then the path: "XY path" or
      // "XY old -> new". Either column may itself be a space.
      const m = /^(..) (.+)$/.exec(line.replace(/\r$/, ""));
      if (!m) continue;
      const path = m[2];
      const renamed = path.includes(" -> ") ? path.split(" -> ")[1] : path;
      files.add(renamed.replace(/^"|"$/g, ""));
    }
  }
  return [...files].sort();
}

/** Work out which rule set applies to this branch. */
function resolveRules(branch, plan) {
  const base = plan.baseBranch ?? "main";
  if (branch === base || branch.startsWith("release/")) {
    return { kind: "exempt", label: `${branch} is owned by the release captain`, allowed: ["**"], forbidden: [] };
  }

  const contracts = plan.contractsOnly;
  if (contracts && branch === contracts.branch) {
    return {
      kind: "contracts",
      label: `${contracts.displayName} — contracts only`,
      allowed: contracts.allowedPaths,
      forbidden: contracts.forbiddenPaths ?? [],
      extraHint:
        "The contracts branch may create only the six shared interface files, and only types and interfaces inside them.",
    };
  }

  const agent = (plan.agents ?? []).find((a) => a.branch === branch);
  if (agent) {
    return {
      kind: "agent",
      label: `${agent.displayName} (${agent.id})`,
      allowed: agent.allowedPaths,
      forbidden: agent.forbiddenPaths ?? [],
      extraHint: agent.forbiddenPathsNote,
      agent,
    };
  }

  const docs = plan.docsConfigBranches;
  if (docs && matchesAny(branch, docs.branchPatterns)) {
    return {
      kind: "docs",
      label: "documentation / repository configuration branch",
      allowed: docs.allowedPaths,
      forbidden: [],
      extraHint: "These branches may not touch product code. Put code on an agent branch.",
    };
  }

  return null;
}

function looksLikeSecret(file, plan) {
  const p = plan.policy ?? {};
  if (file === p.secretPathException) return false;
  return matchesAny(file, p.secretPathPatterns ?? []);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (opts.error) {
    process.stderr.write(`${opts.error}\n\nRun with --help for usage.\n`);
    return 2;
  }

  const plan = loadWorkplan();
  const branch = opts.branch ?? currentBranch();
  if (!branch) {
    process.stderr.write(
      "Could not determine the current branch (detached HEAD?). Pass one with --branch <name>.\n",
    );
    return 2;
  }

  const rules = resolveRules(branch, plan);
  if (!rules) {
    const known = [
      plan.contractsOnly?.branch,
      ...(plan.agents ?? []).map((a) => a.branch),
      ...(plan.docsConfigBranches?.branchPatterns ?? []),
    ].filter(Boolean);
    process.stderr.write(
      `Unknown branch: ${branch}\n\n` +
        `It is not in ops/workplan.json and does not match a documentation pattern.\n` +
        `Check the branch name against the plan, or add it to the workplan first.\n\n` +
        `Known branches and patterns:\n${known.map((k) => `  ${k}`).join("\n")}\n`,
    );
    return 2;
  }

  let files;
  if (opts.files !== undefined) {
    files = opts.files.split(",").map((f) => f.trim()).filter(Boolean);
  } else {
    let base;
    try {
      base = resolveBase(opts.base, plan.baseBranch ?? "main");
    } catch (err) {
      process.stderr.write(`${err.message}\n`);
      return 2;
    }
    files = changedFiles(base, opts.workingTree);
  }

  if (rules.kind === "exempt") {
    if (!opts.quiet) process.stdout.write(`ownership: skipped — ${rules.label}\n`);
    return 0;
  }

  const violations = [];
  for (const file of files) {
    if (looksLikeSecret(file, plan)) {
      violations.push({ file, reason: "looks like a secret or environment file and must never be committed" });
      continue;
    }
    if (matchesAny(file, rules.forbidden)) {
      violations.push({ file, reason: "is a shared contract file this branch may import but not edit" });
      continue;
    }
    if (!matchesAny(file, rules.allowed)) {
      violations.push({ file, reason: "is outside this branch's allowed paths" });
    }
  }

  if (opts.json) {
    process.stdout.write(
      `${JSON.stringify({ branch, rule: rules.kind, label: rules.label, checked: files.length, violations }, null, 2)}\n`,
    );
    return violations.length ? 1 : 0;
  }

  if (violations.length === 0) {
    if (!opts.quiet) {
      process.stdout.write(
        `ownership: OK\n` +
          `  branch:  ${branch}\n` +
          `  owner:   ${rules.label}\n` +
          `  checked: ${files.length} changed file(s)\n`,
      );
    }
    return 0;
  }

  process.stderr.write(
    `\nOWNERSHIP CHECK FAILED\n\n` +
      `  branch: ${branch}\n` +
      `  owner:  ${rules.label}\n\n` +
      `These ${violations.length} file(s) may not be changed on this branch:\n\n` +
      violations.map((v) => `  ${v.file}\n      ${v.reason}`).join("\n") +
      `\n\nThis branch may change:\n` +
      rules.allowed.map((p) => `  ${p}`).join("\n") +
      (rules.forbidden.length ? `\n\nBut never:\n${rules.forbidden.map((p) => `  ${p}`).join("\n")}` : "") +
      (rules.extraHint ? `\n\n${rules.extraHint}` : "") +
      `\n\nWhat to do:\n` +
      `  - Move the change to the branch that owns the path (see ops/workplan.json).\n` +
      `  - If you genuinely need a shared file changed, ask the release captain on\n` +
      `    the "${plan.policy?.coordinationIssueTitle ?? "coordination"}" issue before implementing.\n` +
      `  - Never edit another agent's paths to unblock yourself.\n\n`,
  );
  return 1;
}

try {
  process.exit(main());
} catch (err) {
  process.stderr.write(`check-ownership: ${err.message}\n`);
  process.exit(2);
}
