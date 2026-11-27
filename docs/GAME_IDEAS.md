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

## Notes / smaller follow-ups
- **Coats of arms (Codex, beta).** The Codex's "Coats of arms" section (below
  "Browse all 4,500+ flags") covers countries A–M: 116 current coats of arms,
  emblems and seals, 49 with former ones. Built by `scripts/arms/fetch.mjs`
  (Wikidata + English Wikipedia + Wikimedia Commons; `--offline` rebuilds from
  its cache). Still to do:
  - N–Z countries: widen `SCOPE` in the script, run it, check its notes.
  - Former arms where they're missing ("coming soon"): many articles list them
    in tables, not galleries (Hungary, Lithuania, Chile, Ecuador, Cambodia,
    Mexico, Australia, Canada, Malaysia, Iran…); the script reads galleries only.
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
