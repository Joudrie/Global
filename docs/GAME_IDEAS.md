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
