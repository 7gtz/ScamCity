# Agent brief — Antigravity / case content

**Agent id:** `antigravity-case-content`
**Branch:** `feat/ten-minute-content`
**Workplan entry:** `ops/workplan.json` → `agents[] where id == "antigravity-case-content"`

---

## 0. Read first

1. [`docs/DETECTIVE-TRACK-24H.md`](../../docs/DETECTIVE-TRACK-24H.md) — the build plan. **Required**, especially §1 The case and §11 Content and safety.
2. [`docs/AGENT-OPERATIONS.md`](../../docs/AGENT-OPERATIONS.md) — how the five agents share the repo.
3. [`ops/workplan.json`](../workplan.json) — ownership. If anything here disagrees with it, **the JSON wins**.
4. `src/content/scenarios.ts` and `src/lib/gemini/briefs.ts` — the house voice and the
   existing fictional organisations. **Read for reference; never edit.**

You write **data, not code**. No components, no engine logic, no React.

---

## 1. Paths you own

```
src/content/cases/ten-minute-window/**
src/content/npcs/ten-minute-window/**
```

That is all. This is the tightest ownership of the five, on purpose: it means you
can work without blocking anyone and nobody can block you.

## 2. Paths you must not touch

Everything else. In particular: `src/content/scenarios.ts`, `src/content/districts.ts`,
`src/content/tactics.ts`, `src/content/riddles.ts`, `src/content/fallback-*.ts`,
`src/game/**`, `src/features/**`, `src/lib/**`, `src/app/**`.

If you need an engine change, ask on the `24-hour coordination board` issue. Do not
edit `src/game/case/**` or `src/game/dialogue/**` — that is the dialogue agent's.

## 3. Prerequisites

`chore/game-contracts` merged to `main` (you author against `CaseDefinition`,
`DialogueNode`, `EvidenceItem`, `Condition`, `Effect`).

You do **not** wait on the dialogue agent. Author against the contract types and
watch their integration notes on the coordination issue.

---

## 4. The case — "The Ten-Minute Window"

Bank impersonation leading to OTP theft, with a SIM-swap lead.

It deliberately reuses `bank-security` (the scam) and `card-alert` (the genuine
control call) from `src/lib/gemini/briefs.ts`, so the existing director, persona
rails and judge work unchanged. Stay consistent with those: same fictional
organisation (**Northstar Bank**), same tone.

**Five locations:** `office`, `victim-flat`, `bank-branch`, `repair-shop`,
`police-station`.

### Required content

| Item | Minimum | Notes |
|---|---|---|
| Evidence items | **3** | `bank-statement`, `call-log`, `otp-message`, `sim-swap-record` are the intended set |
| False leads | **2** | Must be genuinely plausible **and** dismissible. `repair-receipt` is one |
| Fact-gated choice | **1** | A dialogue choice hidden until the player holds specific evidence |
| Deductions | **2+** | Each unlocked by holding a specific combination of evidence |
| Endings | success **and** failure | Failure routes to recovery — **never a dead end** |
| NPCs | 5 | `detective`, `mara-okoye`, `teller-vance`, `ravi-sunder`, `sgt-brennan` |

Ids must match `docs/ART-REQUIREMENTS.md` §3 and §4 exactly. The asset loader
resolves by convention, so a mismatched id is a silent missing image later.

### Two perspectives

The **victim** plays the live scam call and sets flags; the **detective** investigates
the aftermath and reads those flags. Write the detective's content so it still
works when the victim track is cut (see §7) — flags default to "the victim complied".

---

## 5. Content and safety — overrides everything else

From `docs/DETECTIVE-TRACK-24H.md` §11, non-negotiable:

- **Everything is fictional.** Fictional organisations (Northstar Bank, SwiftParcel,
  Nimbus OS, Lumen Rewards, Harrow & Finch, Kindred), fictional people, fictional
  numbers. **No real brand, ever.**
- **No real phone numbers, sort codes, card numbers, IBANs or addresses.** Numbers
  must be structurally implausible as real instruments.
- **Teach lawful responses only:** verify through independently trusted channels,
  use official numbers and apps, preserve evidence, secure accounts, report
  through proper routes, ask for help early.
- **Do not reward vigilantism or paranoia.** Turning away something genuine is a
  mistake in this game.
- **No operational fraud detail, ever:** no working scripts, no security bypasses,
  no evasion, no money-movement instructions. Evidence shows **that** something
  happened, never **how to do it**.
- **Victims are written with dignity.** Mara Okoye is competent, capable and
  embarrassed — never foolish. That is the entire point of the game.

---

## 6. Rules that are not negotiable

- **Data only.** No components, no engine logic, no hooks.
- **No refactors.** Do not touch any existing content file.
- **Do not reformat** files you were not otherwise changing.
- **All 88 pre-existing tests stay green.**
- **No new npm dependencies.**
- **No secrets.** No `.env`, key, token or credential, ever.
- **Never push to `main`.**

---

## 7. Hour-15 cut

Your `hour15CutPriority` is **2** — cut early. If the build is behind at hour 15, the
**victim perspective content is cut first**. Structure your files so that is a clean
deletion: keep victim-only content in its own module, not woven through the
detective's dialogue.

---

## 8. Before you open a PR

```powershell
.\ops\scripts\Test-AgentWorktree.ps1 -Agent antigravity-case-content
```

All must pass: pnpm 10 · `node ops/scripts/check-ownership.mjs` · `pnpm typecheck` ·
`pnpm test` · `pnpm build`.

**Additionally, verify by hand and state it in the PR:**

- Every dialogue node is reachable
- Every ending is attainable
- No node is a dead end
- No real brand, number or identity appears anywhere

`src/tests/scenarios.test.ts` already does exactly this kind of graph check for the
existing call scripts — read it as a model for what "reachable, winnable, losable,
no dead loops" means here.

Then:

```bash
git fetch origin main
git rebase origin/main
```

**Never use Corepack**; use `npx -y pnpm@10` if pnpm is not on your PATH.

---

## 9. Report format

```
BRANCH:    feat/ten-minute-content
SHA:       <commit sha>
FILES:     <every changed file, one per line>
COMMANDS:  <every command you ran>
RESULTS:   ownership <pass/fail> | typecheck <pass/fail> | test <n passed> | build <pass/fail>
           graph check: nodes reachable <y/n> | endings attainable <y/n> | dead ends <n>
BLOCKERS:  <anything stopping you, or "none">
INTEGRATION NOTES:
           <evidence ids, flag ids, NPC ids and location ids you define, and any
            contract field you needed that does not exist>
```

List **every flag and evidence id you define**. The foundation and dialogue agents
cannot wire the case together without that list.
