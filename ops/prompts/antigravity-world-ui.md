# Agent brief — Antigravity / world UI

**Agent id:** `antigravity-world-ui`
**Branch:** `feat/world-ui`
**Workplan entry:** `ops/workplan.json` → `agents[] where id == "antigravity-world-ui"`

---

## 0. Read first

1. [`docs/DETECTIVE-TRACK-24H.md`](../../docs/DETECTIVE-TRACK-24H.md) — the build plan. **Required.**
2. [`docs/AGENT-OPERATIONS.md`](../../docs/AGENT-OPERATIONS.md) — how the five agents share the repo.
3. [`docs/ART-REQUIREMENTS.md`](../../docs/ART-REQUIREMENTS.md) — §0 and §2. You build the **T0 procedural** art.
4. [`ops/workplan.json`](../workplan.json) — ownership. If anything here disagrees with it, **the JSON wins**.

The existing game at `/`, `/play/*`, `/freestyle`, `/modes` and `/riddle` already
works and is the fallback demo. **It must keep working at every commit.**

---

## 1. Paths you own

```
src/game/world/**
src/game/ui/**
```

## 2. Paths you must not touch

```
src/game/world/types.ts        shared contract - import it, never edit it
```

Everything not listed in §1. In particular: `src/game/state/**`, `src/app/city/**`
(the foundation agent owns the routes — you provide the components they render),
`src/game/dialogue/**`, `src/game/case/**`, `src/content/**`, `src/features/**`,
`src/components/**`, `src/app/globals.css`, `src/styles/**`.

**You may not add commissioned art.** `public/art/**` is not yours and there is no
art to add — see §4.3.

## 3. Prerequisites

Both must be **merged to `main`** before you open a PR:

- `chore/game-contracts`
- `feat/foundation-state` (you need flags and `evaluate()` to gate panels and hotspots)

Watch the `24-hour coordination board` issue, or run
`.\ops\scripts\Show-AgentStatus.ps1 -Fetch`.

---

## 4. Deliverables

### 4.1 Panel system — `src/game/world/Panel.tsx`, `Hotspot.tsx`

- `Panel` renders a background, a hotspot layer and an overlay slot
- `Hotspot` is one interactive region positioned by **percentage box** so it scales
  at any viewport
- **Pointer, keyboard and touch all work.** Keyboard reachability is an acceptance
  criterion, not polish: every hotspot must be focusable and activatable
- Hidden hotspots respect `requires` via the state agent's `evaluate()`

### 4.2 World map — `src/game/world/WorldMap.tsx`, `geometry.ts`

- The city map screen with node states `locked | open | current | cleared`
- `src/features/districts/geometry.ts` already solves route maths
  (`pointAtLength`, `routeAt`) and is tested in `src/tests/map.test.ts`.
  **Copy the approach into your own `src/game/world/geometry.ts`. Do not edit or
  import-and-modify the original** — it belongs to the existing game.
- `src/features/districts/CityMap.tsx` is a good reference for node status
  rendering. Same rule: read it, do not change it.

### 4.3 Panel art — procedural, tier T0

There is **no commissioned art and there will not be any within the deadline**.
The stylised system *is* the shipped look. Build each panel from:

- a flat colour field in the panel's tone (`data-tone` / `tone-*`)
- 2–4 flat geometric shapes suggesting the space
- a sodium-amber light gradient (`--color-amber`)
- the existing grain and halftone treatment
- the location name set large in `--font-display`

Use **design tokens only** (`src/styles/tokens.css`) — never raw hex. `--color-signal`
(red) and `--color-safe` (green) carry game state and must never be decorative.

Backgrounds are **DOM and CSS, not WebGL**. Do not put a shader between the player
and a panel.

Structure the loader so a future `public/art/panels/<id>/bg.avif` can replace a
procedural background with **no component change**.

**Five panels:** `office`, `victim-flat`, `bank-branch`, `repair-shop`, `police-station`.
See `docs/DETECTIVE-TRACK-24H.md` §1 for what each must read as.

### 4.4 Panel shell — `src/game/ui/PanelShell.tsx`

Back, map, case board, inventory and settings affordances. One shell, one owner,
used by every panel.

### 4.5 Registry and transitions — `src/game/world/registry.ts`, `navigation.ts`, `assets.ts`

Lazy-load panels. Transitions use `--d-wipe` (1400 ms) and must honour
`prefers-reduced-motion`.

---

## 5. Rules that are not negotiable

- **No refactors.** Additive only. Do not touch `districts.ts`, `CityMap.tsx`,
  `geometry.ts` or any existing component.
- **Do not reformat** files you were not otherwise changing.
- **All 88 pre-existing tests stay green.**
- **No new npm dependencies** without the release captain's agreement.
- **No secrets.** No `.env`, key, token or credential, ever.
- **Never push to `main`.**

---

## 6. Before you open a PR

```powershell
.\ops\scripts\Test-AgentWorktree.ps1 -Agent antigravity-world-ui
```

All must pass: pnpm 10 · `node ops/scripts/check-ownership.mjs` · `pnpm typecheck` ·
`pnpm test` · `pnpm build`.

Then:

```bash
git fetch origin main
git rebase origin/main
```

Push and open a PR with the template filled in and a linked issue.
**A screenshot or clip of every panel is required** — your work is entirely visual.
**Never use Corepack**; use `npx -y pnpm@10` if pnpm is not on your PATH.

---

## 7. Report format

```
BRANCH:    feat/world-ui
SHA:       <commit sha>
FILES:     <every changed file, one per line>
COMMANDS:  <every command you ran>
RESULTS:   ownership <pass/fail> | typecheck <pass/fail> | test <n passed> | build <pass/fail>
BLOCKERS:  <anything stopping you, or "none">
INTEGRATION NOTES:
           <components you export, props they take, the hotspot percentage-box
            map per panel, and what you need from state or dialogue>
```

The hotspot map matters beyond this sprint: it is what a commissioned artist works
to when real panel art is produced later.
