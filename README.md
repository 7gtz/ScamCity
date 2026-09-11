# SCAM CITY

**An AI caller is trying to scam you. Out-think it, live, on a real voice call.**

SCAM CITY is a voice-driven training game built for KICKR CODEMANIA 2026 (*Real World × AI × Gaming*). You answer a phone call in the browser and talk out loud to an AI persona, which might be a scammer or might be genuine. It adapts to what you say, uses your real location against you, and switches tactics when you push back. When the call ends, an AI judge reviews the transcript and scores your decisions.

> People learn to resist manipulation far better by experiencing it under pressure than by reading a list of red flags.

---

> **Working on the front end?** Read [`docs/FRONTEND-HANDOFF.md`](docs/FRONTEND-HANDOFF.md) first. It explains why every component exists, what it must keep doing, and what breaks silently.

## Contents

- [Quick start](#quick-start)
- [How to play](#how-to-play)
- [Live AI vs. simulation mode](#live-ai-vs-simulation-mode)
- [What the AI does](#what-the-ai-does)
- [Real-world integration](#real-world-integration)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Deploying to Vercel](#deploying-to-vercel)
- [Project structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Tech stack](#tech-stack)
- [Future potential](#future-potential)

---

## Quick start

**Requirements:** Node.js 22+ and pnpm 10. Use Chrome or Edge for the best microphone support; Safari works too.

```bash
git clone https://github.com/7gtz/ScamCity.git
cd ScamCity
npx -y pnpm@10 install

# Optional, but needed for the live AI caller:
cp .env.example .env.local
# then set GEMINI_API_KEY in .env.local

npx -y pnpm@10 dev
```

Open http://localhost:3000.

- **With `GEMINI_API_KEY`:** calls are live AI voice conversations.
- **Without it:** everything still works in simulation mode (scripted calls, rules-based judge, built-in riddles).

> **Use pnpm 10.** `corepack pnpm` currently resolves pnpm 12.3.4, which corrupts `node_modules` on Windows (see [Troubleshooting](#troubleshooting)). `npx -y pnpm@10 …` always works.

Get a Gemini API key at https://aistudio.google.com/apikey.

---

## How to play

### The loop

```
ENTER THE CITY → PICK A DISTRICT → ANSWER THE CALL → TALK / DECIDE → HANG UP OR GET SCAMMED → AI JUDGE → PROGRESS
```

1. **Enter the city.** The landing page (`/`) introduces the game. Scroll to *The City*, or open the **Index** menu (top right). Each district's plate carries a live thumbnail of the city map; click it (or **On the city map** on a phone) to open the full map as an overlay, pointing at that district, with its status and a way in.
2. **Pick a district.** Each is a different con:

   Six districts, six ways people get manipulated. Each rings with its own caller ID, brand and pretext.

   | # | District | Runs on | Call | Route |
   |---|---|---|---|---|
   | 01 | The Bank | Authority | Account-security impersonation | `/play/bank-security` |
   | 02 | The Delivery | Urgency | Redelivery fee / payment link | `/play/parcel-hold` |
   | 03 | The Desk | Fear | Tech support / remote access | `/play/desk-support` |
   | 04 | The Prize | Greed | "You've won" / release fee | `/play/prize-claim` |
   | 05 | The Impostor | Obedience | Executive gift-card favour | `/play/ceo-favour` |
   | 06 | The Romance | Trust | Online partner's emergency | `/play/romance-emergency` |
   | Bonus | The legitimate call | Verification | A **genuine** fraud alert (verify, don't dismiss) | `/play/card-alert` |

   The legitimate call is a bonus on a spur off the Bank, not a seventh district. It opens once you clear the Bank or solve 3 riddles, and leads back onto the route.

3. **Answer the call.** Press **Answer the call**. In live mode, allow the microphone. You can optionally let the caller use your real location and weather.
4. **Talk.** Speak naturally, as you would on a real call. Question the caller, ask for proof, refuse, or play along. You can interrupt the caller mid-sentence. In a noisy room, type into the reply box instead.
5. **Decide.** Hang up with **Hang up** whenever you like, or let the call reach its end: the caller hangs up on its own when you've been scammed, exposed it, or verified it.
6. **Read the verdict.** One stamped result first (score out of 100, pass mark 65), then the tactics you caught and missed, what the city learned from you, a suspicion timeline, and the judge's notes on your behaviour, quoting the call. Your defense profile sits underneath.
7. **Progress.** Passing a call clears the district and opens the next on the *Your City* transit map.

### Controls

| Action | Control |
|---|---|
| Answer the call | **Answer the call** button |
| Talk | Just speak (live mode) |
| Type a reply | Reply box under the transcript (live mode) |
| Pick a scripted reply | Click it, or press **1** / **2** / **3** (simulation mode) |
| Mute / unmute the mic | **M**, or the **Mic on** button |
| Hang up | **Hang up** |
| Skip the results animation | Click or press any key |
| Section index | **Index** (top right) |

### The HUD

- **Suspicion meter:** how guarded you are acting, as read by the AI analyst each turn. It turns red when high.
- **Red-flag chips:** tactics you have already learned, in three states: not seen yet → **suspected** (amber: the other side is using it) → **called out** (green: you named or resisted it). Tactics you haven't learned stay hidden, so the HUD teaches without spoiling.
- **Guard readout (Messages):** when your guard moves, it says why, e.g. "+40 · Asked to verify their identity".
- **Pressure line:** a hairline across the call room that grows and turns amber, then red, as the caller escalates. "Caller changed tactic" flashes on a pivot, without naming the tactic: spotting it is your job.
- **In play:** the real-world details the caller can use against you.
- **The city noticed:** after every call, email, site or chat, one line on what got past you (or what you shut down) and what the next encounter may lean on. This is the same player model every generator actually reads.
- **Defense profile:** an archetype (the Skeptic, the Accommodator, the Verifier, the Realist), the tactic you're strongest against, the one that works on you, and the district most likely to test you next.

### Riddle Mode (`/riddle`)

This is the quick, voice-free training mode. Read a message, decide whether it's a scam, and if so what kind. The AI then explains the giveaway. In live mode, the AI writes each next riddle for you, aimed at the tactics you keep missing and set in your region. One in three is a legitimate message.

### Tips for a good live call

- **Wear headphones.** Otherwise the caller can hear itself through your speakers.
- Speak in short turns. You can cut in whenever you like.
- To stop at any time, say "stop" or "end game": the caller drops character.

### Modes (`/modes`)

Choose a mode from the 3D ring. Drag it, swipe it, or use the arrow keys; the plate facing you is the one you enter.

| Mode | Route | What happens |
|---|---|---|
| **Freestyle** (the main game) | `/freestyle` | Press **Wake up**, allow notifications, and carry on with your day. Calls, emails, texts and links arrive as desktop notifications at random times: the first within 20 seconds, then at the pace you pick (Intense 15–40 s, Normal 45 s–2 min, Relaxed 2–5 min). About 30% are genuine, and never fewer than 2 in a day. You have 3 lives: **falling for a scam costs one, and so does turning away something genuine** (reporting it, ignoring it, or hanging up without verifying). Distrusting everything is not a strategy. Difficulty climbs every three encounters (Approachable → Polished → Subtle). Survive 8 to win the day. The HUD shows lives, an encounter track, the level, scams stopped, genuine contacts trusted and false alarms. |
| **Calls** | `/play` | A live AI voice caller (see above). |
| **Inbox** | `/inbox` | An AI-written email in a real-feeling mail client. Hover links (tap once on a phone, or use **Inspect links**) to see where they really go, open the sender details to check the reply-to, look at attachments, then report it or mark it safe. |
| **Messages** | `/messages` | A live AI texting conversation, for example "Hi Mum, new number", a fake recruiter, a friend asking for an OTP, or a genuine contact. It adapts to every reply, and the AI judge scores the thread. The first message arrives within about 3 seconds: if the AI's own opening isn't ready by then, a built-in one starts the conversation and the AI takes over from the first reply. |
| **Web** | `/web` | An AI-written website in a simulated browser: a lookalike login, a shop, an investment site or a delivery fee. The address bar, the padlock's site info (domain age) and the form are the clues. Using a scam site counts as being caught. |
| **Riddles** | `/riddle` | Quick scam-or-genuine training. |

Keep the tab open during Freestyle; you can browse other tabs, and desktop notifications will reach you. Clicking a notification brings SCAM CITY forward, and you answer on the in-app card (drawn like an OS notification; its hairline runs out with the 30-second ring). If you leave an encounter half-played, `/freestyle` offers **Go back to it** or **Walk away**.

### The three-minute demo (for judges)

Open `/freestyle?demo=1` (or **Judging? The three-minute demo** on the landing page) and press **Wake up**. Three encounters arrive back to back, each one level harder:

1. **A scam email.** Decide, and the verdict tells you what you checked, what gave it away, and what the city noticed.
2. **A text in a different channel**, aimed at whatever the email exposed. The contact replies live and adapts. Without a Gemini key, a scam website arrives instead.
3. **A live call**, sometimes genuine. The judge scores it and your defense profile appears.

### How the expansion meets the brief

- **The real world changes the game.** Freestyle arrives during your actual day as real desktop notifications. Every generated email, website and conversation is written for your real local time and weather, and, with consent, your city: a delivery fee "because of tonight's rain", or a boss's favour near the end of your working day.
- **The AI matters in every channel.** Emails, websites and texting personas are generated fresh for each player, and Messages is a live adaptive AI conversation. One player model connects everything: the tactics you miss in an email are the ones the next call, chat or website leans on. Without AI you'd get three fixed emails and three fixed sites.
- **A clear game loop.** Wake up → encounters arrive → decide (answer, report, trust, reply) → AI verdict explaining the clues → lives and progress → win the day or lose it.

---

## Live AI vs. simulation mode

| | Live AI mode (`GEMINI_API_KEY` set) | Simulation mode (no key) |
|---|---|---|
| Caller | Gemini Live, real-time voice | Scripted, deterministic |
| Your input | Microphone (or typed) | Scripted reply buttons |
| Each call | Uniquely written by the director | Same script each time |
| HUD | AI analyst, every turn | Script-driven |
| Judge | Gemini judge | Rules-based judge |
| Riddles | AI-generated, adaptive | 5 built-in |

The game picks the mode on its own (`/api/status` reports whether the server has a key). If a live call fails to connect, the error screen offers **Continue with the scripted call**. If the line drops after a real conversation, the call is still judged.

To force simulation mode for a demo even when a key is set, use `NEXT_PUBLIC_LIVE_PROVIDER=mock`.

---

## What the AI does

Five AI roles, each load-bearing. Remove any of them and a core system disappears.

| Role | Model (default) | Job |
|---|---|---|
| **Director** | `gemini-3.5-flash-lite` | Before every call, writes a unique plan: caller name, organisation, voice, pretext, facts and tactic order. The plan is aimed at the tactics this player keeps missing, scaled to their record, and never repeats a recent pretext. In districts 3–7, about one call in five is secretly **genuine**. |
| **Caller** | `gemini-3.1-flash-live-preview` | Performs the plan as a real-time voice call. Escalates when you comply, and pivots to a new tactic when you challenge it. It reads the player: if you stay defensive it reframes instead of arguing (agrees with your caution, backs off, offers its own "callback number", sounds hurt), and it volunteers a believable detail to get you to confirm it. Hangs up on its own through an `end_call` tool. |
| **Analyst** | `gemini-3.5-flash-lite` | After every caller turn, reads the transcript and returns structured state: your suspicion, the tactics in play, what you detected and what you revealed. This drives the HUD. |
| **Judge** | `gemini-3.8-flash` | Scores the whole transcript against a rubric covering verifying questions, how early suspicion appeared, tactics caught, information revealed (confirming a detail the caller read out counts), and the final decision. Its notes judge behaviour, never a bare "correct": "You challenged the caller's identity, but then confirmed the account number they read out." Pass mark and time clamping are enforced in code, not trusted to the model. The judges are raced, not queued: if the flagship hasn't answered in 2 s a lite model starts too, and the first valid verdict wins inside an 8.5 s budget (past that, the rules judge answers). While it works, the player sees *Reading the transcript → Identifying tactics → Building your profile*. Reports use the channel's own words ("Conversation report", "Message timeline"). Emails and sites get the same treatment from rules: the verdict says what you inspected (links, sender details, site information) before you decided. |
| **Game master** | `gemini-3.5-flash-lite` | Writes Riddle Mode scenarios adapted to your weak tactics and your location. |

**What happens if you remove the AI?** There is no caller, nothing adapts, no two calls differ, nothing judges your decisions, and no riddles are written. The whole game collapses into a static quiz.

**Structured output everywhere.** Each model response is constrained by a JSON Schema generated from the same Zod schema that validates it on arrival (`src/lib/validation/schemas.ts`), so contracts and model output can't drift apart.

**Safety rails.** Every persona prompt states that this is a consensual training game and that all details are fictional. The caller never repeats numbers back, and it drops character immediately if the player sounds distressed or says "stop". Organisations are always fictional.

---

## Real-world integration

- **Voice.** A real spoken conversation through your browser microphone, streamed as 16 kHz PCM through an AudioWorklet to Gemini Live, with 24 kHz PCM audio played back.
- **Location, time and weather.** From your timezone by default. With consent, GPS supplies your real city (BigDataCloud) and live weather (open-meteo). The caller weaves these in to sound local and to invent believable urgency ("our Leeds branch closes early with the storm tonight"). **Where and when you play changes the con you face.**

- **A local accent.** The director gives every caller an accent that fits where you are. For a player in India, that's an Indian English accent, sometimes with a regional flavour. The live voice models take no language or accent code, so the accent is set through the caller's instructions, and those instructions forbid caricature.

Location is **off by default**: you opt in with **Personalise this call** (call room) or **Personalise my day** (Freestyle). Coordinates are only sent to those two public lookup services, and only then. Audio is never stored.

---

## Architecture

```
Browser                                            Next.js server (Vercel)
───────                                            ───────────────────────
mic → AudioWorklet (16 kHz PCM16)                  POST /api/live/token
   ↓                                                 ├─ director → unique CallPlan (JSON)
Gemini Live WebSocket  ◄── ephemeral token ────────  └─ one-use token: model, persona, voice,
   ↓  24 kHz PCM + transcripts + end_call tool           tools and transcription locked in
Web Audio scheduled playback (flush on interrupt)
   ↓                                                 POST /api/analyze  → per-turn HUD state
transcript → analyst ──────────────────────────►    POST /api/score    → AI judge verdict
call ends → judge   ──────────────────────────►     POST /api/riddle   → adaptive riddle
                                                     GET  /api/status   → is live AI available?
```

- **The key never reaches the browser.** The server mints a one-use ephemeral token (`v1alpha`) that can open exactly one call with a locked configuration.
- **Provider abstraction.** The call room depends only on the `LiveCallProvider` interface (`src/lib/live/types.ts`). `GeminiLiveCallProvider` and `MockLiveCallProvider` are interchangeable.
- **Explicit call state machine:** `idle → permission-requested → connecting → ringing → live → ending → scoring → results`, with `error` reachable from any state (`src/features/call/call-machine.ts`).
- **Fallbacks at every layer.** No key or a failed token → simulation. Analyst failure → the HUD holds its last state. Judge failure → rules judge. Director failure → the district's hand-written plan. Riddle failure → built-in riddles.
- **Model fallback chains.** Where the player is waiting (the judge, chat replies), the chain is raced rather than queued (`hedgeMs`/`budgetMs` in `generateJson`). Elsewhere, each text role tries its main model first. If that model is overloaded (503/429), too slow, or returns output that fails validation, the next model in the chain answers (`CHAINS` in `src/lib/gemini/models.ts`). For example, the judge falls back from `gemini-3.8-flash` to `gemini-3.5-flash-lite`.
- **Casting seed.** Each call's director prompt gets a random gender (matched to the voice pool) and a random first-name initial, plus the player's recent callers. The same district never sends the same person twice.
- **Rate limiting.** In-memory, per IP, on every AI route.

---

## Configuration

Copy `.env.example` to `.env.local`:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | For live AI | none | Server-only Gemini key. Without it, the game runs in simulation mode. |
| `NEXT_PUBLIC_LIVE_PROVIDER` | No | `auto` | `mock` forces the scripted call even when a key is set. |
| `GEMINI_LIVE_MODEL` | No | `gemini-3.1-flash-live-preview` | Voice model |
| `GEMINI_DIRECTOR_MODEL` | No | `gemini-3.5-flash-lite` | Per-call planner |
| `GEMINI_ANALYST_MODEL` | No | `gemini-3.5-flash-lite` | Per-turn HUD analyst |
| `GEMINI_JUDGE_MODEL` | No | `gemini-3.8-flash` | Post-call judge |
| `GEMINI_RIDDLE_MODEL` | No | `gemini-3.5-flash-lite` | Riddle generator |

---

## Scripts

```bash
npx -y pnpm@10 dev         # development server on :3000
npx -y pnpm@10 build       # production build
npx -y pnpm@10 start       # serve the production build
npx -y pnpm@10 test        # Vitest unit tests
npx -y pnpm@10 typecheck   # TypeScript 7 (tsc)
npx -y pnpm@10 lint        # ESLint
```

**What the tests cover:**
- the call state machine
- the mock provider's full call paths (including a scammed call failing)
- composition of judge verdicts into scores
- Zod-to-JSON-Schema contracts
- a graph check of every call script: every node reachable, every call winnable and losable, no dead loops
- director briefs, persona prompts, difficulty scaling and voice pools

---

## Deploying to Vercel

1. Import `7gtz/ScamCity` at https://vercel.com/new (or connect it under the project's **Settings → Git**). Vercel detects Next.js and pnpm automatically.
2. Add `GEMINI_API_KEY` under **Settings → Environment Variables** (Production and Preview).
3. Deploy. Every push to `main` redeploys automatically.

Microphone access on phones requires HTTPS, which the Vercel URL provides.

---

## Project structure

```
src/
  app/
    page.tsx                  landing narrative (11 sections)
    play/[scenarioId]/        the call room
    results/[sessionId]/      AI judge report
    riddle/                   Riddle Mode
    api/
      live/token/             director + ephemeral token
      analyze/                per-turn analyst
      score/                  AI judge
      riddle/                 adaptive riddle generator
      status/                 live-AI availability
  features/
    call/                     CallRoom, state machine, store, useLiveCall
    scoring/                  ScoreReport, rules judge, verdict composition
    riddle/                   RiddlePlayer
    freestyle/                the day: schedule, lives, HUD, notifications
    encounters/, inbox/, web/, messages/   everyday channels and their verdicts
    profile/                  defense profile and "the city noticed"
    progress/                 progression, learned, weak and strong tactics
  lib/
    live/                     provider interface, Gemini + mock providers, audio pipeline, real-world context
    gemini/                   models, director, persona prompts, district briefs, server client
    validation/schemas.ts     Zod contracts (also the model output schemas)
  content/                    districts, scenarios (fallback scripts), riddles, tactics
  components/                 chrome (nav, cursor, scroll), motion primitives, sections, UI
public/worklets/pcm-capture.js   microphone AudioWorklet
design-system/scam-city/         design system (MASTER + page overrides)
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `ERR_PNPM_CMD_SHIM_PARSE_MANIFEST`, or `node_modules` wiped | You ran pnpm 12. Use `npx -y pnpm@10 install`. |
| "Live AI is not configured" / calls are scripted | `GEMINI_API_KEY` is missing on the server. Restart `dev` after adding it. |
| "The microphone is blocked" | Allow the mic from the address bar, or choose **Continue with the scripted call**. On phones, use the HTTPS URL. |
| The caller interrupts itself | Use headphones; the mic is picking up the speakers. |
| No sound from the caller | Check the tab isn't muted; the audio starts after you press **Answer the call**. |
| Lint says typescript-eslint doesn't support TS 7 | Keep the two TypeScript aliases in `package.json` (`typescript` → TS 6 API, `@typescript/native` → TS 7 `tsc`). |

---

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 7 (strict)
- **AI:** Google Gemini via `@google/genai`: Live API (native audio, ephemeral tokens, function calling), structured JSON output
- **Audio:** Web Audio API, AudioWorklet, `getUserMedia` with echo cancellation. No audio libraries in the realtime path.
- **Validation:** Zod 4 (schemas double as Gemini response schemas)
- **State:** Zustand (call state machine; progress persisted locally)
- **Styling:** Tailwind CSS 4, CSS design tokens
- **Motion:** GSAP + ScrollTrigger, Motion, Lenis; reduced-motion aware throughout
- **Real-world data:** browser geolocation, open-meteo (weather), BigDataCloud (reverse geocoding)
- **Testing:** Vitest; Playwright used for visual verification
- **Hosting:** Vercel

---

## Future potential

- **Where it's useful:** schools, community centres, elder-care programmes, financial-literacy courses and corporate security training, so people practise before the real call comes.
- **Real phone numbers:** a telephony bridge (e.g. SIP) so the practice call rings the player's actual phone.
- **Classroom mode:** an instructor dashboard, shared leaderboards and cohort weak-spot reports.
- **More channels:** SMS and email cons played live, plus multi-stage "combined attacks" across channels.
- **Languages:** the caller already switches language when the player does; district content can be fully localised.
- **Accounts:** accounts, history and cross-device progress via Supabase (already planned in the stack).
