<!--
  SCAM CITY - 24-hour Detective Track build.
  Keep this short. A PR nobody can review in five minutes is too big.
  Delete sections that genuinely do not apply, but do not delete the checklist.
-->

## Linked issue

Closes #

## Purpose

<!-- One or two sentences. What does this PR make possible that was not possible before? -->

## Agent and owned paths

- **Agent / branch:**
- **Paths changed (all must be owned by this branch in `ops/workplan.json`):**

```
<!-- paste the output of: node ops/scripts/check-ownership.mjs -->
```

## Screenshot or clip

<!--
  REQUIRED for anything visible: a panel, the map, dialogue, the case board,
  the debrief. A still is fine; a 10-second clip is better.
  Write "not user-visible" if this PR changes no rendered output.
-->

## Tests

<!-- Paste the commands you actually ran and their results. -->

- [ ] `node ops/scripts/check-ownership.mjs` - passed
- [ ] `pnpm typecheck` - passed
- [ ] `pnpm test` - passed (all pre-existing tests still green)
- [ ] `pnpm build` - passed

```
<!-- paste the tail of the run, or the Test-AgentWorktree.ps1 summary -->
```

## Offline / no-key behaviour

<!--
  REQUIRED if this PR touches anything AI-related (src/game/ai/**, src/lib/gemini/**,
  hints, dialogue generation, the judge).
  How does it behave with GEMINI_API_KEY unset and the network off?
  Write "no AI surface" if this PR touches none of that.
-->

- [ ] Fully playable with `GEMINI_API_KEY` unset
- [ ] Fully playable with the network offline
- [ ] Case outcome is identical with AI on and AI off (AI varies phrasing only)

## Risks

<!-- What might this break? What did you not test? Be honest - it is hour N of 24. -->

## Rollback

<!-- Usually "revert this PR". Say so if it is not that simple. -->

## Confirmations

- [ ] **Rebased onto `main`** (`git fetch origin main && git rebase origin/main`)
- [ ] I changed **only** paths this branch owns - no other agent's files
- [ ] **No refactors** of existing product code; additive changes only
- [ ] I did not reformat files I was not otherwise changing
- [ ] **No secrets**: no `.env` file, API key, token or credential is in this diff
- [ ] Existing routes still work (`/`, `/play/*`, `/freestyle`, `/modes`, `/riddle`)
