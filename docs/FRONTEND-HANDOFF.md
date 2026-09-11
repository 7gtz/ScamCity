# SCAM CITY — Front-end handoff

For whoever is overhauling the front end. Read this before moving or restyling anything.

**The short version:** redesign everything you can *see* freely. Be careful with everything you *can't* see: the contracts between the UI and the call engine, the stores, the API, and a few browser rules (microphone, audio, notifications). Those are what break silently.

- Live site: https://scamcity-pearl.vercel.app. Every push to `main` deploys to production.
- Product and design context: [`README.md`](../README.md), [`design-system/scam-city/MASTER.md`](../design-system/scam-city/MASTER.md), [`ScamCity-design.md`](../ScamCity-design.md), [`problem-statement.md`](../problem-statement.md).

---

## 0. Ten rules that will break things if ignored

1. **Pages never talk to a voice provider directly.** The call UI goes through `useLiveCall` → `LiveCallProvider`. If you call Gemini, the mock or audio code from a component, live calls stop working.
2. **"Answer" must stay a real click.** The microphone and the `AudioContext` are created inside the Answer handler, and browsers block audio that doesn't start from a user gesture. Don't auto-answer on page load, from a timer, or from a notification click. Freestyle is the only exception, and it works because the player clicked *Answer* on the in-app card first (see §6.4).
3. **Every Freestyle encounter must report back.** Inbox, Web, Messages and Calls opened with `?fs=1` / `?auto=1` must report their result (`recordEncounter` / `freestyle.resolve`). If you remove that call, Freestyle waits forever and no more encounters arrive.
4. **The reveal CSS and the reveal components come as a pair.** `globals.css` hides `[data-reveal-line]`, `[data-reveal]` and `[data-wipe]` before first paint, and the GSAP components un-hide them. Remove one without the other and you get invisible content (or a flash).
5. **The Tailwind palette is replaced, not extended.** `tokens.css` sets `--color-*: initial`, so `bg-white`, `text-gray-500`, `rounded-md` and `shadow-lg` **do not exist**. Use the tokens (`bg-ink`, `text-bone`, `bg-paper`…) or arbitrary values.
6. **Don't rename persisted store keys or reshape them** without a migration: `scam-city:progress` (localStorage), `scam-city:results` and `scam-city:freestyle` (sessionStorage).
7. **Don't move `public/worklets/pcm-capture.js`.** The microphone pipeline loads it by that URL.
8. **Server-only code stays server-only.** Nothing in `src/lib/gemini/*`, `src/lib/rate-limit.ts` or `src/app/api/*` may be imported into a client component. They read `GEMINI_API_KEY`.
9. **Keep the accessibility roles** listed in §9. They are announced to screen readers, and some are used by tests.
10. **Use pnpm 10** (`npx -y pnpm@10 …`). Corepack's pnpm 12 corrupts `node_modules` on Windows. Keep both TypeScript aliases in `package.json` (§11).

---

## 1. Run it and check it

```bash
npx -y pnpm@10 install
cp .env.example .env.local        # add GEMINI_API_KEY for live AI; leave empty for simulation
npx -y pnpm@10 dev                # http://localhost:3000

npx -y pnpm@10 test               # 67 unit tests (Vitest)
npx -y pnpm@10 typecheck          # tsc (TypeScript 7)
npx -y pnpm@10 lint               # ESLint incl. React-compiler rules
npx -y pnpm@10 build              # must pass before you push — Vercel runs the same build
```

- **No key** → every AI feature falls back to the simulation (scripted calls, rules judge, built-in emails/sites/riddles; Messages shows "needs the live AI").
- **Force the simulation even with a key:** `NEXT_PUBLIC_LIVE_PROVIDER=mock` (build-time).
- **Test live calls with headphones.**

---

## 2. Architecture in one picture

```
src/app/            Routes. Thin: pick data, render a feature. + API routes (server).
src/components/     Presentation shared across pages: chrome, motion primitives, UI atoms, landing sections.
src/features/       Product features: UI + the state and logic behind it (call, scoring, freestyle, inbox…).
src/lib/            Logic with no page opinions: voice providers, audio, AI client, validation, motion setup.
src/content/        Static data: scenarios/scripts, districts, riddles, tactics, modes, fallback content.
src/styles/         Design tokens (Tailwind 4 @theme).
public/worklets/    The microphone AudioWorklet (served as a static file).
```

Data flow for a live call:

```
CallRoom (UI) ─► useLiveCall ─► LiveCallProvider ─► Gemini Live (WebSocket) / Mock script
    ▲                 │               │ events: status, transcript, state, speaking, options,
    │                 │               │         tactic-detected, persona, ended, error
    └── useCallStore ◄┘◄──────────────┘
                      └─ on "ended": scoreCall() → results-store → progress-store → freestyle → /results/[id]
```

Everything else (Inbox, Web, Messages, Riddles) calls `src/lib/encounters.ts`, which calls the API routes and falls back to built-in content.

---

## 3. Route map

| Route | File | Renders | Notes |
|---|---|---|---|
| `/` | `app/page.tsx` | 11 landing sections (§5.4) | Server component; motion lives in client children |
| `/modes` | `app/modes/page.tsx` | `ModeRing` | 3D mode menu |
| `/play` | `app/play/page.tsx` | redirect → `/play/bank-security` | |
| `/play/[scenarioId]` | `app/play/[scenarioId]/page.tsx` | `CallRoom` | Pre-rendered for every id in `SCENARIOS`. **Immersive** (no nav). `?auto=1` = Freestyle auto-answer |
| `/results/[sessionId]` | `app/results/[sessionId]/page.tsx` | `ResultsView` | Reads sessionStorage; dynamic |
| `/riddle` | `app/riddle/page.tsx` | `RiddlePlayer` | Kept outside `/play` so the nav shows |
| `/freestyle` | `app/freestyle/page.tsx` | `FreestyleConsole` | Wake up / live log / result |
| `/inbox` `/web` `/messages` | `app/*/page.tsx` | `InboxPlayer` / `WebPlayer` / `ChatPlayer` | `?fs=1` = playing a Freestyle encounter |

**Immersive rule:** `Chrome.tsx` hides the nav, the scroll hairline and smooth scrolling for any path starting with `/play`. If you add a route under `/play`, it becomes immersive too.

API routes (all `POST` except status; all return JSON; all validated with Zod in `lib/validation/schemas.ts`):

| Route | Purpose | Request → Response |
|---|---|---|
| `GET /api/status` | Is live AI available? | → `{ gemini: boolean, models }` |
| `/api/live/token` | Director writes a unique call plan, then mints a one-use Gemini Live token | `{ scenarioId, context?, profile? }` → `{ token, model, legitimate, planner, caller, brief }` |
| `/api/analyze` | Per-turn analyst for the call HUD | `{ scenarioId, transcript, detected, legitimate?, objective? }` → `Analysis` |
| `/api/score` | AI judge | `CompletedCall` → `CallScore` |
| `/api/riddle` | Adaptive riddle | `{ weak, avoid, wantLegit, context? }` → riddle |
| `/api/email` | Generated email | `EncounterRequest` → `GeneratedEmail + { id, source }` |
| `/api/site` | Generated website | `EncounterRequest` → `GeneratedSite + { id, source }` |
| `/api/chat` | Texting persona | `{ action: "start", … }` → `{ plan }`; `{ action: "turn", plan, difficulty, history }` → `ChatTurn` |

All AI routes return **503** without a key and **502** on model failure. The client treats both as "use the fallback", so keep that behaviour if you touch the fetch helpers.

---

## 4. Global shell — `src/components/chrome/`

Mounted once in `app/layout.tsx` → `Chrome.tsx`, around every page.

| Component | Why it exists | What it does | Keep |
|---|---|---|---|
| `Chrome.tsx` | One place for everything that wraps every page | Renders SmoothScroll, Nav, ScrollProgress (not on `/play*`), `<main id="main">`, StoreHydrator, **FreestyleEngine**, FreestylePill, Cursor, Grain | `FreestyleEngine` must stay mounted globally, or Freestyle stops when the player changes page. Keep `<main id="main">` (the skip link targets it). |
| `SmoothScroll.tsx` | The landing page's smooth scroll | Lenis driven by the GSAP ticker, synced to ScrollTrigger; off under reduced motion; calls `ScrollTrigger.refresh()` after fonts load | If you drop Lenis, keep the fonts-loaded refresh, or pinned sections measure wrong. |
| `Nav.tsx` | Quiet fixed navigation | Wordmark, section links (landing anchors), **Play** → `/modes`, Index. Links fade out when scrolling down | Hash links go through `scrollToTarget` (works with or without Lenis). |
| `IndexMenu.tsx` | Full-screen section index; also the mobile nav | Radix Dialog; stops Lenis while open | Radix gives focus trap and Esc to close. Keep a dialog primitive. |
| `ScrollProgress.tsx` | Scroll-progress hairline and `03 / 11` counter | Reads every `[data-section]` element | Depends on `Section.tsx` setting `data-section`. |
| `Cursor.tsx` | Custom cursor | Opt in with `data-cursor="magnetic" \| "enter" \| "talk" \| "view"`. Adds `html.has-custom-cursor` (hides the native cursor). Disabled on touch and under reduced motion. Hover state is tied to the route | If you remove it, also remove the `has-custom-cursor` CSS in `globals.css`. Stray `data-cursor` attributes are harmless. |
| `Grain.tsx` | Film-grain texture | A fixed static noise overlay | Purely visual. |
| `StoreHydrator.tsx` | Avoids hydration mismatches | Rehydrates the persisted Zustand stores after mount (they use `skipHydration`) | **Any new persisted store must be added here.** |

`app/layout.tsx` also:
- loads the three fonts through `next/font` (CSS variables `--font-newsreader`, `--font-hanken`, `--font-jetbrains`)
- adds the **pre-paint script** that puts `js` on `<html>` (see §7.1)
- renders the skip link

---

## 5. Components

### 5.1 Motion primitives — `src/components/motion/`

| Component | Why | What / contract |
|---|---|---|
| `SplitReveal.tsx` | Headline line masks (the site's signature motion) | `lines={[…]}` renders each line in `.split-mask > [data-reveal-line]`; GSAP moves lines from `yPercent: 150` to `0`. `trigger="load" \| "scroll"`. The 150% offset is tied to the mask padding in `globals.css`: less than that and glyph slivers show at line-height below 1. |
| `Reveal.tsx` | Staggered fade-up for supporting content | Animates descendants marked `data-reveal`. `trigger="load"` for above-the-fold content, otherwise it waits to scroll into view. |
| `Portrait.tsx` | Caller portraits | Clip-path wipe (`data-wipe="up" \| "left"`), then Ken Burns. Without `src` it shows the "photo withheld" dossier placeholder. Accepts real photos via `src` (`next/image`). |
| `Counter.tsx` | Score count-up | The final value is in the HTML (correct with no JS or reduced motion); it animates from 0. |

All four use `useGSAP` + `gsap.matchMedia(MQ.motion)` from `lib/motion/gsap.ts`, so reduced motion gets the final state. **If you replace GSAP, replace the `globals.css` start-state rules at the same time** (rule 4).

### 5.2 UI atoms — `src/components/ui/`

| Component | Why | Notes |
|---|---|---|
| `Button.tsx` | All buttons (cva variants) | `solid` (primary), `ghost`, and `signal` (red). **`signal` is reserved for "End call"**: red means danger in this design. Supports `asChild` for links. |
| `CtaLink.tsx` | Text-and-arrow calls to action | `href="#id"` smooth-scrolls, `href="/path"` routes, and no `href` renders a button (`onClick`). |
| `Meter.tsx` | Suspicion or guard meter | `role="meter"` with `aria-valuenow` / `valuetext`. Tests and screen readers rely on it. |
| `ListRow.tsx` | `01  TITLE ──── STATUS` rows | Used by Progression. |

### 5.3 Shared helpers

- **`lib/cn.ts`:** `clsx` + `tailwind-merge`, extended so the custom type utilities (`display-xl`, `display-l`, `display-m`, `quote`, `lead`, `ui-label`, `meta`) count as **font sizes**. `cn("quote", "text-[20px]")` therefore drops `quote`. This caused a real bug once (see the comment in `CallRoom.tsx`).

### 5.4 Landing sections — `src/components/sections/`

Order and ids come from **`content/sections.ts`**, which also drives the index menu and the section counter. Keep ids in sync.

| Section | Why | Notable behaviour |
|---|---|---|
| `Section.tsx` | Wrapper for every section | Sets `id`, `data-section="NN"` and `aria-labelledby="{id}-title"`. **Each section must contain an element with id `{id}-title`.** |
| `Opening.tsx` | Hero ("You're already on the call.") | Reveals on load. |
| `IncomingCall.tsx` + `RingTimer.tsx` | The first caller | Answer button → `/play/bank-security`; the timer counts while visible. |
| `City.tsx` | The six districts | **Pinned** on desktop with scroll-scrubbed clip wipes and snapping (`inertia: false`); rows switch plates when not pinned. |
| `Threat.tsx` | "They attack your decision" | **Pinned**, scrubbed, snaps to timeline labels; stacked with CSS grid only while pinned (`data-pinned`). |
| `Opponent.tsx` | Shows adaptation | A sequence that plays once. |
| `LiveCallPreview.tsx` | Static preview of the call room | `inert` + `aria-hidden` (it's a picture, not controls). |
| `Judge.tsx` | An example score report | Hard-coded example, labelled "Example report". |
| `RiddleSection.tsx` | Embeds `RiddlePlayer` and the false-positive message | |
| `Progression.tsx` | "Your city" | Reads `progress-store`. **Its `LEVELS` must match `SCENARIO_ORDER`.** |
| `Impact.tsx`, `FinalCta.tsx` | Closing | FinalCta → `/modes`. |

Maximum two pinned sections (City, Threat); more makes mobile scrolling fight the user. Reduced motion and widths under 1024px get no pinning.

---

## 6. Features — `src/features/`

### 6.1 Calls — `features/call/`

| File | Why | What it does |
|---|---|---|
| `CallRoom.tsx` | The call UI | Reads **only** `useCallStore` and `useLiveCall`. Idle → permission → connecting → ringing → live → ending/scoring. In live mode it shows the `TalkBar` (speak or type); in simulation, scripted replies (keys 1–3). Keyboard: **M** mutes. `?auto=1` auto-answers once (read from `window.location`, not `useSearchParams`, because the page is statically generated). **Layout contract:** exactly `h-dvh`, and the transcript scrolls inside, so the reply box and End call stay visible on phones. |
| `use-live-call.ts` | The **only** bridge from UI to a provider | `answer({ precise, forceMock? })` checks `/api/status`, requests the mic, gets the real-world context, builds a provider, connects, then starts the mic. `choose`, `sendText`, `hangUp` and `toggleMute` are the other actions. On `ended`: `scoreCall` → save to results → update progress → resolve Freestyle → `router.push('/results/…')`. |
| `call-store.ts` | Live call state | Status (guarded by `call-machine`), transcript (**upsert by message id**, because live transcription grows in place), analyst state, scripted options, speaker, detections, mute, error, mode (`gemini \| mock`), context, the director's caller and brief. Not persisted. |
| `call-machine.ts` | Makes illegal state jumps impossible | The allowed-transition table. Pinned by tests. |
| `Waveform.tsx` | The speech line | Reads real audio levels once per animation frame through `readLevel()` (no React state); synthesised in simulation. |

### 6.2 Scoring and results — `features/scoring/`

| File | Why | What it does |
|---|---|---|
| `ScoreReport.tsx` | The forensic report | Score count-up, caught/missed, timeline, notes, the brief ("This call …"). For genuine calls it follows the judge's pass/fail. Any key or click skips the animation. |
| `ResultsView.tsx` | `/results/[id]` | Waits for sessionStorage hydration (`useSyncExternalStore`), then renders the report and actions (Back to Freestyle / Next call / Replay / New conversation for texts). |
| `results-store.ts` | Scorecards | sessionStorage `scam-city:results`. |
| `score-call.ts` | "Always get a score" | AI judge via `/api/score` (30 s budget); on any failure it uses the rules judge. |
| `mock-judge.ts` | Rules judge | `judgeCall`, `PASS_THRESHOLD` (65), `fmt` (mm:ss). |
| `compose.ts` | Judge JSON → `CallScore` | Clamps times, de-duplicates, applies the pass mark, trims labels to whole words. |

### 6.3 Riddles — `features/riddle/RiddlePlayer.tsx`

Scam-or-genuine and then category, as native radio groups. The first riddle is built in (instant). After each answer it prefetches an AI riddle aimed at the player's weak tactics, and falls back to the built-in list.

### 6.4 Freestyle — `features/freestyle/`

| File | Why | What it does |
|---|---|---|
| `schedule.ts` | The rules, as pure functions | `firstDelay()` is always under 20 s; paces (`intense \| normal \| relaxed`); `pickEncounter()` chooses the channel mix, about 30% genuine, and difficulty that ramps. Unit-tested. |
| `freestyle-store.ts` | Session state | sessionStorage `scam-city:freestyle`. `status`, `lives` (3), `handled` (goal 8), `incoming` (arrived), `current` (accepted), `log`, `nextAt`, `context`. Actions: `wake`, `stop`, `ring`, `accept`, `ignore`, `resolve`. Also `routeFor(encounter)` and `freestyleEncounter(channel)`. |
| `FreestyleEngine.tsx` | The clock (mounted globally) | Schedules the next encounter and **prepares its content ahead of time** (so it arrives on time). It pauses while an encounter is `incoming` or `current`, or while a call is active. It fires a desktop notification plus the in-app **IncomingCard**, which rings and auto-ignores after 30 s. Answer → `router.push(routeFor(e))`. |
| `FreestyleConsole.tsx` | `/freestyle` | Wake up (**inside the click**: requests notification permission and unlocks the ringtone audio), then the live log, then the win or lose screen. |
| `FreestylePill.tsx` | "You're still awake" | A fixed status chip (lives, progress). Hidden in `/play` and on `/freestyle`. |
| `ringtone.ts` | Call ring | A synthesised two-tone ring (no audio files). It only plays after Wake Up has unlocked audio. |

**The Freestyle contract:**
- **Opening:** a mode page opened with `?fs=1` takes its content from `freestyleEncounter("email" \| "web" \| "sms")` instead of generating new content. Calls open with `?auto=1`.
- **Reporting:** when the player decides, the page must report the result, through `recordEncounter(...)` for email and web, or `useFreestyle.getState().resolve(...)` for calls (`use-live-call`) and texts (`ChatPlayer`).
- **Why it matters:** until it's reported, `current` stays set and the engine won't schedule the next encounter.

### 6.5 Everyday encounters — `features/encounters/`, `inbox/`, `web/`, `messages/`

| File | Why | What it does |
|---|---|---|
| `encounters/grade.ts` | One grading rule for every channel | `report` / `trust` / `engaged`. Engaging with a scam = caught (costs a Freestyle life). Reporting something genuine = wrong. |
| `encounters/record.ts` | One player model across channels | Updates learned and weak tactics (which steer every generator) and resolves Freestyle. |
| `encounters/Verdict.tsx` | The verdict panel | Headline, explanation, "what gave it away" list; `Highlight` underlines the quoted clue text in place. |
| `inbox/InboxPlayer.tsx` | Email and phishing | Mail client in "paper" tokens. Body paragraphs contain `[link:N]` markers that become buttons. **Hover (or first tap on touch) shows the link's real `actualUrl`** in a status bar, which is the core lesson. "To me" reveals the reply-to. Opening a link or attachment = engaged. |
| `web/WebPlayer.tsx` | Scam websites | Simulated browser: tab, address bar, padlock → site-info panel (https, **domain age**, certificate). `SitePage` renders the generated JSON; submitting the form or adding to cart = engaged. Brand accent colours are content, not game UI. |
| `messages/ChatPlayer.tsx` | Social engineering by text | Phone-style chat. Each turn calls `/api/chat` (reply plus the analyst's read). The contact can end the chat itself. "Block & report" / "End conversation" → `scoreCall` → results (`channel: "sms"`). Without AI it shows an "unavailable" state. |

Generated content is rendered as **text**. The AI never produces HTML, which prevents injection. Keep it that way: don't switch to `dangerouslySetInnerHTML` for generated emails or sites.

### 6.6 Modes and progress

- **`modes/ModeRing.tsx`:** the 3D menu. Six plates on a `rotateY` ring (`preserve-3d`), sized from the container width; the title size comes from the plate width. Drag, arrow keys and buttons turn it, and the front plate is the link. Reduced motion → `FlatModes` grid. Data in `content/modes.ts`.
- **`progress/progress-store.ts`:** localStorage `scam-city:progress`. Stores `cleared` levels, `learned` tactics (the HUD only shows learned red flags), `weak` tactic counts (the adaptive target for every AI generator), `recentHooks` (so the director never repeats a caller), and riddle accuracy. `weakest()` picks the targets.

---

## 7. Hidden coupling (read twice)

### 7.1 The pre-paint `js` class and reveal start states
`layout.tsx` adds `class="js"` to `<html>` before first paint. `globals.css` then hides reveal targets **only** when `html.js` is present **and** motion is allowed:

```css
html.js [data-reveal-line] { transform: translateY(150%); }
html.js [data-reveal]      { opacity: 0; }
html.js [data-wipe="up"]   { clip-path: inset(100% 0 0 0); }
```

Without JS or with reduced motion, content is visible. **Any element carrying these attributes must be animated in by a component, or it stays hidden.**

### 7.2 User-gesture requirements
| Needs a click | Where | Why |
|---|---|---|
| Microphone + call audio | CallRoom **Answer**, or the Freestyle card's **Answer** (client navigation keeps the same document, so the gesture still counts) | `PcmPlayer` (an `AudioContext`) is constructed synchronously in the Gemini provider's constructor |
| Notification permission + ringtone | Freestyle **Wake up** | Browsers only allow `Notification.requestPermission()` and audio unlock from a gesture |
| Notification click | Only focuses the tab | Clicking a notification doesn't count as a gesture for audio. The player answers on the in-app card |

### 7.3 Query parameters
- `?auto=1` on `/play/[id]` → auto-answer (Freestyle).
- `?fs=1` on `/inbox`, `/web`, `/messages` → use the Freestyle encounter.

Both are read from `window.location` inside effects (no `useSearchParams`, which would force a Suspense boundary on statically generated pages).

### 7.4 Data attributes used by logic
| Attribute | Used by |
|---|---|
| `data-section="NN"` | ScrollProgress counter |
| `data-reveal-line`, `data-reveal`, `data-wipe` | Motion start states (§7.1) |
| `data-cursor` | Custom cursor |
| `data-pinned` | Threat's pinned grid layout |
| `data-plate`, `data-plate-inner` | City's GSAP timeline |
| `data-seq`, `data-draw`, `data-tick`, `data-curve` | ScoreReport sequence |
| `data-turn`, `data-step`, `data-pivot`, `data-mark`, `data-flag` | Opponent sequence |

### 7.5 Hydration
Persisted stores use `skipHydration` and are rehydrated by `StoreHydrator` after mount, so the first client render matches the server. Don't read persisted values during the first render and expect them to be there. `ResultsView` shows the pattern (`useSyncExternalStore` on `persist.hasHydrated`).

### 7.6 Lint rules (the React compiler rules in `eslint-config-next` 16)
These already caught real bugs; your code must pass them too:
- No `setState` synchronously in an effect body. Set it in an async callback, or use `useSyncExternalStore`.
- No components defined inside render. Use a plain function that returns JSX (see `WebPlayer`'s `h()`).
- No reassigning variables after render.

### 7.7 Audio and voice
- `lib/live/audio.ts` has two parts. `MicCapture` → 16 kHz PCM through the worklet. `PcmPlayer` → 24 kHz gapless playback, and `flush()` on interrupt.
- `lib/live/gemini-provider.ts` is browser-only (WebSocket + Web Audio). It also runs the analyst after every caller turn and finishes the call itself when the persona calls `end_call`.
- Nothing visual depends on these internals except `Waveform` (through `readLevel()`).

---

## 8. Styling system

- **Tokens:** `src/styles/tokens.css` (Tailwind 4 `@theme`). Game UI uses `ink, surface, raised, line, dim, smoke, ash, bone, signal`. Simulated third-party apps (mail, browser, chat) use the **paper** tokens: `paper, paper-2, paper-line, paper-ink, paper-muted, paper-link`. Radius and shadow scales are reset (only `rounded-full` exists), and the breakpoints are custom (`sm` = 480px).
- **Utilities:** `globals.css` defines `display-xl`, `display-l`, `display-m`, `quote`, `lead`, `ui-label`, `meta`, `tabular`, `gutter-x`, `section-y`, plus the keyframes `ken-burns`, `live-pulse` and `rule-draw`, and a global reduced-motion override.
- **Motion tokens:** `lib/motion/tokens.ts` (Motion library) and `lib/motion/gsap.ts` (the `EASE` custom curve, `MQ` media queries). One easing curve everywhere: `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Design rules:** `design-system/scam-city/MASTER.md`, with page overrides in `pages/` (call room, results, riddle). Signal red is punctuation: at most one red element per viewport on marketing pages. There is no green; genuine and correct are shown in bone.

You're free to replace all of this visually. If you do, keep the semantic distinctions: **danger** (signal), **genuine** (not green-coded as "safe"), and **paper** (simulated apps look like real third-party software).

---

## 9. Accessibility contracts (keep these roles)

| Where | Contract |
|---|---|
| Call transcript | `<ol role="log" aria-live="polite" aria-label="Call transcript">` |
| Call state | a single `role="status"` announcer (state changes only, never partial speech) |
| Suspicion / guard | `role="meter"` with `aria-valuenow` + `aria-valuetext` |
| Red-flag chips | list labelled "Red flags you have learned", each chip with a hidden "detected / not yet" suffix |
| Freestyle arrival | `role="alertdialog"` with Answer (autofocus) and Ignore |
| Verdicts | `role="status"`; the heading receives focus |
| Riddles | native radio groups inside `<fieldset>` + `<legend>`; explicit Confirm |
| 3D menu | `aria-roledescription="carousel"`; only the front plate is focusable; arrow keys turn it; full link list below |
| Global | skip link → `#main`; visible focus rings (`outline 2px bone`); every control ≥ 44px; everything works under `prefers-reduced-motion` |

---

## 10. Content and contracts you may need

- **`content/scenarios.ts`:** the 7 call districts, each with a persona and a scripted fallback call graph. `SCENARIO_ORDER` is the level order. **The graph is unit-tested**: every node reachable, every call winnable and losable.
- **`content/districts.ts`:** the six city districts (→ scenario ids). **`content/modes.ts`:** the mode menu. **`content/riddles.ts`**, **`content/fallback-encounters.ts`:** built-in content (validated against the same schemas the AI must follow). **`content/tactics.ts`:** the six tactic ids and labels used everywhere.
- **`lib/live/types.ts`:** the UI ↔ engine contract (`LiveCallProvider`, the `LiveCallEvent` union, `CompletedCall`, `CallScore`, `RealWorldContext`, `CallBrief`). Change these only together with the providers and tests.
- **`lib/validation/schemas.ts`:** every API request and response, plus the model output schemas (Zod → JSON Schema for Gemini). If the UI needs a new field from the AI, add it here first.
- **`lib/encounters.ts`:** the client fetchers `fetchEmail`, `fetchSite`, `startChat` and `chatTurn`. They add the player's weak tactics, difficulty and real-world context, and fall back automatically.
- **`lib/ai-status.ts`:** a cached `/api/status` (`useAiStatus()`).

---

## 11. Toolchain notes

- **Package manager:** `npx -y pnpm@10`.
- **TypeScript:** `package.json` aliases `typescript` → `@typescript/typescript6` (the API that typescript-eslint and Next need) and `@typescript/native` → TypeScript 7 (the `tsc` binary). Don't "simplify" this.
- **ESLint 10:** `eslint.config.mjs` sets `settings.react.version` explicitly (the plugin's auto-detect is broken on ESLint 10).
- **Next.js 16:** App Router with Turbopack. Route `params` are Promises (`await params`).
- **Secrets:** `.env.local` (gitignored) holds `GEMINI_API_KEY` locally. On Vercel the key is set in Project → Environment Variables (Production). Never put a key in `.env.example` or any tracked file.

---

## 12. Safe to change vs. keep

**Change freely**
- All visual design, layout, typography, colour, copy, iconography and imagery (real caller photos can go into `Portrait src`).
- Motion style and libraries, as long as reduced motion still shows final states and §7.1 stays consistent.
- The landing page's narrative, section order and count (update `content/sections.ts`).
- Component structure *inside* a feature.

**Keep (or change deliberately, with tests)**
- `LiveCallProvider`, the `LiveCallEvent` names, and `use-live-call` as the only bridge.
- The call state machine and `call-store` semantics (transcript upsert by id).
- Store shapes and persist keys; add new persisted stores to `StoreHydrator`.
- API request and response shapes (they're Zod contracts on both sides).
- The Freestyle contract (§6.4), the query params (§7.3), and the gesture flows (§7.2).
- `public/worklets/pcm-capture.js` location; audio internals.
- The accessibility roles (§9); generated content rendered as text, never HTML.

---

## 13. Before you merge — checklist

Automated: `test`, `typecheck`, `lint` and `build` must all pass.

Manual (desktop Chrome, then a 390px phone, then 320px):

- [ ] Landing: scroll all 11 sections; City and Threat pin and snap; no sideways scroll; turn on reduced motion and confirm everything is visible and nothing pins.
- [ ] Simulation call (`NEXT_PUBLIC_LIVE_PROVIDER=mock`): answer, pick replies with 1–3, end the call → results render.
- [ ] Live call (with key and headphones): answer, allow the mic, hear the caller, speak, interrupt, type in the reply box, mute (M), end the call → "Judged by Gemini".
- [ ] Phone call room: the reply box and End call are visible at all times; the transcript scrolls inside.
- [ ] Riddle: answer a few; the next one says "Written for you".
- [ ] Inbox: hover a link → the real URL shows; on touch the first tap shows it; report → verdict with the clues underlined.
- [ ] Web: open the padlock panel (domain age); submit the form → "You took the bait" on a scam.
- [ ] Messages: reply twice, then Block & report → results say "Conversation report".
- [ ] Freestyle: Wake up at *Intense* → the first arrival is under 20 s; answer a call → the call room auto-connects; finish → "Back to Freestyle"; engage with a scam email → a life is lost; ignore one → it's logged; go to sleep.
- [ ] Mode menu: drag, arrow keys, buttons; reduced motion → flat grid.
- [ ] Keyboard only: tab through every screen; focus always visible; Esc closes the index menu.

If something in this doc no longer matches the code, fix the doc in the same PR.
