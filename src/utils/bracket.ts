// Flag Bracket: which flags can play, and how a bracket is drawn from them.
//
// The player switches on any mix of sets: continents (from FLAGS) and the
// Codex's other sections (Pride, Separatist, Micronations, former states…),
// built from the same data and gallery rows the Codex shows. Each extra set
// is its own chunk, loaded the first time it is switched on.
//
// The last choice is saved as globalio_flagbracket_prefs ({ sets, size });
// mergeProgress.ts keeps this device's value (the *_prefs rule).
import { FLAGS, REGIONS } from "../data/flags"
import type { Region } from "../data/flags"
import type { GRegion } from "../data/codexGalleries"
import type { IdentityCategory } from "../data/identityFlags"

export type ExtraId =
  | "peoples" | "pride" | "separatist" | "civic" | "micronations" | "extinct"
  | "cities" | "orgs" | "signal" | "states" | "provinces"
export type SetId = Region | ExtraId

export interface Entrant {
  /** The image URL, which is unique in a pool: a flag in two sets plays once. */
  key: string
  name: string
  flagUrl: string
  set: SetId
  /** A country's code, so its flag gets FlagImage's fallback sources. */
  code?: string
  /** Always shown under the name (a province's country). */
  detail?: string
}

export interface ExtraSet {
  id: ExtraId
  /** The Codex section's name. */
  label: string
  /** For the header line during play ("Asia + Pride"). */
  short: string
  /** Flags this set brings on its own, before loading it (one per image).
   *  scripts/bracket.test.mjs checks these against the data. */
  count: number
  load: () => Promise<Entrant[]>
}

const entrant = (set: SetId, name: string, flagUrl: string, detail?: string): Entrant =>
  ({ key: flagUrl, name, flagUrl, set, detail })

/** One entrant per image, in order; rows with no image are dropped. */
function onePerImage(list: Entrant[]): Entrant[] {
  const seen = new Set<string>()
  return list.filter(e => e.flagUrl && !seen.has(e.key) && (seen.add(e.key), true))
}

const galleryRows = (set: ExtraId, regions: GRegion[]): Entrant[] =>
  regions.flatMap(r => r.groups.flatMap(g => g.items)).map(row => entrant(set, row.title, row.file))

const identity = (set: ExtraId, category: IdentityCategory) => () =>
  import("../data/identityFlags").then(m =>
    m.IDENTITY_FLAGS.filter(f => f.category === category && !f.noFlag).map(f => entrant(set, f.name, f.flagUrl)))

const subdivisions = (set: ExtraId, us: boolean) => () =>
  import("../data/subdivisions").then(m =>
    m.SUB_FLAGS.filter(s => (s.countryCode === "US") === us).map(s => entrant(set, s.name, s.flagUrl, us ? undefined : s.countryName)))

// In the Codex's order, with the subdivisions (shown inside each country's
// Codex entry) last.
const SETS: ExtraSet[] = [
  { id: "peoples", label: "Peoples & Cultures", short: "Peoples", count: 1113,
    load: () => Promise.all([import("../data/codexGalleries"), import("../data/ethnicFlags"), import("../data/identityFlags")])
      .then(([g, e, i]) => galleryRows("peoples", g.peoplesRegions(e.ETHNIC_FLAGS, i.IDENTITY_FLAGS))) },
  { id: "pride", label: "Pride & LGBTQ+", short: "Pride", count: 44, load: identity("pride", "Pride & LGBTQ+") },
  { id: "separatist", label: "Separatist & Autonomous", short: "Separatist", count: 142, load: identity("separatist", "Separatist & Autonomous") },
  { id: "civic", label: "Civic & Ideological", short: "Civic", count: 42, load: identity("civic", "Civic & Ideological") },
  { id: "micronations", label: "Micronations", short: "Micronations", count: 50, load: identity("micronations", "Micronations") },
  { id: "extinct", label: "Extinct & Former States", short: "Former states", count: 555,
    load: () => Promise.all([import("../data/codexGalleries"), import("../data/extinctStates"), import("../data/historicalFlags")])
      .then(([g, e, h]) => galleryRows("extinct", g.extinctRegions(e.EXTINCT_STATES, h.HISTORICAL_FLAGS))) },
  { id: "cities", label: "American Cities", short: "US cities", count: 122,
    load: () => import("../data/usCityFlags").then(m => m.US_CITY_FLAGS.map(f => entrant("cities", `${f.name}, ${f.state}`, f.flagUrl))) },
  { id: "orgs", label: "International Organizations", short: "Organizations", count: 67,
    load: () => Promise.all([import("../data/codexGalleries"), import("../data/orgFlags")])
      .then(([g, o]) => galleryRows("orgs", g.orgRegions(o.ORG_FLAGS))) },
  { id: "signal", label: "Signal & Maritime Flags", short: "Signal flags", count: 27, load: identity("signal", "Maritime & Signal") },
  { id: "states", label: "US States & Territories", short: "US states", count: 56, load: subdivisions("states", true) },
  { id: "provinces", label: "Provinces & Regions", short: "Provinces", count: 1522, load: subdivisions("provinces", false) },
]
export const EXTRA_SETS: readonly ExtraSet[] = SETS.map(s => ({ ...s, load: () => s.load().then(onePerImage) }))
const EXTRA_BY_ID = new Map(EXTRA_SETS.map(s => [s.id, s]))

export const isRegion = (id: SetId): id is Region => (REGIONS as readonly string[]).includes(id)

const COUNTRIES = new Map<Region, Entrant[]>(REGIONS.map(r => [r, FLAGS.filter(f => f.region === r)
  .map(f => ({ key: f.flagUrl, name: f.name, flagUrl: f.flagUrl, set: r, code: f.code }))]))

/** How many flags a set brings on its own. */
export const setCount = (id: SetId): number =>
  isRegion(id) ? COUNTRIES.get(id)!.length : EXTRA_BY_ID.get(id)?.count ?? 0

export const setLabel = (id: SetId): string => (isRegion(id) ? id : EXTRA_BY_ID.get(id)?.label ?? id)

// ── Loading the extra sets ──────────────────────────────────────────────────

const loaded = new Map<ExtraId, Entrant[]>()
const pending = new Map<ExtraId, Promise<Entrant[]>>()

/** A set's flags once loaded (continents are always loaded). */
export const setFlags = (id: SetId): Entrant[] | undefined =>
  isRegion(id) ? COUNTRIES.get(id) : loaded.get(id)

/** Loads an extra set once. A failed load (a connection blip) is forgotten,
 *  so asking again retries. */
export function loadSet(id: ExtraId): Promise<Entrant[]> {
  const done = loaded.get(id)
  if (done) return Promise.resolve(done)
  let p = pending.get(id)
  if (!p) {
    const set = EXTRA_BY_ID.get(id)
    p = (set ? set.load() : Promise.resolve([])).then(
      list => { loaded.set(id, list); pending.delete(id); return list },
      err => { pending.delete(id); throw err })
    pending.set(id, p)
  }
  return p
}

// ── The pool and the draw ───────────────────────────────────────────────────

/** Every flag the chosen sets bring, one per image (a flag in two sets plays
 *  once, in the first set listed). `waiting` holds sets not loaded yet. */
export function buildPool(sets: readonly SetId[]): { flags: Entrant[]; waiting: ExtraId[] } {
  const ordered = orderSets(sets)
  const waiting = ordered.filter((id): id is ExtraId => !setFlags(id))
  const seen = new Set<string>()
  const flags: Entrant[] = []
  for (const id of ordered) for (const e of setFlags(id) ?? []) if (!seen.has(e.key)) { seen.add(e.key); flags.push(e) }
  return { flags, waiting }
}

/** Continents first (in REGIONS order), then the extra sets in list order. */
export const orderSets = (sets: readonly SetId[]): SetId[] =>
  [...REGIONS, ...EXTRA_SETS.map(s => s.id)].filter(id => sets.includes(id))

/** Most flags the chosen sets can bring (before one-per-image): what the
 *  bracket sizes go by while a set is still loading. */
export const poolEstimate = (sets: readonly SetId[]): number =>
  orderSets(sets).reduce((n, id) => n + (setFlags(id)?.length ?? setCount(id)), 0)

export const SIZES = [8, 16, 32, 64] as const
export type Size = typeof SIZES[number] | "all"
export const DEFAULT_SIZE: Size = 16

/** The size that plays: the chosen one if the pool can fill it, else the
 *  largest one it can (or everyone, for a pool under 8). */
export function fitSize(chosen: Size, pool: number): Size {
  if (chosen === "all" || pool >= chosen) return chosen
  return [...SIZES].reverse().find(s => pool >= s) ?? "all"
}

type Rand = () => number
export function shuffle<X>(a: readonly X[], rand: Rand = Math.random): X[] {
  const c = [...a]
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]]
  }
  return c
}

/** A random bracket of `size` flags in which every set gets an even share
 *  (a set too small for its share gives the rest to the others), so a small
 *  set still shows up beside a big one. "all" plays the whole pool. */
export function drawField(pool: readonly Entrant[], size: Size, rand: Rand = Math.random): Entrant[] {
  const n = size === "all" ? pool.length : Math.min(size, pool.length)
  const bySet = new Map<SetId, Entrant[]>()
  for (const e of shuffle(pool, rand)) (bySet.get(e.set) ?? bySet.set(e.set, []).get(e.set)!).push(e)
  const piles = [...bySet.values()]
  const field: Entrant[] = []
  // One from each set in turn (in a fresh random order each lap) until full.
  while (field.length < n) {
    for (const pile of shuffle(piles.filter(p => p.length), rand)) {
      if (field.length === n) break
      field.push(pile.pop()!)
    }
  }
  return shuffle(field, rand)
}

/** "World", "Asia", "Europe + Asia + Pride", "Europe + Asia + 2 more". */
export function selectionLabel(sets: readonly SetId[]): string {
  const ordered = orderSets(sets)
  const regions = ordered.filter(isRegion)
  const parts = [
    ...(regions.length === REGIONS.length ? ["World"] : regions),
    ...ordered.filter(id => !isRegion(id)).map(id => EXTRA_BY_ID.get(id as ExtraId)!.short),
  ]
  if (parts.length <= 3) return parts.join(" + ")
  return `${parts[0]} + ${parts[1]} + ${parts.length - 2} more`
}

/** The closed "More flags" line: "Pride & LGBTQ+", "Pride, Micronations",
 *  "Peoples, Separatist, Civic and 7 more". */
export function extrasSummary(ids: readonly SetId[]): string {
  const on = EXTRA_SETS.filter(s => ids.includes(s.id))
  if (on.length === 1) return on[0].label
  const names = on.map(s => s.short)
  return names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`
}

// ── The saved choice ────────────────────────────────────────────────────────

export const PREFS_KEY = "globalio_flagbracket_prefs"
export interface Prefs { sets: SetId[]; size: Size }
export const DEFAULT_PREFS: Prefs = { sets: [...REGIONS], size: DEFAULT_SIZE }

/** A saved choice, or the default (every continent, 16) for anything that
 *  won't parse. Unknown sets are dropped. */
export function readPrefs(raw: string | null): Prefs {
  try {
    const v = JSON.parse(raw ?? "null")
    if (!v || typeof v !== "object") return DEFAULT_PREFS
    const known = Array.isArray(v.sets) ? orderSets(v.sets.filter((s: unknown) => typeof s === "string")) : []
    const size = v.size === "all" || SIZES.includes(v.size) ? v.size as Size : DEFAULT_SIZE
    return { sets: known.length ? known : DEFAULT_PREFS.sets, size }
  } catch { return DEFAULT_PREFS }
}
