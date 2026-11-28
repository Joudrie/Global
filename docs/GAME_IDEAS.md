# Game ideas — backlog

Captured from playtest feedback. Not built yet — parked here so they're not lost.

## 1. GeoPaint (colour-match)

A colour-matching game. The player is shown a country and a target flag layout
with one region highlighted (e.g. "Put **Sweden** here" with the yellow cross
shown). They start from a random colour on the wheel and use three sliders —
**Hue, Saturation, Lightness (HSL)** — to match a given region of the flag to
its real-world colour as closely as possible.

- Score = how close the chosen colour is to the official flag colour (ΔE / HSL
  distance), per region, averaged.
- Could reuse the official hex values we already store in `buildFlagPuzzles.ts`
  piece colours, or pull from a per-flag palette table.
- Open question: single-region rounds first (easier), then multi-region flags.

## 2. Flaggle-style outline reveal (distinct from existing Flagle)

Inspired by "Flaggle Online" (verify we're not copying their assets — clean-room
the mechanic, not the content). Mechanic: the player **types a country/flag
guess**; for each guess, only the **outline of the parts of that flag's design
that overlap the answer flag** is revealed, narrowing the answer down by
elimination.

- Note: we already ship a `flagle` screen (FlagleScreen.tsx) — this is a
  *different* mechanic (outline/overlap reveal), so it would be a new game id,
  not a replacement.
- Open question: how to compute "overlapping design parts" — likely a curated
  per-flag feature set (stripes/canton/disc/cross/star) rather than pixel diff.

## Flag Identifier: every kind of flag, category by category

The identifier searches more than country flags now, and asks (optionally)
what kind of flag it was: picking a kind puts those flags first and still lists
every other flag that fits below them. Each flag is described in the same words
as the countries, by eye against the image the site shows
(`scripts/flag-identifier/more.mjs`; countries are in `checked.mjs`), then
`build.mjs` writes `src/data/flagIdentify.ts`. To add a category: make contact
sheets (`sheets.mjs <dir> <kind>`, or look at the source images), write one line
per flag in `more.mjs`, rebuild, and run `npm test`.

Covered (662 flags, Nov 2026):
- Countries: all 197.
- States and regions (252): US states, DC and territories (56), Canada (13),
  Australia (8), Germany (16), Austria (9), Spain (19), Switzerland (26),
  Italy (20), France (18), the Netherlands (12), Belgium (11 provinces and
  regions, plus Flanders and Wallonia), Brazil (27), 5 Mexican states, England,
  Scotland, Wales, Cornwall, Greenland, the Faroes, Åland, Kurdistan Region,
  Zanzibar, Republika Srpska, Antarctica.
- US cities: 104 of the 124 in `usCityFlags.ts`.
- Pride and identity (63): all 44 pride flags, plus the best-known peoples
  (Aboriginal, Māori, Sámi, Romani, Amazigh, pan-African, pan-Arab, pan-Slavic…)
  and religions.
- Movements (23) and organizations (20): Catalan esteladas, Tibet, unrecognised
  states (Somaliland, TRNC, Abkhazia…), the EU, UN, NATO, Olympics, Red Cross…
- Historical: only the Ulster Banner, Artsakh and Biafra so far.

Left to do, most looked-for first:
- Historical flags (`historicalFlags.ts`, `extinctStates.ts`, the Codex
  timelines): USSR, Yugoslavia, East Germany, the Confederacy, Ottoman Empire…
  The "Historical" kind has only 5 flags until then.
- Other first-level divisions: Japan's 47 prefectures, Argentina, Russia's
  republics, the UK's council flags, the rest of `subdivisions.ts`.
- Mexico's other 27 states: each is the state's coat of arms on white, so the
  words can't tell them apart; they need a way to describe the arms first.
- The rest of the identity flags: separatist and autonomous (about 110 left),
  pan-national and indigenous peoples, micronations, causes (anarchist flags
  and so on).
- US cities left out: logos only or too busy to describe in these words
  (Sacramento, Tampa, Irvine, Fort Collins…), Yonkers (its image doesn't load),
  and Oklahoma City and Jersey City, whose images here are their state's flag.
- No words yet for some common symbols, so those flags lean on colours and
  layout: a fleur-de-lis, a key, an anchor, a hand, a heart, a checkerboard or
  rays from the centre.

## Notes / smaller follow-ups
- **Coats of arms (Codex, beta).** The Codex's "Coats of arms" section (below
  "Browse all 4,500+ flags") covers every country: 192 current coats of arms,
  emblems and seals, 160 with former ones (479 images, 32 of them undated), and
  a "Coats of Arms" flashcard deck (Flashcards → Codex). Built by
  `scripts/arms/fetch.mjs` from Wikidata, the emblem's English Wikipedia
  article, then (for countries that article leaves bare) the country's own
  Wikipedia, the German, French, Spanish and Russian ones, and Commons'
  "Historical coats of arms of …" categories; `--offline` rebuilds from its
  cache, `--why` explains every image. Emblems of fascist and Nazi-era regimes
  (and their Axis puppet states) stay out. Still to do:
  - Former arms for the 32 countries still on "coming soon": Argentina,
    Belgium, Bhutan, Switzerland, Djibouti, Denmark, Micronesia, Gabon,
    Honduras, Indonesia, Israel, Jordan, Japan, Liechtenstein, Luxembourg,
    Monaco, Marshall Islands, Maldives, Niger, Palestine, Sweden, San Marino,
    Somalia, South Sudan, São Tomé and Príncipe, Eswatini, Chad, Tonga, Tuvalu,
    the United States, Vatican City and Kosovo. Many never changed their arms
    (Japan, Switzerland, the Vatican, the US seal); the rest show the history
    only in royal or personal arms, drawings, photos, 1840s armorial plates or
    rows without dates, or in file titles no second source dates. These need a
    person with the sources (a national heraldry office, a constitution's text).
  - Skipped: Lebanon, Libya and Turkey (no official arms in Wikipedia's
    infobox), Nicaragua and Oman (their only images carry licences that aren't
    public domain or Creative Commons: "Attribution", "OGL-om"). Canada, France
    and the United Kingdom were chosen by hand. Recheck when these change.
  - The deck shows today's arms only; former ones could become a second deck.
  - Later: subdivisions (states, provinces) and royal houses.
  - Maybe a game, e.g. "Whose coat of arms?" (pick the country from its arms).
    Flags stay front and center: the arms are a side door, not the main menu.
- "Peoples & Cultures" fun-fact pool currently has **32** entries (only flags
  with a written `note` show). Expanding it means writing more cultural facts in
  `src/data/ethnicFlags.ts` — content task, flagged for a decision.
- Gauntlet: a few flags render slightly zoomed-in — reported as acceptable for now.
