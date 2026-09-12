# Agent brief — Antigravity / dialogue and case UI

**Agent id:** `antigravity-dialogue-case`
**Branch:** `feat/detective-ui`
**Workplan entry:** `ops/workplan.json` → `agents[] where id == "antigravity-dialogue-case"`

---

## 0. Read first

1. [`docs/DETECTIVE-TRACK-24H.md`](../../docs/DETECTIVE-TRACK-24H.md) — the build plan. **Required.**
2. [`docs/AGENT-OPERATIONS.md`](../../docs/AGENT-OPERATIONS.md) — how the five agents share the repo.
3. [`ops/workplan.json`](../workplan.json) — ownership. If anything here disagrees with it, **the JSON wins**.

You build the **engine**. The content agent (`feat/ten-minute-content`) supplies the
data. Build against the contract types, not against their specific case — if your
components only work for "The Ten-Minute Window", you have built the wrong thing.

---

## 1. Paths you own

```
src/game/dialogue/**
src/game/case/**
```

## 2. Paths you must not touch

```
src/game/dialogue/types.ts     shared contract - import it, never edit it
src/game/case/types.ts         shared contract - import it, never edit it
```

Everything not listed in §1. In particular: `src/game/state/**`, `src/game/world/**`,
`src/game/ui/**`, `src/content/**` (the content agent owns every case data file),
`src/features/**`, `src/app/**`, `src/components/**`.

## 3. Prerequisites

Both must be **merged to `main`** before you open a PR:

- `chore/game-contracts`
- `feat/foundation-state` (you need flags, evidence state and `evaluate()`)

Watch the `24-hour coordination board` issue, or run
`.\ops\scripts\Show-AgentStatus.ps1 -Fetch`.

---

## 4. Deliverables

### 4.1 Dialogue engine — `src/game/dialogue/engine.ts`

**A pure reducer.** `(node, state, choice) -> { nextNode, effects }`. No React, no
store access, no side effects, no I/O. Purity is what makes it testable and
deterministic, and determinism is a hard requirement of this build.

- Evaluates `Condition` to hide choices the player has not earned
- Returns `Effect[]` for the caller to apply — the engine never mutates state itself

### 4.2 Dialogue UI — `src/game/dialogue/DialogueBox.tsx`

Visual-novel presentation: speaker, lines, choices, typewriter reveal, a backlog
and a skip. Honours `prefers-reduced-motion`. Fully keyboard operable.

### 4.3 Conditions — `src/game/dialogue/conditions.ts`

Evaluates `flag`, `hasEvidence`, `all`, `any`, `not` against game state.

**At least one choice in the case must be gated on a discovered fact** — hidden until
the player holds the evidence. This is the mechanic that makes it an
investigation rather than a menu.

### 4.4 Case board — `src/game/case/CaseBoard.tsx`

The deduction surface: evidence cards, links between them, deductions unlocked by
holding the right combination. A `Deduction` fires only when every id in its `from`
array is held. **Deterministic — never AI-decided.**

### 4.5 Evidence cards — `src/game/case/EvidenceCard.tsx`

`src/features/districts/DistrictArtifact.tsx` already renders exactly these kinds
(`ledger`, `tracking`, `log`, `notice`, `chat`) as styled HTML.
**Read it and follow the pattern. Do not edit or import-and-modify the original** —
it belongs to the existing game. Add `statement` as a sixth kind.

Use design tokens only (`src/styles/tokens.css`). `--color-signal` (red) and
`--color-safe` (green) carry game state and must never be decorative.

### 4.6 Inventory — `src/game/case/Inventory.tsx`

Items and documents carried between panels.

### 4.7 Verification — `src/game/case/verify.ts`

Deterministic: does a claim match held evidence? This is the game's core question
and **must never be answered by a model**.

---

## 5. Rules that are not negotiable

- **No refactors.** Additive only. Do not touch `DistrictArtifact.tsx` or any
  existing component.
- **No hard-coded case content.** Everything comes from the `CaseDefinition` data
  the content agent supplies.
- **Do not reformat** files you were not otherwise changing.
- **All 88 pre-existing tests stay green.** Add unit tests for the engine reducer.
- **No new npm dependencies** without the release captain's agreement.
- **No secrets.** No `.env`, key, token or credential, ever.
- **Never push to `main`.**

---

## 6. Before you open a PR

```powershell
.\ops\scripts\Test-AgentWorktree.ps1 -Agent antigravity-dialogue-case
```

All must pass: pnpm 10 · `node ops/scripts/check-ownership.mjs` · `pnpm typecheck` ·
`pnpm test` · `pnpm build`.

Then:

```bash
git fetch origin main
git rebase origin/main
```

Push and open a PR with the template filled in and a linked issue.
**A screenshot or clip of the dialogue box and the case board is required.**
**Never use Corepack**; use `npx -y pnpm@10` if pnpm is not on your PATH.

---

## 7. Report format

```
BRANCH:    feat/detective-ui
SHA:       <commit sha>
FILES:     <every changed file, one per line>
COMMANDS:  <every command you ran>
RESULTS:   ownership <pass/fail> | typecheck <pass/fail> | test <n passed> | build <pass/fail>
BLOCKERS:  <anything stopping you, or "none">
INTEGRATION NOTES:
           <components and functions you export, the exact CaseDefinition shape
            you consume, effects you emit, and anything the content agent must
            provide or change>
```

Your integration notes are the content agent's specification. Be precise about the
data shape you actually read — a mismatch discovered at hour 18 costs the case.
