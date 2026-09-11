# SCAM CITY — Design System (MASTER)

> Global source of truth. Page files in `pages/` override this file where they conflict.
> Source documents: `ScamCity-design.md` (visual brief — authoritative), `ScamCity-spec.md` (product), `ScamCity-stack.md` (implementation).
> Generated with ui-ux-pro-max 2.13.0 · dials: variance 7 · motion 8 · density 3 · 2026-09-11

**Thesis:** *The scammer isn't attacking your computer. They're attacking your decision-making.*
**Register:** luxury + intelligence + tension + restraint + psychological pressure.
**Test:** it must look premium with every animation disabled.

---

## 0. Decisions vs. database output

The database pass returned *Minimalism & Swiss Style*, Inter/Inter, a light `#FAFAFA` + pink `#EC4899` palette, and a "Hero + Features + CTA" card pattern. The brief overrides most of that:

| Area | Database said | Adopted | Why |
|---|---|---|---|
| Style | Minimalism & Swiss | **Kept as the structural base**: 0 radius, no shadows, grid, single accent | Matches "restraint" and "avoid card overload" |
| Mode | Light | **Dark only** | Brief: near-black, charcoal, warm dark gray |
| Accent | Pink `#EC4899` | **Signal `#F0503A`** | Brief: one restrained warning color |
| Fonts | Inter only | **Newsreader / Hanken Grotesk / JetBrains Mono** | Brief: editorial display + grotesk + mono |
| Pattern | Hero + Features + CTA, cards | **11-section continuous narrative** (brief §7 lists 12; "AI Load-Bearing" was cut on 2026-09-11) | Brief §7 |
| Palette | — | No dark palette match found (all results were indigo-based, which the brief bans). **The palette is custom; its contrast was measured, below.** | |

---

## 1. Color

Near-black, warm white, and muted gray. One signal color, used as punctuation.

| Token | Hex | Role | Contrast on `ink` |
|---|---|---|---|
| `--ink` | `#0B0A09` | Page ground (warm near-black) | — |
| `--surface` | `#141210` | Recessed panels, call-room ground | — |
| `--raised` | `#1D1A17` | Overlays, index menu, hover fills | — |
| `--line` | `#2A2723` | Hairlines, rules, dividers (**decorative only**) | 1.33 |
| `--dim` | `#6B665E` | Disabled, locked states, non-text UI marks (≥3:1) | 3.47 |
| `--smoke` | `#8A847B` | Tertiary metadata, timestamps | 5.34 ✓ AA |
| `--ash` | `#A39D93` | Secondary text, supporting copy | 7.35 ✓ AAA |
| `--bone` | `#EFEAE2` | Primary text, headlines, focus ring | 16.52 ✓ AAA |
| `--signal` | `#F0503A` | Alerts, detected tactics, active/live, end call | 5.57 ✓ AA |

Measured pairs: `ink` on `signal` **5.57** (text on signal buttons is always `ink`, never `bone`, which measures 3.39 and fails). `signal` on `raised` **4.88** ✓. `smoke` on `raised` **4.67** ✓. `dim` is **never** used for readable text.

### Signal budget

- Marketing sections: **at most one signal element per viewport.** Examples: the `TEN MINUTES` highlight, `URGENCY DETECTED`, the live dot on "INCOMING CALL".
- Signal never appears as a background wash, gradient, or glow.
- There is no green. Correct, cleared, and legitimate are shown in `bone` with a label (`CLEARED`, `VERIFIED`, `LEGITIMATE`). Success is quiet; danger is loud.

### Tones (visual overhaul, 2026-09-11: "less black")

The page alternates tones instead of sitting on one black ground. A tone is a CSS scope that **remaps the colour tokens** for its subtree (`.tone-ember`, `.tone-paper`, `.tone-amber` in `globals.css`), so every component inside re-themes itself: text, buttons, meters, focus rings, the red.

| Tone | Ground | Used for | Text pairs (measured) |
|---|---|---|---|
| dark | `#0B0A09` | Cinematic moments: Opening, City, Threat, Live, Progression, Final | as above |
| ember | `#1A120D` | Warm dark: Incoming Call, mode pages, call-room portrait column | bone 15.4 · ash 6.9 · smoke 5.0 · signal 5.2 |
| paper | `#F4F1EA` | Printed evidence: Opponent transcript, Judge, results page, riddle cards, Impact | ink 16.2 · ash 8.3 · smoke 5.1 · signal `#B42F1B` 5.5 |
| amber | `#F2DDBF` | Streetlight: Riddle section, Freestyle plate | ink 13.8 · ash 7.1 · smoke 5.9 · signal 4.7 |

- Fixed chrome (nav, scroll hairline, cursor) reads the tone beneath it and re-themes itself (`lib/tone.ts`, `[data-tone]`, `[data-chrome]`).
- `--color-amber` `#E8A657` (9.4:1 on ink) is the city's second light: sodium streetlights, halftone dots, live captions, italic accents. **Never an alert**: signal red stays the only alarm colour.

### Light and texture

- **CityRain** (WebGL, `components/gl`): rain on glass over out-of-focus city lights, behind the Opening, the Final CTA and Freestyle. Driven by the player's real local time (night or day) and, if location was already granted, their real weather (how wet the glass is). Captioned "Live · city · time · weather".
- **Halftone portraits** (WebGL): generative, name-seeded silhouettes replace the missing photos. In a live call they pulse with the caller's real voice.
- **Halftone dot screens** (CSS) on the district plates, like newsprint.
- Film grain: static SVG noise, fixed, at 5% opacity.
- Signal red still never appears as a wash, gradient or glow.

---

## 2. Typography

**Typography is the interface.**

| Role | Family | next/font | Settings |
|---|---|---|---|
| Display | **Newsreader** (variable: `opsz` 6–72, `wght` 200–800, italic) | `Newsreader({ subsets:['latin'], axes:['opsz'], style:['normal','italic'], variable:'--font-display' })` | `font-optical-sizing: auto`; roman is uppercase statements, italic lowercase is the emotional turn ("your trust.") |
| Text / UI | **Hanken Grotesk** (variable `wght` 100–900) | `Hanken_Grotesk({ subsets:['latin'], variable:'--font-sans' })` | Body, buttons, navigation, choices |
| Meta | **JetBrains Mono** (variable `wght` 100–800) | `JetBrains_Mono({ subsets:['latin'], variable:'--font-mono' })` | Uppercase labels, timers, levels, counters, annotations |

Self-host via `next/font` (no `<link>` to Google Fonts). One variable file per family.

### Scale (fluid)

| Token | Size | Line-height | Tracking | Face / weight | Use |
|---|---|---|---|---|---|
| `display-xl` | `clamp(3.5rem, 12.5vw, 13rem)` | 0.86 | -0.035em | Newsreader 380, UPPER | Opening, final CTA |
| `display-l` | `clamp(3rem, 8vw, 8.5rem)` | 0.9 | -0.03em | Newsreader 380, UPPER | Section statements |
| `display-m` | `clamp(2.25rem, 4.8vw, 4.75rem)` | 1.0 | -0.02em | Newsreader 400 / italic 300 | Sub-statements, "your trust." |
| `quote` | `clamp(1.5rem, 2.4vw, 2.25rem)` | 1.2 | -0.01em | Newsreader italic 350 | Scammer dialogue, scenarios |
| `lead` | `clamp(1.125rem, 1.5vw, 1.375rem)` | 1.5 | 0 | Hanken 400 | Intro lines |
| `body` | `1rem` (16px) | 1.6 | 0 | Hanken 400 | Everything else (never below 16px) |
| `ui` | `0.9375rem` | 1.2 | 0.01em | Hanken 500 | Buttons, choices |
| `meta` | `0.75rem` (12px min) | 1.3 | 0.14em | JetBrains Mono 450, UPPER | Labels, timers, `03 / 12` |

Rules:
- Break headlines by hand, one thought per line, as the brief lays them out (`YOU'RE / ALREADY / ON THE CALL.`). Never let a display headline auto-wrap; use `text-wrap: balance` as the fallback.
- Use `font-variant-numeric: tabular-nums` on every timer, score, and counter.
- Keep body measure at 60–68ch or less. Keep copy concise; long explanations belong in the product.

---

## 3. Space, grid, and shape

Spacious density (dial 3).

```
--space-1: 4px   --space-2: 8px   --space-3: 12px  --space-4: 16px
--space-5: 24px  --space-6: 32px  --space-7: 48px  --space-8: 64px
--space-9: 96px  --space-10: 128px --space-11: 192px
--gutter:  clamp(1rem, 4vw, 3rem)          /* side padding, never < 16px */
--section: clamp(6rem, 16vh, 12rem)        /* padding-block per section */
```

- 12-column grid, `max-width: 1600px`; compositions may break the grid to full-bleed.
- Breakpoints: 375 / 768 / 1024 / 1440 / 1920.
- Radius is **0** everywhere. The only exception is the circular cursor dot and live indicator.
- Shadows: **none.** Separate with hairlines (`1px solid var(--line)`) and space.
- Borders are rules, not boxes. Prefer a single top rule plus label over an enclosing frame.
- Negative space is intentional. Do not fill empty columns.

---

## 4. Motion system

**One curve, one director.**

```
--ease:      cubic-bezier(0.16, 1, 0.3, 1)   /* dominant: every enter and state change */
--ease-exit: cubic-bezier(0.7, 0, 0.84, 0)   /* exits only, always shorter than enters */
GSAP equivalent: "expo.out" (≈ --ease)  ·  scrubbed timelines: ease "none"
```

| Token | Duration | Use |
|---|---|---|
| `--d-micro` | 180ms | Hover, focus, cursor label swap |
| `--d-ui` | 320ms | Menus, choice selection, HUD updates |
| `--d-reveal` | 900ms | Body/meta reveals, rule draws |
| `--d-headline` | 1100ms per line, stagger 90ms | Split-line headline masks |
| `--d-wipe` | 1400ms | Portrait clip-path wipes |
| `--d-count` | 1200ms | Score count-up |
| Ken Burns | 20s, scale 1 → 1.06, linear | Portraits outside the call room |
| Exits | about 60% of the enter duration | |

Banned: bounce, elastic, overshoot springs, typewriter-for-everything, particles, independent looping ornaments.

### Tool roles (from the stack document)

| Tool | Owns |
|---|---|
| GSAP + ScrollTrigger + SplitText (3.15, `useGSAP` scoped to the section ref) | Headline masks, image wipes, pinned/scrubbed scenes, the scroll hairline |
| `motion` 13 | Component enter/exit, layout transitions, cursor, index overlay, Riddle choices |
| Lenis 1.3 | Marketing scroll only, synchronized with `ScrollTrigger.update`. **Off in the call room and under reduced motion.** |

### Signature techniques

1. **Split-line reveal.** Hand-broken lines, each in its own mask (`.split-mask`, padded `0.14em` top and bottom); each line moves `yPercent: 150 → 0`. Never 110%: at line-height below 1, Newsreader's caps and descenders overflow the line box and leave slivers visible. Exits go to `-150`. Headlines only (8 words per line or fewer). Keep `aria-label` with the full sentence on the heading and `aria-hidden` on the split spans; call `split.revert()` on cleanup.
2. **Clip-path wipe.** `inset(100% 0 0 0) → inset(0)` (vertical) or `inset(0 100% 0 0) → inset(0)` (horizontal); the image inside counter-scales 1.15 → 1 on the same timeline.
3. **Ken Burns.** CSS `@keyframes` on `transform: scale()` only, starting after the wipe finishes.
4. **Scroll-driven transitions.** `scrub: 0.8`. Pin **at most two sections**: 03 The City and 04 The Psychological Threat. Both snap with `inertia: false` (City to each district, Threat to timeline labels), so a scrub never rests between two states. Every other section uses play-once `start: 'top 75%'` triggers.
5. **Choreography.** Within a section, order is statement, then support, then interaction. At most two animated elements start at the same moment.

### Reduced motion (`prefers-reduced-motion: reduce`)

Render every final state immediately. Specifically: no SplitText (plain text), clip-paths start at `inset(0)`, no Ken Burns, no pinning (sections stack), Lenis disabled, native cursor restored, and counters show the final value. Only `opacity` fades of 200ms or less remain. Use `gsap.matchMedia()` for GSAP and `useReducedMotion()` for `motion`.

Mobile (`pointer: coarse` or below 768px): no pinning, reduced parallax (±4% or less), headline masks kept.

Animate only `transform`, `opacity`, and `clip-path`. Call `ScrollTrigger.refresh()` after fonts load (`document.fonts.ready`) and after images load.

---

## 5. Global chrome

### Navigation (fixed, quiet)

```
SCAM CITY                         ABOUT   SIMULATION   TRAINING   INDEX ☰
```
- Mono `meta`, `bone`/`ash`, no background at the top. On scroll down the links hide (the wordmark and `INDEX` remain) and a `--ink` 80% backdrop appears after 100vh. Scrolling up restores everything.
- `INDEX` opens a full-screen Radix Dialog listing the 11 sections as `01 OPENING` … `11 ENTER`. This is the mobile navigation too.
- Hit areas are at least 44×44 even though the text is 12px (padding extends the target).

### Scroll-progress hairline

- A 1px vertical line on the right edge (`--line` track, `--bone` fill, `scaleY` from the top). The mono counter `03 / 11` next to it updates per section.
- It is hidden in the call room. It is `aria-hidden`; the index dialog provides the accessible equivalent.

### Custom cursor

| State | Trigger | Appearance |
|---|---|---|
| Default | — | 6px `bone` dot, lerp 0.2 |
| Interactive | `[data-cursor="magnetic"]` | Dot scales to 10px; the target translates toward the pointer by 8px or less (strength 0.25) |
| CTA | `[data-cursor="enter"]` | Dot becomes a mono label `ENTER` in `ink` on `bone`, 28px tall |
| Simulation | `[data-cursor="talk"]` | Label `TALK` |
| Image | `[data-cursor="view"]` | Label `VIEW` |

- It never grows into a large circle. There is no `mix-blend-mode: difference`.
- It is disabled (native cursor) under `(hover: none)`, `(pointer: coarse)`, reduced motion, and over text inputs.
- It is a visual layer only. It never replaces focus styles, and every cursor state has a keyboard-focus equivalent.

---

## 6. Components

All interactive elements are `<button>` or `<a>`, and clickable `<div>`s are forbidden. Build on Radix primitives plus `cva`.

| Component | Spec |
|---|---|
| **CTA link** (`ENTER THE CITY →`) | Hanken 500 `ui`, uppercase, 0.08em tracking, `bone`. A 1px underline wipes in on hover/focus (`scaleX`, origin left). The arrow translates 4px. There is no fill and no box. `data-cursor="enter"`. |
| **Solid button** (`ANSWER THE CALL`) | `bone` fill, `ink` text (16.52:1), 56px tall, 0 radius, padding-inline 32px. Hover: fill wipes to `raised`, text to `bone`. |
| **Signal button** (`END CALL`) | `signal` fill, `ink` text (5.57:1). **Used only for ending a call.** |
| **Ghost button** | Transparent, 1px `--line` border, `bone` text; hover border becomes `bone`. |
| **Choice row** (Riddle) | A full-width row with a hairline above, mono index `A` / `B`, Hanken `ui` label, 64px tall. Selected: the row rule turns `bone` and a 2px left bar appears. Semantics: `role="radiogroup"` / radio inputs. |
| **List row** (districts, progression) | `01  THE BANK ─────────── CLEARED`: mono index, Newsreader label, a flexible hairline leader, and a mono status. Status colors: `CLEARED` bone, `CURRENT` signal with a pulsing 6px dot (static under reduced motion), `LOCKED` dim with a lucide `Lock` icon (14px). |
| **Meta label** | JetBrains Mono `meta`, `smoke`. Pairs as `LABEL` / value. |
| **Meter** (suspicion) | 11 segments (`███████░░░░`), 8px × 16px, 2px gap, `bone` filled and `line` empty. Segments above 70% render `signal`. `role="meter"` with `aria-valuenow`. |
| **Portrait** | 4:5 aspect ratio, `next/image` with `sizes`, a warm cinematic grade (desaturated −25%, lifted blacks), vignette, grain; wipes in, then Ken Burns. |

Icons: `lucide-react` only, stroke 1.25, 14–20px, `aria-hidden` when next to a text label. The ones in use are `ArrowRight`, `Mic`, `MicOff`, `PhoneOff`, `Lock`, and `X`. **No emoji. No AI or brain or shield icons.**

---

## 7. Page architecture (landing)

One continuous narrative. Transitions between sections are shared: the outgoing statement's lines mask upward while the next section's rule draws in.

| # | Section | Composition | Signature motion | Signal use |
|---|---|---|---|---|
| 01 | Opening | Near-black viewport. Top meta `SCAM CITY … TRAINING SYSTEM / 01`. `display-xl` in 3 lines, `lead` below, CTA link | Split-line reveal on load (first paint, no scroll needed) | none |
| 02 | Incoming Call | Portrait on 7 columns, full-height; right column holds mono `INCOMING CALL`, `UNKNOWN`, `display-m` name, org, a timer `00:03` counting up, and the solid button | Vertical wipe, then Ken Burns; the timer starts when the section is in view | Live dot beside INCOMING CALL |
| 03 | The City | **Pinned.** The district list on the left; the image stage on the right swaps with a horizontal clip wipe per district | Scrubbed: the active row turns bone and the others go to ash; image wipes | none |
| 04 | Psychological Threat | **Pinned.** Typography only. `THEY DON'T NEED / YOUR PASSWORD.`, then the italic sequence *your attention. → your trust. → your urgency. → your mistake.* replacing in place, then the closing statement | Scrubbed line masks. **The strongest moment on the page.** | `YOUR DECISION.` only |
| 05 | Adaptive AI | `THE OPPONENT` / `NOT A SCRIPT. AN ADAPTIVE AGENT.` A transcript column beside a state rail (`PLAYER SUSPICION ↓ TACTIC CHALLENGED ↓ SCAMMER PIVOTS ↓ INCREASE PRESSURE`) | Play-once sequence: lines appear, the rail steps light up, `TEN MINUTES` is highlighted | `TEN MINUTES`, `URGENCY DETECTED` |
| 06 | Live Call | The page simplifies to `--surface`. A preview of the call room (see `pages/call-room.md`) with the mock provider | The nav and hairline fade out on enter | Meter above threshold, `END CALL` |
| 07 | AI Judge | See `pages/results.md` | Count-up and timeline draw | `YOU MISSED` |
| 08 | Riddle Mode | See `pages/riddle.md` | Choice reveal | Verdict on a scam |
| 08b | False Positives | `NOT EVERYTHING / IS A SCAM.` then `THE GOAL ISN'T PARANOIA. / IT'S VERIFICATION.` and a legitimate scenario | Line masks | none (legitimate is bone) |
| 09 | Progression | `YOUR CITY`, a rule, and 6 list rows. A mono footnote shows how Riddle accuracy unlocks calls | Rows reveal staggered at 80ms | `CURRENT` row |
| 10 | Real-World Impact | The ground warms (`--surface` with warmer imagery). `THE SKILL SHOULD / TRAVEL WITH YOU.` and an audience list in `display-m` | Horizontal wipes on the images | none |
| 11 | Final CTA | Back to `--ink`, centered, `display-xl` statement, CTA link; footer in mono `AI-DRIVEN SOCIAL ENGINEERING TRAINING · 2026` | Split-line reveal | none |

---

## 8. Imagery

- Editorial, believable, slightly tense portraits of ordinary, credible-looking people. **The danger is that the scammer looks legitimate.**
- Use a consistent grade across all images (warm shadows, −25% saturation, soft contrast), a 4:5 aspect ratio for portraits, and 16:10 or 3:2 for districts.
- Formats: AVIF with WebP fallback via `next/image`. Only the Opening and Incoming Call portrait get `priority`; everything else is lazy. Reserve space with the aspect ratio (CLS below 0.1).
- Banned: hooded hackers, code rain, blue overlays, people pointing at laptops, smiling call-center stock, shields and padlocks as heroes.
- All personas and organizations are fictional (for example Northstar Bank). No real brand logos.

---

## 9. Accessibility (required)

- Semantic landmarks, one `h1` (the Opening), and sections as `<section aria-labelledby>`.
- Focus: `outline: 2px solid var(--bone); outline-offset: 3px`. The ring is drawn *outside* the control, on the page ground, so it stays `bone` even on `bone`/`signal` buttons; only switch to `ink` if a control ever sits on a light ground. Never remove focus rings.
- A skip link ("Skip to simulation") as the first focusable element.
- Every animated headline has its full text available to assistive technology (`aria-label` plus `aria-hidden` on the split spans).
- The call room transcript is readable without animation (see the call-room page).
- Touch targets are at least 44×44 with 8px or more between them.
- Contrast is verified in §1. `dim` and `line` are never text.
- Motion is never required for comprehension: the page reads correctly as static content.

---

## 10. Tailwind 4 tokens (`src/styles/tokens.css`)

```css
@theme {
  --color-ink: #0B0A09;
  --color-surface: #141210;
  --color-raised: #1D1A17;
  --color-line: #2A2723;
  --color-dim: #6B665E;
  --color-smoke: #8A847B;
  --color-ash: #A39D93;
  --color-bone: #EFEAE2;
  --color-signal: #F0503A;

  --font-display: var(--font-newsreader), "Times New Roman", serif;
  --font-sans: var(--font-hanken), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;

  --radius-*: initial;          /* 0 radius system */
  --shadow-*: initial;          /* no shadows */

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.7, 0, 0.84, 0);
}

:root {
  color-scheme: dark;
  --gutter: clamp(1rem, 4vw, 3rem);
  --section: clamp(6rem, 16vh, 12rem);
  --d-micro: 180ms; --d-ui: 320ms; --d-reveal: 900ms;
  --d-headline: 1100ms; --d-wipe: 1400ms; --d-count: 1200ms;
}

::selection { background: var(--color-signal); color: var(--color-ink); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Verified package versions (2026-09-11): next 16.3.4 · react 19.3.0 · tailwindcss 4.3.3 · gsap 3.15.0 · @gsap/react 2.1.2 · motion 13.2.0 · lenis 1.3.26 · lucide-react 1.44.0 · zustand 5.0.15.

---

## 11. Anti-patterns (reject in review)

Glowing blue or purple gradients · AI blobs or orbs · glassmorphism · neon or cyberpunk · particles · generic chatbot bubbles · rounded cards everywhere · drop shadows · SaaS dashboard panels · pricing-page structure · XP bars · confetti · bounce or elastic motion · typewriter effects on everything · random parallax · signal red as decoration · fake testimonials, logos, user counts, statistics, or certifications · emoji as icons · a giant navbar · `'use client'` on page files (keep client components as leaves) · `<link>` font loading.

## 12. Pre-delivery checklist

- [ ] Premium with all motion disabled (check with reduced motion enabled)
- [ ] One easing curve; exits shorter than enters; no more than 2 pinned sections
- [ ] Signal appears once per viewport or less on the landing page
- [ ] Text contrast is 4.5:1 or better everywhere (tokens per §1); focus is visible on every control
- [ ] Keyboard: tab order follows the narrative; Esc closes the index; nothing traps focus
- [ ] Headlines readable by a screen reader as full sentences; transcript uses `role="log"`
- [ ] Cursor disabled on touch devices and under reduced motion; no hover-only actions
- [ ] 375 / 768 / 1024 / 1440 widths: no horizontal scroll, gutter of 16px or more, headlines re-broken rather than shrunk
- [ ] The LCP image is prioritized, others are lazy, CLS is below 0.1, fonts come via `next/font`
- [ ] SplitText reverted and ScrollTriggers killed on unmount
