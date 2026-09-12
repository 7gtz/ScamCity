# SCAM CITY — Art requirements

Complete bill of materials for the detective track: every panel, character, document, prop, map element, icon and overlay the game needs, with specs, file paths and priorities.

**Companion docs:** [`DETECTIVE-BUILD-PLAN.md`](DETECTIVE-BUILD-PLAN.md) · [`../design-system/scam-city/MASTER.md`](../design-system/scam-city/MASTER.md) (§1 colour, §8 imagery — authoritative) · [`FRONTEND-HANDOFF.md`](FRONTEND-HANDOFF.md)

---

## 0. How to read this

### Priority tiers

| Tier | Meaning |
|---|---|
| **T0** | Needed for the 24-hour demo build. **Produced procedurally** — CSS, SVG and type, no raster art, no external dependency |
| **T1** | First commissioned wave. Replaces T0 procedural art in the five demo panels, plus the cast |
| **T2** | Expansion to the full 20–30 panel city |
| **T3** | Polish — alternate lighting, expression extensions, animation |

### The 24-hour reality

**Nothing in T1–T3 exists on deadline day and nothing should block on it.** Every T0 asset is buildable by a developer in the browser from the existing design tokens. The art system must be built so a commissioned `bg.avif` can be dropped into a folder later and replace the procedural background with **no code change** — that is what `src/game/world/assets.ts` is for.

Read T1–T3 as the commissioning brief to hand an artist after the deadline.

---

## 1. Global specifications

### Formats and sizes

| Asset class | Master size | Aspect | Delivered as | Budget |
|---|---|---|---|---|
| Panel background | 2560 × 1440 | 16:9 | AVIF + WebP | ≤ 400 KB AVIF |
| Panel foreground layer (optional) | 2560 × 1440 | 16:9 | AVIF + WebP, alpha | ≤ 250 KB |
| Character full-body | 1200 × 2000 | 3:5 | WebP, alpha | ≤ 180 KB |
| Character portrait (dialogue) | 1000 × 1250 | 4:5 | WebP, alpha | ≤ 120 KB |
| Evidence document | 1400 × 1800 | 7:9 | WebP | ≤ 150 KB |
| Prop / inventory item | 512 × 512 | 1:1 | WebP, alpha | ≤ 40 KB |
| Map node / marker | — | — | **SVG** | ≤ 4 KB |
| UI icon | 24 px grid | 1:1 | **SVG** | ≤ 2 KB |
| Overlay / texture | 1024 × 1024 tileable | 1:1 | WebP or CSS | ≤ 60 KB |

> **Deviation from MASTER §8, recorded deliberately:** §8 specifies 16:10 or 3:2 for district imagery. Explorable panels use **16:9** because they must fill a game viewport without letterboxing. Portraits stay 4:5 as §8 requires. Add this to MASTER as §13 when the art system lands.

### Rules inherited from MASTER §8 — non-negotiable

- Editorial, believable, slightly tense. **The danger is that the scammer looks legitimate.**
- Consistent grade across everything: warm shadows, −25% saturation, soft contrast.
- **Banned:** hooded hackers, code rain, blue overlays, people pointing at laptops, smiling call-centre stock, shields and padlocks as heroes, green-on-black terminals.
- All people, organisations and brands are fictional. No real logos, no real phone numbers, no real payment marks.
- Every image lazy-loaded via `next/image` except the first panel of a case. Reserve space by aspect ratio; CLS below 0.1.

### Palette — use these tokens, never raw hex

From [`src/styles/tokens.css`](../src/styles/tokens.css):

| Token | Value | Use in art |
|---|---|---|
| `--color-ink` | `#0b0a09` | Deepest shadow, night exteriors |
| `--color-ember` | `#1a120d` | Warm near-black — interior shadow |
| `--color-surface` / `--color-raised` | `#141210` / `#1d1a17` | Mid-dark surfaces, furniture |
| `--color-line` | `#2a2723` | Edges, panel lines |
| `--color-smoke` / `--color-ash` | `#9a9488` / `#a39d93` | Mid-tones, concrete, fabric |
| `--color-bone` | `#efeae2` | Paper, highlights, skin light |
| `--color-amber` | `#e8a657` | **Sodium streetlight.** The city's warm secondary light — ambience only |
| `--color-signal` | `#f0503a` | Danger. Never decorative |
| `--color-safe` | `#6f9b78` | Verified / safe. Never decorative |
| `--color-paper*` | `#f7f6f3` family | Simulated third-party apps — mail, browser, chat. Must read as real software |

**The rule:** `amber` is ambience, `signal` is danger, `safe` is verified. An artist must never use signal-red or safe-green as a decorative accent — those two colours carry game state.

### District hues (for panels that belong to a district)

From [`src/content/districts.ts`](../src/content/districts.ts) — each panel inherits its district's street lighting:

`bank` `#4f7185` · `delivery` `#b4774d` · `desk` `#66758f` · `prize` `#a88a4a` · `impostor` `#70677e` · `romance` `#9a5d68`

### Naming and paths

```
public/art/
  panels/<location-id>/bg.avif | bg.webp | fg.webp | thumb.webp
  characters/<character-id>/full.webp
  characters/<character-id>/portrait-<expression>.webp
  evidence/<evidence-id>.webp
  props/<prop-id>.webp
  map/<node-id>.svg
  ui/<icon-name>.svg
  overlays/<name>.webp
```

All ids are kebab-case and **must match the ids in the content files** — `location-id` matches `LocationId`, `evidence-id` matches `EvidenceItem.id`. The loader resolves by convention; a mismatch is a silent missing image.

---

## 2. Panel backgrounds

### T0 — the five demo panels (procedural, built by D1)

Each is a CSS composition: a flat colour field in the panel's tone, 2–4 flat geometric shapes suggesting the space, a sodium-amber light gradient, the existing grain and halftone overlays, and the location name set large in `--font-display`.

| # | `location-id` | Panel | Tone | Hotspots | What the shapes must read as |
|---|---|---|---|---|---|
| 1 | `office` | Detective office | `ember` | 4 | Desk, window blinds with amber slats, corkboard wall, door |
| 2 | `victim-flat` | Victim's flat | `dark` | 5 | Kitchen table, landline/mobile, front door, window, sideboard |
| 3 | `bank-branch` | Bank branch interior | `paper` | 4 | Counter line, queue barrier, teller window, ATM alcove |
| 4 | `repair-shop` | Phone-repair shop | `ember` | 5 | Glass counter, parts wall, workbench, shutter, SIM rack |
| 5 | `police-station` | Police station front desk | `dark` | 3 | Front desk, notice board, corridor door |

### T1 — the same five, commissioned

Replace each procedural background with a painted 16:9 panel plus an optional alpha foreground layer for depth (counter edge, doorframe, foreground clutter). Same hotspot geometry — the artist works to the hotspot map D1 supplies, so no code changes.

**10 files** (5 × `bg` + 5 × `fg`).

### T2 — the full city, to 26 panels

| # | `location-id` | Panel | District | Notes |
|---|---|---|---|---|
| 6 | `street-north` | Northern street, night | — | Connective. Sodium lighting hero shot |
| 7 | `street-market` | Market street, day | — | Connective. QR-code payment fraud staging |
| 8 | `street-underpass` | Underpass | — | Connective, tense |
| 9 | `apartment-block` | Apartment block exterior | — | Establishing shot for `victim-flat-2` |
| 10 | `apartment-hall` | Apartment communal hallway | — | Doorstep interviews |
| 11 | `victim-flat-2` | Second victim's flat | `romance` | Romance-scam victim. Warmer, more personal |
| 12 | `victim-flat-3` | Third victim's flat, elderly | `desk` | Tech-support victim. Desktop PC visible |
| 13 | `parcel-depot` | Parcel depot yard | `delivery` | Daylight, industrial |
| 14 | `parcel-office` | Depot back office | `delivery` | Manifest records — evidence source |
| 15 | `bank-back-office` | Bank back office | `bank` | Transaction traces |
| 16 | `bank-atm` | ATM vestibule, night | `bank` | Card-skimming, CCTV |
| 17 | `corporate-office` | Open-plan office | `impostor` | CEO-impersonation case |
| 18 | `corporate-exec` | Executive office | `impostor` | The impersonated director's real office |
| 19 | `cyber-cafe` | Cyber café | — | Terminal logs, cash payments |
| 20 | `clinic-waiting` | Clinic waiting room | — | Health-scam / data-harvesting case |
| 21 | `clinic-office` | Clinic admin office | — | Patient-record evidence |
| 22 | `phone-shop` | Mobile phone shop | `bank` | SIM-swap point of sale |
| 23 | `police-interview` | Police interview room | — | Interrogation set-piece |
| 24 | `police-evidence` | Police evidence room | — | Chain-of-custody beat |
| 25 | `hideout-flat` | Scam-operation flat | — | **Aftermath only.** See §11 |
| 26 | `hideout-callcentre` | Scam call centre | — | **Aftermath only.** See §11 |

**T2 total: 21 panels × 2 layers = 42 files.**

### T3 — lighting variants

Day / night / rain variants for the 6 connective street and exterior panels, so the city visibly changes as a case progresses. **12 files.** Cut first if budget is tight — a tone overlay approximates it.

---

## 3. Characters

### Expression set

Every speaking character needs a portrait set. **Core set (T1): 4 expressions** — `neutral`, `concerned`, `guarded`, `open`. **Extended set (T3): 3 more** — `angry`, `distressed`, `relieved`.

Portraits are 4:5, shoulders-up, lit from one side, against alpha. They appear beside the dialogue box.

### Principal cast — T1

| `character-id` | Role | Full-body | Portraits (T1) | Notes |
|---|---|---|---|---|
| `detective` | The player-detective | 1 | 4 | Ordinary, tired, unglamorous. Not a noir cliché. Readable at small sizes |
| `mara-okoye` | Victim, bank/OTP case | 1 | 4 | Mid-40s, competent, embarrassed — **not foolish**. This is the whole point |
| `teller-vance` | Bank teller | 1 | 4 | Helpful within rules, slightly defensive |
| `ravi-sunder` | Phone-repair shop owner | 1 | 4 | Wary of police, not a criminal. Carries the false lead |
| `sgt-brennan` | Desk sergeant | 1 | 4 | Procedural, unhurried, not obstructive |
| `caller-silhouette` | The scammer on the line | 1 | 2 | **Never a face.** A shape behind glass. The scammer is only a voice |

**T1 cast total: 6 full-body + 22 portraits = 28 files.**

### Supporting cast — T2

| `character-id` | Role | Portraits |
|---|---|---|
| `victim-elderly` | Tech-support victim | 4 |
| `victim-romance` | Romance-scam victim | 4 |
| `depot-manager` | Parcel depot manager | 4 |
| `exec-whitfield` | Impersonated director | 4 |
| `exec-assistant` | Assistant who nearly paid | 4 |
| `cafe-owner` | Cyber café owner | 4 |
| `clinic-admin` | Clinic administrator | 4 |
| `di-halloway` | Senior investigating officer | 4 |
| `mule-recruit` | Money mule, themselves a victim | 4 |
| `bystander-a` / `bystander-b` | Street NPCs | 2 each |

**T2 cast total: 10 full-body + 40 portraits = 50 files.**

### T3 — expression extensions

3 extra expressions × 16 speaking characters = **48 files.**

---

## 4. Evidence and documents

These are the investigation. Each must be **readable at full size** and must contain the tell the player is meant to find. The existing [`DistrictArtifact.tsx`](../src/features/districts/DistrictArtifact.tsx) renderers (`ledger` `tracking` `log` `notice` `chat`) already produce these **as styled HTML** — which is why they are T0.

### T0 — rendered as HTML, no art needed

| `evidence-id` | Kind | Contains |
|---|---|---|
| `bank-statement` | `ledger` | The fraudulent transaction, flagged |
| `call-log` | `log` | Inbound call at the claimed time, wrong number |
| `otp-message` | `chat` | The real bank's "we will never ask" warning |
| `sim-swap-record` | `log` | Port-out request, timestamped |
| `repair-receipt` | `notice` | The false lead — innocent explanation |
| `courier-notice` | `tracking` | Second case. Redelivery-fee bait |

### T1 — photographic/illustrated versions

Real-feeling paper: a bank statement, a handwritten note, a printed receipt, a SIM card packet, a business card. Shot or painted flat, warm grade, slight wear. **6 files**, replacing the HTML renderers where a physical object reads better than a screen.

### T2 — full evidence set

18 additional documents across the expansion cases: delivery manifests, CCTV stills (4), a forged letterhead, patient-record printout, till receipts, a burner-phone photo, chat printouts, a spoofed email header printout, a fake investment dashboard screenshot, a QR-code sticker photograph, an ID card, a tenancy agreement, a wire-transfer slip. **18 files.**

> **Every document is fictional.** Fictional bank (`Northstar`), fictional courier (`SwiftParcel`), fictional numbers. No real sort codes, IBANs, card BINs or addresses. Numbers must be structurally implausible as real instruments.

---

## 5. Props and inventory items

Small 1:1 objects shown in the inventory and as hotspot targets.

### T1 — 14 items

`phone-victim` · `phone-burner` · `sim-card` · `bank-card` · `notebook` · `pen` · `evidence-bag` · `keyring` · `usb-stick` · `landline-handset` · `envelope` · `laptop-closed` · `cctv-disc` · `warrant-folder`

### T2 — 10 more

`parcel-box` · `qr-sticker` · `router` · `card-reader` · `prescription-box` · `till-roll` · `id-badge` · `cash-bundle` · `gift-card` · `padlocked-cabinet`

**Total props: 24 files.**

---

## 6. World map

The map is **SVG, T0, and built by D1** — it reuses the proven route maths in [`geometry.ts`](../src/features/districts/geometry.ts).

| Asset | Tier | Count | Notes |
|---|---|---|---|
| Node marker — 4 states (`locked`, `open`, `current`, `cleared`) | T0 | 4 SVG | Matches the existing `CityMap` states |
| Route line styles (travelled / untravelled / spur) | T0 | CSS | No files |
| District colour swatches | T0 | — | From `districts.ts` hues |
| Location vignette thumbnails for map tooltips | T1 | 26 WebP | 320 × 180, cropped from panel backgrounds |
| Hand-drawn city map illustration (replaces the transit abstraction) | T2 | 1 large SVG/WebP | 4096 × 2304. **Optional** — the transit map is a deliberate style, not a placeholder |
| Weather / time-of-day map overlays | T3 | 3 | Ties to the real-world context feature |

---

## 7. UI and icons

All SVG on a 24 px grid, single-colour, `currentColor`, 1.5 px stroke. [`lucide-react`](https://lucide.dev) already covers most of this — **only commission what Lucide lacks.**

### T0 — custom SVG needed (Lucide has no equivalent)

| Icon | Use |
|---|---|
| `case-board` | Open the case board |
| `evidence-pin` | Pinned evidence marker |
| `deduction-link` | Connection between two evidence cards |
| `hotspot-idle` / `hotspot-active` | Interactive region indicator |
| `false-lead` | Marks a dismissed lead |
| `preserve-evidence` | The lawful-action verb |
| `verify-channel` | "Check independently" action |

**7 custom icons.**

### T0 — from Lucide, no art needed

`phone` `mail` `globe` `message-square` `map` `lock` `unlock` `search` `clock` `alert-triangle` `check` `x` `chevron-*` `mic` `mic-off` `volume-2` `headphones` — all already in use.

### T1 — case-board furniture

Corkboard texture, pin, string/thread, card stock, tape, paper clip, coffee ring. **7 files**, 1:1 or tileable.

---

## 8. Overlays, textures and effects

| Asset | Tier | Notes |
|---|---|---|
| Film grain | T0 | **Already exists** — `src/components/chrome/Grain.tsx` |
| Halftone dot matrix | T0 | **Already exists** — `src/components/gl/` |
| Sodium light gradient | T0 | CSS radial gradient, amber token |
| Vignette | T0 | CSS |
| Rain streaks | T0 | **Already exists** — `CityRain.tsx` |
| Panel transition wipe | T0 | CSS/SVG mask, uses `--d-wipe` (1400 ms) |
| Paper texture for documents | T1 | 1 tileable WebP |
| Glass/screen reflection for phone props | T1 | 1 alpha WebP |
| Dust motes in light shafts | T3 | 1 sprite sheet |

---

## 9. Asset count summary

| Class | T0 (procedural) | T1 | T2 | T3 |
|---|---|---|---|---|
| Panel backgrounds | 5 (CSS) | 10 | 42 | 12 |
| Character full-body | 0 | 6 | 10 | 0 |
| Character portraits | 0 | 22 | 40 | 48 |
| Evidence documents | 6 (HTML) | 6 | 18 | 0 |
| Props | 0 | 14 | 10 | 0 |
| Map | 4 (SVG) | 26 | 1 | 3 |
| UI icons | 7 (SVG) | 7 | 0 | 0 |
| Overlays | 6 (existing/CSS) | 2 | 0 | 1 |
| **Total files to commission** | **0** | **93** | **121** | **64** |

**T0 commissioned art: zero.** That is the point — the 24-hour build ships on the design system.

Full production game, T1–T3: **278 files.**

---

## 10. Delivery requirements for a commissioned artist

1. **Layered source** (PSD/Procreate/Krita) plus flattened exports. We need to re-light panels later.
2. **Exports:** AVIF + WebP for panels, WebP with alpha for characters and props, SVG for icons and map. No PNG in the shipped bundle.
3. **Naming to the id list in this document.** A filename that does not match a content id is a silent missing image.
4. **Hotspot map respected.** D1 supplies a percentage-box overlay per panel; interactive objects must sit inside those boxes.
5. **Grade consistency:** warm shadows, −25% saturation, soft contrast, across every asset.
6. **Palette discipline:** never use `signal` red or `safe` green decoratively. They are game state.
7. **Two passes minimum:** greyscale value study approved before colour.
8. **Rights:** full commercial assignment, original work only, no AI-generated base art without written provenance disclosure.

---

## 11. Content and safety constraints on art

These bind the artist as much as the writer.

- **No real brands, logos, trade dress, wordmarks or colour-identities.** Fictional only: Northstar Bank, SwiftParcel, Nimbus OS, Lumen Rewards, Harrow & Finch, Kindred.
- **No real phone numbers, sort codes, card numbers, IBANs, QR codes that resolve, or addresses.** QR codes drawn in art must be non-scannable patterns.
- **The scammer is never glamorised.** `caller-silhouette` has no face. Hideout panels (`hideout-flat`, `hideout-callcentre`) are shown **as aftermath only** — after a lawful operation, empty or being catalogued by officers. Never as an aspirational workspace, never mid-operation, never depicting a working method.
- **No operationally useful detail anywhere in art:** no legible working scripts, no readable credential-harvesting interfaces, no functional device configurations, no depiction of how a SIM swap or skimmer is performed. Evidence shows *that* it happened, never *how to do it*.
- **Victims are depicted with dignity.** Competent, ordinary, embarrassed — never foolish, never elderly-as-punchline. Vary age, ethnicity and class across the cast; the scam victim stereotype is itself a risk factor, and the game should undercut it.
- **Banned imagery from MASTER §8 applies in full** — no hooded figures, no code rain, no padlock heroes.

---

## 12. What we are deliberately not commissioning

- Animation frames, sprite sheets, walk cycles, lip sync. Characters are static with CSS transitions.
- Tilesets or modular environment kits. Panels are single images.
- 3D assets. The existing WebGL is background ambience only.
- A logo or brand refresh. The wordmark is typographic and already set.
- Marketing or store art.
- Audio of any kind — out of scope for this document and for the current phase.
