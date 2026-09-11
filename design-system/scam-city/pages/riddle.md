# Page override — Riddle Mode (landing §08 / §08b, `/riddle`)

> Lives at `/riddle`, not under `/play`: every `/play/*` route is the immersive call room (no nav).

> Overrides MASTER where they conflict.

## Intent

Elegant and editorial, like reading evidence. **Not a school quiz**: no colored answer buttons, no green ticks or red crosses, no progress bar, no timer pressure unless a scenario calls for it.

## Composition

```
BEFORE YOU ENTER / THE CALL,            ← display-l, line masks
LEARN TO SEE / THE TRAP.                ← display-l italic

──────────────────────────────────────  ← rule
09:42 AM · SMS                          ← mono meta, smoke

"Your package could not be delivered.   ← quote (Newsreader italic), bone
 Confirm your address within 30 minutes    max 32ch
 to avoid return charges."

IS THIS A SCAM?                         ← mono meta
──────────────────────────────────────
A   SCAM                                ← choice rows (MASTER §6)
──────────────────────────────────────
B   LEGITIMATE
──────────────────────────────────────
```

- The scenario sits in columns 2–8 on desktop. Choices take the full column width.
- Scenario frames vary by channel but stay typographic: an SMS is set as a quote with sender meta; a call is a transcript excerpt; an email shows `FROM` / `SUBJECT` meta rows. No fake phone mockups or UI screenshots.

## Flow (progressive disclosure)

1. **Q1: Is this a scam?** Two choice rows.
2. If SCAM: **Q2: What type?** Five rows (`PHISHING`, `IMPERSONATION`, `DELIVERY`, `TECH SUPPORT`, `OTHER`). They reveal below Q1 with a height-free approach: mask the rows in with `clip-path` and `translateY`, and keep space reserved to avoid a jump. Q1 collapses to a single summary line (`YOUR ANSWER · SCAM`) with a change link.
3. **Verdict:** `display-m`, either `CORRECT.` (bone) or `NOT QUITE.` (bone). The explanation follows in Hanken `lead`, `ash`. The **tell** (for example "within 30 minutes") is quoted and underlined with a 1px signal rule. That underline is the only signal on the screen.
4. `NEXT SCENARIO →` CTA link. A mono footnote reads: `RIDDLE ACCURACY 4/5 · UNLOCKS: THE DESK`.

## False positives (§08b)

- The same component shows a legitimate scenario. The verdict for a correct `LEGITIMATE` answer reads `VERIFIED. THIS ONE WAS REAL.`, followed by *why* it is real and what the right verification step would be ("call the number on the back of your card").
- The copy frames the goal as verification, not paranoia.

## Accessibility

- Each question is a `<fieldset>` with its `<legend>` (`IS THIS A SCAM?`), native radio inputs styled as rows, and a submit button (`CONFIRM`). Answers do not auto-submit on selection, so keyboard users can move between options.
- The verdict region is `role="status"` and moves focus to the verdict heading after submit.
- The scenario text is plain text (no split-text animation on scenario bodies, only on section headlines).
