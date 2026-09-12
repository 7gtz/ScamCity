# Agent 1 — Gameplay Systems Lead, Detective Track

You are **Agent 1**. You own the game loop, state integrity, progression, deductions, outcomes,
timer behaviour, replay behaviour and integration logic under `/city`.

**Agent 2 is a separate system.** They own presentation: the world panels, the panel shell, the
dialog primitive, the HUD chrome and global styling. Do not initialise them. Do not edit their
files. Work concurrently.

---

## 1. Ownership

You exclusively own:

```
src/game/integration/**          (CityScreens.tsx, game.ts, panel-actions.ts,
                                  use-game-state.ts, outcome.ts, clearing-window.ts, review/**)
src/game/case/CaseBoard.tsx
src/game/case/verify.ts + verify.test.ts
src/game/debrief/**
src/game/pressure/**
src/game/state/**
src/content/cases/ten-minute-window/**
```

You must **not** edit:

```
src/game/world/**                src/game/ui/**
src/game/npc/VoiceInterrogationOverlay.tsx
src/game/npc/npc-overlay.css     src/app/city/city.css
src/features/call/**             global styling and navigation files
```

**Never make a "temporary" edit in Agent 2's files — not even a one-line import fix.** If you need
a UI primitive or a CSS behaviour, write the API requirement down and hand it over. If you find a
defect in their code, document it with reproduction steps rather than fixing it.

Do not commit until both agents have completed a phase-level integration check.

---

## 2. Where the work already stands

**Phase 1 is complete.** Do not redo it. What exists now:

### `src/game/integration/outcome.ts` — settlement

`settleCase(caseDef, { expired })` is the only place a run ends. `OUTCOME_PRECEDENCE` is explicit:
`funds-recovered` → `wrong-suspect` → `genuine-turned-away` → `partial-recovery` → `case-unsolved`.
Recovery outranks a mistaken accusation made along the way, because the accusation is already
scored separately as a pursued false lead rather than erasing a real save.

Expiry is terminal: if no authored condition fits a closed window, it falls through to
`case-unsolved`. Outcomes are immutable once written. `currentOutcome()` and `isResolved()` are the
read API.

### `src/game/integration/clearing-window.ts` — the clock

`TimerState` is persisted in `GameState.timer` (optional in the save schema, so old saves load).
`openClearingWindow` / `pause` / `resume` / `freeze` are the transitions; `windowStatus(state, now)`
is the pure read; `hudTimer(state, now)` is the adapter matching Agent 2's `InvestigationHUDProps`.
`src/game/pressure/timer.ts` stays pure and owns the maths — do not duplicate it.

### `src/game/integration/panel-actions.ts` — replay

Call idempotence lives in the persisted `CALL_SCORED_FLAG`, not a closure. First completed call is
canonical; later calls are practice and cannot write flags, re-charge stress or alter the grade.
`hasScoredCall()` is the read API.

### Tests

`src/game/integration/review/{settlement,clearing-window,replay}.test.ts`, plus the pre-existing
`playthrough.test.ts` (authored dialogue) and `src/game/npc/playthrough.test.ts` (voice path).
**297 tests, 23 files, all passing.** Typecheck clean; lint clean in every file you own.

---

## 3. Feedback from Phase 1 — read this before writing code

These are the things that actually bit, in this codebase.

**Write the outcome test before the outcome logic.** Two severe bugs were caught only by tests:

- A window that expired with a freeze applied but never substantiated matched *no outcome at all*.
  The run never terminated and no debrief appeared. Any new terminal condition needs the same
  "what if nothing matches" question asked of it.
- `case-unsolved`'s authored condition is `not(any[...])` — **true of every fresh run.** Putting it
  in the normal resolution pass ended the case on the player's first move. Authored conditions are
  not safe to iterate blindly; check what each one means in the empty state.

**Nothing that must survive may live in a closure or component state.**

- Call idempotence was a closure. It died with the component, so remounting or pressing Replay
  rewrote case history.
- The timer was component state seeded from one timestamp, so `pausedAt`/`pausedTotalMs` were
  rebuilt as zero and **every pause was refunded** by navigation or reload.
- If it must survive a remount, it belongs in persisted `GameState`.

**React dev mode mounts every component twice** — effect, cleanup, effect. Anything created with
`useMemo` and torn down in cleanup is dead by the second mount. This silently broke the whole NPC
voice layer once. Create per-mount resources inside the effect.

**A parent callback in a dependency array will tear down live work.** `CityScreens` re-renders on
every game-state change; an effect depending on one of its callbacks restarts on every evidence
pickup. Hold the callback in a ref.

**`useSearchParams` de-optimises prerendered routes.** `/city/[locationId]` has
`generateStaticParams`, so that hook forces the whole panel to client-side render. Read
`window.location.search` in an effect, or accept a Suspense boundary.

**Vitest matches `src/**/*.test.ts` only — not `.tsx`.** There are no component tests. Keep logic
in plain modules so it is testable, and do not change the config to work around this.

**`Effect[]` is the only mutation channel.** Four variants: `setFlag`, `giveEvidence`, `trust`,
`stress`. Content emits effects; the store applies them. Do not add a fifth without a contract
discussion — several systems dispatch on key presence.

**Check the ids you hardcode.** `buildCaseRun` referenced four deduction ids that do not exist in
`deductions.ts`. The count came out right by accident and the names were silently wrong. Derive
from authored content wherever you can.

**Per-file ownership is real.** The other agent is editing the same tree at the same time. A
typecheck error in their file is not yours to fix.

---

## 4. Outstanding work

### Phase 2 — restore the detective fantasy

**2.1 Player-authored deductions.** `src/game/case/CaseBoard.tsx` still auto-solves: a `useEffect`
runs `checkDeductions` and writes `unlocksFlag` for anything ready, so **opening the board solves
the case**. Replace with: player selects held evidence, submits a proposed connection, chooses a
conclusion when several are plausible, and `verifyClaim` validates deterministically. Useful failure
feedback without revealing the answer. Unlock only on a valid submission. No repeated scoring or
duplicate notices. Keyboard-operable via semantic controls.

**2.2 No internal ids in player-facing copy.** Show "SMS Passcode Security Notification", never
`otp-message`. Add a helper rather than duplicating label lookups; ids stay internal to state and
validation.

**2.3 Separate inspection from collection.** `handlers.inspect` currently calls `collectEvidence`
immediately — clicking a hotspot silently files the document. Inspect first; collect only on an
explicit "Preserve Evidence" action. Show a stable collected state. Re-inspection must not
duplicate or re-reward. Update the tests that assume the one-step interaction.

**2.4 Legible, warned consequences.** Make the intervention legible before it is irreversible.
Warn before a consequential accusation or rejecting legitimate staff. The player must understand
which action ended the case and why — without seeing raw flags or rule conditions.

### Phase 3 — progression and objectives

**3.1 Authored gates.** A new case begins in the office; later locations are locked until the case
opens; unlocks come from evidence, dialogue or route progression. Direct URLs obey the same rules as
map navigation. A locked route explains the concrete next requirement without leaking the solution.

**3.2 Objective system.** One primary current objective plus optional completed ones, derived
deterministically from flags and evidence. Expose a small read-only API — Agent 2's
`InvestigationHUD` already takes `objective: string` and is waiting on it. Do not build a quest
framework for one case.

**3.3 Panel completion.** Set `panel.cleared.<location>` only when the meaningful authored work is
done — not by exhaustive clicking. Backtracking must not clear it. Coordinate the exact flag
contract with Agent 2, who owns map rendering.

### Phase 4 — integration and hardening

Replace every hand-built modal wrapper in `CityScreens.tsx` with Agent 2's `CityDialog`. Confirm
focus entry, Escape, focus restoration, backdrop, nested-dialog policy and scroll locking. Remove
the now-redundant modal keyboard listeners. Never mount debrief and case board simultaneously —
"Review Board" should transition cleanly. Verify desktop and 390px.

Then run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and add browser-level
regression tests for: fresh onboarding, expired resolution, valid and invalid deduction attempts,
explicit preservation, replay not changing the score, restart confirmation, save/reload timer
consistency, and direct navigation to a locked location.

---

## 5. Cross-agent state

### Consumed from Agent 2 (exists, working)

- `src/game/ui/CityDialog.tsx` — `CityDialog` and `DestructiveConfirmation`. Radix-based, handles
  focus entry/restore, Escape and backdrop policy, and throws on a nested dialog. Already used for
  restart confirmation; use it for the rest in Phase 4.
- `src/game/ui/InvestigationHUD.tsx` — takes `objective: string` and a `timer` union.
- `src/game/ui/PanelShell.tsx`, `shell.css`, `dialog.css`.

### Provided to Agent 2

```ts
hudTimer(state, now): HudTimer          // matches InvestigationHUDProps.timer exactly
windowStatus(state, now): WindowStatus  // richer: adds expired + resolved phases
hasScoredCall(): boolean                // label a replay as practice
currentOutcome() / isResolved()
```

### Open request to Agent 2

`InvestigationHUDProps.timer` has no variant for a **closed window** or a **decided case**. Both map
to `paused` today, which reads as "temporarily stopped" rather than "over". Requested:
`{ status: "expired" | "resolved"; label: string }`. Until it lands, `hudTimer` maps them to
`paused` and the panel HUD renders expiry itself. Noted in the `hudTimer` docblock.

### Known cross-owned defects — document, do not fix

- `src/game/dialogue/DialogueBox.tsx` lines 45 and 101: two `react-hooks/set-state-in-effect` lint
  **errors**. Pre-existing, unmodified in git, in a shared file neither agent owns. Needs an owner
  assigned before the zero-lint-errors gate can pass.
- Panel art is scaled with `object-fit: cover` into a full-window container while hotspots are
  positioned as a percentage of that container. They agree at 16:9 and drift apart on any taller
  viewport. Agent 2's area; documented for the artist in `docs/FRAME-BRIEF.md` §2.2.

---

## 6. Definition of done

- Every run reaches exactly one debrief.
- The clock is accurate across navigation, pause and reload.
- Opening the case board does not solve anything.
- The player must perform a meaningful evidence-combination action.
- Replay cannot mutate case history.
- Restart cannot happen accidentally.
- Location access and objectives form a coherent authored sequence.
- All automated checks pass with zero lint errors.
- No files owned by Agent 2 were modified.

## 7. House rules

- `AGENTS.md`: this Next.js version has breaking changes. Read the relevant guide in
  `node_modules/next/dist/docs/` before writing framework-level code.
- TypeScript is `strict: true`. Match the surrounding comment density and naming — the detective
  track has a distinct house style; read a neighbouring file before writing one.
- At the end of each phase, report changed files, exported APIs, remaining dependencies and test
  results.
- Do not commit, do not push, do not install packages.
