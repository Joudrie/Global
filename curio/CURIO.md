# Curio — Complete Build Bible (v0.4)

> **Working name:** Curio *(alternate: **Dabble** — verify trademark / app-store / domain before committing)*
> **One line:** A daily cabinet of curiosities. Swipe less, do more — one small real-world skill challenge a day, rated by how it felt, collected in a cabinet that only grows.
> **Status:** Spec complete, pre-build. This document is the single source of truth. It is self-contained: everything needed to build Curio from scratch is here.
> **North-Star metric:** challenges **completed & stamped per user per week** — never time-in-app, never DAU.

This file reconciles the full design history: the original concept, two rigorous product-audit rounds, and a UI design analysis. The companion HTML docs in `/curio/docs/` are the visual/illustrated versions of everything below; **this markdown is authoritative and complete on its own.**

---

## Table of Contents

1. [The Thesis](#1-the-thesis)
2. [The Core Loop & Three Tiers](#2-the-core-loop--three-tiers)
3. [Finding Today's Challenge](#3-finding-todays-challenge)
4. [Personalization & Difficulty](#4-personalization--difficulty)
5. [The Challenge: Anatomy, Ladders & Multi-Day](#5-the-challenge-anatomy-ladders--multi-day)
6. [After: The Stamp](#6-after-the-stamp)
7. [Progression: The Curio Cabinet](#7-progression-the-curio-cabinet)
8. [Sharing & Virality](#8-sharing--virality)
9. [Data Model](#9-data-model)
10. [The Full Catalog — 24 Drawers, 381 Skills](#10-the-full-catalog--24-drawers-381-skills)
11. [Fully-Authored Challenge Examples (Templates)](#11-fully-authored-challenge-examples-templates)
12. [Voice & Sensitivity Guide](#12-voice--sensitivity-guide)
13. [Monetization](#13-monetization)
14. [Onboarding](#14-onboarding)
15. [Re-engagement](#15-re-engagement)
16. [Trust, Safety, Privacy & Accessibility](#16-trust-safety-privacy--accessibility)
17. [States & Edge Cases](#17-states--edge-cases)
18. [Design System](#18-design-system)
19. [Screen Inventory](#19-screen-inventory)
20. [Tech, Platform & MVP Scope](#20-tech-platform--mvp-scope)
21. [Roadmap](#21-roadmap)
22. [Design Decisions & Rationale (Audit Log)](#22-design-decisions--rationale-audit-log)
23. [Open Questions](#23-open-questions)

---

## 1. The Thesis

Most apps sell **more**. Curio sells **less, better**: instead of an infinite feed, it hands you **one thing to actually go do** today — pulled from a library of hundreds of small skills — teaches you a two-minute sliver of it, and asks only *"how did that feel?"* Trying is the win; skill is a side effect. You're replacing a doomscroll with something you made, learned, or noticed.

**The emotional promise:** "You'll have *done* something today." Over months, Curio becomes a diary of a more interesting year — a record of things you actually tried, and quite possibly the discovery of a hobby you didn't know you'd love.

**Why it can work:** it replaces a passive, dopamine-on-tap habit with a small active one, and removes the two things that stop people trying new hobbies — not knowing what to do, and fear of being bad at it. Curio answers "what should I do today?" with one confident pick, and reframes bad/funny results as the whole point.

**The measure of success is behavioral, not attentional.** A doomscroll-replacement that maximized screen time would have failed on its own terms. The North Star is completions/week.

---

## 2. The Core Loop & Three Tiers

**The loop:**

| Step | Name | What happens |
|------|------|--------------|
| S1 | Open | Greeted with today's pick |
| S2 | Choose depth | Right-Now / Today's Curio / browse |
| S3 | Do it | Micro-lesson + task |
| S4 | Stamp 1–5 | "How did that feel?" |
| S5 | Collect / share | Token lands in cabinet, optional daily share |

**The three effort tiers** — the critical structural fix. Challenges come in three sizes so the app can meet the *actual moment* you reach for your phone, including the low-energy, in-bed, one-handed moment that doomscrolling owns:

- **Right Now** *(60–120s, phone-only)* — One-handed, doable in bed or in line: learn a word, one breath drill, notice five sounds, one card move. **Must produce a tiny action, never passive reading.** This is what actually intercepts the scroll. Leads the home screen.
- **Today's Curio** *(10–60 min, the main event)* — One assigned real-world challenge respecting your budget + preferences. The Wordle move: decided for you, no choosing. The default hero card.
- **Go Bigger** *(half-day / multi-day)* — Weekend projects and multi-day tracks (sourdough, a 30-day language sprint). Opt-in; runs as a pinned tracker that does **not** consume the daily slot.

> **Why the Right-Now tier is non-negotiable:** Behavior substitution only works when the replacement fits the *same context* as the habit. Scrolling happens in bed / on the toilet / in waiting rooms — you cannot beat a phone-in-bed habit with a "go bake a cake" solution. The Right-Now tier meets the scroll where it lives, earns the stamp in that moment, and *then* upsells effort.

---

## 3. Finding Today's Challenge

**Default: one assigned card.** On open you get "Today's Curio" big and unmissable — serendipity by default, no menu to agonize over (decision fatigue is the enemy of a daily ritual; Wordle/BeReal win by removing the choice). A prominent **"Not feeling it? deal another"** button is the escape hatch to a finite **hand of 5–7** budget-matched cards. Tap-to-open is primary; swipe is an accelerator. **Never an infinite stack** — a hand is a decision, a stack is a scroll (and the anti-scroll app must not grow its own scroll).

**Budget "moods" — one tap, not three dials.** The three original axes (time / money / plans) collapse into saveable presets:
- 🌙 **Cozy night in**
- ⏱ **Killing 15 min**
- 🚶 **Out & about**
- ☀️ **No budget, all afternoon**

The underlying axes remain: **time** (10 min / 1 hr / half-day), **cost** (free / cheap / splurge — relative bands, *never* dollar figures, for localization), **setting** (home / outdoors / errand).

**Context awareness — the app fills a 4th axis for free.** Device time + a lightweight weather lookup silently filter the deck: raining → indoor picks; 11pm → a Right-Now micro-curio; bright Saturday morning → outdoor + adventurous. "It's pouring — here's an indoor one" is the cheapest possible way to feel alive and cared-for. Degrades gracefully with no signal.

**Wildcard, on by default (~20%).** A fixed slice of the deck ignores your preferences to keep discovery alive, surfaced in-context ("🎲 a wildcard, because you might surprise yourself") — *not* a buried setting. Discovering-your-hobby is the whole point; never let the filter bubble close.

---

## 4. Personalization & Difficulty

### Boost & Mute
A **"Tune my deck"** screen lists every drawer with a three-state dial:
- **Boosted** — shows up more often
- **Default**
- **Muted** — removed from the daily deck entirely, but **never deleted** (still browsable in the Catalog; nothing is destroyed, just deprioritized)

Explicit taps set it directly; **every 1–5 stamp also nudges the dial**, so the deck personalizes even if the user never opens this screen. (Two-layer design: explicit control on top of implicit inference.)

### Difficulty — flow-state matching
Every challenge carries a **level**, and the app infers the user's level *per drawer* from ratings/history, keeping them in the flow band between bored and defeated. It also asks once on start ("new to this, or done it before?").

| Level | For | Feel |
|-------|-----|------|
| **Dabble** | Never done it | First contact. Max encouragement, min prerequisites. |
| **Dig In** | Tried it before | A real technique or a harder variant. |
| **Deep** | Into this hobby | The rungs that turn a dabbler into a hobbyist. |

> A single difficulty for everyone misses the flow band for almost everyone (too easy = boring, too hard = defeated; both churn). Cheap per-drawer level inference keeps challenges in the sweet spot.

---

## 5. The Challenge: Anatomy, Ladders & Multi-Day

Every challenge pairs a two-minute **micro-lesson** (the actual skill) with one concrete **task**, framed by pre-written **encouragement** and a **resources** pointer. Before commit, a **"what you'll need" checklist** prevents the mid-task rage-quit.

**Full field list:**
- **Micro-lesson** — the 2-minute lesson that teaches the sliver of skill.
- **Task** — one concrete thing to do today (or staged, if multi-day).
- **What you'll need** — checklist; "use what you have first."
- **Accessible alternate** — same lesson, a task without the assumed ability (mobility / vision / hearing).
- **Safety note** — one line, only on heat / blade / wildlife / ingestible challenges (tiered — see §16).
- **Encouragement** — names the bad outcome first; "funny is a valid win."
- **Resources & inspiration** — what a good AND a funny result look like, plus one "go deeper" step.

### Ladders — the retention & "found my hobby" engine
Popular skills grow a **3–8 rung ladder** (dabble → dig-in → deep). This:
1. Triples the catalog's effective size (staving off content exhaustion — see §22), and
2. Turns a dabbler into a hobbyist — the discovery→depth payoff that makes Curio *matter*, not just amuse.

**Cooking is the flagship laddered drawer for launch** — the proof that Curio can make someone *get into* something. Example rung path: knife skills → one pan sauce → fresh pasta → a braise → host a dinner.

### Multi-Day Tracker
Multi-day challenges (sourdough, a 30-day language sprint) run as a **pinned "in-progress" card** and **do not consume the daily new-card slot**. Today's tiny step (feed the starter) keeps the streak; you can still deal a fresh short challenge. Mastery and discovery never compete for one slot.

---

## 6. After: The Stamp

No pass/fail. One question — **"how did that feel?"** — a 1–5 rubber stamp that is the **emotional climax of the loop** (a real animation + haptic thunk; the app's signature moment). It doubles as the preference signal for boost/mute and difficulty.

- **Optional reflection line** — e.g. "the pigeon would not cooperate." Over months, a diary.
- **Optional photo** — attached to the log; *evidence for future-you*, never proof for the system.
- **Low-score tag** — a "2" can mean *boring* / *too hard* / *not my thing*; one tap routes them differently (mute vs. offer easier vs. bad luck).

**Streaks count *attempts*, not perfect scores** — a "2" keeps the streak alive; only quitting halfway breaks it.

> **Integrity by design, not verification.** It's all self-report and that's fine (you only cheat yourself). The app never ships leaderboards or prizes that would give anyone a reason to lie. Keep the stakes internal and the cheating problem dissolves — no invasive verification needed.

---

## 7. Progression: The Curio Cabinet

The hero progression system, **replacing anxiety-streaks** (which would contradict a calm, anti-doomscroll app). You're literally filling a **cabinet of curiosities** — one illustrated specimen token per skill tried, organized by drawer. The hero metric is **"47 skills tried"**: a shelf that only ever grows and never breaks.

- **Growth-only.** Show what you *have*, **never empty ghost slots** taunting you — that would smuggle completionism-anxiety back in.
- **Soft streak, secondary.** A quiet daily rhythm with 1–2 free auto-freezes a month; never a red angry number. The cabinet carries the "keep going" pull through *accumulation*, not *threat*.
- **Comeback flow.** Return after a lapse → "welcome back, your cabinet's right where you left it, here's an easy one." Zero guilt, an easy win, straight back in.
- **The cabinet is the profile** and the year-in-review flex — shareable as "my year of curios."

> **Token art is a parametric/generative system** (a per-drawer shape family + per-skill color/detail variation), NOT 381 hand-drawn originals — keeps the signature screen rich without an impossible illustration bill. Needs an art lead to define the parametric style.

---

## 8. Sharing & Virality

One completed challenge per day can become a share card — a deliberate cap so it never becomes a performative feed. The pitch is always **"here's a weird thing I tried,"** never "look how good I am." Funny results get identical treatment to great ones. **Sharing is free forever** — it's the acquisition engine, never gated.

- **Watermark** — small, corner-anchored, never covering the content.
- **Per-drawer templates** — a cooking card ≠ a meditation card; each share feels intentional.
- **Photo-first** — if you took a shot, it's the card's hero (not a text-only template).
- **Deep link / QR** — "try this exact challenge" drops a friend onto a **web preview** of that challenge, pre-loaded, with install as the CTA. *This* is the real K-factor, not the watermark (nobody types a URL off a Story).
- **Challenge a friend** — first-class action; seeds the "Dabble together" shared-daily-curio feature later.
- **Formats** — Story ratio, square, and plain-text caption.

---

## 9. Data Model

```ts
Skill {
  id: string            // drawer code, e.g. "PHO"
  name: string          // "Photography & Visual Arts"
  oneLiner: string
}

Challenge {
  id: string            // e.g. "PHO-014"
  skillId: string       // "PHO"
  title: string
  level: "dabble" | "digin" | "deep"        // difficulty band (§4)
  ladderStep?: number                       // rung within a skill's ladder
  microLesson: string                       // the 2-minute lesson
  task: string                              // the concrete thing to do today
  stages?: { day: string, task: string }[]  // multi-day only
  needs?: string[]                          // "what you'll need" checklist
  accessibleAlternate?: string              // same lesson, no assumed ability
  safetyTier?: "note" | "acknowledge"       // §16; absent = no risk
  safetyNote?: string                       // the one-line copy, if tiered
  encouragement: string                     // pre-written, low-pressure
  resources: {
    inspiration: string                     // what good AND funny results look like
    goDeeper: string                        // one concrete next step, not a link dump
  }
  budget: {
    time: "2m" | "15m" | "1h" | "half-day" | "multi-day"
    cost: "free" | "cheap" | "splurge"      // relative bands, NOT $ — localization
    setting: "home" | "outdoors" | "errand"
  }
  context?: { daylight?: boolean, dry?: boolean, quiet?: boolean } // smart deck (§3)
  region?: string[]                         // culture/geo-specific challenges
  units?: "metric" | "imperial" | "n/a"     // resolved to user setting
  funnyResultsExpected?: boolean            // flags copy that leans into imperfect outcomes
  shareTemplate: string                     // pre-filled caption for the share card
}

UserPreference { userId: string, skillId: string, affinity: -2 | -1 | 0 | 1 | 2 } // muted..boosted
UserLevel      { userId: string, skillId: string, level: "dabble"|"digin"|"deep" } // inferred per drawer
LogEntry       { userId: string, challengeId: string, rating: 1|2|3|4|5,
                 tag?: "boring"|"too-hard"|"not-me", note?: string, photoRef?: string, date: string }
Settings       { units, notificationTime, budgetMoodDefault, wildcardPercent, backupOptIn, theme }
```

**Localization is architected in, not launched:** units are a user setting, cost is relative bands (never `$` figures), and `region` tags let culture-specific challenges be filtered/swapped. Retrofitting this across 2,000 strings later is the expensive path.

---

## 10. The Full Catalog — 24 Drawers, 381 Skills

This is the seed content. Each entry below is a **skill name** (a candidate for one or more authored challenges). The **bold** first item in each drawer is the anchor/first challenge to author. Codes are drawer prefixes for challenge IDs.

> **Launch strategy:** author **40–60 of these fully** (micro-lesson + task + resources + encouragement) spread one-or-two per drawer — *breadth of drawers, depth of a few* — plus one fully-laddered flagship drawer (Culinary). Do NOT ship all 381 half-done. See §22.

**Two gaps flagged to add before ship:** a low-energy **"5-Minute Mind"** set feeding the Right-Now tier, and a **"People In Your Life"** relationship/pet set.

### PHO · Photography & Visual Arts (18)
**Rule-of-thirds bird photography** · Golden-hour portraits · Macro shots of insects · Long-exposure light trails · Smartphone food styling · Silhouette sunset shots · Street photography candids · Charcoal sketching basics · Watercolor washes · One-line contour drawing · Collage from magazine scraps · Stop-motion flipbook · Cyanotype sun prints · Pinhole camera basics · Claymation stop-motion scene · Whiteboard animation loop · Shadow puppet show · Cinemagraph (mostly-still photo, one moving part)

### CUL · Culinary & Baking (19) — *flagship laddered drawer*
**Cake from scratch, frosting optional** · Knife skills: dice an onion · Five-minute pan sauce · Homemade pasta by hand · Perfect scrambled eggs, three ways · Cold brew concentrate · No-yeast flatbread · Whip egg whites to soft peaks · Caramel without a thermometer · Plate a dish like a restaurant · Ice cream in a bag · Homemade yogurt from a spoonful of culture · Butter from cream, by hand · Spice blend from scratch · Stock from kitchen scraps · Temper chocolate without a thermometer · Pour a latte-art heart · Homemade mayonnaise, by hand · Sharpen a kitchen knife properly

### FER · Home Fermentation & Brewing (14)
**Sourdough starter, flour to first loaf** *(multi-day)* · Kombucha, first ferment *(multi-day)* · Quick sauerkraut in a jar · Ginger bug soda starter *(multi-day)* · Fermented hot sauce · Small-batch kimchi · Home-brewed root beer (non-alcoholic) · Vinegar mother from leftover wine · Miso-style bean paste starter *(multi-day)* · Tempeh at home *(multi-day)* · Sourdough discard pancakes · Fermented honey garlic *(multi-day)* · Quick-refrigerator pickled onions · Learn to smell when a ferment's gone right

### BRD · Birdwatching & Wildlife Watching (16)
**Identify five birds by silhouette alone** · Keep a one-day birding log (time + species) · Learn one bird call by ear · Set up a backyard feeder and wait · Watch one bird for ten full minutes · Tell a hawk from a vulture in flight · Find and identify an animal track · Identify a local mammal by size and movement · Count distinct bird calls in five minutes · Tell a crow from a raven · Backyard moth-watching with a porch light · Sketch a bird (for attention, not accuracy) · Learn one owl call · Watch bees work a single flower · Identify a butterfly by wing pattern · Start a "life list" with one entry

### LAN · Language & Communication (18)
**Three Portuguese street phrases** · Order coffee in Japanese · Sign-language alphabet · Spanish tongue-twisters · Write your name in Hangul · Five words in an unrelated language · A full day of active listening · Practice a British RP accent · Read a menu in French · Morse code your name · Improv "yes, and" with a stranger · Compliment someone in Swahili · Debate both sides of a silly topic · Haiku about your commute · 30-day sprint on one language *(multi-day)* · Learn the NATO phonetic alphabet · Practice a job-interview answer out loud · Learn to introduce yourself in ASL

### CRA · Craft & Making (18)
**Sand and oil a wood coaster** · Whittle a simple spoon · Hand-sew a button · Macramé a plant hanger · Fold an origami crane · Wire-wrap a stone pendant · Candle pouring basics · Bind a mini notebook · Screen-print a tote bag · Repair a torn seam · Build a birdhouse from scraps · Stamp a leather keychain · Knit a single row (garter stitch) · Clay pinch-pot · Repair a squeaky hinge · Cast a small object in plaster · Solder a simple circuit · Build a slingshot

### PFT · Paper, Fiber & Textile Arts (18)
**Cross-stitch one small motif** · Embroider a simple flower · Piece one quilt square · Crochet an amigurumi ball · Weave a mini potholder on a loom · Weave a mini basket from paper strips · Needle-felt a tiny wool shape · Make a friendship bracelet · String a beaded bracelet · Tie-dye a plain t-shirt · Batik wax-resist on fabric scrap · Dye fabric with onion skins or beets · Marble paper with shaving cream · Linocut print a single card · Fold and bind a zine · Hand-letter a quote · Make a pom-pom · Sew a drawstring pouch

### MOV · Movement & Body (18)
**10-minute full-body stretch** · Learn a cartwheel, safely · Balance on a slackline · Juggle three objects · Beginner yoga flow · Shadowbox five rounds · 10,000 steps somewhere new · Jump-rope tricks · Handstand against a wall · Partner acro pose · Box-step waltz basics · Plank challenge · Stretch toward the splits · Tai chi's opening move · Beginner tap-dance shuffle · Salsa basic step · Deadlift form with a light weight · 30-second cold-water plunge *(safety tier)*

### MUS · Music & Sound (17)
**Three chords on guitar** · Beatbox a basic loop · Whistle a tune, on key · Body-percussion rhythm · Hum harmony to a song · Write one verse of a song · Play spoons like a folk musician · Tune a ukulele by ear · Record a one-minute podcast intro · Compose a 4-bar melody · Read the bass clef · Practice scat singing · Make a rain-stick from a tube · Read simple drum notation · Overtone singing basics · Loop a beat by clapping · Learn a lullaby by ear

### WRI · Writing & Storytelling (17)
**Six-word memoir** · Letter to your future self · Flash fiction in 100 words · Interview a family member · 10 minutes of freewriting · Write a limerick · Fake review for something absurd · Start a one-line-a-day journal · Write your own eulogy, for laughs · Pitch a movie in one sentence · Ghostwrite a birthday card poem · Haiku about breakfast · Outline a story you'll never finish · Cover letter for a job that doesn't exist · Fake Yelp review of your own kitchen · Break-up letter to a bad habit · Bedtime story on the spot

### NAT · Nature & Science (16)
**Identify five backyard plants** · Find one constellation tonight · Leaf-print art piece · Compost your first batch · Identify a bird by its call · Simple volcano reaction · Press wildflowers into a book · Track the moon for a week · Build a rain gauge · Skip stones, count the bounces · Terrarium in a jar · Learn one cloud type by sight · Test your yard's soil pH · Float an egg in salt water · Make a rainbow with a hose or prism · Collect and identify three types of rocks

### GRW · Growing Things (14)
**Grow a bean in a wet paper towel** · Start seeds in an egg carton · Propagate a succulent from a leaf · Repot a root-bound houseplant · Build a small compost bin · Start a worm bin · Prune a houseplant properly · Make your own potting mix · Plant one pollinator-friendly flower · Root a cutting in a glass of water · Windowsill herb garden, first harvest *(multi-day)* · Direct-sow one vegetable from seed *(multi-day)* · Build a simple raised garden bed · Learn to read a seed packet

### GAM · Strategy & Games (16)
**Chess: four opening moves** · Solve one Rubik's cube face · Solitaire with real cards · Learn a card trick · A strategy board game, solo · Beat your own puzzle high score · Go's basic capture rule · Host a trivia round for one · Build a house of cards · Backgammon's opening rolls · Speed-solve a jigsaw corner · Poker against yourself · Memorize a deck-order trick · Mahjong's basic tile sets · Speedrun a simple video game level · Host a household escape-room puzzle

### MNY · Money & Life Skills (17)
**5-minute budget spreadsheet** · Negotiate one price today · Sew on a name patch · Change a tire, or practice · Fix a running toilet · Read a wine label · Iron a shirt properly · Tie six useful knots · Set up automatic savings · Parallel park better · Read a mortgage statement line by line · Pack a bag with the roll method · Draft a will's first outline · Read a car's dashboard warning lights · Set up a bill-pay reminder system · Learn the basics of a credit score · Practice a hard conversation you've avoided

### TEC · Digital & Tech Creativity (17)
**Edit a 15-second video clip** · Learn three keyboard shortcuts · Build a one-page website · GIF from your camera roll · Try a generative art prompt · Automate one repetitive task · Touch-type the home row · Record and edit a voice memo · Make a meme from scratch · Try a no-code app builder · Learn one spreadsheet formula · 3D-model a simple shape · Colorize an old photo · Refine an AI image-generation prompt · Build a simple budget-tracker template · Set up a password manager · Record a screen-share tutorial

### MND · Mindfulness & Reflection (16)
**Five-minute silent sit** · Gratitude list of ten things · Digital declutter, one folder · Body scan before bed · Write a fear, then reframe it · Practice box breathing · Walk with no phone · Single-task lunch, no scrolling · Letter you'll never send · Sit with boredom, ten minutes · Loving-kindness meditation · Mindfully declutter one drawer · Practice saying no, once · 24-hour social media pause · Reframe three things that went wrong · 4-7-8 breathing before bed

### SOC · Social & Community (16)
**Compliment three strangers** · Call a friend from a year ago · Write a thank-you note · Volunteer for one hour · Learn a neighbor's name · Host a mini potluck · Teach someone a skill you know · Start a conversation in line · Send a care package · Organize a small skill-swap · Give feedback that's actually kind · Ask someone their story · Plan a small surprise for someone · Write a genuine recommendation for someone · Invite a coworker you've never talked to, to lunch · Leave a detailed five-star review for a small business

### OUT · Outdoors & Adventure (16)
**Bird photography, rule of thirds** · Build a campfire, safely *(safety tier)* · Read a trail map · Forage something edible, with a guide *(safety tier)* · Sleep under the stars, backyard edition · Take a basic compass bearing · Identify poison ivy · Pitch a tent · "Notice five colors" walk · Night photography of the sky · Whistle loud enough to hail a cab · Map a new route home on foot · Try geocaching for one hidden container · Fish from shore with borrowed gear · Watch a full sunrise, start to finish · Skip a stone across water

### HIS · History & Culture (16)
**Learn one flag's story** · Cook a dish from another culture · A folk dance's basic step · Read one page of a myth · Learn a proverb in another language · Visit a museum you've never entered · Your street name's history · A board game from another culture · A historical event from today's date · Music from a decade you skipped · A toast in another language · Trace your family's migration on a map · One word of a dying language · Your family recipe's origin story · Read a "this day in history" page aloud · The story behind a local landmark

### STY · Style & Self-Care (16)
**Try a new hairstyle for a day** · Give yourself a manicure · Organize your closet by color · Tie a bow tie · Five-minute skincare routine · Steam and iron your best outfit · A new way to fold a pocket square · Capsule-wardrobe experiment · Try a bold lip color · At-home facial · Polish your shoes properly · Learn a hairstyle braid · Practice good posture for a day · Five-minute cold-shower finish · Match a scent to your mood for a day · Try a different part in your hair

### MDL · Model Making & Miniatures (14)
**Build a Lego freebuild, no instructions** · Build a diorama in a shoebox · Popsicle-stick bridge · Paper model of a building · Assemble a model car or plane kit · Dollhouse-scale furniture piece · Simplified ship-in-a-bottle · Sculpt a miniature figure in polymer clay · Marble run from household objects · Pinhole diorama theater · Carve or print a small object · Build a to-scale birdhouse model · Miniature-scale terrarium garden · Cardboard automaton with a crank

### MAG · Magic & Sleight of Hand (12)
**Learn one coin vanish** · The cup-and-ball trick · Practice a card force · A card flourish (fan or spring) · Twist one balloon animal · A "guess the number" mentalism trick · Palm a small object convincingly · A rope-cut illusion · Practice a levitation-of-object gag · Learn a false shuffle · Perform a trick for one person, read the reaction · "Torn and restored paper" trick

### PRF · Performance & Voice (12)
**Write and perform one minute of stand-up** · Three celebrity impressions · Give a two-minute toast to no one · Practice a job-interview answer on video · Sing karaoke and actually watch the playback · Record a voicemail greeting you're proud of · Debate yourself on a silly topic, both sides · Read a children's book in character voices · Public speaking to a mirror, five minutes · Dramatic reading of a grocery receipt · Host a one-person trivia night · Record a "commercial" for something you own

### COL · Collecting & Curating (10)
**Start a collection with one object** · Build a themed 10-song playlist in one sitting · Curate a mood board for somewhere you'd like to go · Organize your bookshelf by color for a day · Build a "museum shelf" of five meaningful objects · Catalog your houseplants with names and care notes · Start a pressed-flower collection page · Build a folder of five favorite childhood photos · Curate five recipes you want to master this year · Start a jar of "good day" notes to open in a year

---

## 11. Fully-Authored Challenge Examples (Templates)

These four show the target quality and voice for authored challenges. Use them as the template when writing the rest.

### PHO-014 — Shoot a bird using the rule of thirds
- **Level:** dabble · **Budget:** free / 15m / outdoors · **Context:** daylight, dry
- **Micro-lesson:** Split the frame into a 3×3 grid. Put your subject on one of the four crossing points instead of dead center — the eye reads it as more alive, less like a mugshot.
- **Task:** Find any bird — pigeon counts — and take 5 shots with it off-center. Keep your favorite.
- **Accessible alternate:** Can't get outdoors or track a moving subject? Reframe any still object in the room the same way — a mug, a plant, a shoe by the door.
- **Encouragement:** Blurry, too far away, flew off mid-shot — that's the whole exercise. You're training your eye, not auditioning for National Geographic.
- **Resources:** *Inspiration —* a perfectly-framed pigeon on a wire, or a squirrel that photobombed the whole shot; both count. *Go deeper —* try the same grid on a person or a plate of food tomorrow.
- **Share template:** "Shot a bird using the rule of thirds 📷"

### LAN-002 — Three Portuguese phrases for the street
- **Level:** dabble · **Budget:** free / 10m / anywhere
- **Micro-lesson:** Portuguese softens its "s" at the end of words into a "sh" sound — "dois" sounds like "doysh." Say it out loud before you read on.
- **Task:** Learn "obrigado/a" (thanks), "quanto custa?" (how much?), and "com licença" (excuse me). Use all three on someone today, even if it's the barista.
- **Encouragement:** Mangling the accent is part of learning it. Nobody has ever been mad at someone for trying.
- **Resources:** *Inspiration —* record a voice memo before and after; most people can hear themselves improve. *Go deeper —* this skill has a 30-day sprint version if three phrases wasn't enough.

### FER-001 — Sourdough starter, flour to first loaf *(multi-day)*
- **Level:** dabble · **Budget:** cheap / multi-day (5 days, 5 min/day) / kitchen
- **Micro-lesson:** Flour and water left out attract wild yeast and bacteria already floating in your kitchen air — you're not adding life to it, you're inviting it in. Feeding it daily just keeps that colony fed faster than it starves.
- **Stages:**
  - *Day 1:* Mix equal parts flour and water in a jar. Loosely cover. Leave it out.
  - *Day 2:* Discard half, feed with fresh flour and water. Nothing's happening yet — that's normal.
  - *Day 3–4:* Watch for bubbles and a sour smell. Keep feeding once a day.
  - *Day 5:* It should double a few hours after feeding. Use the discard for pancakes as a first win before a full loaf.
- **Encouragement:** A flat, grey, weird-smelling starter on day 2 is not a failure report — it's day 2. Most starters look unpromising right up until they don't.
- **Resources:** *Inspiration —* real starters range from soupy-beige to thick-streaky; there's no "correct" look, only "is it bubbling." *Go deeper —* search "sourdough starter troubleshooting" the first time it does something confusing.

### CUL-009 — Bake a cake from scratch
- **Level:** dabble · **Budget:** cheap / 1h active (≈2h total) / kitchen · **funnyResultsExpected:** true
- **Micro-lesson:** Creaming butter and sugar together traps air — that's what makes a cake rise without help. Beat it until it's pale and fluffy, not just mixed.
- **Task:** Pick any from-scratch recipe (we'll suggest three by pantry match). Bake it. Frosting is optional; a plate and a fork are not.
- **What you'll need:** flour · sugar · butter · eggs · a tin *(check "use what you have first")*
- **Encouragement:** Sunken middle, burnt edge, tastes incredible anyway — funny results are a completely valid outcome. Rate it a 5 if you laughed.
- **Resources:** *Inspiration —* the gallery for this card is mostly lopsided, sunken, collapsed cakes with five-star ratings; that's the point. *Go deeper —* try a second layer, or frost one badly on purpose.

---

## 12. Voice & Sensitivity Guide

The voice is the **one moat competitors can't clone in a weekend** — codify it before the catalog scales, or it regresses to the mean.

**The single job of every line:** make someone who has never done the thing feel safe trying it badly. Name the bad outcome before they can worry about it; treat "funny" as a legitimate win condition, not a consolation prize.

| Rule | Instead of… | Write… |
|------|-------------|--------|
| **Name the bad outcome first** | "Take a stunning bird photo." | "Blurry, too far, flew off — that's the exercise. You're not auditioning for Nat Geo." |
| **Funny is a win** | "Follow the recipe exactly." | "Sunken, burnt, delicious anyway. Rate it a 5 if you laughed." |
| **Banned words** | master · perfect · stunning · flawless | try · notice · have a go · see what happens |

**Sensitivity guide (mandatory, alongside voice):**
- No medical, financial, or mental-health *advice*.
- "Check with a doctor" on anything physiological (cold plunge, fasting-adjacent).
- Never frame body/appearance challenges around fixing a flaw — curiosity, never prescription.
- The playful voice stays playful everywhere it's safe and turns careful exactly where it must.
- **Any challenge touching safety / health / food / factual claims gets human expert review — never raw AI output.** Add a per-card "report an error" tap so users are your QA net.

---

## 13. Monetization

Freemium that converts on **desire, not frustration**. The free app is a **genuinely complete forever experience**; paid unlocks agency and volume.

| Free forever | Curio+ (~$25/yr, annual-forward) |
|--------------|----------------------------------|
| Today's Curio · Right-Now tier · the daily share · the Cabinet · soft streak · guaranteed first win | Full catalog browse-on-demand · boost/mute · unlimited rerolls · multi-day tracks · seasonal packs · **cloud backup ("never lose your cabinet")** · photo storage |

- **Intent-triggered trial.** A 7-day free week fires the moment a free user reaches for a paid feature (tries to browse the full catalog, boost a drawer) — the highest-intent moment you'll get. **Never paywall on day 1.**
- **Cloud backup is the flagship hook.** The more people love their cabinet, the more devastating loss is, and the more they'll pay to protect it — the MVP's biggest weakness (local-only) reframed as its clearest conversion.
- **Ethical affiliate.** Supply links appear *only* inside "what you'll need," always disclosed (FTC), always with "use what you have first" — **never in the deck or the challenge.** The moment money changes what you're *shown*, trust dies.

> **North Star guards the model:** completions/week, not time-in-app. Chase attention and you rebuild the slot machine you set out to replace.

---

## 14. Onboarding

Time-to-first-value is the #1 predictor of D1 retention. A completed challenge in session one turns "an app I downloaded" into "a thing I did" — the exact identity shift Curio sells — before the user can bounce.

- **One-screen taste quiz** — "Which pull at you?" / "Which never?" (tap images; **"surprise me" is a valid answer**) — seeds boost/mute so card one is warm. Show **"1 of 3"** so it reads as short.
- **Guaranteed first win in-session** — the last onboarding step *is* a 60-second Right-Now curio you complete before ever closing the app. Stamp it, and only *then* introduce streaks/sharing.
- **Plain-English liability + privacy** — a short "use common sense; your cabinet lives on your phone" screen, not a wall of legal text.

---

## 15. Re-engagement

Diversified so it doesn't hinge on one permission dialog (iOS notification opt-in is only ~40–60%).

- **Home-screen widget** *(primary)* — today's curio, passive, no permission needed, sitting on the home screen *next to the apps you're replacing*. The killer re-engagement surface.
- **One gentle daily nudge** — user-picked time (or learned), never fires if today's is already done, respects timezone, contextual copy ("rainy afternoon — here's an indoor curio"). No streak-shaming.
- **Optional email & a "morning ritual" pairing** (with your coffee) as backup paths.

---

## 16. Trust, Safety, Privacy & Accessibility

### Audience & Age
**13+ with a neutral age gate; no open user-photo gallery at launch.** This sidesteps the worst of COPPA/GDPR-K and child-safety burden. Challenges are family-safe regardless. Any under-13 target is a deliberate, lawyered, separate decision — never a drift. *(Age determines legal obligations, data architecture, and whether a gallery is even legal — decide first, build to it.)*

### Safety Tiering
| Tier | Applies to | Treatment |
|------|-----------|-----------|
| **None** | ~95% of challenges | Nothing — keep it calm. |
| **Note** | heat, blades, mild risk | One-line inline safety note. |
| **Acknowledge** | fire, cold exposure, ingestibles | Mandatory tap-through + expert-reviewed. **Reframe wild foraging from "eat" to "learn to identify."** |

### Privacy
**On-device-first.** The log and photos live on the phone; cloud backup is explicit opt-in and ideally end-to-end encrypted ("we can't see your photos, we just store them") — a selling point against data-hungry incumbents. Location is coarse and on-demand only. **Even the local MVP ships one-tap export/import** so a lost phone isn't a lost cabinet.

### Accessibility
- **Content:** accessible-alternate task for every physical/sensory assumption.
- **Interaction:** tap equivalent for every swipe, full screen-reader labels, respected font-scaling, reduced-motion for stamp/cabinet animations, a **list view of the cabinet** for non-visual users.
- **Contrast:** every text/background pair clears WCAG AA at target size; meaning never carried by color alone.

> **Lawyer pass required before launch:** liability waiver, terms, privacy policy matching actual (minimal) data practices, FTC affiliate disclosure.

---

## 17. States & Edge Cases

All states are **warm, illustrated, in-voice** — paper-toned skeleton loaders, never a generic spinner. Empty states are onboarding in disguise.

- **Deck exhausted for today** → "That's today — nicely done. Tomorrow's already picked." A warm stop that reinforces the once-a-day ritual, not an error.
- **Muted everything** → "You've muted a lot — want a wildcard anyway?"
- **Empty cabinet** → an inviting "your first specimen goes here," one tap to start.
- **Offline** → today's + tomorrow's challenge and the whole cabinet are cached; weather/gallery degrade gracefully; share-gen is local.
- **Lapse recovery** → warm, zero-guilt re-entry with an easy win.
- **Day boundary** → resets at local midnight with a generous grace window (a 2am completion counts for the day that just ended, à la Wordle). Soft/frozen streaks make timezone travel a non-issue.

---

## 18. Design System

**Design north star: "calm *and* alive."** Nobody in the daily-habit / hobby space has pulled off both — they're either loud (Duolingo) or sterile. Curio's bet: a warm paper world with three perfect tactile moments feels more premium and more human than any confetti explosion. Keep the calm paper foundation; **spend the energy budget on motion and one bright joy-spark accent.**

### Color tokens

**Light theme:**
```css
--paper:        #E9E3D0;  /* app background */
--paper-card:   #F8F4E7;  /* card surfaces */
--ink:          #1C2521;  /* primary text */
--ink-soft:     #4B564E;  /* secondary text */
--teal:         #1F5C52;  /* primary action, brand */
--teal-strong:  #163F38;  /* share-card ground */
--ochre:        #B9791C;  /* category eyebrows */
--stamp:        #A9402A;  /* the rating stamp ONLY */
--plum:         #6B4E8A;  /* JOY SPARK — celebration/completion only */
--gold:         #C79A2E;  /* milestone glints */
--line:         rgba(28,37,33,0.14);
--line-strong:  rgba(28,37,33,0.28);
```

**Dark theme (deep forest-paper, tuned separately — do NOT naively invert):**
```css
--paper:        #161F1B;
--paper-card:   #1E2A24;
--ink:          #E9E4D2;
--ink-soft:     #A9B3A6;
--teal:         #6FBFAE;
--teal-strong:  #9AD8C9;
--ochre:        #E0B255;
--stamp:        #E08669;
--plum:         #B79BD8;
--gold:         #E7C766;
--line:         rgba(233,228,210,0.14);
--line-strong:  rgba(233,228,210,0.26);
```
Both themes are token-level. Use `prefers-color-scheme` + a `data-theme` override. **Contrast is a known risk of a muted palette** — every text/bg pair must clear WCAG AA (4.5:1 small, 3:1 large) at real size.

### Typography
Three roles:
- **Display / Title** — serif (warmth, editorial calm). Display 28–34px, Title 20–24px, weight 600, `text-wrap:balance`.
- **Body** — humanist sans, 15px, 400. Running text near 65 chars wide.
- **Label / Data** — monospace (the "catalog" texture), uppercase, letter-spacing ~0.08em.

**Hard rules:** nothing below **11px** ever; monospace floors at **12px** (reads smaller than sans); mono for eyebrows/tags/stats only, **never body copy**.

*(Reference face families that fit the brand: a serif like Playfair/Lora, a sans like Inter, a mono like JetBrains Mono. In production, self-host; don't rely on CDN webfonts.)*

### Spacing / Radii / Elevation
- **Spacing:** 4px base → 4 / 8 / 12 / 16 / 24 / 32 / 48. Lay out with flex/grid + `gap`, never per-element margins. Screen gutters 16px, card padding 16px.
- **Radii:** sm 6 / md 12 / lg 16 / pill 999.
- **Elevation:** deliberately low and paper-like — a hairline border + one soft shadow. No heavy Material drop-shadows; cards feel like stock on a desk.

### Iconography
**Etched line icons, one consistent stroke weight, never emoji** anywhere in the app's own chrome. (Emoji only inside user-written reflections.) Use a Lucide-style set.

### Components
- **Buttons:** exactly **one filled (primary) button per screen**; everything else ghost or text link. Min touch target 44px. Primary CTAs in the bottom thumb zone.
- **Chips:** budget moods + filters, pill-shaped, mono text.
- **Challenge card:** paper-stock, hairline border, a soft watercolour wash in one corner (the "alive" texture at rest). Serif title, mono eyebrow (category · level), mono tags.
- **The stamp:** 48px targets, generous gap; selected state rotates like a rubber stamp + rust color + soft shadow.
- **Cabinet tokens:** parametric illustrated specimens (per-drawer shape family + per-skill variation); **never empty ghost slots.**

### Motion & Tactility — the most important section
Static, the calm aesthetic risks feeling *dead*. Motion proves it's **calm, not lifeless.** Spend the budget on three signature moments; keep everything else quiet.

| Moment | Motion | Haptic / sound | Feel |
|--------|--------|----------------|------|
| **The Stamp** (rating) | Press-down + slight rotate + settle, the number "inking" in rust | Firm thunk + soft paper-press | The defining moment — like stamping a passport. Satisfying enough to do for its own sake. |
| **The Deal** (new hand) | Cards slide in and settle with real weight | Soft shuffle whisper | Tactile — "these are real cards." |
| **The Landing** (completion → cabinet) | New specimen eases into its drawer slot; a single plum/gold glint | Gentle chime + light haptic | The reward. The one moment the joy-spark color appears. |

**Principles:** calm easing (no springy bounce-fest, no slot-machine energy), short durations (150–350ms), one thing moving at a time, **always respect `prefers-reduced-motion`** (fall back to cross-fade + haptic).

### Do / Don't
**Do:** keep the calm paper foundation · spend energy on the 3 signature motions · one filled primary button per screen · line icons everywhere in chrome · design empty/offline/loading states in-voice · show what you've collected, never what's missing.
**Don't:** let it feel like a museum (static + all-muted = dead) · ship text under 11px or mono body copy · use emoji in app chrome · stack two competing filled CTAs · show empty ghost cabinet slots · use bouncy/slot-machine motion.

---

## 19. Screen Inventory

1. **Onboarding / taste quiz** — one screen, tap-select images, "surprise me," progress "1 of 3," ends in a first-win curio.
2. **Today's Curio (home)** — greeting + date + soft day count, budget-mood chip, one big hero challenge card, primary "Start" CTA, secondary "deal another" link, bottom tab bar (Today / Cabinet / Catalog / You).
3. **The deck** — finite hand of 5–7 cards, tap to open (swipe as accelerator).
4. **Challenge detail** — category·level eyebrow, title, micro-lesson, task, "what you'll need" checklist, encouragement, (safety note if tiered), sticky "I'm in" CTA (hide tab bar here).
5. **The stamp (rating)** — full-screen, "how did that feel?", 1–5 stamps, optional reflection line + photo, "Stamp & log it" CTA. The animation climax.
6. **The Curio Cabinet** — hero count ("47 skills tried"), per-drawer token rows (no empty slots), share affordance.
7. **Share card** — per-drawer template, photo-first, watermark, deep-link/QR, format toggle (Story/Square/Text).
8. **Catalog** (Curio+) — search, filter by drawer/budget/level, saved list, "done" checkmarks.
9. **Tune my deck** (settings group) — boost/mute dials, wildcard, budget moods.
10. **Multi-day tracker** — pinned in-progress card.
11. **States** — empty/offline/loading/lapse, all in-voice.

**Ergonomics:** primary CTAs and tab bar in the natural bottom thumb zone; never put a *control* in the hard-reach top third (info that's read, not tapped, is fine up there).

---

## 20. Tech, Platform & MVP Scope

**Launch as a polished PWA** on a React / Vite / Tailwind stack. Reuse the `html-to-image` share-card pattern (proven in the sibling "Globalio" project). The share deep-link's web preview doubles as the landing surface. Go native (React Native / Expo) once the habit is proven and you specifically need widgets, better notifications, and app-store presence.

**Ruthless MVP scope:**
- **IN:** taste quiz → Today's Curio + Right-Now tier → do → stamp → cabinet → daily share card. **Local-only** (no accounts, no backend). ~50 fully-authored challenges across all drawers + one fully-laddered flagship drawer (Culinary). One-tap export/import.
- **OUT (until habit proven):** accounts, backend, cloud sync, the gallery, social, community submissions, the physical card deck.

> The single riskiest assumption is *"will people do a real-world challenge daily instead of scrolling?"* — fully testable with a local app and zero backend. Everything server-side is premature until that's a yes.

**Suggested build order:** (1) data model + seed the ~50 challenges as JSON · (2) Today's Curio + detail + stamp loop, local storage · (3) the Cabinet + token system · (4) budget moods + finite deck + wildcard · (5) share-card generation · (6) onboarding + first win · (7) states + offline cache · (8) Right-Now tier · (9) export/import.

---

## 21. Roadmap

- **Phase 0 · Prove the habit** — Local PWA MVP. The core loop, 50 great challenges, the cabinet, the share card. *Goal: do people come back for a week? Measure completions/week.*
- **Phase 1 · Depth & money** — Fully ladder 3–4 drawers, ship freemium + cloud backup, home-screen widget, seasonal packs, difficulty inference.
- **Phase 2 · Together** — "Dabble together" shared daily curio, challenge-a-friend, curated inspiration (stats/staff-picks — still no open UGC photos).
- **Phase 3 · Scale content** — Curated community-submission pipeline (users *suggest*, staff/trusted-contributors rewrite to voice + safety-check), native apps, first non-English/US locale. Only once voice, safety, and moderation tooling are solid.

---

## 22. Design Decisions & Rationale (Audit Log)

The reasoning behind the non-obvious calls, so nothing from the review process is lost. (Scores are from the two audit rounds, 1–10.)

**From Round 1 (concept teardown, composite 5.9):**
- **Doomscroll fit was the weakest core (5/10)** → added the Right-Now tier. Real-world challenges can't be done in the low-energy moments the scroll owns; without a phone-only micro-tier the whole thesis cracks.
- **Monetization was absent (2/10)** → freemium + affiliate. Hand-authored content is expensive; "free, no plan" is a founder-killer.
- **Onboarding was absent (2/10)** → taste quiz + guaranteed first win.
- **Streaks contradicted the calm brand** → replaced with the growth-only Cabinet (the collection metaphor fits "cabinet of curiosities" perfectly and removes streak-anxiety).
- **Removed:** open user-photo gallery from v1 (moderation/CSAM/COPPA landmine), accounts from MVP, any leaderboard framing (invites cheating on self-report).

**From Round 2 (v0.3 audit, composite 5.8 — the score barely moved because fixing the top layer exposed a deeper one):**
- **Difficulty matching (4/10)** → the dabble/dig-in/deep level system. A beginner and an expert getting the same card misses the flow band for both.
- **Content exhaustion:** a daily user burns 381 challenges in ~13 months → **ladders** (3–8 rungs/skill triples effective catalog) + **seasonal packs** (cadence outruns fastest users).
- **Localization (3/10)** → architect seams now (units setting, relative cost bands, region tags); retrofitting 2,000 strings later is brutal.
- **Data loss risk** of local-only → one-tap export + cloud-backup-as-Curio+-hook ("never lose your cabinet" turns the weakness into the conversion).
- **No North Star (3/10)** → completions/week, never time-in-app (or you rebuild the slot machine).
- **Age/COPPA undecided (4/10)** → 13+, no open UGC at launch.

**From the UI analysis (bones strong, living layer to build):**
- Core tension: the archival/paper aesthetic is a real asset but static reads as "old/dead" to a young audience → **keep the calm, spend on motion** (the 3 signature moments) + a plum joy-spark.
- Type floors (11px / 12px mono) — the charming mono was illegibly small and flirting with WCAG failure.
- One primary CTA per screen (Today had two competing).
- Kill empty ghost cabinet slots (they smuggle completionism-anxiety back in).
- Design empty/offline/loading states — a third of real sessions, currently blank.

**Content authoring is the real company.** 381 names ≠ 381 challenges (~6 authored fields each = 2,000+ crafted, fact-checked, safe strings + upkeep). Launch narrow-and-deep (40–60 loved > 381 mediocre), build an AI-assisted-but-always-human-edited pipeline, codify voice first, open curated community submissions as the long-tail path.

---

## 23. Open Questions

- **Name:** Curio vs. Dabble — pending trademark + app-store + domain search. ("Curio"/"Curious" are crowded; "Dabble" describes the behavior and may be more ownable.)
- **Token art direction:** the generative specimen system needs an illustrator/art lead to define the parametric style.
- **First-locale bet:** which market after English/US, and when.
- **Exact Curio+ price** and whether a lifetime option exists.
- **Content velocity:** who writes the catalog past the first 50 — in-house, contractor pool, or contributor tier — and at what cadence.
- **App-store discoverability:** nobody searches "Curio"; optimize the store *subtitle* for the job-to-be-done ("daily challenges to learn a new skill") and lean on the share-card + deep-link loop for acquisition.

---

*Curio — Master Build Bible v0.4. Self-contained. Companion illustrated HTML docs live in `/curio/docs/`. This markdown is authoritative.*
