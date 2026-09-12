# Agent brief — Integration

**Agent id:** `integration`
**Branch:** `feat/integration`
**Workplan entry:** `ops/workplan.json` → `agents[] where id == "integration"`

---

## 0. Read first

1. [`docs/DETECTIVE-TRACK-24H.md`](../../docs/DETECTIVE-TRACK-24H.md) — the build plan.
2. [`docs/AGENT-OPERATIONS.md`](../../docs/AGENT-OPERATIONS.md) — how branches and ownership work.
3. [`src/game/integration/README.md`](../../src/game/integration/README.md) — the foundation agent's handoff. The most important file for you.
4. [`ops/workplan.json`](../workplan.json) — ownership. If anything here disagrees with it, **the JSON wins**.

---

## 1. Why you exist

Five agents built five correct, tested silos in parallel. **Nothing joins them.** Today `/city` renders a placeholder list and says *"The investigation at this location is not available yet."*

On `main` right now, all of this is built and **unreachable**:

| Built | Reachable? |
|---|---|
| `world/Panel`, `Hotspot`, `WorldMap`, `ui/PanelShell`, 5 procedural backgrounds | ❌ referenced nowhere outside `src/game/world/` |
| `dialogue/engine`, `DialogueBox`, `case/CaseBoard`, `EvidenceCard`, `Inventory`, `verify` | ❌ rendered nowhere |
| 1,327 lines of authored case content (42 dialogue nodes, 6 evidence, 5 deductions, 5 outcomes) | ❌ imported by nothing |
| `debrief/Debrief`, `pressure/timer`, `ai/hints` | ❌ never mounted |

**Your job is to make the game exist.** You write very little new logic. You connect what is there.

---

## 2. Paths you own

```
src/app/city/**                        routes and composition
src/game/integration/**                the glue layer
src/game/world/registry.ts             hotspot/id fixes only (see §4)
src/content/cases/ten-minute-window/** id and mapping fixes only (see §4)
src/content/modes.ts                   one entry so players can reach /city
src/features/call/CallRoom.tsx         ADDITIVE only
src/features/call/use-live-call.ts     ADDITIVE only
```

Everything else is off limits: `src/game/world/**` other than `registry.ts`, `src/game/ui/**`,
`src/game/dialogue/**`, `src/game/case/**`, `src/game/state/**`, `src/game/pressure/**`,
`src/game/ai/**`, `src/game/recovery/**`, `src/game/debrief/**`, `src/lib/**`.

**Consume those. Do not rewrite them.** If a component's props are genuinely wrong for
assembly, say so in your report rather than editing it.

---

## 3. Four defects found before you started

These are confirmed, not hypothetical. Fix them as part of assembly.

### 3.1 Two competing navigation models — decide this first

- The **dialogue graph** is location-keyed (`office-start`, `office-travel`, `victim-entry`)
  and moves the player through dialogue choices: *"Select a destination and head out."*
- The **world registry** moves the player through hotspots:
  `flat-front-door → { kind: "travel", to: "bank-branch" }`.

Both work. They disagree. **Pick hotspot travel as primary** — it is what makes this an
explorable 2D game rather than a text adventure, and it is what the plan specifies. Keep
`office-travel` reachable as a fallback route, but the map and hotspots are the spine.
State the decision in your PR.

### 3.2 `talk` cannot resolve to a dialogue node

Hotspots carry `action: { kind: "talk", npc: "ravi-sunder" }` — an **npc id**.
`DialogueNode.speaker` is a **display name** (`"Detective Miller"`), and the graph has no
npc index. Nothing maps one to the other.

Build that mapping. Prefer a small explicit table in
`src/content/cases/ten-minute-window/` — npc id → entry node id — so it is authored data,
not logic buried in glue:

```
ravi-sunder   -> repair-...       (entry node for the repair-shop interview)
sgt-brennan   -> police-...
teller-vance  -> bank-...
mara-okoye    -> victim-interview-start
```

Read `dialogue.ts` for the real node ids. Do not invent nodes.

### 3.3 The victim cannot be interviewed

`victim-flat` has four `inspect` hotspots and one `travel` hotspot — **no `talk` hotspot at
all**. But the case authors a full `victim-interview-start` branch. Mara Okoye is the centre
of the case and is currently unreachable.

Add a talk hotspot for her to `victim-flat` in `world/registry.ts`.

### 3.4 Evidence ids do not line up

Eight hotspots inspect evidence that **does not exist** in the case:

```
window-scene  window-view  case-board  case-notes
case-notices  corridor-access  parts-inventory  queue-area
```

And one authored evidence item is referenced by **no hotspot**: `delivery-notice`.

Decide per item and say which you did:
- if it is real evidence, point the hotspot at the authored id;
- if it is scenery, it must not use `kind: "inspect"` with a fake evidence id — give it a
  flavour action or remove it. A hotspot that silently collects nothing is worse than none.
- wire `delivery-notice` to a hotspot, or drop it from the case.

**Add a test that fails if any hotspot references an unknown evidence or npc id.** This class
of bug must not come back.

---

## 4. Deliverables, in order

Do them in this order. Each one should leave the game more playable than before.

**1. Swap the registry.** `src/app/city/[locationId]/page.tsx` and
`src/game/integration/CityScreens.tsx` still import
`@/game/integration/panel-registry` — the bootstrap placeholder where every panel has
`hotspots: []`. Point them at `@/game/world/registry`. Delete or reduce the placeholder.

**2. Render the real UI.** Replace the bootstrap markup in `CityScreens.tsx` with
`WorldMap`, `Panel`, `Hotspot` and `PanelShell`.

**3. Wire the handlers.** `panel-actions.activateHotspot(hotspot, panels, handlers)` already
takes `PanelHandlers` with `talk` / `inspect` / `travel`. Implement them:
`talk` opens `DialogueBox` at the mapped node; `inspect` opens `EvidenceCard` and calls
`collectEvidence` where the item is real; `travel` navigates. Use the `children`/`overlay`
slots foundation left for exactly this.

**4. Feed the case in.** Load `TEN_MINUTE_DIALOGUE` and the `CaseDefinition` into the
dialogue engine and `CaseBoard`. Apply returned `Effect[]` through `applyEffects`.
The engine is a pure reducer — it returns effects, it does not mutate.

**5. Render the debrief.** When `resolveCase` fires, show `Debrief`.

**6. Mount pressure and hints.** `pressure/timer` on the ten-minute window;
`ai/hints` through `withFallback` so hints appear when available and authored text when not.

**7. Wire the victim's live call — highest value, do not skip.**
`panel-actions.createCallCompletion` is built and used only by a test. Connect the victim's
scam call to the existing live `CallRoom` so the case investigates a call the player actually
had, generated by the existing director using their real city, weather and time. This is what
gives the detective track its AI and real-world integration; without it the whole track is a
static visual novel. Use the granted additive `onComplete` hook — do not reach into
`useResultsStore`.

**8. Entry point.** Add a `/city` entry to `src/content/modes.ts` so players can reach it.

**9. The `onComplete` fix.** Replace the `useResultsStore` scan at `CallRoom.tsx:115`.
`CallScore` has no timestamp, so "newest score for a scenario" is unsound and picks the wrong
score on replay.

---

## 5. Rules

- **No refactors** of other agents' modules. Additive only in `CallRoom.tsx` and
  `use-live-call.ts`: new optional props and one callback.
- **Do not reformat** files you are not otherwise changing.
- **All pre-existing tests stay green.** Add tests for id integrity (§3.4).
- **No new npm dependencies.** **No secrets.** **Never push to `main`.**
- AI varies phrasing only. Case outcomes stay deterministic.

---

## 6. Before you open a PR

```bash
node ops/scripts/check-ownership.mjs
npx -y pnpm@10 typecheck
npx -y pnpm@10 test
npx -y pnpm@10 build
git fetch origin main && git rebase origin/main
```

**Then actually play it**, and paste the results into the PR:

- [ ] Map → panel → talk → evidence → case board → deduction → resolve → debrief, end to end
- [ ] With `GEMINI_API_KEY` unset **and** the network offline, the case still completes
- [ ] Save, reload mid-case, and the location, flags, evidence and board are restored
- [ ] A keyboard-only playthrough completes
- [ ] A failure path routes into recovery and does **not** dead-end

Nobody has played this yet. You are the first. Report what is not fun, not only what is broken.

---

## 7. Report format

```
BRANCH:    feat/integration
SHA:       <commit sha>
FILES:     <every changed file>
COMMANDS:  <every command run>
RESULTS:   ownership | typecheck | test | build
           playthrough: end-to-end <y/n> | offline <y/n> | reload <y/n> |
           keyboard-only <y/n> | failure-path <y/n>
DECISIONS: navigation model chosen; per-item resolution of the 8 unknown evidence ids
           and delivery-notice; where the npc -> node map lives
BLOCKERS:  <or "none">
NOTES:     what is unfun, unclear or unbalanced - you are the first player
```
