# SCAM CITY — Exact Implementation Stack
 
## Recommendation in one line

Build SCAM CITY as a **Next.js TypeScript app on Vercel**, with **Tailwind + Motion + GSAP/Lenis** for the premium experience, **Gemini Live connected directly from the browser via short-lived tokens**, and a small Next.js server layer for authentication, scoring, persistence, and token issuance.

Do not put a WebRTC/SFU service in the first version. Gemini Live’s native browser path is bidirectional WebSocket audio; using a direct connection avoids a needless relay and lowers latency.

## Frontend

- **Framework:** Next.js, App Router
- **Language:** TypeScript with `strict: true`
- **Runtime:** React current stable compatible with the selected Next.js release
- **Build/tooling:** Next.js built-in bundler and ESLint; use `pnpm`
- **Rendering strategy:**
  - Server Components for marketing/content pages
  - Client Components only for the live call room and highly interactive scenes
  - Route handlers for tokens, scores, and session persistence
- **Styling:** Tailwind CSS 4, CSS variables for design tokens, and a small global CSS layer for grain, selection, typography, and animation utilities
- **Component primitives:** Radix UI primitives plus `class-variance-authority`, `clsx`, and `tailwind-merge`
- **Icons:** `lucide-react`
- **Fonts:** self-hosted variable fonts with `next/font`; use one editorial display face plus one precise grotesk/monospace face

Recommended packages:

```text
next react react-dom typescript
tailwindcss @tailwindcss/postcss
motion gsap @gsap/react lenis
@radix-ui/react-dialog @radix-ui/react-slot
class-variance-authority clsx tailwind-merge
lucide-react
zustand @tanstack/react-query
zod react-hook-form @hookform/resolvers
```

## Motion and visual system

Use three complementary tools, each with a narrow role:

| Tool | Use it for | Do not use it for |
|---|---|---|
| `motion` | component entrances, exits, shared-layout transitions, gestures, UI state | complex scrubbed editorial timelines |
| GSAP + ScrollTrigger | hero reveals, pinned scenes, precise scroll choreography | ordinary buttons and menus |
| Lenis | smooth scrolling and ScrollTrigger synchronization | the live-call interface |

Keep the call room responsive and calm: no smooth-scroll container, no ongoing decorative animation competing with speech. Honor `prefers-reduced-motion`, reduce scroll effects on mobile, and animate only compositor-friendly properties (`transform`, `opacity`, `clip-path` where tested).

## Realtime voice architecture

### Recommended first-release architecture

```text
Browser microphone
  → MediaStream / AudioWorklet
  → PCM audio frames
  → Gemini Live WebSocket, authenticated by ephemeral token
  → PCM audio chunks
  → Web Audio API scheduled playback
  → transcripts / interruption events
  → React call-room UI

Next.js server
  → authenticates player
  → creates constrained ephemeral Gemini token
  → saves session metadata and transcript
  → sends final transcript to scoring model
```

Gemini Live supports native real-time audio over WebSockets through `@google/genai`; it does not require WebRTC for a browser-to-Gemini experience. Google’s current recommended browser security model is a constrained, short-lived ephemeral token minted by the backend, so the long-lived Gemini key never reaches the browser. [Gemini Live SDK guide](https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk) [Ephemeral-token guide](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens)

### Voice packages and browser APIs

```text
@google/genai
```

Use browser APIs rather than an audio abstraction library:

- `navigator.mediaDevices.getUserMedia()` for microphone permission
- `AudioContext` and `AudioWorklet` to capture and convert input to the PCM format Gemini expects
- `AudioBufferSourceNode` scheduling for click-free streamed model playback
- `AbortController` plus an output-generation counter to immediately stop queued model audio when the player interrupts
- `MediaRecorder` only if a later consented recording/replay feature is added

Avoid `howler`, browser speech-recognition APIs, and HTML `<audio>` for the live call. They are useful elsewhere, but not for low-latency duplex PCM.

### Provider abstraction

Keep Google-specific code out of UI components.

```ts
export interface LiveCallProvider {
  connect(config: LiveCallConfig): Promise<void>;
  startMicrophone(stream: MediaStream): Promise<void>;
  sendText(message: string): void;
  endCall(): Promise<CompletedCall>;
  disconnect(): void;
  on(event: LiveCallEvent, listener: EventListener): () => void;
}
```

Implement two providers:

```text
MockLiveCallProvider
  Deterministic scenario script, simulated timing, transcript events, canned PCM clips.
  Used for visual development, demos without credentials, tests, and reliable judging.

GeminiLiveCallProvider
  Gets an ephemeral token from /api/live/token.
  Opens Gemini Live session with @google/genai.
  Streams PCM input/output and maps provider events to LiveCallEvent.
```

The call-room screen depends only on `LiveCallProvider`. Select the mock provider with `NEXT_PUBLIC_LIVE_PROVIDER=mock`; select Gemini with `gemini`. This makes the flagship demo reliable even if connectivity or quotas fail.

### Google Gemini configuration

- Use the current stable Gemini Live model documented for native audio at implementation time; this family changes quickly, so keep it in one server-controlled configuration file.
- Create a one-use ephemeral token with:
  - short new-session lifetime
  - approximately 30-minute session lifetime
  - model constrained server-side
  - audio response modality constrained server-side
  - fixed persona/scenario configuration where appropriate
- Enable input and output transcription for the score report.
- Put scenario rules, safety rails, conversation goals, and allowed evidence into the Live session instructions.
- Never expose `GEMINI_API_KEY` to the browser.

Gemini’s ephemeral-token feature is currently a preview API and operates on the Live API’s `v1beta` surface; isolate it in `lib/live/gemini.ts` so an API revision is a contained change. [Google’s Live API overview](https://ai.google.dev/gemini-api/docs/live-api)

## Backend, data, and scoring

- **Backend/runtime:** Next.js route handlers and server actions running on Vercel Node.js runtime
- **Authentication and database:** Supabase Auth + Postgres
- **Database access:** `@supabase/ssr` and `@supabase/supabase-js`
- **Validation:** Zod at every server boundary
- **Score generation:** a regular server-side Gemini request after the call, requiring structured JSON validated by Zod
- **Rate limiting:** Upstash Redis plus `@upstash/ratelimit`, especially for token issuance and score generation
- **Optional anonymous-demo path:** create a temporary anonymous Supabase user; upgrade to authenticated account only when the player wants history or a leaderboard

Recommended packages:

```text
@supabase/supabase-js @supabase/ssr
@google/genai
zod
@upstash/redis @upstash/ratelimit
```

Core tables:

```text
profiles
scenarios
game_sessions
transcript_turns
scorecards
player_progress
```

Store transcript text, event timings, scenario identifier, scorecard, and player decision. Do not persist raw audio by default. If recordings are ever added, require explicit consent, specify retention, and store them separately.

## State management

Use state based on its lifetime:

- **React local state:** input controls, modal state, tiny page-specific interaction state
- **Zustand:** live-call state machine, active scenario, audio status, transcript buffer, interruption state, and mock/realtime provider selection
- **TanStack Query:** player profile, scenario catalog, previous scorecards, leaderboard, and other server state
- **URL state:** shareable result/report identifiers only

The call state machine should be explicit:

```text
idle → permission-requested → connecting → ringing → live
live → player-interrupting | provider-speaking
live → ending → scoring → results
any state → error → fallback/mock-retry
```

## Forms, types, and contracts

- `zod` for all API request/response schemas and scorecard output
- `react-hook-form` for onboarding, scenario selection, and feedback forms
- Infer types from Zod schemas; do not duplicate API interfaces manually
- Use a discriminated union for all `LiveCallEvent` types
- Keep scenario content as typed JSON/TypeScript modules in the hackathon version; migrate to CMS/database authoring only after the core experience works

## Testing

```text
vitest @testing-library/react @testing-library/user-event jsdom
playwright
msw
```

- **Vitest:** score parsing, scenario rules, provider event mapping, call-state transitions, token-route validation
- **MSW:** Gemini token and scoring API mocks
- **Playwright:** microphone-permission mock, mock-call happy path, interruption, hang-up, retry, reduced-motion, and mobile layouts
- **Manual device matrix:** Chrome desktop, Chrome Android, Safari iOS/macOS. Live microphone behavior must be tested on real devices.

Use the mock provider as the default test and visual-development backend. One small integration suite can target Gemini in a protected environment when credentials are available.

## Deployment and observability

- **Hosting:** Vercel
- **Database/auth:** Supabase
- **Redis/rate limits:** Upstash
- **Error and performance monitoring:** Sentry (`@sentry/nextjs`)
- **Product analytics:** PostHog (`posthog-js`)
- **Basic traffic analytics:** Vercel Analytics and Speed Insights

Track product events, not conversation content:

```text
landing_viewed
scenario_selected
mic_permission_granted
call_connected
player_interrupted
call_ended
score_generated
result_shared
live_provider_failed
mock_fallback_used
```

Attach session IDs and provider timing/error codes to Sentry, but redact transcript text, personal details, credentials, and audio payloads.

## Project structure

```text
src/
  app/
    (marketing)/
      page.tsx
      how-it-works/page.tsx
    play/
      page.tsx
      [scenarioId]/page.tsx
    results/
      [sessionId]/page.tsx
    api/
      live/token/route.ts
      sessions/route.ts
      sessions/[id]/complete/route.ts
      score/route.ts
  components/
    marketing/
    call-room/
    results/
    ui/
  features/
    call/
      call-store.ts
      CallRoom.tsx
      use-live-call.ts
      call-machine.ts
    scenarios/
    scoring/
  lib/
    live/
      types.ts
      provider.ts
      mock-provider.ts
      gemini-provider.ts
      audio-capture.worklet.ts
      audio-playback.ts
    gemini/
      client.ts
      score-session.ts
    supabase/
      client.ts
      server.ts
    validation/
      schemas.ts
  content/
    scenarios/
  styles/
    globals.css
    tokens.css
  tests/
```

## Environment variables

```text
GEMINI_API_KEY=
NEXT_PUBLIC_LIVE_PROVIDER=mock
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

Only server code may read `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and Upstash credentials.

## What not to add for the hackathon

- No separate Express/Nest backend
- No WebRTC SFU, LiveKit, Twilio, or Daily unless the scope expands to phone numbers, group calls, call recording, or human/operator routing
- No microservices
- No CMS
- No ORM in addition to Supabase for the first release
- No global Redux store
- No generic audio/chat SDK in the realtime path
- No raw audio retention by default

This stack keeps the visual site premium, the live-call path low latency, and the failure mode graceful: a fully polished mock simulation remains available when the realtime provider cannot be used.