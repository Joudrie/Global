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

Covered (1,192 flags, Nov 2026):
- Countries: all 197.
- States and regions (429): US states, DC and territories (56), Canada (13),
  Australia (8), Germany (16), Austria (9), Spain (19), Switzerland (26),
  Italy (20), France (18), the Netherlands (12), Belgium (11 plus Flanders and
  Wallonia), Brazil (27), Japan's 47 prefectures, Argentina (24), Russia's
  federal subjects (83), the UK's 22 council and county flags, 5 Mexican
  states, England, Scotland, Wales, Cornwall, Greenland, the Faroes, Åland,
  Norfolk Island, Kurdistan Region, Zanzibar, Republika Srpska, Antarctica.
- US cities: 110 of the 124 in `usCityFlags.ts`.
- Historical (206): 198 from `historicalFlags.ts` (the Soviet Union and all 15
  SSRs, Yugoslavia, East Germany, Prussia, Austria-Hungary, the Ottoman
  Empire, the Qing, Manchukuo, Rhodesia, the Confederacy…) plus 8 identity
  flags of former states (the Ulster Banner, colonial Hong Kong, Biafra…). Several share a design with a flag still flown (Poland and the Duchy
  of Warsaw, Turkey and the Ottoman Empire): both are listed, the country first.
- Pride and identity (100): all 44 pride flags, and most peoples, indigenous
  nations and religions.
- Movements (127): separatist and regional flags (all but a handful in
  `identityFlags.ts`), causes, and 44 micronations.
- Organizations (23): the EU, UN, NATO, Olympics, Red Cross, OIC…
- Details now include a fleur-de-lis, a key, an anchor, a hand, a heart and a
  checkerboard.

Left to do, most looked-for first:
- The other ~280 entries in `historicalFlags.ts` (German and Italian states,
  Indian princely states, Indonesian sultanates, colonial flags…) and the
  extinct-states gallery (`extinctStates.ts`, mostly the same states).
- The rest of `subdivisions.ts`: Thailand, Kenya, Romania, Indonesia, Moldova,
  Colombia, Nigeria and others (about 900 flags), most a provincial seal.
- Mexico's other 27 states: each is the state's coat of arms on white, so the
  words can't tell them apart; they need a way to describe the arms first.
- Left out on purpose: logos with no field or a collage (Antifa, Extinction
  Rebellion, the Happy Human, the Eurasian Economic Union, Pan-Celtic, some
  micronations), the Belarusian People's Republic (its image is today's
  Belarus flag), and US cities that are a logo or words (Sacramento, Irvine,
  Fort Collins…), too busy (Tampa, Peoria), Yonkers (image doesn't load),
  Oklahoma City and Jersey City (their image is the state's flag).
- No words yet for rays from the centre, a tree versus a flower, or a ship.

## Notes / smaller follow-ups
- **Coats of arms (Codex, beta).** The Codex's "Coats of arms" section (below
  "Browse all 4,500+ flags") covers countries A–M: 116 current coats of arms,
  emblems and seals, 86 with former ones (277 images, a few undated). Built by
  `scripts/arms/fetch.mjs` (Wikidata + English Wikipedia + Wikimedia Commons;
  `--offline` rebuilds from its cache, `--why` explains every image). Still to do:
  - N–Z countries: widen `SCOPE` in the script, run it, check its notes.
  - Former arms for the 30 A–M countries still on "coming soon" (Argentina,
    Belgium, Denmark, Ecuador, Estonia, Iran, Japan, Luxembourg, Mongolia…):
    many never changed their arms, and the rest show the history only in
    drawings, photos, royal arms or rows without dates. Next sources: other-language Wikipedias (es, fr, de, ru)
    and Commons' "Historical coats of arms of …" categories, checked by hand.
  - Lebanon and Libya are skipped (no official arms in Wikipedia's infobox);
    Canada and France were chosen by hand. Recheck when their infoboxes change.
  - Later: subdivisions (states, provinces) and royal houses.
  - Maybe a game, e.g. "Whose coat of arms?" (pick the country from its arms),
    and a Flashcards deck (Flashcards → Codex; `scripts/bundle.test.mjs` lets
    `arms` off the "every Codex section is a deck" rule until then).
    Flags stay front and center: the arms are a side door, not the main menu.
- "Peoples & Cultures" fun-fact pool currently has **32** entries (only flags
  with a written `note` show). Expanding it means writing more cultural facts in
  `src/data/ethnicFlags.ts` — content task, flagged for a decision.
- Gauntlet: a few flags render slightly zoomed-in — reported as acceptable for now.
