// Spoken Here: a country's languages as a pie, and the player names the
// country. Ten right before three strikes wins (the Abroad games' rules, from
// utils/abroad.ts). Easy and medium show the language names; hard shows only
// their families ("Romance · Indo-European"), so it plays on the pies that
// still look like no other country's.
//
// This file is the game's logic, apart from the screen: the line under the
// pie, how alike two pies are, a game's rounds, the four choices, typed
// answers and the slice colours. The data is src/data/languageShares.ts,
// built by scripts/languagepie/build.mjs.
import { LANGUAGE_GROUPS, LANGUAGE_SHARES } from "../data/languageShares"
import type { LanguageShare, LanguageSlice, Measure } from "../data/languageShares"
import { FLAGS } from "../data/flags"
import type { FlagRecord } from "../data/flags"
import { MAX_ROUNDS } from "./abroad"
import type { Tier, Value } from "./abroad"
import { isExactName, matchNames, pickOnEnter } from "./pickOnEnter"
import { shuffleWithRng } from "./prng"

export type { Tier }
/** Names: the pie shows each language. Families: only each language's family (hard). */
export type PieView = "names" | "families"
export const viewFor = (tier: Tier): PieView => (tier === "hard" ? "families" : "names")
export const VALUE: Record<Tier, Value> = { easy: 10, medium: 20, hard: 30 }

const BY_CODE = new Map(FLAGS.map(f => [f.code, f]))
export const countryOf = (code: string): FlagRecord => BY_CODE.get(code)!
export const SHARES = LANGUAGE_SHARES
const SHARE_BY_CODE = new Map(SHARES.map(s => [s.code, s]))
export const shareOf = (code: string) => SHARE_BY_CODE.get(code)

// ── The line under the pie ─────────────────────────────────────────────────

const MEASURE_TEXT: Record<Measure, string> = {
  mother: "Mother tongue", first: "First language", home: "Language spoken at home", main: "Main language",
  everyday: "Language of everyday use", household: "Language of the household", spoken: "Languages spoken",
}
const KIND_TEXT: Record<LanguageShare["kind"], string> = { census: "census", survey: "survey", register: "population register", estimate: "estimate" }

/** "Mother tongue, 2021 census" */
export const measureLine = (s: LanguageShare) => `${MEASURE_TEXT[s.measure]}, ${s.year} ${KIND_TEXT[s.kind]}`

/** How old the figures are, when they're old enough to say so: "From 2001, 25 years ago." */
export function ageLine(s: LanguageShare, now = new Date().getFullYear()): string | null {
  const age = now - s.year
  return age >= 10 ? `From ${s.year}, ${age} years ago.` : null
}

/** What else a player should know about the numbers. */
export function fineprint(s: LanguageShare): string[] {
  const out: string[] = []
  if (s.multi) out.push("People could name more than one language, so the shares add up to more than 100%.")
  if (s.answered !== null) out.push(`Shares of the ${s.answered}% who answered.`)
  return out
}

/** The family a slice is shown as on hard: "Romance · Indo-European". */
export const familyLabel = (sl: LanguageSlice) => sl.family

// ── How alike two pies are ────────────────────────────────────────────────

// Total variation distance between two pies' shares (normalised to 100): 0 is
// the same pie, 100 shares nothing. By name, "Spanish only" counts as
// Spanish. By family, each group's slices in size order ("romance 1",
// "romance 2"), since hard still shows a country's two Romance slices apart.
// scripts/languagepie/build.mjs compares pies the same way to choose hard's.
type Vec = Record<string, number>
const keyOf = (n: string) => n.replace(/ only$/, "")
export function pieVector(s: LanguageShare, view: PieView): Vec {
  const total = s.slices.reduce((a, x) => a + x.pct, 0)
  const v: Vec = {}, seen: Record<string, number> = {}
  for (const x of s.slices) {
    const k = view === "families" ? `${x.group} ${(seen[x.group] = (seen[x.group] ?? 0) + 1)}` : keyOf(x.name)
    v[k] = (v[k] ?? 0) + (x.pct * 100) / total
  }
  return v
}
export function pieDistance(a: LanguageShare, b: LanguageShare, view: PieView): number {
  const va = pieVector(a, view), vb = pieVector(b, view)
  let d = 0
  for (const k of new Set([...Object.keys(va), ...Object.keys(vb)])) d += Math.abs((va[k] ?? 0) - (vb[k] ?? 0))
  return d / 2
}

/** Pies this close look the same: a typed lookalike counts as right, and
 *  two of them are never both among the four choices. */
export const LOOKALIKE = 3

/** Countries whose pie can't be told from this one's (in this view). */
export function lookalikes(s: LanguageShare, view: PieView): string[] {
  return SHARES.filter(o => o.code !== s.code && pieDistance(s, o, view) <= LOOKALIKE).map(o => o.code)
}

// ── Rounds ─────────────────────────────────────────────────────────────────

/** The countries a tier plays: easy and medium by their tier, hard the pies
 *  that families alone tell apart. */
export function pool(tier: Tier): LanguageShare[] {
  return tier === "hard" ? SHARES.filter(s => s.hard) : SHARES.filter(s => s.tier === tier)
}
const rankIn = (s: LanguageShare, tier: Tier) => (tier === "hard" ? s.hardRank ?? 1 : s.rank)

/** At most this many rounds in a game are pies with a lookalike, so most of
 *  it can be reasoned out. */
export const MAX_LOOKALIKE_ROUNDS = 3

/** A game's countries: up to `count` from the tier, at random, at most
 *  MAX_LOOKALIKE_ROUNDS with a lookalike pie, played gentlest first. */
export function pickRounds(tier: Tier, rng: () => number, count = MAX_ROUNDS): LanguageShare[] {
  const view = viewFor(tier)
  const list = shuffleWithRng(pool(tier), rng)
  const picked: LanguageShare[] = []
  let alike = 0
  for (const pass of [0, 1]) {
    for (const s of list) {
      if (picked.length >= count) break
      if (picked.includes(s)) continue
      const hasTwin = lookalikes(s, view).length > 0
      if (pass === 0 && hasTwin && alike >= MAX_LOOKALIKE_ROUNDS) continue
      picked.push(s)
      if (hasTwin) alike++
    }
  }
  return picked.sort((a, b) => rankIn(a, tier) - rankIn(b, tier))
}

/** The answer and three wrong countries whose pies look most like it (the
 *  same top language or family, then the nearest), but never one that can't
 *  be told from it, so the round can always be reasoned out. Shuffled. */
export function pickChoices(s: LanguageShare, view: PieView, rng: () => number): string[] {
  const top = (x: LanguageShare) => (view === "families" ? x.slices[0].group : keyOf(x.slices[0].name))
  const scored = SHARES
    .filter(o => o.code !== s.code)
    .map(o => ({ o, d: pieDistance(s, o, view) }))
    .filter(x => x.d > LOOKALIKE)
    .map(x => ({ ...x, score: x.d - (top(x.o) === top(s) ? 30 : 0) - (countryOf(x.o.code).region === countryOf(s.code).region ? 8 : 0) + rng() * 14 }))
    .sort((a, b) => a.score - b.score)
  const wrong: LanguageShare[] = []
  for (const { o } of scored) {
    // Two decoys that are lookalikes of each other would make one of them a giveaway.
    if (wrong.some(w => pieDistance(w, o, view) <= LOOKALIKE)) continue
    wrong.push(o)
    if (wrong.length === 3) break
  }
  return shuffleWithRng([s.code, ...wrong.map(w => w.code)], rng)
}

// ── Typed answers ──────────────────────────────────────────────────────────

export interface Typed {
  /** The country the typing names, if it names exactly one. */
  country: FlagRecord | null
  correct: boolean
  /** Right because its pie can't be told from the answer's. */
  lookalike: boolean
}

/** Read a typed answer: the country it names (its name or another name for
 *  it, "USA", "Holland"), and whether that's the answer or a lookalike. */
export function judgeTyped(typed: string, s: LanguageShare, view: PieView): Typed {
  const matches = matchNames(FLAGS, typed, 6)
  const country = pickOnEnter(matches, typed) ?? null
  if (!country) return { country: null, correct: false, lookalike: false }
  if (country.code === s.code) return { country, correct: true, lookalike: false }
  const twin = lookalikes(s, view).includes(country.code)
  return { country, correct: twin, lookalike: twin }
}
export { isExactName }

// ── Colours ────────────────────────────────────────────────────────────────

const mix = (hex: string, toward: string, t: number) => {
  const a = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  const b = [1, 3, 5].map(i => parseInt(toward.slice(i, i + 2), 16))
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("")
}
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrastRatio = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
const PAPER = "#FFFCF4", INK = "#1F3A3C"

export interface SliceColor { fill: string; ink: string; striped: boolean }
/** Each slice's colour: its group's tone, then a step away from it for each
 *  further slice of the same group (dark tones step lighter, light tones
 *  darker), so related languages read as one family. The label on a slice is
 *  whichever of paper and ink reads better on it. "Two languages" slices are
 *  striped (the screen draws the stripes). */
export function sliceColors(slices: LanguageSlice[]): SliceColor[] {
  const seen: Record<string, number> = {}
  return slices.map(sl => {
    const n = (seen[sl.group] = (seen[sl.group] ?? 0) + 1) - 1
    const base = LANGUAGE_GROUPS[sl.group].color
    const dark = contrastRatio(base, PAPER) >= contrastRatio(base, INK)
    const fill = n === 0 ? base : dark ? mix(base, PAPER, Math.min(0.62, n * 0.2)) : mix(base, INK, Math.min(0.45, n * 0.15))
    return { fill, ink: contrastRatio(fill, PAPER) >= contrastRatio(fill, INK) ? PAPER : INK, striped: sl.group === "two" }
  })
}
