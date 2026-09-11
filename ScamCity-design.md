Absolutely. For a greenfield build, I’d make the prompt much more prescriptive than a normal “build me a website” prompt. The model should understand the **product, visual thesis, interaction model, technical constraints, content architecture, and what not to do** before it writes a single component.

Here is the prompt I would actually want to receive:

# SCAM CITY — Premium Interactive Web Experience

## ROLE

You are a senior creative frontend engineer and interaction designer building a greenfield website for **SCAM CITY**, an AI-powered voice training game about resisting scams and social engineering.

You are responsible for turning the concept below into a **production-quality, highly polished interactive website**, not a generic landing page.

There is currently **nothing implemented**. Assume a completely empty repository / greenfield project. Establish the project architecture, dependencies, components, styling system, animation system, mock data, and frontend experience from scratch.

The result should feel like it was designed and built by a high-end digital studio.

Do **not** make it look like a hackathon project.

Do **not** make it look like a SaaS dashboard.

Do **not** make it look like a generic AI website.

Do **not** use visual clichés such as glowing blue/purple gradients, floating AI blobs, excessive glassmorphism, neon cyberpunk graphics, generic chatbot interfaces, or gratuitous particle effects.

The design should communicate:

**luxury + intelligence + tension + restraint + psychological pressure.**

---

# 1. PRODUCT CONCEPT

SCAM CITY is a voice-driven training game where the player has to out-think a live AI scammer.

The AI plays realistic scam personas:

- bank fraud
- fake delivery
- technical support
- impersonation
- prize/reward scams
- other social-engineering scenarios

The player has a real-time spoken conversation with the AI through the browser.

The player must:

- interrogate the caller
- ask verification questions
- recognize manipulation
- resist urgency
- identify authority claims
- distinguish legitimate calls from scams
- decide when to hang up

The AI adapts during the conversation.

If the player becomes suspicious, the scammer can:

- change tactics
- increase urgency
- establish additional credibility
- pivot the story
- apply social pressure
- attempt to recover from being challenged

After the call, an AI judge analyzes the transcript and evaluates:

- what questions the player asked
- when suspicion emerged
- which manipulation tactics they detected
- whether they revealed information
- whether they correctly verified claims
- whether they incorrectly rejected a legitimate caller
- how effectively they extracted evidence

Difficulty increases through progression.

There are two primary modes:

### LIVE CALL MODE

The flagship experience.

The player has a real-time voice conversation with an AI scammer.

### RIDDLE MODE

A lower-friction written training mode.

The AI presents realistic scam-inspired scenarios and asks:

1. Is this a scam?
2. If yes, what type?

The AI then explains the reasoning.

Riddle Mode teaches pattern recognition before the player enters more difficult live calls.

---

# 2. THE CORE DESIGN THESIS

The entire website should communicate one idea:

> **The scammer isn't attacking your computer. They're attacking your decision-making.**

The website itself should therefore feel psychologically deliberate.

Do not reveal everything immediately.

Use:

- controlled information disclosure
- tension
- pauses
- large statements
- evidence-like details
- increasingly interactive sections
- transitions that feel intentional
- cinematic portraits
- restrained interface elements

The website should feel like entering a training facility / simulation system.

SCAM CITY is the fictional world.

The website is the entrance into that world.

---

# 3. VISUAL DIRECTION

## Overall aesthetic

Use a dark, editorial, cinematic visual language.

Think:

- premium investigative publication
- luxury technology brand
- experimental game studio
- intelligence briefing
- cinematic documentary
- high-end digital agency

Avoid literal cyberpunk aesthetics.

### Background

Predominantly:

- near-black
- charcoal
- extremely dark warm gray

Do not make every section a different colored gradient.

### Typography

Use a sophisticated display typeface for major statements and a highly legible sans-serif / grotesk for supporting information.

Optional monospace font for:

- metadata
- timestamps
- system labels
- call state
- level information
- technical annotations

Typography should carry much of the visual identity.

Major headlines should be enormous.

Use generous whitespace.

### Color

Keep the palette extremely restrained.

Primary:

- near-black
- warm white
- muted gray

Accent:

Use a single restrained warning/signal color.

It should appear primarily for:

- suspicious behavior
- alerts
- active states
- important game information

Do not make the entire website red.

Red should feel meaningful when it appears.

---

# 4. DESIGN PRINCIPLES

Follow these rules throughout the entire project.

### Rule 1 — Restraint

If an animation or decorative element doesn't improve comprehension or atmosphere, remove it.

### Rule 2 — Typography is the interface

Use typography as an animated object.

### Rule 3 — Motion must be choreographed

Do not independently animate everything.

The site should feel as though one motion director designed every transition.

### Rule 4 — Negative space is intentional

Do not fill empty areas simply because they are empty.

### Rule 5 — Avoid component-card overload

Do not turn every concept into a rounded card.

Use full-viewport compositions, typography, rules, imagery, and spatial relationships.

### Rule 6 — No generic AI aesthetic

SCAM CITY is about AI, but its visual language should not rely on generic "AI" imagery.

---

# 5. MOTION SYSTEM

Motion is a core part of the design.

The website should feel exceptionally smooth.

Use a coherent animation language.

## Primary easing

Use a strong, elegant ease-out such as:

`cubic-bezier(0.16, 1, 0.3, 1)`

Use this as the dominant transition curve.

Do not randomly mix many easing styles.

Avoid:

- bounce
- elastic effects
- cartoon springs
- excessive overshoot

Motion should feel expensive and controlled.

---

# 6. REQUIRED MOTION TECHNIQUES

Implement the following deliberately.

## Split-text headline reveals

Major headings should reveal line-by-line or word-by-word.

Use clipping/masking rather than simply fading text.

Example:

```text
YOU'RE
ALREADY
ON THE CALL.
```

The text begins clipped below its final position and moves upward into place.

The reveal should feel physical.

---

## Clip-path image wipes

Large portraits and editorial imagery should enter using animated clipping masks.

Examples:

- vertical wipe
- horizontal wipe
- asymmetric rectangular reveal

Avoid simple opacity fades for major imagery.

---

## Ken Burns imagery

Portraits/background photographs should have extremely slow movement.

Example:

```text
scale: 1 → 1.06/1.08
```

over a long duration.

The movement should be subtle enough to feel cinematic rather than like a slideshow.

---

## Magnetic cursor

Create a custom cursor.

Default:

small dot / understated indicator.

Interactive elements:

the cursor subtly gravitates toward the target.

For important buttons, the cursor can transform into a small contextual indicator such as:

```text
ENTER
```

or

```text
TALK
```

The cursor should never become a giant distracting circle.

On touch devices, disable magnetic behavior appropriately.

---

## Scroll-progress hairline

Add a very thin progress indicator at the edge of the viewport.

It should communicate where the visitor is in the experience.

Optionally pair it with small metadata such as:

```text
03 / 08
```

or:

```text
CITY 03
```

Keep it subtle.

---

## Scroll-driven transitions

Use scroll position to control:

- typography movement
- image scale
- clipping
- parallax
- section transitions
- progression indicators

Do not make scrolling feel like a collection of unrelated animations.

---

# 7. PAGE ARCHITECTURE

Build the website as a continuous cinematic narrative.

The primary page should contain these major experiences:

1. Opening
2. Incoming Call
3. The City
4. The Psychological Threat
5. The Adaptive AI
6. Live Call
7. AI Judge
8. Riddle Mode
9. Progression
10. AI Load-Bearing Explanation
11. Real-World Impact
12. Final CTA

The page should not feel like twelve disconnected sections.

Each section should transition naturally into the next.

---

# 8. SECTION 01 — OPENING

Start with a nearly black viewport.

Minimal top metadata:

```text
SCAM CITY                              TRAINING SYSTEM / 01
```

Then introduce the main statement:

```text
YOU'RE
ALREADY
ON THE CALL.
```

Use enormous typography.

Reveal each line sequentially using split-text clipping.

Below it, introduce:

```text
An AI is trying to convince you of something.
```

Then a restrained CTA:

```text
ENTER THE CITY →
```

Do not immediately explain every feature.

Create curiosity first.

---

# 9. SECTION 02 — INCOMING CALL

Transition into an incoming-call composition.

Use a cinematic portrait of a fictional scammer.

Display:

```text
INCOMING CALL

UNKNOWN

MARTIN HAYES
ACCOUNT SECURITY
NORTHSTAR BANK
```

Add a subtle timer:

```text
00:03
```

Portrait should enter through a clip-path reveal.

Begin subtle Ken-Burns movement.

Primary CTA:

```text
ANSWER THE CALL
```

Clicking should feel like entering the simulation.

---

# 10. SECTION 03 — THE CITY

Introduce the conceptual world.

Do not use a literal 3D city.

Instead, SCAM CITY consists of districts.

Example:

```text
01  THE BANK
02  THE DELIVERY
03  THE DESK
04  THE PRIZE
05  THE IMPOSTOR
06  THE ROMANCE
```

Each district can have:

- number
- title
- short description
- photographic visual
- completion state

Use a full-screen scrolling composition.

As the user moves through the districts, each one should feel like entering another part of the city.

Transitions should use:

- clip-path
- scale
- typography movement
- image movement

rather than conventional card animations.

---

# 11. SECTION 04 — THE PSYCHOLOGICAL THREAT

Create a dramatic typography-driven section.

Start:

```text
THEY DON'T NEED
YOUR PASSWORD.
```

Then progressively reveal:

```text
They need
your attention.
```

Then:

```text
your trust.
```

Then:

```text
your urgency.
```

Then:

```text
your mistake.
```

Finish with:

```text
THE SCAMMER
DOESN'T ATTACK
YOUR COMPUTER.

THEY ATTACK
YOUR DECISION.
```

This should be one of the strongest visual moments on the website.

Minimal imagery.

Let typography dominate.

---

# 12. SECTION 05 — THE ADAPTIVE AI

Introduce the AI opponent.

Headline:

```text
THE OPPONENT
```

Then:

```text
NOT A SCRIPT.

AN ADAPTIVE AGENT.
```

Show a simulated conversation.

Example:

```text
SCAMMER

"Mr. Carter, I'm calling because
we've detected suspicious activity
on your account."

YOU

"What activity?"

SCAMMER

"I'll need to verify your identity
before I can disclose that."

YOU

"What's your employee ID?"
```

Then visually demonstrate the AI state changing.

Example:

```text
PLAYER SUSPICION
        ↓
TACTIC CHALLENGED
        ↓
SCAMMER PIVOTS
        ↓
INCREASE PRESSURE
```

Then show:

```text
"I understand your concern.

Unfortunately, if we don't resolve
this within the next ten minutes,
the account may be frozen."
```

Highlight:

```text
TEN MINUTES
```

Then identify:

```text
URGENCY DETECTED
```

This section should make the adaptive nature of the system immediately understandable.

---

# 13. SECTION 06 — LIVE CALL

This is the flagship interactive section.

The page should dramatically simplify.

Black background.

Minimal HUD.

Example:

```text
LEVEL 03                                      04:17
```

Large portrait.

Subtle audio waveform.

Current dialogue:

```text
"Can you confirm which department
you're calling from?"
```

HUD:

```text
SUSPICION
███████░░░░
```

Bottom controls:

```text
MIC ACTIVE                              END CALL
```

If real voice integration is unavailable during development, build a realistic mock simulation with a clear abstraction layer so the actual voice provider can later be connected.

Do not build the frontend around fake hardcoded UI in a way that prevents real integration.

Create interfaces/types for:

- call state
- transcript
- speaker
- tactic
- suspicion
- timer
- agent state
- call completion

---

# 14. LIVE CALL UX

The call experience must feel like a game, not a dashboard.

The player should not be overwhelmed by information.

The important hierarchy is:

1. scammer
2. conversation
3. player microphone state
4. suspicion
5. subtle learned red flags
6. secondary metadata

The HUD should never dominate the portrait/conversation.

---

# 15. SECTION 07 — AI JUDGE

After a call, transition into a quiet analysis state.

Start:

```text
CALL ENDED
```

Then animate a score:

```text
72 / 100
```

Then reveal:

```text
YOU CAUGHT

01  AUTHORITY CLAIM
02  URGENCY
03  REQUEST FOR VERIFICATION
```

Then:

```text
YOU MISSED

04  SOCIAL PRESSURE
```

Create a horizontal timeline:

```text
00:18        01:42        03:07        04:11
  │             │            │             │
  │         questioned     pressure       reveal
  │
SUSPICION ───────────────────────────────────
```

Make this feel like forensic analysis.

The purpose is to communicate that the AI isn't simply deciding "WIN" or "LOSE."

It is evaluating the player's decision-making.

---

# 16. SECTION 08 — RIDDLE MODE

Introduce the low-friction training mode.

Headline:

```text
BEFORE YOU ENTER
THE CALL,

LEARN TO SEE
THE TRAP.
```

Then show a scenario.

Example:

```text
09:42 AM

Your phone receives a message:

"Your package could not be delivered.
Confirm your address within 30 minutes
to avoid return charges."
```

Choices:

```text
IS THIS A SCAM?

SCAM
LEGITIMATE
```

If scam:

```text
WHAT TYPE?

PHISHING
IMPERSONATION
DELIVERY
TECH SUPPORT
OTHER
```

Then reveal an AI explanation.

The interaction should feel elegant and editorial.

Avoid making it look like a school quiz.

---

# 17. FALSE POSITIVES

Explicitly demonstrate legitimate calls.

Headline:

```text
NOT EVERYTHING
IS A SCAM.
```

Then:

```text
THE GOAL ISN'T PARANOIA.

IT'S VERIFICATION.
```

Show a legitimate scenario where the correct behavior is to verify appropriately rather than immediately hang up.

This is an important part of the product philosophy.

The game teaches skepticism without teaching irrational distrust.

---

# 18. SECTION 09 — PROGRESSION

Create a minimalist progression interface.

Example:

```text
YOUR CITY

────────────────────────────────────

01  BANK SECURITY             CLEARED
02  DELIVERY                   CLEARED
03  TECH SUPPORT               CURRENT
04  EXECUTIVE IMPERSONATION   LOCKED
05  ROMANCE                    LOCKED
06  COMBINED ATTACK            LOCKED
```

Do not use conventional gamified XP bars unless genuinely necessary.

Progression should feel like mastery.

Riddle performance can influence which live-call scenarios unlock.

Represent this visually.
---

# 20. SECTION 11 — REAL-WORLD IMPACT

Transition into warmer, human-focused imagery.

Potential audiences:

- schools
- students
- community centers
- elder-care organizations
- financial-literacy programs
- corporate security training

Headline:

```text
THE SKILL SHOULD
TRAVEL WITH YOU.
```

Then:

```text
SCHOOLS
COMMUNITY CENTERS
ELDER-CARE PROGRAMS
FINANCIAL LITERACY
CORPORATE TRAINING
```

The message:

SCAM CITY isn't merely a game.

It is experiential social-engineering training.

---

# 21. SECTION 12 — FINAL CTA

Return to near-black.

Very little UI.

Centered:

```text
SCAM CITY

DON'T LEARN
THE RED FLAGS.

LEARN
TO THINK
UNDER PRESSURE.
```

CTA:

```text
ENTER THE CITY →
```

Footer:

```text
AI-DRIVEN SOCIAL ENGINEERING TRAINING
2026
```

Keep the ending extremely restrained.

---

# 22. NAVIGATION

Do not use a conventional large navbar.

Use a minimal fixed navigation system.

Possible structure:

```text
SCAM CITY
```

left

```text
ABOUT
SIMULATION
TRAINING
```

right

plus a small menu / index trigger.

Navigation should remain visually quiet.

On scroll, it can reduce further.

---

# 23. CUSTOM CURSOR

Implement a custom cursor system globally.

States should include:

### Default

Tiny point.

### Interactive

Subtle magnetic attraction.

### CTA

Contextual label:

```text
ENTER
```

### Simulation

```text
TALK
```

### Image

Potentially:

```text
VIEW
```

Cursor transitions should use the same motion language as the rest of the site.

Respect:

```text
prefers-reduced-motion
```

and disable magnetic behavior on touch devices.

---

# 24. IMAGE DIRECTION

Use high-quality editorial photography.

Portraits should feel:

- believable
- professional
- slightly tense
- cinematic
- understated

Avoid obvious stock photography.

Avoid:

- people pointing at laptops
- fake hacker imagery
- blue digital overlays
- hooded hackers
- Matrix-style graphics
- smiling customer-service stock photos

The scammer portraits should feel like ordinary credible people.

That's important to the concept.

The danger is that the scammer looks legitimate.

---

# 25. TECHNICAL ARCHITECTURE

The project is greenfield.

Build cleanly from the beginning.

Use a modern React-based frontend with TypeScript.

Prefer:

- componentized architecture
- reusable animation primitives
- centralized design tokens
- strongly typed state
- clear separation between presentation and simulation logic

Animation architecture should not be scattered across arbitrary components.

Create reusable systems for:

- text reveals
- image reveals
- scroll animations
- magnetic cursor
- page transitions
- number counters
- timeline animation
- staggered reveals

If using GSAP, use it deliberately and organize animation code cleanly.

Use a smooth scrolling solution only if it materially improves the experience.

Do not add libraries merely because they are fashionable.

---

# 26. BACKEND / AI ABSTRACTION

Even though the primary task is the frontend, architect the application so the real AI system can be connected cleanly.

Do not tightly couple UI components to mock data.

Define interfaces for concepts such as:

```ts
ScammerPersona
CallSession
TranscriptMessage
ScammerState
Tactic
PlayerAction
CallScore
RiddleScenario
ProgressionState
```

Example conceptual structure:

```ts
type Speaker = "player" | "scammer";

interface TranscriptMessage {
  id: string;
  speaker: Speaker;
  text: string;
  timestamp: number;
}

interface ScammerState {
  persona: string;
  currentTactic: string;
  tacticsUsed: string[];
  escalationLevel: number;
  suspicionEstimate: number;
}
```

The exact implementation can differ, but the frontend should be ready for a real backend.

---

# 27. MOCK MODE

Because the project is greenfield, initially implement a **deterministic demo/mock mode**.

This allows the website to be fully demonstrated before live voice infrastructure is connected.

The mock mode should simulate:

- incoming call
- conversation
- scammer responses
- changing tactics
- suspicion
- call ending
- transcript
- AI evaluation
- score
- progression

The architecture must make it possible to swap:

```text
MockCallProvider
```

for:

```text
RealtimeVoiceCallProvider
```

without rebuilding the UI.

---

# 28. RESPONSIVE DESIGN

Desktop is the primary judging/demo environment.

However, the website must be fully responsive.

Desktop:

- cinematic full-screen compositions
- large typography
- generous horizontal spacing

Tablet:

- preserve hierarchy
- reduce oversized typography
- simplify some interactions

Mobile:

- prioritize readability
- preserve the narrative
- disable magnetic cursor
- reduce complex parallax
- ensure live call controls are usable
- don't simply shrink desktop layouts

---

# 29. ACCESSIBILITY

Implement accessibility properly.

At minimum:

- semantic HTML
- keyboard navigation
- visible focus states
- appropriate ARIA labels
- sufficient contrast
- reduced-motion support
- buttons rather than clickable divs
- accessible form controls
- transcript readable without animation
- live call state available to assistive technology where appropriate

Motion must enhance the experience, never be required to understand it.

---

# 30. PERFORMANCE

The website should look expensive without being technically wasteful.

Pay attention to:

- image optimization
- lazy loading
- responsive image sizes
- animation performance
- avoiding layout thrashing
- GPU-friendly transforms
- minimizing unnecessary rerenders
- code splitting where appropriate

Do not preload every image in the entire experience.

Prioritize the opening experience.

---

# 31. WHAT NOT TO DO

Absolutely avoid:

- generic Tailwind-looking layouts
- excessive rounded cards
- excessive shadows
- glassmorphism everywhere
- neon gradients
- floating blobs
- generic AI icons
- stock "cybersecurity" imagery
- huge dashboard panels
- excessive borders
- excessive animations
- bounce effects
- random parallax
- animated background particles
- typewriter effects for everything
- excessive red
- conventional SaaS pricing-page structure
- giant navigation menus
- meaningless decorative statistics
- fake testimonials
- fake logos
- fabricated claims
- fake user counts
- fake security certifications

Every element should have a reason to exist.

---

# 32. QUALITY BAR

The finished experience should make someone think:

> "This looks like a real product."

Not:

> "This is a cool website someone made for a hackathon."

The most important quality signals are:

1. typography
2. spacing
3. image treatment
4. transitions
5. consistency
6. restraint
7. interaction quality
8. micro-details

A mediocre layout with impressive animations is still mediocre.

Prioritize composition first.

---

# 33. DEVELOPMENT ORDER

Do not attempt to build every detail simultaneously.

Build in this order:

### Phase A — Foundation

- project setup
- typography
- color tokens
- spacing system
- global layout
- responsive breakpoints
- cursor
- scroll progress

### Phase B — Hero

Build the opening experience to a very high level of polish.

### Phase C — Narrative sections

Implement:

- City
- Psychological Threat
- Adaptive AI

### Phase D — Simulation

Implement mock Live Call.

### Phase E — Judge

Implement post-call analysis.

### Phase F — Riddle Mode

Implement interactive scenario flow.

### Phase G — Progression

Implement city progression.

### Phase H — Impact / final CTA

### Phase I — Polish

Then systematically refine:

- easing
- timing
- spacing
- typography
- transitions
- responsive behavior
- accessibility
- performance

Do not move on from a section while it still looks like a prototype.

---

# 34. CONTENT PRINCIPLE

Keep copy concise.

This is a visual experience, not a documentation page.

Prefer:

```text
THEY NEED
YOUR ATTENTION.
```

over:

```text
Scammers use psychological manipulation techniques
to gain the victim's attention and convince them...
```

Long explanations belong in the actual product experience or supporting content.

The marketing site should communicate through:

**statement → interaction → evidence → demonstration.**

---

# 35. FINAL EXPERIENCE TEST

Before considering the project complete, ask:

### Visual

Does this look premium even when every animation is disabled?

### Motion

Do all major animations feel like they belong to the same system?

### Concept

Can someone understand SCAM CITY's premise without reading a wall of text?

### AI

Is it obvious that AI is the opponent rather than merely a content-generation feature?

### Product

Can someone actually understand what they would do inside the game?

### Demo

Could a judge sit down and immediately understand the live-call experience?

### Technical

Can the mock voice system be replaced with the actual realtime AI backend without rewriting the UI?

### Restraint

If removing an element would improve the page, remove it.

---

# FINAL INSTRUCTION

Build this as a **complete greenfield frontend**, not as a design mockup.

Start by establishing the project structure and design system.

Then implement the experience progressively.

Use realistic mock data where backend functionality does not yet exist, but clearly structure the application around future real-time AI integration.

The final result should be:

**minimal, cinematic, editorial, premium, interactive, technically credible, and extremely polished.**

The website should feel like a product launch experience for a serious AI training platform.

Most importantly:

**SCAM CITY should feel like a place you have entered—not a website you are scrolling through.**