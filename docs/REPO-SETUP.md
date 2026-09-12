# Repository setup — manual steps for the release captain

Everything in this repository that *can* be automated has been. This file lists
what cannot: GitHub settings that only a repository admin can change through the
web UI.

**Do all of this before the five agents start.** It takes about ten minutes, and
each item prevents a specific failure that is expensive to recover from at
hour 19.

---

## 1. Branch protection on `main`

**Settings → Branches → Add branch ruleset** (or *Branch protection rules*), targeting `main`.

| Setting | Value | Why |
|---|---|---|
| Require a pull request before merging | **On** | Nobody pushes to `main`. This is the rule the whole workflow rests on |
| Required approvals | **1** | See §2 for the deliberate exception |
| Dismiss stale approvals on new commits | **On** | An approval must describe the code being merged |
| Require status checks to pass | **On** | Add `typecheck / test / build / ownership` (the job in `verify-pr.yml`) once it has run at least once — GitHub only lists checks it has seen |
| **Require branches to be up to date before merging** | **OFF** | **Deliberate for this sprint.** With five parallel branches, this forces a rebase-and-wait cycle on every merge and serialises the team. We rely on the rebase rule in `docs/AGENT-OPERATIONS.md` instead |
| Require conversation resolution | **On** | Cheap, catches dropped review comments |
| Block force pushes | **On** | The single most valuable protection at hour 19 |
| Restrict deletions | **On** | Same |
| Allow bypass for administrators | **Off** during the sprint | If the captain can bypass, the captain will bypass |

> **Merge queue: leave OFF.** It adds latency to every merge and provides little
> value with six branches over 24 hours. Turn it on only if the team explicitly
> decides the serialisation is worth it.

---

## 2. The approval exception

Requiring one approval on *every* PR makes documentation changes as slow as
engine changes. The intent for this sprint:

- **Product code** (`src/**`) — 1 approval, always.
- **Docs, ops scripts and workflows** (`docs/**`, `ops/**`, `.github/**`) — approval
  not needed; the author may merge once checks are green.

GitHub branch protection cannot express "required approvals, but only for these
paths". Two ways to get the intended behaviour:

1. **Simplest (recommended for 24 hours):** set required approvals to 1 for
   everything, and let the `automerge-docs` label plus
   `.github/workflows/docs-automerge.yml` handle prose PRs. Requires §4.
2. **Alternative:** use two rulesets — one targeting `main` with 1 approval, and a
   second, more permissive ruleset scoped by path. This is fiddlier and easy to
   misconfigure under time pressure. Prefer option 1.

---

## 3. Confirm CODEOWNERS handles

`.github/CODEOWNERS` currently names exactly one owner: **`@7gtz`**, the author of
every commit in this repository's history. All per-agent lines are **commented
out** on purpose.

**Why it is not already filled in:** a username in CODEOWNERS that does not exist,
or that lacks write access to this repository, silently breaks
*Require review from Code Owners*. The required review can then never be
satisfied and every PR jams. That is unrecoverable-looking at 3 a.m.

**What to do:**

1. Confirm the GitHub usernames of the other two developers and that each has
   **write access** (*Settings → Collaborators*). The handles supplied during
   planning were `harshitbahl90` and `Abuzaid-01`; they have **not** been verified
   against this repository and are therefore not asserted in the file.
2. Uncomment the per-agent block in `.github/CODEOWNERS` and replace
   `AGENT-A` / `AGENT-B` with the confirmed usernames.
3. Only then enable **Require review from Code Owners** in the ruleset.

Until step 3, review routing is manual. That is the safe failure mode.

---

## 4. Allow auto-merge (needed for `docs-automerge.yml`)

**Settings → General → Pull Requests → Allow auto-merge** — tick it.

Without this, `.github/workflows/docs-automerge.yml` cannot enable auto-merge. It
handles that gracefully: it posts a comment explaining this exact setting and
exits successfully, so no PR is ever blocked by it.

Auto-merge also needs at least one **required status check** on `main` (§1),
otherwise there is nothing for it to wait for.

---

## 5. Workflow permissions for the merge announcement

`.github/workflows/announce-merge.yml` creates and comments on the
`24-hour coordination board` issue. It declares the least privilege it needs:

```yaml
permissions:
  contents: read
  issues: write
```

For that to be granted, check **Settings → Actions → General → Workflow permissions**:

- **"Read and write permissions"** selected, **or**
- **"Read repository contents and packages permissions"** selected — in which case the
  per-workflow `permissions:` block above still grants `issues: write`, because a
  workflow may request more than the default *only* when the default is not
  restricted below it. If merge announcements silently do nothing, this is the
  first setting to check.

Also ensure **Allow GitHub Actions to create and approve pull requests** stays
**off** — nothing here needs it, and it is a needless capability.

> If issue creation is blocked by organisation policy, the workflow fails loudly
> in its own run and nothing else is affected. Fall back to announcing merges
> manually on the coordination issue.

---

## 6. Labels

The automation creates `coordination` on first use. Create these by hand
(**Issues → Labels**) so they exist before they are needed:

| Label | Colour | Purpose |
|---|---|---|
| `coordination` | `0e8a16` | The 24-hour coordination board |
| `agent-task` | `1d76db` | Applied by the agent task issue template |
| `automerge-docs` | `c2e0c6` | Opts a docs/ops PR into auto-merge |
| `hour-15-cut` | `d93f0b` | Marks work dropped by the hour-15 decision |

---

## 7. Secrets

**Add none.** The CI gate must never need one.

`verify-pr.yml` runs `typecheck`, `test` and `build` with no `GEMINI_API_KEY`, and
that is a feature, not a limitation: it continuously proves the game is
completable with no AI key and no network, which is a hard acceptance criterion
in `docs/DETECTIVE-TRACK-24H.md`.

If a Vercel deployment needs `GEMINI_API_KEY`, it belongs in **Vercel's**
environment variables, never in this repository and never in a workflow.

`.gitignore` already excludes `.env*` while keeping `.env.example` tracked, and
`ops/scripts/check-ownership.mjs` fails any PR that adds a secret-shaped file on
any branch.

---

## 8. Verification

After applying the above, confirm the wiring end to end:

1. Open a trivial docs PR. **Expect:** `verify-pr` runs; the ownership check reports
   *documentation / repository configuration branch*; all four steps pass.
2. Add the `automerge-docs` label. **Expect:** auto-merge is enabled, or a comment
   explaining §4.
3. Merge it. **Expect:** the `24-hour coordination board` issue is created and a
   merge comment appears on it.
4. Push a branch that touches a path it does not own and open a PR.
   **Expect:** `verify-pr` fails at the ownership step, in seconds, before the build.

If step 3 produces nothing, revisit §5. If step 4 passes when it should fail,
stop and fix it — the ownership gate is the thing keeping five agents apart.

---

## 9. What is already handled in-repo

No action needed for these:

- Ownership rules — `ops/workplan.json` + `ops/scripts/check-ownership.mjs`
- CI gate — `.github/workflows/verify-pr.yml`
- Merge announcements — `.github/workflows/announce-merge.yml`
- PR and issue templates — `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/agent-task.yml`
- Worktree creation, quality gate and status — `ops/scripts/*.ps1`
- Agent briefs — `ops/prompts/*.md`
- pnpm 10 pinning in CI — `verify-pr.yml` (`package.json` has **no** `packageManager`
  field, and should not gain one: it would activate Corepack, which resolves
  pnpm 12 and corrupts `node_modules` on Windows)
