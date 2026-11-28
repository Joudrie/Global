// Flag DNA: guess a country, and its flag's traits (colours, pattern,
// symbols) are checked against the mystery flag, Wordle style. A guess only
// ever talks about the traits of the flag you guessed:
//   hit   the mystery flag has it too                                 green
//   near  stripes or a cross that run the other way on the mystery    yellow
//         flag (yours are horizontal, its are vertical; your cross is
//         upright, its is diagonal). Only when your flag doesn't
//         already have the other one, like a Wordle letter used twice.
//   miss  the mystery flag doesn't have it                            grey
// A trait the guessed flag doesn't have is never mentioned, so guessing the
// USA says nothing about green.
//
// Traits come from the Flag Identifier's hand-checked descriptions
// (data/flagIdentifyCountries.ts, checked against the drawn flags). Only the main
// parts count: a "?" (small or arguable, like a colour that only shows
// inside a coat of arms) is left out, so every trait can be seen on the flag
// at a glance. Colours are folded into seven (maroon is red, light blue is
// blue): a guess can't tell Latvia's maroon from Austria's red by name.
// Pure: no storage, no randomness.
import { IDENTIFY_COUNTRIES } from "../data/flagIdentifyCountries"
import type { IdentifyEntry } from "./flagIdentify"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"

export type Region = FlagRecord["region"]

export type DnaColour = "red" | "orange" | "yellow" | "green" | "blue" | "white" | "black"
export type PatternId =
  | "hstripes" | "vstripes" | "split" | "diagonal" | "cross" | "nordic" | "saltire" | "unionjack"
  | "canton" | "triangle" | "circle" | "diamond" | "border" | "plain" | "quartered" | "shape" | "manystripes"
export type SymbolId =
  | "star" | "crescent" | "sun" | "emblem" | "crown" | "animal" | "plant" | "weapon" | "building" | "writing" | "map"
export type TraitId = DnaColour | PatternId | SymbolId
export type TraitKind = "colour" | "pattern" | "symbol"

export interface Trait { id: TraitId; kind: TraitKind; label: string }

/** Every trait, in the order a row lists them (colours, then pattern, then symbols). */
export const TRAITS: Trait[] = [
  { id: "red", kind: "colour", label: "red" },
  { id: "orange", kind: "colour", label: "orange" },
  { id: "yellow", kind: "colour", label: "yellow" },
  { id: "green", kind: "colour", label: "green" },
  { id: "blue", kind: "colour", label: "blue" },
  { id: "white", kind: "colour", label: "white" },
  { id: "black", kind: "colour", label: "black" },

  { id: "hstripes", kind: "pattern", label: "Horizontal stripes" },
  { id: "vstripes", kind: "pattern", label: "Vertical stripes" },
  { id: "manystripes", kind: "pattern", label: "5+ stripes" },
  { id: "split", kind: "pattern", label: "Two halves" },
  { id: "diagonal", kind: "pattern", label: "Diagonal" },
  { id: "cross", kind: "pattern", label: "Cross" },
  { id: "nordic", kind: "pattern", label: "Nordic cross" },
  { id: "saltire", kind: "pattern", label: "Diagonal cross" },
  { id: "unionjack", kind: "pattern", label: "Union Jack" },
  { id: "canton", kind: "pattern", label: "Corner box" },
  { id: "triangle", kind: "pattern", label: "Triangle" },
  { id: "circle", kind: "pattern", label: "Circle" },
  { id: "diamond", kind: "pattern", label: "Diamond" },
  { id: "border", kind: "pattern", label: "Border" },
  { id: "plain", kind: "pattern", label: "One main colour" },
  { id: "quartered", kind: "pattern", label: "Quarters" },
  { id: "shape", kind: "pattern", label: "Not a rectangle" },

  { id: "star", kind: "symbol", label: "Star" },
  { id: "crescent", kind: "symbol", label: "Crescent" },
  { id: "sun", kind: "symbol", label: "Sun" },
  { id: "emblem", kind: "symbol", label: "Emblem" },
  { id: "crown", kind: "symbol", label: "Crown" },
  { id: "animal", kind: "symbol", label: "Animal" },
  { id: "plant", kind: "symbol", label: "Plant" },
  { id: "weapon", kind: "symbol", label: "Weapon" },
  { id: "building", kind: "symbol", label: "Building" },
  { id: "writing", kind: "symbol", label: "Writing" },
  { id: "map", kind: "symbol", label: "Map" },
]
export const TRAIT = Object.fromEntries(TRAITS.map(t => [t.id, t])) as Record<TraitId, Trait>
const ORDER = new Map(TRAITS.map((t, i) => [t.id, i]))
const byOrder = (a: TraitId, b: TraitId) => ORDER.get(a)! - ORDER.get(b)!

export const COLOURS = TRAITS.filter(t => t.kind === "colour").map(t => t.id as DnaColour)
export const isColour = (id: TraitId): id is DnaColour => TRAIT[id].kind === "colour"

/** The swatch inside a colour pill: the flag colour itself. */
export const SWATCH: Record<DnaColour, string> = {
  red: "#D52B1E", orange: "#F28C28", yellow: "#FCD116", green: "#078930",
  blue: "#1E4FA3", white: "#FFFFFF", black: "#111111",
}

/** Pairs that are the same thing turned: a guess with one, against a flag
 *  with only the other, is "near". */
const TURNED: [TraitId, TraitId][] = [["hstripes", "vstripes"], ["cross", "saltire"]]

export const REGIONS: Region[] = ["Europe", "Africa", "Asia", "Middle East", "Americas", "Oceania"]

// Where Flag DNA reads a flag differently from the Identifier's main parts,
// checked against the drawn flags: a part you'd name at a glance is in, a
// shape you have to look twice for is out.
const ADD: Partial<Record<string, TraitId[]>> = {
  BR: ["white"],   // the white band with the motto, and the white stars
  CY: ["green"],   // the two green olive branches under the map
}
const DROP: Partial<Record<string, TraitId[]>> = {
  CV: ["circle"],  // a ring of ten stars, not a circle you'd name
}

const FOLD: Record<string, DnaColour> = { maroon: "red", lightblue: "blue" }
const DIRECT: PatternId[] = ["hstripes", "vstripes", "split", "diagonal", "nordic", "canton", "unionjack",
  "diamond", "border", "plain", "quartered", "shape"]
const SYMBOLS: SymbolId[] = ["star", "crescent", "sun", "emblem", "crown", "animal", "plant", "weapon", "building", "writing", "map"]

/** A flag's traits from its Identifier entry (main parts only). */
export function traitsOf(e: IdentifyEntry): TraitId[] {
  const t = new Set<TraitId>()
  for (const spec of e.colors) {
    const c = spec.split("|")[0]
    t.add(FOLD[c] ?? (c as DnaColour))
  }
  const L = new Set<string>(e.layouts), D = new Set<string>(e.details)
  for (const p of DIRECT) if (L.has(p)) t.add(p)
  // Any cross you can see counts, the Union Jack's included. The Identifier
  // adds a "cross" detail to every diagonal cross, so that one doesn't make
  // an upright cross.
  if (L.has("cross") || L.has("nordic") || L.has("unionjack") || (D.has("cross") && !L.has("saltire"))) t.add("cross")
  if (L.has("saltire") || L.has("unionjack")) t.add("saltire")
  if (L.has("hoist") || L.has("chevron") || D.has("triangle")) t.add("triangle")
  if (L.has("disc") || D.has("circle")) t.add("circle")
  if (D.has("manystripes")) t.add("manystripes")
  for (const s of SYMBOLS) if (D.has(s)) t.add(s)
  for (const x of ADD[e.code] ?? []) t.add(x)
  for (const x of DROP[e.code] ?? []) t.delete(x)
  return [...t].sort(byOrder)
}

export interface DnaFlag {
  code: string
  name: string
  region: Region
  traits: TraitId[]          // in TRAITS order
  colours: number            // how many of the seven colours it has
}

const REGION_OF = new Map(FLAGS.map(f => [f.code, f.region]))

export const DNA: Record<string, DnaFlag> = Object.fromEntries(IDENTIFY_COUNTRIES
  .filter(e => REGION_OF.has(e.code))
  .map(e => {
    const traits = traitsOf(e)
    return [e.code, { code: e.code, name: e.name, region: REGION_OF.get(e.code)!, traits, colours: traits.filter(isColour).length }]
  }))

/** Every country Flag DNA can use, as a guess or as the mystery flag. */
export const DNA_CODES = Object.keys(DNA)

export type Mark = "hit" | "near" | "miss"
export interface Clue { trait: TraitId; mark: Mark }

export interface GuessResult {
  code: string
  clues: Clue[]            // the guessed flag's traits: hits, then near, then misses
  region: boolean          // same region as the mystery flag
  match: number            // 0–100, see similarity()
  solved: boolean
  lookalike: boolean       // a different flag with exactly the same DNA and region
}

const MARK_ORDER: Record<Mark, number> = { hit: 0, near: 1, miss: 2 }

function markOf(x: TraitId, g: Set<TraitId>, t: Set<TraitId>): Mark {
  if (t.has(x)) return "hit"
  for (const [a, b] of TURNED) {
    const other = x === a ? b : x === b ? a : null
    if (other && !g.has(other) && t.has(other)) return "near"
  }
  return "miss"
}

/** How alike two flags are, 0–100: shared traits over all the traits either
 *  has, with the region as one more trait and a turned pair as half a match.
 *  Only the same flag scores 100. */
export function similarity(guess: DnaFlag, target: DnaFlag): number {
  if (guess.code === target.code) return 100
  const g = new Set(guess.traits), t = new Set(target.traits)
  let shared = 0, all = 0
  for (const x of new Set([...g, ...t])) { all++; if (g.has(x) && t.has(x)) shared++ }
  for (const [a, b] of TURNED) {
    if ((g.has(a) && !g.has(b) && t.has(b) && !t.has(a)) || (g.has(b) && !g.has(a) && t.has(a) && !t.has(b))) {
      all -= 1; shared += 0.5
    }
  }
  all++; if (guess.region === target.region) shared++
  return Math.min(99, Math.round((100 * shared) / all))
}

export function compare(guessCode: string, targetCode: string): GuessResult {
  const guess = DNA[guessCode], target = DNA[targetCode]
  const g = new Set(guess.traits), t = new Set(target.traits)
  const clues = guess.traits
    .map(trait => ({ trait, mark: markOf(trait, g, t) }))
    .sort((a, b) => MARK_ORDER[a.mark] - MARK_ORDER[b.mark] || byOrder(a.trait, b.trait))
  const solved = guessCode === targetCode
  const sameDna = guess.traits.length === target.traits.length && guess.traits.every(x => t.has(x))
  return {
    code: guessCode, clues, solved,
    region: guess.region === target.region,
    match: similarity(guess, target),
    lookalike: !solved && sameDna && guess.region === target.region,
  }
}

/** What the guesses so far add up to: the "Known so far" strip. */
export interface Known {
  colours: DnaColour[]       // colours the mystery flag is known to have
  colourCount: number        // how many it has in all (told at the start)
  has: TraitId[]             // other traits it's known to have
  not: TraitId[]             // traits it's known not to have (colours first)
  region: Region | null      // known region, or null
  notRegions: Region[]       // regions it isn't in
}

export function knownSoFar(results: GuessResult[], colourCount: number): Known {
  const has = new Set<TraitId>(), not = new Set<TraitId>()
  let region: Region | null = null
  const notRegions = new Set<Region>()
  for (const r of results) {
    const flagRegion = DNA[r.code].region
    if (r.region) region = flagRegion
    else notRegions.add(flagRegion)
    for (const c of r.clues) {
      if (c.mark === "hit") has.add(c.trait)
      else if (c.mark === "miss") not.add(c.trait)
      else {
        // Turned: it has the other one, and not this one.
        not.add(c.trait)
        const pair = TURNED.find(p => p.includes(c.trait))!
        has.add(pair[0] === c.trait ? pair[1] : pair[0])
      }
    }
  }
  // Every region but one ruled out: that's the one.
  if (!region) {
    const left = REGIONS.filter(x => !notRegions.has(x))
    if (left.length === 1) region = left[0]
  }
  const all = [...has].sort(byOrder)
  return {
    colours: all.filter(isColour),
    colourCount,
    has: all.filter(x => !isColour(x)),
    not: [...not].filter(x => !has.has(x)).sort(byOrder),
    region,
    notRegions: region ? [] : REGIONS.filter(x => notRegions.has(x)),
  }
}

/** The warmth word under a guess's match %. */
export function warmth(match: number): "Hot" | "Very warm" | "Warm" | "Cool" | "Cold" {
  if (match >= 80) return "Hot"
  if (match >= 65) return "Very warm"
  if (match >= 50) return "Warm"
  if (match >= 35) return "Cool"
  return "Cold"
}
