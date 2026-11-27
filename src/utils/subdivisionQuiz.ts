// Rounds and answer choices for the two subdivision games.
//
// Province Roulette: pick where the spins come from (the world, a continent or
// one country), then trace each flag from there down: its continent, its
// country, then its name. Subdivision Stumper: "Whose is it?" (the country)
// or "Name it" (the name, from four answers of the same country).
//
// Naming uses only countries with at least MIN_NAME_FLAGS different flags, so
// all four name choices can come from the answer's own country: Oregon sits
// next to Florida, Texas and Massachusetts, never next to Bavaria, and the
// spelling gives nothing away. A flag with its own name written on it
// (Kansas, Montana: data/flagText.ts) is never the one to name, though it can
// be a wrong option; a flag that spells out its country ("ROMANIA") is never
// the one to place in "Whose is it?". Pure apart from the rng passed in.

import { SUB_FLAGS, SUB_CONTINENTS } from "../data/subdivisions"
import type { SubFlag } from "../data/subdivisions"
import { COUNTRY_ON_FLAG, NAME_ON_FLAG } from "../data/flagText"
import { shuffleWithRng } from "./prng"

export type Rng = () => number

/** A country needs this many different flags to be named from four of its own. */
export const MIN_NAME_FLAGS = 4
/** …and this many without their name written on them, to ask about. */
export const MIN_NAME_ROUNDS = 4

/** Its name is written on it, so it's never the flag to name. */
export const showsName = (s: SubFlag) => Object.hasOwn(NAME_ON_FLAG, s.code)
/** Its country is written on it, so it's never the flag to place. */
export const showsCountry = (s: SubFlag) => Object.hasOwn(COUNTRY_ON_FLAG, s.code)

export interface PickCountry {
  code: string
  name: string
  continentId: string
  continent: string
  /** Its flags that can come up (not those with the name on them). */
  total: number
}

const byCountry = new Map<string, SubFlag[]>()
for (const s of SUB_FLAGS) {
  const list = byCountry.get(s.countryCode)
  if (list) list.push(s)
  else byCountry.set(s.countryCode, [s])
}

const continentId = (name: string) => SUB_CONTINENTS.find(c => c.name === name)?.id ?? name

/** Every country whose subdivisions can be named, A to Z. */
export const NAMEABLE_COUNTRIES: PickCountry[] = [...byCountry.values()]
  .filter(subs => new Set(subs.map(s => s.flagUrl)).size >= MIN_NAME_FLAGS
    && subs.filter(s => !showsName(s)).length >= MIN_NAME_ROUNDS)
  .map(subs => ({
    code: subs[0].countryCode,
    name: subs[0].countryName,
    continentId: continentId(subs[0].continent),
    continent: subs[0].continent,
    total: subs.filter(s => !showsName(s)).length,
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

const nameable = new Set(NAMEABLE_COUNTRIES.map(c => c.code))

/** The flags that can be asked about by name: those of NAMEABLE_COUNTRIES
 *  without their name written on them. */
export const NAMEABLE_FLAGS: SubFlag[] = SUB_FLAGS.filter(s => nameable.has(s.countryCode) && !showsName(s))

/** The flags "Whose is it?" can show: any without its country written on it. */
export const PLACEABLE_FLAGS: SubFlag[] = SUB_FLAGS.filter(s => !showsCountry(s))

export interface PickContinent {
  id: string
  name: string
  countries: PickCountry[]
  total: number
  /** "All of Europe" is offered only when it mixes two countries or more. */
  wholeContinent: boolean
}

/** Continents with at least one nameable country, in the usual order. */
export const PICK_CONTINENTS: PickContinent[] = SUB_CONTINENTS
  .map(c => {
    const countries = NAMEABLE_COUNTRIES.filter(n => n.continentId === c.id)
    return { id: c.id, name: c.name, countries, total: countries.reduce((n, x) => n + x.total, 0), wholeContinent: countries.length >= 2 }
  })
  .filter(c => c.countries.length > 0)

// ── Pools: where the flags come from ───────────────────────────────────────

export type Pool =
  | { kind: "world" }
  | { kind: "continent"; id: string; name: string }
  | { kind: "country"; code: string; name: string; continentId: string }

export const WORLD: Pool = { kind: "world" }

/** A short id for a pool, for saved bests and the last pick: "world", "europe", "US". */
export function poolKey(p: Pool): string {
  return p.kind === "world" ? "world" : p.kind === "continent" ? p.id : p.code
}

/** The pool a saved key names, or null when it no longer exists. */
export function poolFromKey(key: unknown): Pool | null {
  if (key === "world") return WORLD
  const cont = PICK_CONTINENTS.find(c => c.id === key)
  if (cont) return cont.wholeContinent ? { kind: "continent", id: cont.id, name: cont.name } : null
  const country = NAMEABLE_COUNTRIES.find(c => c.code === key)
  return country ? { kind: "country", code: country.code, name: country.name, continentId: country.continentId } : null
}

export function poolLabel(p: Pool): string {
  return p.kind === "world" ? "The whole world" : p.name
}

/** The continent a pool sits in ("world" for the world), to open the picker on. */
export function poolRegion(p: Pool): string {
  return p.kind === "world" ? "world" : p.kind === "continent" ? p.id : p.continentId
}

/** Every flag a pool can show. */
export function poolFlags(p: Pool): SubFlag[] {
  if (p.kind === "world") return NAMEABLE_FLAGS
  if (p.kind === "continent") return NAMEABLE_FLAGS.filter(s => continentId(s.continent) === p.id)
  return NAMEABLE_FLAGS.filter(s => s.countryCode === p.code)
}

// ── Answer choices ─────────────────────────────────────────────────────────

/** `answer` plus up to three others, never a repeat, taken from `lists` in order. */
function fourOf(answer: string, lists: string[][], rng: Rng): string[] {
  const out = [answer]
  const seen = new Set(out)
  for (const list of lists) {
    for (const x of shuffleWithRng(list, rng)) {
      if (out.length >= 4) break
      if (!seen.has(x)) { seen.add(x); out.push(x) }
    }
  }
  return shuffleWithRng(out, rng)
}

const ALL_COUNTRY_NAMES = [...new Set(SUB_FLAGS.map(s => s.countryName))]

/** Four countries: the answer and three from the same continent (others only if it has too few). */
export function countryChoices(target: SubFlag, rng: Rng): string[] {
  const near = [...new Set(SUB_FLAGS.filter(s => s.continent === target.continent).map(s => s.countryName))]
  return fourOf(target.countryName, [near, ALL_COUNTRY_NAMES], rng)
}

/**
 * Four names, all from the answer's own country. A subdivision that shares the
 * answer's flag is never offered (Sharjah and Ras al-Khaimah fly the same
 * one), since picking it would be marked wrong.
 */
export function nameChoices(target: SubFlag, rng: Rng): string[] {
  const others = (byCountry.get(target.countryCode) ?? []).filter(s => s.flagUrl !== target.flagUrl).map(s => s.name)
  return fourOf(target.name, [others], rng)
}

// Country names that take "the" in a sentence (as in scripts/prerender.mjs).
const THE = new Set(["AE", "CZ", "DO", "GB", "KM", "MH", "NL", "PH", "SB", "US"])

/** "Which part of the United States?", "Which part of Japan?" */
export const namePrompt = (s: SubFlag) => `Which part of ${THE.has(s.countryCode) ? "the " : ""}${s.countryName}?`

/** Every continent, always in the same order so they're quick to scan. */
export const CONTINENT_NAMES: string[] = SUB_CONTINENTS.filter(c => SUB_FLAGS.some(s => s.continent === c.name)).map(c => c.name)

// ── Province Roulette: one spin, traced down from the pool ─────────────────

export type StepKind = "continent" | "country" | "name"
export interface Step { kind: StepKind; label: string; choices: string[]; answer: string }

export const STEP_LABEL: Record<StepKind, string> = { continent: "Continent", country: "Country", name: "Name" }

/** The steps a pool asks: from the world all three, from a continent two, from a country just the name. */
export function stepKinds(p: Pool): StepKind[] {
  return p.kind === "world" ? ["continent", "country", "name"] : p.kind === "continent" ? ["country", "name"] : ["name"]
}

export function spinSteps(p: Pool, target: SubFlag, rng: Rng): Step[] {
  return stepKinds(p).map(kind => {
    if (kind === "continent") return { kind, label: "Which continent?", choices: CONTINENT_NAMES, answer: target.continent }
    if (kind === "country") return { kind, label: "Which country?", choices: countryChoices(target, rng), answer: target.countryName }
    return { kind, label: namePrompt(target), choices: nameChoices(target, rng), answer: target.name }
  })
}

/** Misses before a Roulette run ends. */
export const ROULETTE_LIVES = 3

// ── Subdivision Stumper ────────────────────────────────────────────────────

export type StumperMode = "whose" | "name"
export const STUMPER_ROUNDS = 10

export interface StumperRound { target: SubFlag; label: string; choices: string[]; answer: string }

export function stumperRound(mode: StumperMode, target: SubFlag, rng: Rng): StumperRound {
  return mode === "whose"
    ? { target, label: "Which country is this from?", choices: countryChoices(target, rng), answer: target.countryName }
    : { target, label: namePrompt(target), choices: nameChoices(target, rng), answer: target.name }
}

/** The flags a Stumper game can show: nearly any for "Whose is it?", the pool's for "Name it". */
export function stumperFlags(mode: StumperMode, pool: Pool): SubFlag[] {
  return mode === "whose" ? PLACEABLE_FLAGS : poolFlags(pool)
}

/** How many rounds a game has: ten, or every flag when the pool has fewer. */
export function stumperLength(mode: StumperMode, pool: Pool): number {
  return Math.min(STUMPER_ROUNDS, stumperFlags(mode, pool).length)
}

export function stumperRounds(mode: StumperMode, pool: Pool, rng: Rng): StumperRound[] {
  const flags = stumperFlags(mode, pool)
  return shuffleWithRng(flags, rng).slice(0, STUMPER_ROUNDS).map(t => stumperRound(mode, t, rng))
}

/** The key a Stumper best is saved under: "whose", or "name-" and the pool ("name-US"). */
export function stumperBestKey(mode: StumperMode, pool: Pool): string {
  return mode === "whose" ? "whose" : `name-${poolKey(pool)}`
}
