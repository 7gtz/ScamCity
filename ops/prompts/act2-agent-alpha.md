# Agent Alpha — Act 2 Voice UI & Scene Integration

You are **Agent Alpha** on the SCAM CITY repo. A second agent (**Beta**) is working in this same
repo at the same time. Your single most important constraint is below; read it before anything
else.

## Hard rule: file ownership

Ownership is **per file, not per directory**. You may create and edit **only** these files:

```
src/game/npc/VoiceInterrogationOverlay.tsx
src/game/npc/useNpcVoice.ts
src/game/npc/NpcPortrait.tsx
src/game/npc/SubtitleReel.tsx
src/game/npc/npc-overlay.css
src/game/npc/npc-session-store.ts
src/game/npc/overlay.test.ts          (new, optional)
src/game/integration/CityScreens.tsx
src/game/world/registry.ts
src/game/world/Panel.tsx
src/game/world/Hotspot.tsx
src/game/world/panels.css
src/game/ui/PanelShell.tsx
src/game/ui/shell.css
```

**Beta owns** (do not open with intent to edit, do not "just fix an import"):
`src/game/npc/types.ts`, `schemas.ts`, `tools.ts`, `context-builder.ts`, `mock-session.ts`,
`src/game/npc/personas/*`, `src/game/npc/*.test.ts`, `src/app/api/detective/**`,
`src/content/cases/ten-minute-window/*`, `src/content/npcs/ten-minute-window/*`,
`src/game/integration/review/playthrough.test.ts`.

**Neither agent touches** (a change here needs both to agree first):
`src/lib/live/*`, `src/features/call/*`, `src/game/state/*`, `src/game/dialogue/*`,
`src/lib/validation/schemas.ts`, `src/lib/gemini/*`, `package.json`, `pnpm-lock.yaml`.

If you need something changed in a file you do not own, **stop and report it** — describe what you
need and keep working on something else. Do not edit it.

## What we are building

Act 2 of the detective track, "The Ten-Minute Window". Today the five scenes play as a static
multiple-choice dialogue tree. We are replacing that with **free-form real-time voice
conversations** with five AI NPCs — Miller (office), Mara (victim's flat), Vance (bank),
Ravi (repair shop), Brennan (police station) — inside a live 10-minute countdown.

The full narrative beats are in `docs/implementation_plan.md`. Read it for tone and scene
structure, but the numbers in it are being re-localised by Beta (₹4,80,000, OTP 847291, 21:47 /
22:01 / 22:03 on Oct 14, Sector 22) — **you never write case facts**, so this does not affect you.

You own the **client**: the overlay the player sees, the microphone and audio plumbing, and the
wiring that puts all five scenes on screen.

## The contract (already landed — read it first)

`src/game/npc/types.ts` is written, typechecks, and is **frozen**. It defines everything you code
against:

- `NpcId = "miller" | "mara" | "vance" | "ravi" | "brennan"`
- `NPC_BY_DIALOGUE_KEY` — maps the existing hotspot/dialogue keys (`"detective"`, `"mara-okoye"`,
  `"teller-vance"`, `"ravi-sunder"`, `"sgt-brennan"`) to `NpcId`. Use this rather than rewriting
  hotspot ids.
- `NPC_LOCATION`, `DIALOGUE_KEY_BY_NPC`
- `NpcSession` — the interface your hook implements: `connect`, `startMicrophone`, `sendText`,
  `setMuted`, `end`, `on(listener) => unsubscribe`
- `NpcSessionEvent` — `status | subtitle | speaking | tool | error | ended`
- `NpcSessionStatus` — note `"unavailable"`, which is your signal to fall back to the authored tree
- `NpcToolCall` / `NpcToolResult` — `result.effects` is an `Effect[]`; **your code is the only place
  `applyEffects` is ever called**
- `VoiceInterrogationOverlayProps`

`src/game/npc/mock-session.ts` is also landed: `createMockNpcSession(npc, speed?)` returns a fully
scripted `NpcSession` with realistic word-by-word subtitle streaming and sample tool events, with
no key, no mic and no network. **Build the entire overlay against this first.** It is also the
offline demo path.

If the contract is genuinely missing something you need, report it — do not edit it.

## Your phases, in priority order

### A1 — Overlay shell, driven by the mock session (do this first)

`VoiceInterrogationOverlay.tsx`: a noir bottom-sheet that slides up over the panel art.

- Character portrait, NPC name and role, a mood/state indicator
- Streaming subtitle reel (`SubtitleReel.tsx`) — NPC lines grow word by word; player lines appear
  as they are transcribed
- Audio waveform. **Reuse `src/features/call/Waveform.tsx` as-is** — it reads a module-level level
  bridge and animates per rAF without React state. Do not reimplement it, do not edit it.
- Controls: push-to-talk button, open-mic toggle, mute, a text input bar (the no-mic path — call
  `session.sendText`), and a close/leave button
- Fallback: when the session reports `status: "unavailable"`, render the existing
  `DialogueBox` (`src/game/dialogue/DialogueBox.tsx`) for that NPC instead, using the entry node
  from `NPC_DIALOGUE_ENTRY` in `src/content/cases/ten-minute-window`. Both paths call the same
  `onEffects`.
- Accessibility: `role="dialog" aria-modal`, Escape closes, focus trapped, and honour
  `prefers-reduced-motion` (`src/game/world/navigation.ts` already exports a helper). Follow the
  modal patterns already used in `CityScreens.tsx`.

Style with the existing tone vocabulary in `src/game/world/panels.css` and `src/game/ui/shell.css`
(tokens live in `src/styles/tokens.css`). It should look like it belongs to the panel art, not
like a chat widget.

### A2 — Real voice: `useNpcVoice.ts`

Implement `NpcSession` against Gemini Live. **Copy the working patterns from
`src/lib/live/gemini-provider.ts`** — read it closely; it is a solved version of this problem.

- `POST /api/detective/npc-token` with `{ npc, dossier }` → `{ token, model }`. Beta owns that
  route and it may not exist yet; until it does, treat a non-200 as `status: "unavailable"` and
  fall back. That is the correct final behaviour too.
- `new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } })` then
  `ai.live.connect({ model, config: { responseModalities: [Modality.AUDIO] }, callbacks })`.
  Everything else (system instruction, voice, tools) is locked server-side into the token — do not
  re-send it from the client.
- **Reuse verbatim, do not fork:** `MicCapture`, `PcmPlayer`, `setLevelSources`, `toBase64` from
  `src/lib/live/audio.ts`, and `public/worklets/pcm-capture.js`. Mic frames go out as
  `sendRealtimeInput({ audio: { data, mimeType: "audio/pcm;rate=16000" } })`.
- Barge-in: on `content.interrupted`, call `player.flush()`.
- Transcription: `inputAudioTranscription` / `outputAudioTranscription` arrive incrementally —
  upsert by turn id into `NpcSubtitle`s rather than appending duplicates. `call-store.ts`'s `push`
  shows the upsert pattern.
- **Tool calls — the critical gotcha.** On `message.toolCall?.functionCalls`, you must send
  `session.sendToolResponse({ functionResponses: [...] })` **immediately**, echoing each call's
  `id` and `name`. Gemini 3.1 Live blocks until you do; a missing ack is why an NPC goes silent
  mid-sentence. The response body must carry the guard's verdict:
  `{ result: r.ok ? "ok" : "refused", reason: r.reason }` — that is how a refusal becomes something
  the NPC says out loud.
- The verdict comes from Beta's `executeNpcTool(call, getGameState())` in `src/game/npc/tools.ts`
  (pure; state in, `NpcToolResult` out). It currently returns `{ ok: false }` from a stub and lands
  for real in Beta's phase B3 — import it and use it now; your code does not change when it fills
  in. Emit `{ type: "tool", call, result }` and let the overlay hand `result.effects` to
  `onEffects`.
- Never call `applyEffects` from inside the hook. The overlay's `onEffects` prop is the single
  mutation point, so `CityScreens` stays in control.

Keep a factory seam (`createNpcSession` vs `createMockNpcSession`) so the overlay swaps between
mock and live with one call and the mock path survives for demos.

### A3 — Scene wiring

In `CityScreens.tsx`:

- Route `handlers.talk(npc)` through `NPC_BY_DIALOGUE_KEY` to open the overlay. Keep the existing
  `NPC_DIALOGUE_ENTRY` lookup as the fallback node id.
- Pass `onEffects` = the existing `handleEffectsAndCheck` (it already runs `applyEffects` then
  `checkAndAutoResolve`) so the case can resolve itself from a conversation.
- Timer: start the 10-minute window when Miller's briefing ends, not on page load. Pause it while
  an overlay is connecting. The timer helpers in `src/game/pressure/timer.ts` are pure and take
  `now` — keep using them.
- Evidence toast when a `tool` event lands with `ok: true` and a `giveEvidence` effect.
- Auto-open `Debrief` when `police.formal-report-lodged` is set.

In `src/game/world/registry.ts`, add the hotspots the script needs so all five scenes are reachable
without the map: office ↔ flat ↔ bank ↔ repair shop ↔ police station travel, plus the ATM alcove.
Note there are **uncommitted hotspot-geometry changes already in this file** fitted to the new
background art in `public/art/panels/` — preserve them; extend, do not overwrite.

### A4 — Integration (joint, last)

Swap the mock factory for the real one and walk the whole case with Beta. Only at this point may
you *propose* changes to files you do not own — as a request, not an edit.

## Verification

```bash
npx -y pnpm@10 typecheck
npx -y pnpm@10 lint
npx -y pnpm@10 test
npx -y pnpm@10 dev      # then open http://localhost:3000/city
```

Vitest is `environment: "node"` and matches only `src/**/*.test.ts` — **not `.tsx`** — so your
overlay is verified by hand in the browser, not by unit test. Do not change the vitest config to
get around this.

Before you call any phase done: the offline path must work with **no `GEMINI_API_KEY` set** —
`/city` → office → Desk → the overlay opens and plays, and the existing authored playthrough still
reaches Grade A.

## House rules

- `AGENTS.md` at the repo root: this Next.js version has breaking changes from what you may know.
  Read the relevant guide in `node_modules/next/dist/docs/` before writing framework-level code.
- TypeScript is `strict: true`. Match the surrounding comment density and naming — the detective
  track files have a distinct house style; read one before you write one.
- Do not commit, do not push, do not install packages. Everything you need is already a dependency.
