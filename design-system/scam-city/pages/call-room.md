# Page override — Call Room (`/play/[scenarioId]`, landing §06 preview)

> Overrides MASTER where they conflict. Everything not listed here follows MASTER.

## Intent

Calm, responsive, immersive. The player is under pressure from the **conversation**, not from the interface. Nothing decorative moves while someone is speaking.

## Overrides

| MASTER rule | Call room |
|---|---|
| Ground `--ink` | Ground `--surface`; the portrait column bleeds to `--ink` |
| Lenis smooth scroll | **Off.** The page does not scroll on desktop (`100dvh`). On mobile, only the transcript scrolls. |
| Ken Burns on portraits | **Off.** The portrait is static after its entrance wipe. |
| Magnetic cursor | **Off.** Only the `TALK` label appears over the mic control; there is no attraction. |
| Nav and scroll hairline | **Hidden.** They are replaced by the HUD bar. |
| Signal budget of one per viewport | Relaxed: the meter above 70%, detected-tactic chips, the live dot, and `END CALL` |

## Hierarchy (from the brief §14, enforced by size and position)

1. Scammer (portrait, name, role)
2. Conversation (current line, large)
3. Player microphone state
4. Suspicion
5. Learned red flags (subtle)
6. Secondary metadata (level, timer, scenario ID)

## Layout

**Desktop (≥1024px):**
```
┌──────────────────────────────────────────────────────────────┐
│ LEVEL 03 · THE DESK                           ● LIVE   04:17 │  HUD: mono meta, 56px, hairline below
├────────────────────────┬─────────────────────────────────────┤
│                        │  MARTIN HAYES                        │
│   PORTRAIT (4:5)       │  ACCOUNT SECURITY · NORTHSTAR BANK   │
│   cols 1–5             │                                      │
│   ~~waveform~~         │  "Can you confirm which department   │  current line: `quote`, bone
│   (bottom of portrait) │   you're calling from?"              │
│                        │                                      │
│                        │  earlier turns ↑ (ash, fading)       │
├────────────────────────┴─────────────────────────────────────┤
│ SUSPICION ███████░░░░   URGENCY · AUTHORITY                  │  meter + learned-flag chips
│ ● MIC ACTIVE   [M] mute                          [END CALL]  │  controls, 72px
└──────────────────────────────────────────────────────────────┘
```

**Mobile (<768px):** the portrait takes the top 38dvh with the name overlaid on a bottom vignette. The current line and a scrollable transcript sit in the middle. Controls are fixed at the bottom with `padding-bottom: max(16px, env(safe-area-inset-bottom))`. `END CALL` and the mic toggle are each at least 56px tall and sit at opposite ends.

## Components

- **Current line:** Newsreader italic `quote`. When a new line arrives, the previous one shifts up into the history (a `motion` layout transition, `--d-ui`) and turns `ash`. Words appear as the streamed transcription delivers them; there is no fake typewriter effect.
- **Player lines:** Hanken `body`, right-aligned in the history, labeled `YOU` in mono.
- **Waveform:** a 1px `bone` line driven by a real `AnalyserNode` for whoever is speaking (scammer output or player mic). It is flat when silent. Under reduced motion it is replaced by a text state (`SPEAKING` / `LISTENING`).
- **Suspicion meter:** 11 segments per MASTER. It updates at `--d-ui`, and never more than once per turn.
- **Red-flag chips:** mono `meta`, 1px border. They appear **only for tactics the player has already learned** (the brief's no-spoiler rule). When detected, the border and text turn `signal` over 320ms. Unlearned tactics are never rendered, not even as locked chips.
- **Mic control:** a ghost button with `Mic`/`MicOff` icons plus the text `MIC ACTIVE` / `MUTED`. Pressing `M` toggles it. The active state shows a 6px signal dot.
- **End call:** the signal button. It is not bound to Esc, to avoid accidental hang-ups. It has a focus ring in `ink`.

## Call states (from `call-machine.ts`)

| State | UI |
|---|---|
| `idle` | Portrait hidden; `ANSWER THE CALL` solid button |
| `permission-requested` | Inline explainer: "Your microphone stays in this browser tab. Audio is not stored." Buttons: `ALLOW MICROPHONE` / `TRY RIDDLE MODE INSTEAD` |
| `connecting` | Mono `CONNECTING…` with a hairline progress line; still no portrait |
| `ringing` | Portrait wipes in, `INCOMING CALL`, the timer counts ringing time |
| `live` | Full layout above |
| `player-interrupting` | Queued scammer audio stops instantly; the current line is truncated with an em dash (—) |
| `ending` | Everything except the portrait fades (`--d-ui`); mono `CALL ENDED` |
| `scoring` | Mono `REVIEWING TRANSCRIPT` with a rule drawing slowly. It must never look like a spinner. |
| `results` | Route transition to `/results/[sessionId]` (see `results.md`) |
| `error` | `THE LINE DROPPED.` in `display-m`, the reason in `ash`, then `RETRY` (solid) and `CONTINUE IN SIMULATION MODE` (ghost, mock provider). The error is not shown as a toast. |

## Accessibility

- The status region `<p role="status" aria-atomic="true">` announces state changes only: "Call connected. Level 3, The Desk.", "Call ended.", "Microphone muted."
- The transcript is `<ol role="log" aria-live="polite" aria-label="Call transcript">`, with each turn prefixed by the speaker (visually hidden when the label is visible). Only final turns are announced, never partial streaming text.
- Suspicion is announced only when it crosses 30 / 70% ("Caller suspicion high"), never on every tick.
- Keyboard: `M` mutes, Tab reaches mute and then end call, and everything is operable without a pointer.
- Captions are always on. The call is fully playable with sound muted, reading along.
