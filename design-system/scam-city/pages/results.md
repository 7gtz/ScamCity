# Page override — AI Judge / Results (`/results/[sessionId]`, landing §07)

> Overrides MASTER where they conflict.

## Intent

Forensic analysis, not a scoreboard. It is a quiet room after a loud call. It communicates that the AI evaluated **decisions**, not win or lose.

## Sequence (play once on load, ~3.5s total, skippable)

1. `CALL ENDED`: mono `meta`, fades in (300ms).
2. Score: Newsreader `display-xl`, `72` counting up from 0 over `--d-count` with tabular numbers, then `/ 100` in `ash` at `display-m`.
3. `YOU CAUGHT`: a numbered list (`01  AUTHORITY CLAIM`, …), rows revealed with an 80ms stagger. Row label in Newsreader `display-m`; index and timestamp in mono.
4. `YOU MISSED`: same list form. **Label and index in `signal`**; this is the one place signal carries the meaning "your mistake".
5. Timeline: a horizontal SVG. The axis rule draws left to right (`scaleX`, `--d-reveal`); event ticks drop in at their timestamps; a suspicion curve below it (1px bone polyline) draws via `stroke-dashoffset`.
6. Judge notes: 2–4 short sentences from the scorer, Hanken `lead`, `ash`.
7. Actions: `NEXT CALL →` (CTA link, only if passed) · `REPLAY TRANSCRIPT` (ghost) · `BACK TO THE CITY` (ghost).

Clicking anywhere or pressing any key during the sequence jumps to the final state. Under reduced motion, everything renders in its final state immediately.

## Timeline

```
00:18        01:42        03:07        04:11
  │            │            │            │
  │        questioned    pressure      reveal
  │
SUSPICION ─────────────────────────────────────
```
- Desktop: horizontal and full-width inside the gutter.
- Mobile (<768px): it rotates to a **vertical** timeline (time on the left, event on the right). Never scroll horizontally.
- Accessible equivalent: a visually hidden `<table>` (time, event, suspicion). The SVG is `aria-hidden`.

## Legitimate-call results

When the scenario was legitimate, the header reads `IT WAS REAL.` The scoring language changes to "verified appropriately" / "rejected a legitimate caller". A correctly handled legitimate call shows `VERIFIED` in bone. A false rejection is listed under `YOU MISSED` in signal. The message is verification, not paranoia.

## Rules

- No confetti, badges, stars, XP, or pass/fail colors beyond the single signal list.
- The pass threshold is shown in mono `meta` beside the score: `PASS ≥ 65`.
- The score is `role="img"` with `aria-label="Score 72 out of 100, passed"`; the count-up is `aria-hidden`.
