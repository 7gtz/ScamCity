# SCAM CITY — Detective Track: 24-hour build plan

**Read this before you write a line.** It is the single reference for the next 24 hours: what we are building, who owns what, the interfaces you can rely on, and the rules that stop three people standing on each other.

- **Deadline:** 24 hours, fixed.
- **Repo:** `github.com/7gtz/ScamCity`, branch `main`.
- **Baseline:** commit `1830343`. 88 tests passing, `tsc --noEmit` clean, no CI.
- **Companion docs:** [`FRONTEND-HANDOFF.md`](FRONTEND-HANDOFF.md) (why every existing component exists — still authoritative), [`../README.md`](../README.md), [`../design-system/scam-city/MASTER.md`](../design-system/scam-city/MASTER.md).

---

## 0. Ten rules

1. **Additive only. No refactors.** We are not splitting `CallRoom.tsx` or `scenarios.ts`. We are not generalising `districts.ts`, `CityMap.tsx` or `progress-store.ts`. Those were in the long-form plan and are cancelled for the 24-hour window.
2. **Never break the existing demo.** `/`, `/play/*`, `/inbox`, `/messages`, `/web`, `/riddle`, `/freestyle`, `/modes`, `/results/*` must keep working at every commit. They are the fallback demo.
3. **New code lives in `src/game/` and `src/content/cases/`.** Reachable at `/city`. If our track half-lands, the old game still ships.
4. **The 88 existing tests are the regression gate.** If your PR reds them, it does not merge.
5. **AI never decides outcomes.** It varies phrasing, hints and NPC flavour. Success, failure, evidence and score stay deterministic, computed in code. This is already how the codebase works — keep it that way.
6. **Every AI call has a deadline and an authored fallback.** The game must be fully completable with `GEMINI_API_KEY` unset and the network off.
7. **Shared files have one owner.** See §5. If you need a change in someone else's file, message them; do not edit it.
8. **One branch, one purpose.** Small PRs. No drive-by reformatting.
9. **Rebase on `main` before you open a PR.** Every time.
10. **At hour 15 we cut scope, not quality.** See §8.

---

## 1. What we are building

A 2D detective-led narrative investigation track that runs **alongside** the existing channel game, not replacing it. Both are gameplay tracks from the landing page and `/modes`.

### The case — "The Ten-Minute Window"

Bank impersonation leading to OTP theft and a SIM-swap lead. It deliberately reuses `bank-security` (the scam) and `card-alert` (the genuine control call) from `src/lib/gemini/briefs.ts`, so the AI director, the persona safety rails and the judge all work from hour one with no new prompt engineering.

### Two perspectives, one incident

- **Victim** — plays the scam call live in the existing call room, under pressure, and chooses whether to comply, verify, freeze, or report. Their choices set flags.
- **Detective** — investigates the aftermath. The case reads the victim's flags, so what the player did as the victim changes what the detective finds.

This is the hook, and it is cheap: both sides share one flag store.

### Five panels

| Location id | Panel | Role in the case |
|---|---|---|
| `office` | Detective office | Hub. Case board, inventory, travel |
| `victim-flat` | Victim's flat | Interview, phone evidence, the transcript |
| `bank-branch` | Bank branch | Verify the claim, freeze the account, recover |
| `repair-shop` | Phone-repair shop | The SIM-swap lead — and one plausible false lead |
| `police-station` | Police station | Preserve evidence, report lawfully, resolve |

### Systems in scope

World map · panel + hotspots · dialogue engine · case board · evidence · flags · autosave · one timed decision · recovery workflow · debrief.

### Explicitly out of scope

Red-team/scammer mode · 20–30 panels · save slots and migrations · Playwright E2E · accessibility test suite · content-validator CLI · localisation · analytics · audio · authoring tools · mobile parity · Supabase.

---

## 2. Art direction

The stylised placeholder system **is** the shipped art. There is no commissioning window in 24 hours.

Panels are built from flat shapes, the existing tone tokens (`data-tone` / `tone-*`), the halftone and grain treatment already in `src/components/gl/` and `src/app/globals.css`, and strong editorial typography. This reads as deliberate, matches `MASTER.md`, and costs hours instead of days.

- Backgrounds are DOM + CSS, not WebGL. Do not put a shader between the player and a panel.
- Characters are silhouette + type + colour, not illustration.
- If art falls behind, a typographic-only panel is acceptable and still on-brand.

---

## 3. Architecture

```
src/game/                  NEW — the detective track
  world/                   D1 — panels, hotspots, map, navigation
  state/                   D1 — flags, game store, autosave, events
  ui/                      D1 — panel shell
  dialogue/                D2 — engine (pure) + dialogue UI
  case/                    D2 — case board, evidence, inventory, verification
  pressure/                D3 — timers, stress/trust
  ai/                      D3 — adapter with deadline + authored fallback, hints
  recovery/                D3 — lawful recovery workflows
  debrief/                 D3 — case debrief on top of existing scoring

src/content/cases/ten-minute-window/   D2 — case data, one folder
src/app/city/                          D1 — routes

Untouched: src/features/*, src/lib/*, src/content/{districts,scenarios,tactics,riddles}.ts
```

### What we reuse rather than rebuild

| Existing | Reused as |
|---|---|
| `src/features/districts/geometry.ts` | Reference for the new `game/world/geometry.ts` (route maths, `pointAtLength`) — **copy the approach, do not edit the original** |
| `src/features/districts/DistrictArtifact.tsx` | Pattern for `case/EvidenceCard.tsx` (ledger / tracking / log / notice / chat renderers) |
| `src/features/scoring/compose.ts`, `mock-judge.ts` | Deterministic scoring under the case debrief |
| `src/features/encounters/grade.ts`, `src/features/profile/defense.ts` | Behaviour grading and archetypes |
| `src/lib/gemini/*` | Director, persona safety rails, judge, hedged fallback chains — unchanged |
| `src/lib/validation/schemas.ts` | Zod contracts. **Append-only** |
| `src/features/call/CallRoom.tsx` | The victim's live scam call, via one new optional prop |
| `src/features/progress/progress-store.ts` | Read for the player model (`weak`, `strong`, `learned`). Do not restructure it |

---

## 4. Interfaces

These ship in a **types-only PR in hour 1**. Nothing else merges before it. If you need a change to one after that, say so in the sync — do not fork a private copy.

### D1 — `src/game/world/types.ts`

```ts
export type LocationId = "office" | "victim-flat" | "bank-branch" | "repair-shop" | "police-station";

export interface Hotspot {
  id: string;
  /** Percentage box within the panel, so it scales with any viewport. */
  rect: { x: number; y: number; w: number; h: number };
  label: string;
  /** What activating it does. Resolved by the case layer, not the world layer. */
  action:
    | { kind: "talk"; npc: string }
    | { kind: "inspect"; evidence: string }
    | { kind: "travel"; to: LocationId };
  /** Hidden until this condition passes. */
  requires?: Condition;
}

export interface PanelDefinition {
  id: LocationId;
  title: string;
  tone: "dark" | "ember" | "paper" | "amber";
  hotspots: Hotspot[];
  /** Unlocked on the world map only when this passes. */
  requires?: Condition;
}
```

### D1 — `src/game/state/types.ts`

```ts
export type FlagId = string;

export interface GameState {
  location: LocationId;
  flags: Record<FlagId, boolean | number | string>;
  evidence: string[];              // EvidenceItem ids, in the order found
  inventory: string[];
  trust: Record<string, number>;   // npc id -> -100..100
  stress: number;                  // 0..100
  caseId: string | null;
  version: number;
}

export function setFlag(id: FlagId, value: boolean | number | string): void;
export function hasFlag(id: FlagId): boolean;
export function evaluate(c: Condition): boolean;
export function save(): void;                // autosave, debounced
export function load(): GameState | null;    // Zod-validated; null on any failure
```

**`load()` never throws.** A corrupt or old save returns `null` and the player starts fresh. No migration code.

### D1 — `src/game/state/events.ts`

Systems talk through this. **Do not import another developer's store directly.**

```ts
type GameEvent =
  | { type: "flag-set"; id: FlagId }
  | { type: "evidence-found"; id: string }
  | { type: "panel-entered"; id: LocationId }
  | { type: "case-resolved"; outcome: CaseOutcome };

export function emit(e: GameEvent): void;
export function on<T extends GameEvent["type"]>(
  type: T,
  fn: (e: Extract<GameEvent, { type: T }>) => void,
): () => void;
```

### D2 — `src/game/dialogue/types.ts`

```ts
export type Condition =
  | { flag: FlagId; is?: boolean | number | string }
  | { hasEvidence: string }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export type Effect =
  | { setFlag: FlagId; to: boolean | number | string }
  | { giveEvidence: string }
  | { trust: string; by: number }
  | { stress: number };

export interface Choice {
  id: string;
  text: string;
  /** Hidden unless the player has discovered the relevant fact. */
  requires?: Condition;
  effects?: Effect[];
  next: string | "END";
}

export interface DialogueNode {
  id: string;
  speaker: string;
  lines: string[];
  choices: Choice[];
}
```

### D2 — `src/game/case/types.ts`

```ts
export interface EvidenceItem {
  id: string;
  title: string;
  /** Reuses the DistrictArtifact renderers. */
  kind: "ledger" | "tracking" | "log" | "notice" | "chat" | "statement";
  lines: { text: string; value?: string; flag?: boolean }[];
  /** A lead that goes nowhere. Must be plausible, and must be dismissible. */
  falseLead?: boolean;
}

export interface Deduction {
  id: string;
  /** Evidence ids that, held together, unlock this conclusion. */
  from: string[];
  conclusion: string;
  unlocksFlag: FlagId;
}

export interface CaseDefinition {
  id: string;
  title: string;
  locations: LocationId[];
  evidence: EvidenceItem[];
  deductions: Deduction[];
  dialogue: Record<string, DialogueNode>;
  /** Deterministic. Never AI-decided. */
  outcomes: Record<CaseOutcome, { requires: Condition; debrief: string }>;
}
```

### D3 — `src/game/ai/adapter.ts`

Every AI call in the detective track goes through this. No exceptions.

```ts
export interface AiAdapter<TIn, TOut> {
  /** Authored content used on timeout, outage, moderation failure, or missing key. */
  fallback: (input: TIn) => TOut;
  deadlineMs: number;
  run: (input: TIn) => Promise<TOut>;
}

/** Never throws, never exceeds deadlineMs, always returns something renderable. */
export function withFallback<TIn, TOut>(a: AiAdapter<TIn, TOut>, input: TIn): Promise<TOut>;
```

---

## 5. Ownership

> **Unconfirmed:** the lead supplied two handles for three seats. Confirm before hour 0.
> Assumed: **D1 = `@7gtz`** (author of all 16 commits to date), **D2 = `@harshitbahl90`**, **D3 = `@Abuzaid-01`**.

| | D1 — Foundation & world | D2 — Narrative & cases | D3 — Simulation, AI & quality |
|---|---|---|---|
| **Owns** | `src/game/world/`, `src/game/state/`, `src/game/ui/`, `src/app/city/`, `src/components/chrome/`, `src/app/globals.css`, `src/styles/`, `public/art/`, `package.json`, `.github/` | `src/game/dialogue/`, `src/game/case/`, `src/content/cases/`, `src/content/npcs/` | `src/game/pressure/`, `src/game/ai/`, `src/game/recovery/`, `src/game/debrief/`, `src/lib/gemini/`, `src/lib/live/`, `src/features/call/`, `src/features/scoring/`, `src/tests/` |
| **Provides** | `PanelDefinition`, `Hotspot`, `GameState`, `setFlag`/`hasFlag`/`evaluate`, `save`/`load`, `emit`/`on` | `DialogueNode`, `Choice`, `Condition`, `Effect`, `CaseDefinition`, `EvidenceItem`, dialogue engine, `verifyClaim()` | `AiAdapter`/`withFallback`, timer, trust/stress, recovery steps, `gradeCase()` |
| **Waits on** | Nobody — ships first | D1 flags + panel host | D1 state/events, D2 case types |
| **Merge order** | 1st | 2nd | 3rd (integrates) |

### Single-owner files — do not edit if it isn't yours

| File | Owner |
|---|---|
| `src/components/chrome/Chrome.tsx` | D1 |
| `src/app/globals.css` | D1 |
| `src/styles/tokens.css` | D1 |
| `package.json` | D1 |
| `src/lib/validation/schemas.ts` | D3 — **append-only**, one commented section per owner |
| `src/lib/live/types.ts` | D3 — **additive changes only** |

---

## 6. Hour-by-hour

| Hours | D1 | D2 | D3 |
|---|---|---|---|
| **0–1** | CI, CODEOWNERS, PR/issue templates, CONTRIBUTING. **Types-only PR merged by H1** | Review types; case outline + dialogue drafted on paper | Review types; `AiAdapter` skeleton |
| **1–5** | `game-store` (flags, location, trust, stress), autosave, `Panel.tsx`, `Hotspot.tsx` | `dialogue/engine.ts` (pure reducer) + `DialogueBox.tsx` | `pressure/timer.ts`, `recovery/workflows.ts`, `onComplete` prop on `CallRoom` |
| **5–9** | `WorldMap.tsx`, `game/world/geometry.ts`, `/city` + `/city/[locationId]` | `CaseBoard.tsx`, `EvidenceCard.tsx`, `verify.ts` | `ai/hints.ts` with authored fallbacks; `debrief/Debrief.tsx` |
| **9–12** | Panel art system; 5 panel backgrounds | Case data: 5 locations, 3 evidence items, 2 false leads, NPC dialogue | Live call wired into the victim perspective; flag emission on outcome |
| **12–15** | **Integration checkpoint** — playable map → panel → dialogue → evidence → board | Second half of the case; failure branches | Recovery path after a mistake; timed decision tuned |
| **15–18** | Transitions, keyboard input, polish | Fact-gated dialogue; false leads made plausible | AI-off playthrough verified; key and network killed by hand |
| **18–21** | **Feature freeze.** Bug bash, all three | | |
| **21–23** | README + demo script; `release/demo` cut; Vercel deploy verified | | |
| **23–24** | Buffer. Nothing merges. | | |

---

## 7. GitHub workflow

Deliberately lighter than a normal project — rebase thrash costs more than it saves in a 24-hour window.

**On `main`:** PR required · force-push blocked · deletion blocked · CI must pass · **1 approval on `src/game/` and `src/lib/` only**. No "branches up to date before merge". `chore/` and `docs/` PRs need no approval.

**Branches:** `feat/world-map`, `feat/case-ten-minute-window`, `feat/scam-director`, `fix/save-state`, `chore/ci`. One purpose each.

**Commits:** conventional, with a scope — `feat(world): lazy-load panel backgrounds`, `fix(state): autosave debounce`. Types: `feat` `fix` `refactor` `test` `docs` `chore` `perf`.

**PR description:** purpose (+ `Closes #N`) · affected systems and files · screenshot or clip for anything visible · test steps · risks · rollback.

**CI:** install (pnpm pinned to **10** — never `corepack`, it resolves pnpm 12 and corrupts `node_modules` on Windows) → typecheck → test → build. CI holds **no** `GEMINI_API_KEY`; everything runs on mocks and authored fallbacks.

### Conflict avoidance

- Interfaces land before implementations (hour 1).
- One folder per case, one file per NPC. Registries are barrels of one-line entries.
- Systems communicate via `game/state/events.ts`, never by importing another store.
- No reformatting files you did not otherwise change.

---

## 8. The hour-15 gate

If the loop **map → panel → dialogue → evidence → case board** is not playable end to end at hour 15:

**Cut the victim perspective. Ship the detective case alone.**

Decide this at hour 15, not at hour 20. The victim track is the most valuable thing to lose because it is the most self-contained — the detective case reads flags that simply default to "the victim complied".

Further cuts, in the order we take them:

1. Victim perspective → detective only.
2. Five panels → three (`office`, `victim-flat`, `bank-branch`).
3. Panel backgrounds → typographic only.
4. Timed decision → untimed.

---

## 9. Acceptance criteria

- [ ] Case completable in 10–15 minutes, keyboard and mouse.
- [ ] Fully playable with `GEMINI_API_KEY` unset **and** the network offline.
- [ ] AI varies hint and dialogue phrasing only; case outcome identical with AI on or off.
- [ ] At least 3 evidence items, 2 plausible false leads, 1 dialogue branch gated on a discovered fact.
- [ ] A failure path exists and routes into recovery — never a dead end.
- [ ] Reload restores location, flags, evidence and case board.
- [ ] All 88 existing tests green; every existing route still works; CI green.
- [ ] `tsc --noEmit` clean.

---

## 10. Risks

| Risk | Trigger | Response |
|---|---|---|
| Integration slips | Loop not playable at H15 | Cut the victim perspective (§8) |
| Panel art eats D1's hours | H12 not met | Three panels; typographic backgrounds |
| Live call embed fights the case flow | H12–15 | Launch `/play/*` in place and return via flag, instead of embedding |
| Toolchain breaks CI | First CI run | pnpm pinned to 10; keep both TypeScript aliases in `package.json` |
| Two devs on one seat | Handles unconfirmed | Confirm before H0 |
| Someone refactors a shared file at hour 19 | — | Rule 1 and §5. Revert first, discuss after |

---

## 11. Content and safety

The existing safety rails in `src/lib/gemini/persona.ts` are not optional and are not to be loosened:

- Every persona prompt states this is a consensual training game and all details are fictional.
- The caller never repeats numbers back and drops character immediately on distress or "stop".
- Organisations, numbers, brands and payment details are always fictional. Never a real brand.

For the detective track specifically:

- Teach **lawful** responses only: verify through independently trusted channels, use official numbers and apps, preserve evidence, secure accounts, report through proper routes, ask for help early.
- Do not reward vigilantism or paranoia. Turning away something genuine is a mistake in this game — that is already how `freestyle-store.ts` scores it, and the case debrief must agree.
- No operational fraud detail, ever: no working scripts, no security bypasses, no evasion, no money movement.
