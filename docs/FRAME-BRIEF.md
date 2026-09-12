# SCAM CITY — Frame brief

Every frame the game needs for **The Ten-Minute Window** (Act 2), with the exact screen geometry
each one has to survive. The UI is drawn **on top of** the art, not beside it.

**Companion docs:** [`ART-REQUIREMENTS.md`](ART-REQUIREMENTS.md) (bill of materials, tiers, full-city
expansion) · [`DETECTIVE-TRACK-24H.md`](DETECTIVE-TRACK-24H.md) · [`implementation_plan.md`](implementation_plan.md) ·
[`../design-system/scam-city/MASTER.md`](../design-system/scam-city/MASTER.md) (§1 colour, §8 imagery — authoritative)

> This document is the **composition brief**: where each object must be painted, and what the
> interface covers. `ART-REQUIREMENTS.md` remains the authority on tiers, budgets and the T2/T3
> expansion beyond Act 2.

| | |
|---|---|
| Frames total | **74** |
| Panel layers | 10 (5 `bg` + 5 `fg`) |
| Character frames | 28 (6 full-body + 22 portraits) |
| Evidence documents | 6 |
| Full-screen surfaces and props | 30 |
| Delivered so far | 2 (both off-spec — see §3.1, §3.2) |

---

## 1. Before you start

Scam City is a point-and-click detective game. The player looks at a room, clicks objects in it, and
talks to the person standing there. Every panel frame does two jobs at once: it is a painting, and it
is a **map of clickable targets**.

Those targets are hard-coded percentage boxes in
[`src/game/world/registry.ts`](../src/game/world/registry.ts), shared with the game logic and the test
suite. **If an object is painted outside its box, the player clicks empty wall and the case stalls.**
The boxes are not adjustable per-frame.

### 1.1 The grade

Editorial, believable, slightly tense. Warm shadows, roughly −25% saturation, soft contrast.
**The danger is that the scammer looks legitimate** — so nothing in this world should look sinister.
It should look like Tuesday.

### 1.2 Palette

Paint to these values, from [`src/styles/tokens.css`](../src/styles/tokens.css).

| Token | Hex | Use in art |
|---|---|---|
| `ink` | `#0b0a09` | Deepest shadow, night |
| `ember` | `#1a120d` | Warm interior shadow |
| `line` | `#2a2723` | Edges, panel lines |
| `smoke` | `#9a9488` | Concrete, fabric, mid-tone |
| `bone` | `#efeae2` | Paper, highlight, skin light |
| `amber` | `#e8a657` | Sodium streetlight — **ambience only** |
| `signal` | `#f0503a` | Danger — **never decorative** |
| `safe` | `#6f9b78` | Verified — **never decorative** |
| `paper` | `#f7f6f3` | Bank interior, documents |

Two of these are load-bearing: **signal red and safe green carry game state**. A red object in a frame
reads to the player as "this is the danger"; a green one reads as "this is verified".

### 1.3 Canvas and delivery

| Asset class | Master size | Aspect | Deliver as | Budget |
|---|---|---|---|---|
| Panel background `bg` | 2560 × 1440 | 16:9 | AVIF + WebP | ≤ 400 KB |
| Panel foreground `fg` | 2560 × 1440 | 16:9 | WebP, alpha | ≤ 250 KB |
| Character full-body | 1200 × 2000 | 3:5 | WebP, alpha | ≤ 180 KB |
| Character portrait | 1000 × 1250 | 4:5 | WebP, alpha | ≤ 120 KB |
| Evidence document | 1400 × 1800 | 7:9 | WebP | ≤ 150 KB |
| Prop / inventory | 512 × 512 | 1:1 | WebP, alpha | ≤ 40 KB |
| Map thumbnail | 320 × 180 | 16:9 | WebP | ≤ 25 KB |
| Texture / overlay | 1024 × 1024 | tileable | WebP | ≤ 60 KB |

File paths are load-bearing. The loader resolves by convention
([`src/game/world/assets.ts`](../src/game/world/assets.ts)), so a filename that does not match the id
in this document is a **silent missing image** — no error, just an empty room.

```
public/art/panels/<location-id>/bg.avif | bg.webp | fg.webp | thumb.webp
public/art/characters/<character-id>/full.webp
public/art/characters/<character-id>/portrait-<expression>.webp
public/art/evidence/<evidence-id>.webp
public/art/props/<prop-id>.webp
```

---

## 2. Where the interface sits

The panel art fills the entire browser window. Every piece of interface is drawn over it — no
letterbox, no frame, no margin. Bands below are measured from the shipped CSS
([`shell.css`](../src/game/ui/shell.css), [`npc-overlay.css`](../src/game/npc/npc-overlay.css)),
expressed as a share of window height.

```
0% ┌──────────────────────────────────────────────────────────┐
   │ ████ TOP CHROME — Back · Map · Case · Items · countdown   │  always
12%├──────────────────────────────────────────────────────────┤
   │ ▒▒▒▒ HINT BANNER — [Investigator Note]                    │  intermittent
20%├──────────────────────────────────────────────────────────┤
22%│ ████████████████████████████████████████████████████████ │
   │ ████ CONVERSATION SHEET                                   │  whenever an
   │ ████ portrait · name · waveform · subtitles · mic         │  NPC is speaking
   │ ████ (centred, max 68rem wide)                            │
95%│ ████████████████████████████████████████████████████████ │
   │ ████ LOCATION NAME                                        │  always
100%└──────────────────────────────────────────────────────────┘
```

| Band | Occupies | When | What lands there |
|---|---|---|---|
| Top chrome | y 0–12% | Always | Left: *Back*, *Map*. Right: *Case*, *Items*. Below: countdown pill `CLEARING WINDOW 09:43` at left; *Ask for Hint* at right, plus *Play Live Call* on the flat only |
| Hint banner | y 12–20% | On request | Full-width amber-edged note, `[Investigator Note]` |
| Conversation sheet | y 22–100%, centred, max 68rem | Talking to anyone | Opaque bottom sheet. Rises over 1400 ms |
| Evidence toast | right 1rem, y ≈ 26% | On pickup | Green-edged `EVIDENCE ADDED` tag |
| Location name | y 95–100% | Always | Centred amber monospace caption |
| Full-screen modals | 100% | Case board, items, debrief | Art fully covered by a blurred 90% ink scrim — nothing shows through |

### 2.1 The two rules that follow

**1. The top 22% is the only strip visible during a conversation.** When the player is talking to
Mara, the sheet covers everything below it. That strip has to carry the location's identity on its
own — the ceiling, the light source, the top of a window, a sliver of corkboard. Never put the room's
whole story in the lower half.

**2. Nothing you want read sits in y 0–12% or y 95–100%.** Permanently covered. Keep that material
dark, quiet and low-contrast — it is also where the buttons need contrast to stay legible.

### 2.2 Known engine issue — compose for it

The panel is scaled with `object-fit: cover` into a full-window container
([`panels.css`](../src/game/world/panels.css)). On a 16:9 display the frame maps 1:1 and the click
boxes land exactly where painted. On a taller window — a laptop at 16:10, a phone in portrait — the
frame scales to fill the height and is **cropped at the left and right edges**, while the click boxes
stay put.

Until engineering resolves this: **keep every interactive object clear of the outer 8% on each side**,
and let only scenery live out there. An object painted at the extreme edge will drift out from under
its own click box.

---

## 3. The five panels — frames 01–10

Each panel is two frames: a painted background, and an optional alpha foreground layer for depth (a
counter edge, a doorframe, foreground clutter the player appears to stand behind). Worth doing for the
flat, the bank and the shop.

The case runs **office → flat → bank → repair shop → police station** against a ten-minute clock. The
rooms should get progressively less comfortable — the office is warm and stale, the station at the end
is fluorescent and indifferent.

Click-target boxes are given as `x / y / w / h`, all percentages of the frame.

### 3.1 Detective office

`public/art/panels/office/` · tone **ember** · **bg delivered, fg outstanding**

| | |
|---|---|
| **The frame's job** | Establish the whole game in one image. The first room the player sees, and the only one before the clock starts. The end of a long night, not the start of an adventure |
| **Light** | One desk lamp, warm and low, doing most of the work. Amber slats through window blinds across the back wall. Everything else falls to ember. No overhead light |
| **Camera** | Eye level, standing in front of the desk. Miller's chair behind it, door at frame right, closed |
| **Must contain** | A desk buried in case files. A corkboard wall with pinned photographs and thread. Window blinds, half shut. A door. A dead coffee cup |

| Click target | Box | What must be painted there |
|---|---|---|
| `office-desk` | `10 / 55 / 60 / 40` | The desk, and **Detective Miller seated behind it**. He is who you talk to here, so he must be *inside* this box, not beside it. Gruff, fifties, twenty years in, tie loosened. Not a noir cliché — an exhausted civil servant |
| `office-door` | `82 / 10 / 16 / 75` | Full-height closed door with a visible handle, reading as the way out. Frosted glass optional; any lettering reversed and illegible |

> **Already delivered — revision needed.** `panels/office/bg.jpg` exists at **1168 × 784** against a
> spec of 2560 × 1440, and that is **3:2, not 16:9**, so it is already being cropped. Re-deliver at
> full size and aspect. The composition works and the hotspot boxes were fitted to it.

### 3.2 Victim's flat

`public/art/panels/victim-flat/` · tone **dark** · **bg delivered, fg outstanding**

| | |
|---|---|
| **The frame's job** | The densest room in the game — six click targets and three pieces of evidence. It has to stay readable while holding that much |
| **Light** | Morning, but the curtains are still shut from last night. Cold grey from the window, one warm lamp left on since the small hours. She has not slept |
| **Who lives here** | Mara Okoye, mid-forties, a senior architect. **This flat is tidy, considered and well-kept** — see the dignity note |
| **Must contain** | Kitchen table with papers. A landline on a side table. A sideboard with her mobile face up. A delivery card on the door mat. Front door. Stairwell arch at far left |

| Click target | Box | What must be painted there |
|---|---|---|
| `flat-mara` | `38 / 16 / 14 / 44` | **Mara, standing, by the coat rack.** A narrow upright box — standing, arms folded or holding a mug, not seated. Her head lands near the top of the frame deliberately: that is the part still visible when the sheet is up |
| `flat-kitchen-table` | `5 / 56 / 46 / 40` | Kitchen table, scattered papers, and the **bank statement** among them. Large box — the table can genuinely dominate the lower left |
| `flat-landline` | `29 / 38 / 12 / 17` | A corded landline handset on a side table or wall mount. Small target — needs a clear silhouette against whatever is behind it |
| `flat-sideboard` | `52 / 42 / 27 / 35` | Sideboard with her **mobile face up and screen lit**. The lit screen is the read — the only self-lit object in the room, and it should draw the eye |
| `flat-mail-slot` | `72 / 75 / 20 / 22` | A **delivery card lying on the door mat**, inside the flat by the front door. On the floor — not in a letterbox, not on a table |
| `flat-front-door` | `82 / 5 / 16 / 72` | The flat's front door, closed, with a chain |
| `flat-office-route` | `0 / 8 / 8 / 46` | A sliver at the extreme left reading as a way back out — a hallway arch or stairwell. Very narrow: suggest depth rather than detail |

> **Dignity — the point of the whole game.** Mara is competent, organised and embarrassed. She is
> **not foolish and not frail**. No squalor, no clutter-as-chaos, no medication bottles, no sad
> elderly woman. The scam-victim stereotype is itself a risk factor, and this game exists to undercut
> it: the room should say *this could happen to you*, and it only says that if the person living there
> is plainly capable.

> **Already delivered — same revision.** `panels/victim-flat/bg.jpg` is **1168 × 784**, 3:2.
> Re-deliver at 2560 × 1440, 16:9, keeping the furniture where it is.

### 3.3 Bank branch

`public/art/panels/bank-branch/` · tone **paper** · district hue `bank #4f7185` · **not started**

| | |
|---|---|
| **The frame's job** | Tonal relief and tonal threat at once. The only bright room in the case — after two dark interiors the player walks into hard daylight and polished stone. Institutional and unhurried while the clock runs down |
| **Light** | Flat, even, daylight-balanced. Almost no shadow. **The one panel where amber is nearly absent** — the warmth drops out, and that is the point |
| **Camera** | Standing on the customer side, counter running across the middle distance |
| **Must contain** | A long counter with a queue barrier. A glassed teller window. An ATM alcove at the right. A street exit lower left, a side exit upper right. Marble or terrazzo floor |

| Click target | Box | What must be painted there |
|---|---|---|
| `bank-counter` | `10 / 45 / 50 / 25` | The counter run, with **Teller Vance behind it**. Formal, correct, faintly bureaucratic — a man with rules and a job to lose. Not a villain, and not complicit |
| `bank-teller-window` | `55 / 20 / 25 / 35` | The glassed service window above the counter — grille or speaker disc, a laminated notice taped inside. **Overlaps the counter box on purpose**: both lead to Vance, and the seam must not read as a gap |
| `bank-atm-alcove` | `75 / 40 / 20 / 45` | A recessed alcove, a machine with a blank or generic screen, a CCTV dome above. Where the **SIM-swap record** is found. No readable interface on the screen |
| `bank-flat-route` | `0 / 72 / 13 / 25` | Glass street doors at lower left, daylight beyond |
| `bank-shop-route` | `86 / 5 / 13 / 30` | A side exit, upper right — a corridor or second doorway |

> **Brand safety.** The bank is fictional: **Northstar Bank**. No real logo, wordmark, trade dress or
> colour identity anywhere — no signage resembling an existing bank, no real card-scheme marks on the
> ATM. Invent the Northstar mark or leave surfaces blank.

### 3.4 Phone-repair shop

`public/art/panels/repair-shop/` · tone **ember** · **not started**

| | |
|---|---|
| **The frame's job** | This is the red herring, and the frame has to play fair. Ravi is innocent. The room must look like a **legitimate, busy, competent small business** — the player should be tempted by it only because of where it sits in the story, never because it was painted as a den |
| **Light** | Fluorescent tube overhead, a bright task lamp at the bench. Cluttered but working. Warm, lived-in, slightly cramped. Sector 22 — a neighbourhood shop everyone uses |
| **Camera** | Just inside the door. Glass counter across the foreground left, bench behind it |
| **Must contain** | A glass display counter. A workbench with tools and an opened handset. A parts wall. A rack of SIM cards and accessories. A roller shutter at the right |

| Click target | Box | What must be painted there |
|---|---|---|
| `shop-glass-counter` | `10 / 50 / 35 / 30` | Glass display counter with **Ravi Sunder behind it**. Late twenties, friendly, a cloth in his hands. Wary of police but plainly not hiding anything |
| `shop-workbench` | `40 / 45 / 30 / 35` | The bench: screwdrivers, suction cup, heat mat, an opened handset. The **repair receipt** sits here, a paper work order on a spike or under a clip |
| `shop-sim-rack` | `55 / 10 / 18 / 30` | A wall rack of carrier SIM packets and accessories. Ordinary retail stock. **Nothing that reads as cloning equipment** |
| `shop-shutter` | `75 / 10 / 20 / 70` | A roller shutter, part raised, street visible beneath. The exit to the police station |
| `shop-bank-route` | `0 / 8 / 9 / 38` | The shop's own entrance at the far left — a glass door, street beyond |

> **Nothing operationally useful.** The real attack happened at the mobile carrier, not in this shop,
> and the art must not suggest otherwise or teach anything. **No SIM-cloning rigs, no readable device
> configuration screens, no legible scripts, no functioning QR codes.** Any QR pattern drawn must be
> non-scannable. Evidence in this game shows *that* something happened, never *how to do it*.

### 3.5 Police station

`public/art/panels/police-station/` · tone **dark** · **not started**

| | |
|---|---|
| **The frame's job** | The last room. The case resolves here, so it is deliberately the plainest of the five — no atmosphere competing with the closing conversation. Almost the entire lower frame is covered by the sheet while Brennan takes the statement |
| **Light** | Overhead fluorescent, slightly green-tinged, indifferent. The least flattering light in the game. Late-shift emptiness |
| **Camera** | Public side of the front desk, facing it square on |
| **Must contain** | A high front desk with a glass screen. A notice board of curling public-information posters. A corridor door with a keypad. Plastic chairs against a wall |

| Click target | Box | What must be painted there |
|---|---|---|
| `station-front-desk` | `15 / 40 / 45 / 35` | The desk, with **Sgt. Brennan behind it**. Procedural, unhurried, competent, not obstructive. Reading glasses, a keyboard he does not look at |
| `station-shop-route` | `0 / 10 / 12 / 55` | The station's public doors at the far left, street beyond |

With only two targets, the rest of the frame is free — spend it on the notice board and the corridor.
Posters should be fictional public-information notices, legible as *type* but not as *text*; anything
sharp enough to read will be read.

---

## 4. The cast — frames 11–38

Five speaking characters and one silhouette. Each gets a full-body frame for the panel and a set of
shoulders-up portraits for the conversation sheet. The portraits are the workhorse: they appear every
time anyone speaks.

> **Portraits display at 72 px wide.** The portrait chip in the conversation sheet is **4.5rem — about
> 72 px — in a 4:5 box**, with a clipped corner. Master at 1000 × 1250, but **check every portrait at
> 72 px before delivering**. At that size only three things survive: the silhouette of head and
> shoulders, the direction of the light, and one strong value contrast. Fine linework, subtle eye
> expression and detailed clothing all vanish. Push expression into *posture and head angle*, not
> facial micro-detail.

| `character-id` | Role | Frames | Direction |
|---|---|---|---|
| `detective` | Detective Miller — your partner | 1 full + 4 portraits | Gruff, tired, fifties. Twenty years in and not romantic about it. Ordinary and unglamorous — **explicitly not a trench-coat noir detective**. Reads at small size by silhouette: heavy shoulders, loosened tie |
| `mara-okoye` | Mara Okoye — the victim | 1 full + 4 portraits | Mid-forties, senior architect, normally the most organised person in the room. Shaken and ashamed, holding herself together. Well-dressed even now. **Competent, embarrassed, never foolish** |
| `teller-vance` | Teller Vance — bank counter staff | 1 full + 4 portraits | Formal, correct, a lanyard and a pressed shirt. Helpful within rules and faintly defensive about them. Not complicit, and the art must not hint that he is |
| `ravi-sunder` | Ravi Sunder — repair shop owner | 1 full + 4 portraits | Late twenties, quick, friendly, a cloth in hand. Wary of police the way a small trader is — a rumour would finish his shop. **He is innocent; never paint him shifty** |
| `sgt-brennan` | Sgt. Brennan — desk sergeant | 1 full + 4 portraits | Bureaucratic but genuinely competent, and not unkind. Has filed a thousand of these. Unhurried |
| `caller-silhouette` | The scammer on the line | 1 full + 2 portraits | **Never a face.** A shape behind glass, a form at the edge of light. The scammer exists only as a voice and must never resolve into a person — no hoodie, no mask, no laptop |

### 4.1 Expressions

Four per speaking character: `neutral` · `concerned` · `guarded` · `open`. These map to real story
beats — Mara is *concerned* throughout and *open* only if the detective treats her well; Ravi flips to
*guarded* the instant he is accused; Vance sits *guarded* until the evidence lands, then goes *open*.
Shoulders-up, lit from one side, alpha background, 4:5.

### 4.2 Banned imagery

- No hooded figures, masks, or anonymous-hacker imagery.
- No code rain, no blue screen-glow overlays, no green-on-black terminals.
- No padlocks or shields as heroic objects.
- No smiling call-centre stock energy, and nobody pointing at a laptop.
- No elderly-victim punchline. Vary age, class and ethnicity across the cast.

---

## 5. Evidence documents — frames 39–44

These are the investigation. The player opens each one full-screen and reads it, so every one must be
**legible at full size** and must contain the specific detail it carries. **The text below is fixed** —
it is what the characters say out loud, and a mismatch between a spoken line and a painted document
breaks the case.

These currently render as styled HTML. Commissioned versions replace them where a physical object
reads better than a screen: real paper, warm grade, slight wear, shot or painted flat.

| `evidence-id` | Object | Must legibly show |
|---|---|---|
| `bank-statement` | Printed interim statement, folded once | Account holder **Mara Okoye**, account `******8821`, IFSC `NRTH0004471`. A line reading **22:03 HELD: Apex Horizon Trading −₹4,80,000.00**, visually flagged. Above it an ordinary `21:12` shop purchase of `₹180.00` for contrast |
| `call-log` | Handset call-log screen or printed log | **21:47 inbound, +91 22 4019 0142**, 7 min. And the card's real line, **1800 419 4471**. The tell is that these two numbers differ |
| `otp-message` | Phone screen, SMS thread | Sender `NORTHSTAR-SEC`, **22:01:08, 14 Oct**. Body: *847291 is your Northstar one-time passcode to AUTHORISE transfer of ₹4,80,000.00 to Apex Horizon Trading.* And the warning beneath: **never share this code with anyone, including Northstar staff** |
| `sim-swap-record` | Carrier audit printout, tractor-feed | **21:20:14 port-out / re-provision request**, **21:22:05 SMS routing divert active**. A line confirming the handset was untouched — the breach was at the network. This is the frame that exonerates Ravi |
| `repair-receipt` | Carbon-copy work order, spiked | `Apex Fix & Tech`, Sector 22, work order **#4018**, Mara Okoye. Work: **front OLED display glass replacement**. Technician's note: *SIM tray remained empty; customer retained SIM.* *(false lead)* |
| `delivery-notice` | Missed-delivery card, slightly bent | `SwiftParcel Logistics`, tracking **SP-9920-X**, dropped 11:15 on 13 Oct. Sender: Harrow & Finch Architectural Supplies. Contents: plotter paper. Utterly mundane — that is the joke *(false lead)* |

> **Every number must be structurally implausible as a real instrument.** Fictional bank
> (**Northstar**), courier (**SwiftParcel**), shop (**Apex Fix & Tech**), payee (**Apex Horizon
> Trading**). No real IFSC codes, sort codes, IBANs, card BINs, phone numbers or addresses — including
> in background clutter and in any text too small to read. Use exactly the strings above.

---

## 6. Full-screen surfaces and props — frames 45–74

These cover the panel art entirely, so they are their own compositions rather than overlays. Most are
built from type and CSS already — what is needed is the material: texture, furniture, and the small
objects.

| Surface | Frames | What's needed |
|---|---|---|
| **Case board** | 7 | The corkboard the player pins evidence to: cork texture (tileable), a pin, a length of red thread, card stock, tape, a paper clip, a coffee ring. The most-visited screen after the panels |
| **Map thumbnails** | 5 | 320 × 180 vignettes of each panel for transit-map tooltips. Crop from the panel masters — pick the most recognisable quarter of each room, not the centre |
| **Document paper** | 1 | Tileable paper texture for the evidence renderer. Warm, faint tooth |
| **Screen glass** | 1 | Alpha reflection/smear layer laid over phone props so lit screens read as glass |
| **Props** | 14 | `phone-victim` · `phone-burner` · `sim-card` · `bank-card` · `notebook` · `pen` · `evidence-bag` · `keyring` · `usb-stick` · `landline-handset` · `envelope` · `laptop-closed` · `cctv-disc` · `warrant-folder`. 512 × 512, alpha, lit consistently from upper left |
| **Panel foregrounds** | 2 | Counted in §3 — the flat, bank and shop `fg` layers |

**Not being commissioned** — do not budget for it: animation frames, sprite sheets, walk cycles, lip
sync, tilesets, 3D, logo design, marketing art. Characters are static with CSS transitions. The
transition between rooms is a 1400 ms CSS wipe and needs no art.

---

## 7. Delivery checklist

- [ ] **Greyscale value study approved before colour**, on every panel. Two passes minimum.
- [ ] **Layered source** plus flattened exports. Panels get re-lit later — day/night/rain variants are a planned second wave.
- [ ] **AVIF + WebP** for panels, **WebP with alpha** for characters and props. No PNG in the shipped bundle.
- [ ] **Filenames match the ids in this document exactly.** A mismatch is a silent missing image, not an error.
- [ ] **Every interactive object sits inside its click box**, and clear of the outer 8% on each side.
- [ ] **Each panel checked at 72 px tall and at 2560 px wide** — it must read as a thumbnail and hold up full-bleed.
- [ ] **Portraits checked at 72 px** before delivery.
- [ ] **Grade consistent across everything**: warm shadows, −25% saturation, soft contrast.
- [ ] **Signal red and safe green nowhere decorative.**
- [ ] **Rights:** full commercial assignment, original work, no AI-generated base art without written provenance disclosure.

### 7.1 Open questions for engineering

1. **The `object-fit: cover` crop** described in §2.2. Until it is resolved, the 8% edge margin is a
   workaround rather than a fix.
2. **The two delivered panels** are 1168 × 784 in 3:2. Confirm whether they are re-rendered at
   2560 × 1440 or re-composed — re-composing moves the click boxes, which is a code change on our side,
   not a paint change on the artist's.
3. **Duplicate hotspots in the registry.** `bank-flat-route`, `bank-shop-route`, `shop-bank-route` and
   `station-shop-route` are each declared twice in
   [`src/game/world/registry.ts`](../src/game/world/registry.ts) with identical ids and rects. Harmless
   to the art (the geometry is the same either way), but it must be de-duplicated before the hotspot
   map is treated as final.

---

Case: **The Ten-Minute Window** · Act 2 · 5 scenes · ~8 minutes of play.
Ids in this document are authoritative and match the game content files.

All people, organisations, brands, numbers and documents in this game are fictional.
