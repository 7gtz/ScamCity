# Agent brief — Claude Code / simulation and recovery

**Agent id:** `claude-simulation-recovery`
**Branch:** `feat/simulation-recovery`
**Workplan entry:** `ops/workplan.json` → `agents[] where id == "claude-simulation-recovery"`

---

## 0. Read first

1. [`docs/DETECTIVE-TRACK-24H.md`](../../docs/DETECTIVE-TRACK-24H.md) — the build plan. **Required**, especially §11 Content and safety.
2. [`docs/AGENT-OPERATIONS.md`](../../docs/AGENT-OPERATIONS.md) — how the five agents share the repo.
3. [`ops/workplan.json`](../workplan.json) — ownership. If anything here disagrees with it, **the JSON wins**.
4. `src/lib/gemini/persona.ts` — the existing safety rails. You extend them; you never loosen them.

You hold the **only approval to change existing product code**, and it is strictly
additive. Treat that as a liability, not a licence.

---

## 1. Paths you own

```
src/game/pressure/**
src/game/ai/**
src/game/recovery/**
src/game/debrief/**
```

### Additive-only, by explicit approval

```
src/features/call/CallRoom.tsx      new optional props only
src/features/call/use-live-call.ts  ONE optional onComplete(score) callback, nothing else
src/lib/gemini/**                   new exports only
src/lib/validation/schemas.ts       APPEND-ONLY
src/tests/**                        new test files; never weaken an existing one
```

**Additive means:** new optional props, new exported functions, appended Zod
schemas, new test files. It does **not** mean changing a signature, reordering
code, renaming anything, or reformatting. `CallRoom.tsx` is 797 lines and is the
flagship — the intended change there is roughly ten lines adding an optional
`onComplete` callback.

`use-live-call.ts` was granted by the release captain for exactly one purpose:
calling `onComplete(score)` where the score is already produced (around line 38,
beside the existing `progress` and `freestyle.resolve` calls). This replaces
reading the newest score back out of `useResultsStore`, which is unsound because
`CallScore` carries no timestamp. **Nothing else in that file may change.**

## 2. Paths you must not touch

```
src/game/ai/adapter.ts    shared contract - implementations live beside it, not in it
```

Everything not listed in §1. In particular: `src/game/state/**`, `src/game/world/**`,
`src/game/ui/**`, `src/game/dialogue/**`, `src/game/case/**`, `src/content/**`,
`src/app/**`, `src/components/**`.

## 3. Prerequisites

`chore/game-contracts` merged to `main`. You do **not** wait on foundation — start
as soon as contracts land.

---

## 4. Deliverables

### 4.1 AI adapter — `src/game/ai/` (implementations of the contract)

Every AI call in the Detective Track goes through `withFallback`. No exceptions.

- Has a **deadline** and an **authored fallback**
- **Never throws**, never exceeds its deadline, always returns something renderable
- Covers timeout, outage, missing key and moderation failure identically

The existing `src/lib/gemini/server.ts` already does hedged and sequential fallback
chains, and `src/content/fallback-*.ts` are authored fallbacks. **Follow those
patterns.** Read them; do not change them.

### 4.2 Hints — `src/game/ai/hints.ts`

AI varies **phrasing only**. It must never decide an outcome, invent evidence, or
change what is true in the case. A deterministic authored hint exists for every
situation.

### 4.3 Pressure — `src/game/pressure/timer.ts`, `stress.ts`

- One fair, pausable timed decision. Honours `prefers-reduced-motion`
- Trust and stress curves
- Keep the logic **pure and unit-tested**, like `src/features/freestyle/schedule.ts`

### 4.4 Recovery — `src/game/recovery/`

The path after the player gets it wrong. **Failure must never dead-end** — that is a
brief requirement, not a nicety.

Authored, deterministic, and **lawful only**: verify through independently trusted
channels, use official numbers and apps, preserve evidence, secure accounts,
report through proper routes, ask for help early.

### 4.5 Debrief — `src/game/debrief/Debrief.tsx`

Build on the existing deterministic scoring: `src/features/scoring/compose.ts`,
`mock-judge.ts`, `src/features/encounters/grade.ts`,
`src/features/profile/defense.ts`. **Read and reuse. Do not restructure.**

Do not reward paranoia: turning away something genuine is a mistake in this game,
and the debrief must agree with `freestyle-store.ts`, which already scores it that way.

---

## 5. Safety — overrides everything else

From `docs/DETECTIVE-TRACK-24H.md` §11, non-negotiable:

- Every persona prompt states this is a consensual training game and all details
  are fictional
- The caller never repeats numbers back and drops character immediately on
  distress or "stop"
- Organisations, numbers, brands and payment details are **always fictional**
- **No operational fraud detail, ever:** no working scripts, no security bypasses,
  no evasion techniques, no money-movement instructions

If a deliverable seems to require any of that, it is out of scope. Say so in your
report rather than implementing it.

---

## 6. Rules that are not negotiable

- **No refactors.** Additive only, including in the files you are approved to touch.
- **`schemas.ts` is append-only**, in your own commented section.
- **Do not reformat** files you were not otherwise changing.
- **All 88 pre-existing tests stay green.** You own `src/tests/**` — never weaken an
  existing test to make something pass.
- **No new npm dependencies** without the release captain's agreement.
- **No secrets.** CI has no `GEMINI_API_KEY` and must never need one.
- **Never push to `main`.**

---

## 7. Before you open a PR

```powershell
.\ops\scripts\Test-AgentWorktree.ps1 -Agent claude-simulation-recovery
```

All must pass: pnpm 10 · `node ops/scripts/check-ownership.mjs` · `pnpm typecheck` ·
`pnpm test` · `pnpm build`.

**Additionally, prove the offline path by hand** and paste the result in the PR:

1. Unset `GEMINI_API_KEY`, restart, play the case through
2. Disconnect the network, play the case through
3. Confirm the case outcome is **identical** with AI on and AI off

Then:

```bash
git fetch origin main
git rebase origin/main
```

**Never use Corepack**; use `npx -y pnpm@10` if pnpm is not on your PATH.

---

## 8. Report format

```
BRANCH:    feat/simulation-recovery
SHA:       <commit sha>
FILES:     <every changed file, one per line>
COMMANDS:  <every command you ran>
RESULTS:   ownership <pass/fail> | typecheck <pass/fail> | test <n passed> | build <pass/fail>
           offline playthrough <pass/fail> | no-key playthrough <pass/fail>
BLOCKERS:  <anything stopping you, or "none">
INTEGRATION NOTES:
           <exports other agents import, the exact additive change made to
            CallRoom.tsx, schemas appended, and any safety concern you hit>
```

Call out **every line** you changed in existing product code, separately from your
new files. That is what the release captain reviews hardest.
