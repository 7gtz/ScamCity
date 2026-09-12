# Foundation handoff

All runtime consumers use `@/game/integration/game` instead of importing the
Zustand store. The shared `state/types.ts` and `state/events.ts` remain types only.

- Contract API: `game`, `setFlag(id, value)`, `hasFlag(id)`, `evaluate(condition)`,
  `save()`, `load()`.
- Snapshot and subscription: `getGameState()` returns a detached `GameState`;
  `subscribeGameState(listener)` returns cleanup. React consumers use
  `useGameState(selector)` from `integration/use-game-state`. Select existing
  references or primitives, not a freshly allocated object.
- Mutations: `enterPanel(id)`, `giveEvidence(id)`, `giveItem(id)`, `removeItem(id)`,
  `changeTrust(npc, delta)`, `changeStress(delta)`, `applyEffects(effects)`,
  `resetGame(caseId?)`. Trust clamps to -100..100 and stress to 0..100.
- Events: `emit` and `on` re-export `state/event-bus`. Flag, evidence and travel
  actions publish after state changes, only when changed. Subscriber failures
  do not interrupt the remaining observers. `resetGame` and hydration notify
  snapshot subscribers, without replaying gameplay events.
- Pure conditions: `evaluateCondition(condition, state)` is available for
  reducers. Missing flags are false; explicit `is` compares strictly (including
  `false`, `0`, and empty strings). `all: []` is true; `any: []` is false.

`GameProvider` wraps both city routes, hydrates once, and flushes pending saves on
page hide, hidden visibility and unmount. `useGameReady()` gates interactions
until hydration has finished. One localStorage key, `scam-city:detective`, stores
the Zustand `{ state, version: 1 }` envelope. Both the envelope version and state
version must be 1. Autosave waits 300 ms after the latest mutation. `load()`
returns null for missing, corrupt, obsolete, invalid or inaccessible storage.
There are no migrations. Storage failure leaves the in-memory game playable.
Only GameState fields persist; evidence ids and deduction flags reconstruct the
case board. `save()` is debounced; `flushSave()` from `state/save` is the immediate
flush for navigation outside React when needed.

## Hosting the other systems

`panel-actions` provides:

- `activateHotspot(hotspot, panels, { talk, inspect, travel })`: rechecks hotspot
  and destination conditions. Talk/inspect open the owning UI via callbacks;
  inspection alone does not collect evidence. Travel sets location and delegates
  navigation to the host.
- `collectEvidence(caseDefinition, id)`: only collects authored evidence in the
  active case.
- `resolveCase(caseDefinition, outcome)`: checks the authored outcome condition,
  writes `case.outcome`, and emits `case-resolved` once. This is the only new flag
  defined here. Outcome selection belongs to the deterministic case/recovery
  code, never AI.
- `createCallCompletion(mapResult)`: maps the simulation owner's typed call
  result into authored `Effect[]`, once per callback instance. Create one callback
  per call attempt; it neither changes CallRoom nor assumes its result format.

`CityPanelScreen({ panel, children?, overlay? })` supplies independent content and
overlay slots for dialogue, evidence and calls. The city layout owns hydration.
Direct URLs check panel conditions after hydration before changing location.
Unknown route ids return 404; all five known ids have static params and metadata.

## Follow-up integration required

Foundation must merge before world UI starts, so importing world components now
would break the build. `CityScreens.tsx` currently renders a minimal map and honest
unavailable-location message; `panel-registry.ts` supplies only the five route
identities and titles, with no case content or hotspots. These are bootstrap
adapters, not the shipped world UI.

1. World owner: export the panel definitions from `game/world/registry.ts` and
   provide WorldMap, Panel and PanelShell component props on coordination issue
   #3. Foundation will replace the bootstrap registry with a re-export and bind
   the actual components in `CityScreens.tsx`. Do not edit foundation files.
2. Dialogue/case owner: provide callbacks/components consuming the facade above;
   pure reducer effects are applied by `applyEffects`. Content supplies the case
   definition and NPC/node mapping. Foundation wires these into the overlay slots.
3. Simulation owner: map CallRoom completion to authored effects with
   `createCallCompletion`; report the optional completion prop signature.
4. Release captain: `src/components/chrome/Chrome.tsx` currently treats only
   `/play` as immersive. Add `/city/` panel routes to the immersive predicate so
   global nav and smooth scrolling are omitted. No agent owns this file in the
   five-agent workplan; foundation cannot edit it. Current panels retain chrome.

This foundation does not claim the complete case is playable before those
dependent branches land. No existing product files or shared contracts changed.
