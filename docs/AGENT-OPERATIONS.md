# Agent operations — how five agents share one repository for 24 hours

Plain-language rules for everyone working on the Detective Track. Read this once
before you start, then keep it open.

- **The plan:** [`DETECTIVE-TRACK-24H.md`](DETECTIVE-TRACK-24H.md) — what we are building.
- **The rules, machine-readable:** [`../ops/workplan.json`](../ops/workplan.json) — who may change what.
- **Your brief:** `ops/prompts/<your-agent>.md`.
- **Repository settings:** [`REPO-SETUP.md`](REPO-SETUP.md) — release captain only.

> **If this document and `ops/workplan.json` ever disagree, the JSON wins.** It is
> what the ownership checker and CI actually read. This file explains it; it does
> not redefine it.

> **Note on the plan document.** `DETECTIVE-TRACK-24H.md` §5 describes the build as
> three developers, which is how it was originally scoped. The five-agent mapping
> below supersedes that section for branch and path ownership. Everything else in
> the plan — the additive-only rule, the hour-15 gate, the acceptance criteria,
> the safety constraints — stands exactly as written.

---

## 1. The five agents and what each owns

| Agent | Branch | Owns |
|---|---|---|
| **Codex / foundation** | `feat/foundation-state` | `src/game/state/**`, `src/app/city/**`, `src/game/integration/**` |
| **Antigravity / world UI** | `feat/world-ui` | `src/game/world/**` (except `types.ts`), `src/game/ui/**` |
| **Claude Code / simulation** | `feat/simulation-recovery` | `src/game/pressure/**`, `src/game/ai/**`, `src/game/recovery/**`, `src/game/debrief/**` — plus *additive-only* changes to `CallRoom.tsx`, `src/lib/gemini/**`, `src/lib/validation/schemas.ts`, `src/tests/**` |
| **Antigravity / dialogue UI** | `feat/detective-ui` | `src/game/dialogue/**` (except `types.ts`), `src/game/case/**` (except `types.ts`) |
| **Antigravity / content** | `feat/ten-minute-content` | `src/content/cases/ten-minute-window/**`, `src/content/npcs/ten-minute-window/**` |

**Two rules, and they are absolute:**

1. **No agent edits another agent's paths.** Not "just this once", not to unblock
   yourself, not at hour 19. If you need a change outside your paths, ask on the
   coordination issue and let the owner make it.
2. **No agent pushes to `main`.** Only the release captain merges.

Every PR is checked automatically. `ops/scripts/check-ownership.mjs` compares your
changed files against the workplan and fails the build with a list of the files
you may not touch.

---

## 2. Shared contracts, and the one branch that may create them

Six files are imported by nearly everyone, so nobody owns them outright:

```
src/game/world/types.ts
src/game/state/types.ts
src/game/state/events.ts
src/game/dialogue/types.ts
src/game/case/types.ts
src/game/ai/adapter.ts
```

They are created on **`chore/game-contracts`**, which is the only branch allowed to
touch them and the only branch allowed to touch *nothing else*. It ships
**types and interfaces only** — no runtime logic, no React components.

**This merges first, before any implementation branch opens a PR.** Everything
else waits on it. Once merged, those files are read-only for every agent: import
them freely, edit them never.

If a contract turns out to be wrong — and one will — do not patch it locally.
Say so on the coordination issue, and the release captain lands a follow-up
contracts change that everyone rebases onto.

---

## 3. When you may start

```
chore/game-contracts        start now, blocks everything
   |
   +-- feat/foundation-state          after contracts
   |      |
   |      +-- feat/world-ui           after contracts + foundation
   |      +-- feat/detective-ui       after contracts + foundation
   |
   +-- feat/simulation-recovery       after contracts
   +-- feat/ten-minute-content        after contracts
```

**You start when your dependencies are merged to `main`** — not when they are
"nearly done", not when a PR is open.

You will know because `.github/workflows/announce-merge.yml` posts to a single
issue called **`24-hour coordination board`** every time something lands. It names
the branch, the merge SHA, the paths it owned, and exactly who is now unblocked.

**Watch that issue.** It is the only status channel that matters.

To check at any time without asking anyone:

```powershell
.\ops\scripts\Show-AgentStatus.ps1 -Fetch
```

---

## 4. Your working loop

**Set up once, per agent.** Pick whichever of these matches your machine. Both end
in the same place; neither depends on anyone else's directory layout.

### A. Fresh clone — use this by default

One agent on your own laptop. Portable, and guaranteed to start from `origin/main`
as it is right now rather than from whatever a local clone happens to hold.

```bash
git clone https://github.com/7gtz/ScamCity.git scamcity-<your-agent-id>
cd scamcity-<your-agent-id>
git checkout -b <your-branch> origin/main
npx -y pnpm@10 install
```

Your branch name is in the table in §1, and in `ops/workplan.json`.

If your branch already exists on the remote — someone created it for you, or you
are resuming — track it instead of creating it:

```bash
git checkout -b <your-branch> origin/<your-branch>
```

### B. Worktree — when one person runs several agents on one machine

Worth it only when you are driving more than one branch from the same laptop: it
shares the git object store and keeps the branches in sibling directories.

```powershell
# From an existing clone. -RepoRoot and -WorktreeRoot both default sensibly,
# so this works wherever your clone lives.
.\ops\scripts\New-AgentWorktree.ps1 -List              # see the agents
.\ops\scripts\New-AgentWorktree.ps1 -Agent codex-foundation
```

It fetches `origin/main` first, creates the worktree and branch, and prints your
allowed paths, dependencies and the next command. It refuses to overwrite an
existing directory or reuse a branch checked out elsewhere, and it never deletes
a worktree or resets a branch.

```powershell
cd <the path it printed>
npx -y pnpm@10 install
```

**Either way, a new working directory has no `node_modules`.** The `install` step
is not optional, and it is the one people skip.

**Then, repeatedly:**

1. Write code — **only inside your allowed paths**.
2. Run the gate:

   ```powershell
   .\ops\scripts\Test-AgentWorktree.ps1
   ```

   This checks pnpm is version 10, runs the ownership check, then `typecheck`,
   `test` and `build`. It is the same gate CI runs, so green here means green
   there.

   Not on Windows, or no PowerShell? Run the same four checks directly:

   ```bash
   node ops/scripts/check-ownership.mjs
   npx -y pnpm@10 typecheck
   npx -y pnpm@10 test
   npx -y pnpm@10 build
   ```

3. Rebase onto `main`:

   ```bash
   git fetch origin main
   git rebase origin/main
   ```

4. Push and open a PR using the template. Link your issue.

**Use pnpm 10.** If `pnpm` is not on your PATH, use `npx -y pnpm@10 <command>` —
that is what the scripts do. **Never use Corepack:** it resolves pnpm 12, which
corrupts `node_modules` on Windows. This is a documented failure in this
repository's README, not a theory.

---

## 5. Pull request rules

- **One branch, one purpose.** Small enough to review in five minutes.
- **Always rebase onto `main` immediately before opening the PR**, and again
  whenever a merge is announced while your PR is open. `main` is moving all day.
- **Fill in the template honestly**, including the risks section. "I did not test
  X" is useful; a confident empty risks section is not.
- **A screenshot or clip is required** for anything visible.
- **Never reformat a file you were not otherwise changing.** A whitespace-only
  diff across a shared file is the fastest way to create a conflict nobody can
  resolve at hour 20.
- **No refactors.** Additive changes only. We are not splitting `CallRoom.tsx` or
  `scenarios.ts`, not generalising `districts.ts`, `CityMap.tsx` or
  `progress-store.ts`. The existing game must keep working at every commit,
  because it is the fallback demo.
- **All 88 pre-existing tests must stay green.** They are the regression gate.

### Conflicts

If your PR conflicts with `main`, rebase and resolve **only your own files**. If
the conflict is in someone else's file or in a shared contract, stop and hand it
to the release captain. Two agents resolving the same conflict in two different
ways is worse than a ten-minute wait.

---

## 6. How the release captain merges

The captain is the only person who merges, and merges in this order:

```
1. chore/game-contracts
2. feat/foundation-state
3. feat/world-ui
4. feat/detective-ui
5. feat/simulation-recovery
6. feat/ten-minute-content
```

For each PR, the captain checks: the ownership gate passed, CI is green, the
template is filled in, the diff contains no refactor and no reformatting, and
nothing secret-shaped is in it. Then **squash-merge** — the PR title becomes the
commit message, which is why titles must be conventional commits
(`feat(world): add panel hotspot layer`).

The captain also: resolves every cross-branch conflict, announces the hour-15
decision, cuts `release/demo`, and verifies the deploy.

Code PRs are **never** auto-merged. The only automation that can merge anything is
`docs-automerge.yml`, and only for documentation and ops scripts that carry the
`automerge-docs` label — never for `src/**`, and never for the files that define
these rules.

---

## 7. The hour-15 decision

At hour 15, the captain answers one question:

> Is **map → panel → dialogue → evidence → case board** playable end to end?

**If yes:** carry on; move to polish and integration.

**If no:** cut scope, in this order, and announce it on the coordination board:

1. Cut the victim perspective — ship the detective case alone.
2. Cut five panels to three: `office`, `victim-flat`, `bank-branch`.
3. Cut panel backgrounds to typographic only.
4. Cut the timed decision to untimed.

**The decision is made at hour 15, not hour 20.** Cutting early is a choice;
cutting late is a failure. Work that is cut is labelled `hour-15-cut` and left on
its branch — it is not deleted, and it may come back after the deadline.

Every agent's `hour15CutPriority` is in `ops/workplan.json`. Lower numbers are
cut first. Priority `0` and `5` are never cut.

---

## 8. Hard prohibitions

- **No secrets in the repository.** No `.env` file, no API key, no token, no
  credential, ever, on any branch. `.gitignore` excludes `.env*` (keeping
  `.env.example`), and the ownership checker fails any PR that adds a
  secret-shaped file regardless of which branch it is on. If a key is ever
  committed, treat it as compromised: rotate it first, rewrite history second.
- **CI never needs a key.** `GEMINI_API_KEY` is deliberately absent from CI. Every
  test runs against the mock providers and authored fallbacks. This continuously
  proves the acceptance criterion that the game is completable with no AI and no
  network.
- **No pushing to `main`.** No exceptions, including the captain — the captain
  merges PRs.
- **No force-pushing a branch someone else is working from.** Force-pushing your
  own un-reviewed branch after a rebase is normal and fine.
- **No editing another agent's paths.**
- **No new npm dependencies** without the captain's agreement. Install time is
  time we do not have, and a lockfile conflict blocks everyone.

---

## 9. Quick reference

```powershell
# What exists, what is merged, who is blocked
.\ops\scripts\Show-AgentStatus.ps1 -Fetch

# Create my workspace
.\ops\scripts\New-AgentWorktree.ps1 -Agent <agent-id>

# The full gate, before every PR
.\ops\scripts\Test-AgentWorktree.ps1

# Just the ownership question
node ops/scripts/check-ownership.mjs
node ops/scripts/check-ownership.mjs --help
```

```bash
# Before every PR
git fetch origin main
git rebase origin/main
```

**When in doubt: ask on the `24-hour coordination board` issue.** A two-minute
question beats a two-hour conflict.
