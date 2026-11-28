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
(`scripts/flag-identifier/more.mjs` and `codex.mjs`; countries are in
`checked.mjs`), then `build.mjs` writes `src/data/flagIdentify.ts`. To add a
category: draft it with `measure.mjs` (or make contact sheets with
`sheets.mjs <dir> <kind>`), check and correct every line by eye, add the
lines, rebuild, and run `npm test`.

Covered (3,230 flags, Nov 2026), 3,882 of the 4,573 entries on the Codex's
Browse-all wall (the rest are mostly the same flag under another name, or
left out below):
- Countries: all 197.
- States and regions (1,295): first-level divisions of 100+ countries from
  `subdivisions.ts` (every US state, Canada, Australia, Germany, Spain, Japan,
  Russia, Thailand, Kenya, Romania, Indonesia, Peru, Ukraine, Ireland…), UK
  councils, dependent territories (Gibraltar, Bermuda, the Falklands…).
- US cities: 110 of the 124 in `usCityFlags.ts`.
- Historical (780): `historicalFlags.ts`, the extinct-states gallery, the
  former flags in every country's history in the Codex, and the UK nations'
  old banners.
- Pride, peoples and identity (679): all 44 pride flags and about 600
  peoples' flags from the cultural-flags gallery (`ethnicFlags.ts`).
- Movements (128) and organizations (41).

How the Codex batches were made (`scripts/flag-identifier/codex.mjs`):
`measure.mjs` drafts each flag from its image (colours by share of the area,
under 6% marked small; stripes from clean rows and columns; "plain" from one
colour on most of the flag), draws contact sheets with the draft under each
flag, and every flag was then checked by eye and corrected before its line
went in. Crosses, discs, triangles and all symbols are added by eye.

Left to do:
- World city flags (`src/data/cityFlags.ts`, on another branch): add a
  `wcity:` source to `build.mjs` (it prints a reminder once the file is
  there) and describe them in `codex.mjs` the same way.
- Left out, listed in `codex.mjs` by name (about 390 flags): a seal or coat
  of arms on one plain colour that can't be told from three or more others
  (52, mostly Japan, Peru, Bulgaria, Montenegro), most Romanian, Thai, Korean,
  Estonian-style and Albanian seal-on-white flags, logo or text flags (Korean
  provinces, Danish regions, organisations' logos, Liechtenstein's ribbon
  flags), and maritime signal flags. They need words for what's inside a
  seal before they can be told apart.
- Mexico's 27 coat-of-arms-on-white state flags, for the same reason.
- Peoples' flags that are a country's or region's own flag under the people's
  name (about 210, like "Portuguese people"): searchable as that flag already.
- No words yet for rays from the centre, a tree versus a flower, a ship, or
  the order of stripes (so tricolours in the same colours tie).

## Notes / smaller follow-ups
- **City flags (Codex, beta).** The Codex's "City Flags" section lists cities by
  continent, then country, biggest first: 491 cities in 44 European countries
  (built by `scripts/cities/build.mjs` from Wikidata, English Wikipedia and
  Wikimedia Commons; `--offline` rebuilds from its cache, `--selection` prints
  what it picked and why the rest was left out) and the 124 U.S. cities of
  `usCityFlags.ts` under North America. Each European country has its capital,
  every place of 100,000 or more (at most 25), and at least 10 where it has
  that many. Still to do:
  - Other continents, one at a time, with the same rule: the rest of North
    America (Canada, Mexico, the Caribbean), South America, Asia, Africa,
    Oceania. Each needs a pass of `FLAG`/`DROP`
    checks on contact sheets (logos and coats of arms filed as flags) and a
    `LANGS` entry per country.
  - A city flag game: "Which city?" (a flag, four cities of the same country),
    built on `CITY_ATLAS` (`src/data/cityAtlas.ts`), with the U.S. City Flags
    game folded in as its United States round. Flag Bracket could take a
    "European cities" set the same way.
  - Gaps on Wikidata: big cities with no flag image or no dated population
    there (London and Athens have no flag at all; Linz, Espoo, Cluj-Napoca,
    Timișoara, Manchester, Leeds…), Lyon (its only file is GFDL), and
    Copenhagen and Luxembourg City (their files are logos).
    Add them by hand in `FLAG`/`EXTRA` once a free file is on Commons.
  - Descriptions: only the 35 cities whose flag has its own English Wikipedia
    article have one. Other-language articles (de, fr, it, pl) would cover many
    more, checked by hand.
  - Smaller places with famous flags under the 100,000 line (Siena; Bruges is
    already in) were left out on purpose; add them only by hand, with a reason.
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
