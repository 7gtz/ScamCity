# Agent brief — Codex / foundation

**Agent id:** `codex-foundation`
**Branch:** `feat/foundation-state`
**Workplan entry:** `ops/workplan.json` → `agents[] where id == "codex-foundation"`

---

## 0. Read first

1. [`docs/DETECTIVE-TRACK-24H.md`](../../docs/DETECTIVE-TRACK-24H.md) — the build plan. **Required.**
2. [`docs/AGENT-OPERATIONS.md`](../../docs/AGENT-OPERATIONS.md) — how the five agents share the repo.
3. [`ops/workplan.json`](../workplan.json) — ownership, machine-readable. If anything here disagrees with it, **the JSON wins**.

You are one of five agents working in parallel on a fixed 24-hour deadline. The
existing game at `/`, `/play/*`, `/freestyle`, `/modes` and `/riddle` already works
and is the fallback demo. **It must keep working at every commit.**

---

## 1. Paths you own

```
src/game/state/**
src/app/city/**
src/game/integration/**
```

## 2. Paths you must not touch

```
src/game/state/types.ts        shared contract - import it, never edit it
src/game/state/events.ts       shared contract - import it, never edit it
```

Everything not listed in §1 belongs to someone else. In particular:
`src/game/world/**`, `src/game/ui/**`, `src/game/dialogue/**`, `src/game/case/**`,
`src/game/pressure/**`, `src/game/ai/**`, `src/game/recovery/**`,
`src/game/debrief/**`, `src/content/**`, `src/features/**`, `src/lib/**`.

**Do not edit another agent's files to unblock yourself.** Ask on the
`24-hour coordination board` issue instead.

## 3. Prerequisites

`chore/game-contracts` must be **merged to `main`** before you open a PR. Watch the
coordination issue for the announcement, or run
`.\ops\scripts\Show-AgentStatus.ps1 -Fetch`.

You are on the critical path: `feat/world-ui` and `feat/detective-ui` both wait on
you. Land something importable early rather than something perfect late.

---

## 4. Deliverables

### 4.1 Game state store — `src/game/state/game-store.ts`

A Zustand store implementing `GameState` from the contract:

- `location`, `flags`, `evidence[]`, `inventory[]`, `trust{}`, `stress`, `caseId`, `version`
- `setFlag(id, value)`, `hasFlag(id)`, `evaluate(condition)`
- Emits through `events.ts` so no other system imports this store directly

Follow the existing house style in `src/features/progress/progress-store.ts`:
Zustand with `persist`, `createJSONStorage`, `skipHydration: true`.

**Read** `src/features/progress/progress-store.ts` for the player model (`weak`,
`strong`, `learned`) — but **do not restructure it**. It is read by five other
modules.

### 4.2 Autosave — `src/game/state/save.ts`

- One `localStorage` key, debounced autosave
- `load()` is **Zod-validated and never throws**: a corrupt, truncated or
  older-version save returns `null` and the player starts fresh
- No migration code. There is no shipped version to migrate from

### 4.3 Routes — `src/app/city/page.tsx`, `src/app/city/[locationId]/page.tsx`

- `/city` — the world map screen (renders the world UI agent's component)
- `/city/[locationId]` — a panel, with `generateStaticParams` from the panel registry
- Follow the App Router patterns already in `src/app/play/[scenarioId]/page.tsx`
- Panels are immersive: coordinate with the shell the same way `/play` does

### 4.4 Integration glue — `src/game/integration/**`

The wiring that lets a panel host dialogue, evidence and the live call without
those systems importing each other.

---

## 5. Rules that are not negotiable

- **No refactors.** Additive only. Do not split, generalise or reorganise existing
  product code. Not `CallRoom.tsx`, not `scenarios.ts`, not `districts.ts`, not
  `CityMap.tsx`, not `progress-store.ts`.
- **Do not reformat** files you were not otherwise changing.
- **All 88 pre-existing tests stay green.**
- **No new npm dependencies** without the release captain's agreement.
- **No secrets.** No `.env`, key, token or credential, ever.
- **Never push to `main`.**

---

## 6. Before you open a PR

```powershell
.\ops\scripts\Test-AgentWorktree.ps1 -Agent codex-foundation
```

This runs, and all must pass:

| Check | Command |
|---|---|
| pnpm is version 10 | `pnpm --version` (or `npx -y pnpm@10 --version`) |
| ownership | `node ops/scripts/check-ownership.mjs` |
| typecheck | `pnpm typecheck` |
| tests | `pnpm test` |
| build | `pnpm build` |

Then:

```bash
git fetch origin main
git rebase origin/main
```

Push, and open a PR with `.github/pull_request_template.md` filled in and a linked
issue. **Never use Corepack** — use `npx -y pnpm@10` if pnpm is not on your PATH.

---

## 7. Report format

End your run with exactly this:

```
BRANCH:    feat/foundation-state
SHA:       <commit sha>
FILES:     <every changed file, one per line>
COMMANDS:  <every command you ran>
RESULTS:   ownership <pass/fail> | typecheck <pass/fail> | test <n passed> | build <pass/fail>
BLOCKERS:  <anything stopping you, or "none">
INTEGRATION NOTES:
           <exports other agents will import, events you emit, flags you define,
            and anything you need another agent to change>
```

Integration notes are the most valuable thing you produce. Four other agents are
guessing about your interfaces until you write them down.
