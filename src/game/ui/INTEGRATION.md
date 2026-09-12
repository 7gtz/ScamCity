# Agent 2 integration contract

Import `CityDialog`, `DestructiveConfirmation`, and their prop types from
`@/game/ui/CityDialog`. Radix is the existing modal dependency.

```tsx
<CityDialog open={overlay === "evidence"} onOpenChange={(open) => !open && setOverlay(null)}
  title="Evidence" description="Collected evidence in this investigation."
  initialFocusRef={firstControl} returnFocusRef={evidenceButton}
  dismissOnEscape dismissOnBackdrop={false}>
  {content}
</CityDialog>
```

Required props: `open`, `onOpenChange`, `title`, `children`. Optional:
`description`, `initialFocusRef`, `returnFocusRef` (HTMLElement refs),
`dismissOnEscape` (default true), `dismissOnBackdrop` (default false), `className`.
Close the active dialog before opening another. Do not wrap the NPC overlay in
a second modal: it owns its CityDialog. All legacy integration modals need migration.

`DestructiveConfirmation` replaces children/initialFocusRef with required
`confirmLabel` and `onConfirm`. Cancel receives initial focus. Example:

```tsx
<DestructiveConfirmation open={restartOpen} onOpenChange={setRestartOpen}
  title="Restart investigation?" description="Current progress will be cleared."
  confirmLabel="Restart investigation" onConfirm={restart} />
```

Import `InvestigationHUD` from `@/game/ui/InvestigationHUD`. Required props:
`objective: string`, `timer: {status: "not-started"} | {status: "untimed"} |
{status: "running" | "paused"; label: string}`. Optional callbacks: `onHint`,
`onRestart`. Place in document flow, not over PanelShell controls. This replaces
the integration-owned timer/restart HUD; do not render both.

`Panel` accepts optional `interactionStates: Readonly<Record<string,
"available" | "relevant" | "collected" | "complete">>`, keyed by hotspot ID.
Please supply authored state; collection must not imply a location is complete.

WorldMap accepts `completedLocations?: readonly LocationId[]`,
`availableLocations?: readonly LocationId[]`, and `objective?: string`.
Without explicit completion props it reads the existing boolean `panel.cleared.<location-id>`
contract. Please persist these flags on meaningful completion. Progress uses
completed locations, never current position, so backtracking does not erase it.

PanelShell retains `onInventory` for source compatibility; its visible label is
now Evidence. There is one City Map link. No Back link is shown because both
previous links had identical destinations.

Art is explicit in `world/assets.ts`: add an entry only when its file ships.
There are no optional HEAD probes. Rectangles describe compact authored anchors;
buttons have independent minimum sizing and touch layouts use a labelled tray.

Joint integration is required before commit: migrate legacy modals/HUD and pass
authored interaction/completion state, then run all city browser tests.

## Layout contract (replaces the 64px assumption)

`PanelShell` measures its bars and publishes them on the document element as
`--city-shell-top` and `--city-shell-bottom`, updated by `ResizeObserver` and on
resize. Content in normal flow must clear the shell using those values, never a
constant: the bar wraps at narrow widths, grows with text zoom, and takes
safe-area padding on notched devices. `InvestigationHUD` already does this
(`margin-block-start: var(--city-shell-top, 4.75rem)`).

## Locked hotspots

`Panel` now accepts `hotspotRequirements?: Readonly<Record<string, string>>`
alongside `interactionStates`, and the interaction state union gained `"locked"`.
A `locked` hotspot renders `aria-disabled`, announces the requirement in its
accessible name, refuses activation, and shows the requirement text.

**Please supply both**, from `integration/progression.ts`:

```tsx
<Panel
  panel={panel}
  handlers={handlers}
  interactionStates={interactionStates(panel, state)}
  hotspotRequirements={Object.fromEntries(panel.hotspots.flatMap((h) =>
    h.action.kind === "travel" && !locationAccess(h.action.to, state).allowed
      ? [[h.id, locationAccess(h.action.to, state).requirement]] : []))}
/>
```

Passing `accessiblePanel(panel, state)` instead is equally acceptable — it
filters gated exits out entirely. What must not continue is the current state:
`activateHotspot` refuses the travel, but the exit still renders as an ordinary
enabled button that does nothing when pressed, with no explanation.

## Integration status — complete

`CityScreens.tsx` now consumes the progression and UI contracts:

- `interactionStates(panel, state)` plus a `locked` overlay for gated exits, with
  `hotspotRequirements` from `locationAccess(...).requirement`.
- `InvestigationHUD` with `currentObjective(state)` and `hudTimer(state, now)`,
  replacing the integration-owned timer/Hint/Restart row.
- `WorldMap` receives `completedLocations`, `availableLocations` and `objective`.
- Evidence inspection, Case Board, Evidence list, debrief and restart are all
  `CityDialog`. Inspection no longer collects: `Preserve Evidence` is explicit.
- The debrief and the Case Board never mount together; Review Board hands over
  and closing the board returns to the debrief.
- The integration Escape listener now covers only what the primitive does not
  own (the hint popover and the full-screen call room).

All 20 city browser tests pass, including the four that previously documented
these gaps.

