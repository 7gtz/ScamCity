# SCAM CITY — Full Concept

## Premise
SCAM CITY is a voice-driven training game where the player has to out-think a live AI that is actively trying to scam them. The AI plays a real-time scammer persona — bank fraud, fake delivery, tech support, impersonation — and the player has to interrogate, verify, and decide whether to trust or hang up. It's built on the belief that people learn to resist manipulation far better by experiencing it under pressure than by reading a list of "scam red flags."

## Core Loop
1. Player enters SCAM CITY (web app).
2. AI initiates a live voice call using Google AI Studio's voice model — a real-time, spoken conversation, not text-to-speech bolted onto a chatbot.
3. Player talks back in real time (mic in browser via WebRTC), asks questions, pushes back, tries to verify identity/legitimacy.
4. The AI persona adapts mid-call: escalates pressure tactics if the player seems convinced, pivots tactics if the player catches on, and can pull from a set of realistic scam patterns (urgency, fake authority, threat of consequence, too-good-to-be-true offers).
5. Call ends by player hanging up, getting "scammed" (revealing fake sensitive info), or successfully exposing the scam.
6. The same AI (or a second AI judge role) reviews the transcript and scores the player — did they ask verifying questions, did they get manipulated, how fast did suspicion kick in, did they extract useful "evidence" from the scammer.
7. Score determines whether the player advances to the next level — later levels use more subtle personas, combined tactics, and less obvious tells.

## Two Modes

**Live Call Mode** — the flagship real-time experience described above. This is what should headline the live demo for judges: someone actually gets "called" and has to handle it live, in the room.

**Riddle Mode (static, in-app)** — lower-friction, no live voice needed. The AI generates a written scenario inspired by real documented scam patterns ("You get a text saying..." / "A caller claims to be from..."). The player answers two questions: (1) is this a scam, and (2) if so, what category is it (phishing, impersonation, fake prize, romance scam, tech support scam, etc.). The AI explains the reasoning either way. This mode works as:
- an instant-playable entry point at your demo booth (no setup delay),
- a teaching layer that builds pattern recognition before the player faces a live call,
- a safety net in case live voice has any hiccup during judging — you still have a fully playable, demoable product.

## Gamification Layer
- **Level structure**: each live call is a level; difficulty (subtlety of tactics, persona realism) increases as you clear levels.
- **Live HUD during calls**: suspicion meter, red-flag tracker that lights up only for tactics the player has already learned to spot (so it teaches, doesn't spoil).
- **AI-as-judge scoring**: transcript-based scoring after each call, not just a binary win/lose.
- **False positives mixed in**: some calls are genuinely legitimate, scored the same style — teaches "verify appropriately," not "distrust everyone," which is a more honest and more impressive framing for judges.
- **Progression**: riddle-mode performance can feed into what live-call difficulty/persona the player is ready for next — ties the two modes into one AI-driven difficulty curve.

## Why AI is structurally load-bearing (your judging-criteria answer)
Remove the AI and: there's no live adversarial persona, no adaptive tactic selection, no transcript-based judging, no personalized difficulty curve, no riddle generation. Every core system depends on it, not just the flavor text.

## Real-world integration
Voice, in real time, through the browser (WebRTC mic/speaker) — the player is genuinely having a spoken conversation with an adversarial AI, not clicking through dialogue options. This is the real-world input requirement satisfied directly and non-decoratively.

## Impact framing
Directly addresses phishing/scam vulnerability — a widespread, costly, real problem — through experiential learning rather than a lecture or checklist. Strong "this could have a life beyond the hackathon" pitch (schools, community centers, elder-care programs).

---

# Phased Work Breakdown

## Phase 1 — Core voice pipeline (foundation, blocks everything else)
- Set up Google AI Studio voice integration for real-time conversational audio (persona in, spoken response out).
- Build the WebRTC layer: browser mic capture → stream to backend → audio back to browser.
- Get one single hardcoded scammer persona working end-to-end: player can talk, AI responds in character, call can be ended.
- **Goal of this phase:** one working live call, no scoring, no levels, no HUD — just prove the loop functions and latency is acceptable.

## Phase 2 — Scammer agent logic (parallelizable with Phase 1's tail end)
- Define persona state structure: role, objective, tactics used/remaining, escalation level.
- Prompt engineering for the persona to stay in character, escalate/pivot based on player suspicion, and never request real sensitive data (fake in-fiction data only).
- Build 3–4 distinct persona types (bank fraud, delivery scam, tech support, one benign/legit control call for the false-positive mechanic).

## Phase 3 — Scoring and judge layer
- Post-call transcript analysis: AI-as-judge scores verifying questions asked, suspicion timing, whether player revealed anything, whether they correctly identified a legit call as legit.
- Define the scoring formula and pass/fail threshold per level.
- Build the level progression logic (which persona/difficulty unlocks next based on score history).

## Phase 4 — Riddle Mode (independent build track, no voice dependency)
- Prompt for generating written scam-inspired scenarios from real documented patterns.
- Simple UI: scenario text → player picks "scam or not" + category if scam → AI explains verdict.
- This can be built fully in parallel with Phases 1–3 by a separate team member, since it shares only the underlying LLM, not the voice pipeline.

## Phase 5 — HUD and live-call UI
- Suspicion meter, red-flag tracker (gated by tactics already learned), call timer.
- Wire HUD state updates to the persona's turn-by-turn output (the agent needs to emit structured state alongside dialogue, not just text).

## Phase 6 — Frontend integration and level/progression UI
- City map or level-select screen tying riddle mode and call mode together.
- Progress tracking across sessions (tactics caught, calls survived).

## Phase 7 — Polish and demo hardening
- Pre-test 2–3 known-good persona scenarios for the live judge demo specifically (don't rely on fully unconstrained generation live).
- Add natural filler/latency-masking behavior so dead air never breaks immersion.
- Prepare the pitch: gameplay walkthrough, AI-is-load-bearing explanation, impact narrative, future scalability.

