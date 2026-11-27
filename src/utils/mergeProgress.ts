// Combining two Globalio saves: "keep the best of both".
//
// A save is a snapshot of localStorage: storage key → the string stored there
// (see utils/backup.ts). mergeSnapshots(local, incoming) returns the combined
// snapshot. It is pure (no storage, no clock, no randomness), so the backup
// restore and account sync (src/account/engine.ts) both use it.
//
// Guarantees:
// - Nothing is lost: every key on either side is in the result, and progress
//   only goes up (flags learned, best scores, streaks, collections).
// - Symmetric: mergeSnapshots(a, b) equals mergeSnapshots(b, a) for every key
//   whose rule is marked `symmetric` below. The rest are this device's own
//   settings and choices, which keep the local value (two devices keep their
//   own and stay stable).
// - Idempotent: merging the result with either input again changes nothing.
// - Never throws. A value that won't parse is never trusted: if only one side
//   parses, that side wins; if neither does, the local value is kept as-is.
//
// Output: a key on one side only, or with the same string on both, is copied
// unchanged. A key that really merges is written as canonical JSON (object keys
// sorted, set-like lists sorted), so both merge directions give the same text.
//
// Adding a localStorage key? Give it a rule in RULES, or check the fallback
// (numbers → higher, lists → union, objects → merged entry by entry,
// anything else → this device's) is right for it.

export type Snapshot = Record<string, string>

/** The main save (utils/storage.ts → AppState). */
export const MAIN_KEY = "dailyglobe_v1"

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
type Obj = { [key: string]: Json }

export type RuleName =
  | "main" | "max" | "min" | "union" | "dated" | "gacha" | "flagStudio" | "gauntlet"
  | "unionKeepLocal" | "device"

interface Rule {
  /** A storage key, or a pattern for a family of keys. */
  key: string | RegExp
  rule: RuleName
  symmetric: boolean
  /** What the key holds and how it merges, for people reading the table. */
  note: string
}

// First match wins.
export const RULES: Rule[] = [
  { key: MAIN_KEY, rule: "main", symmetric: true,
    note: "Main save: learned flags, crowns, streaks, daily history. Field rules in mergeMain()." },

  // Before the best-score pattern below, which would also match it.
  { key: "globalio_gauntlet_best", rule: "gauntlet", symmetric: true,
    note: "Gauntlet ({ region: { best, completed, firstCompleted } }): per region the higher best, passed if passed on either, the earlier first pass." },

  // Best scores: a number ("12"), or one per tier/mode ({ "easy-type": 340 }).
  // Covers hl, doa, realorbot, forgery, statclash, prideroulette (and _best_<n>),
  // flagfusion, citiesabroad, countriesabroad, nativenames, composer (Tile
  // Flipper: { level, score }) and thepeel ({ streak, points }): each field
  // the higher.
  { key: /^globalio_[a-z0-9-]+_best(_\d+)?$/, rule: "max", symmetric: true,
    note: "Best score: the higher one (per tier/mode when it holds several)." },
  { key: "globalio_total_plays", rule: "max", symmetric: true,
    note: "Games launched: the higher count." },

  { key: "globalio_gacha", rule: "gacha", symmetric: true,
    note: "Gacha: every flag collected, the higher XP, the later daily pull (same day: a pull spent on either device stays spent)." },
  { key: "globalio_flagstudio_v1", rule: "flagStudio", symmetric: false,
    note: "Flag Studio: every saved design (newer edit wins, newest first, 60 max); the open design stays this device's." },

  // The profile (src/profile/): unlocks keep the earliest time; the profile's
  // look is one choice, so the later change wins as a whole.
  { key: "globalio_achievements", rule: "min", symmetric: true,
    note: "Achievements ({ id: unlock time }): every one unlocked on either device, at the earlier time." },
  { key: "globalio_first_seen", rule: "min", symmetric: true,
    note: "When the player first opened Globalio (ms), for “Playing since”: the earlier." },
  { key: "globalio_profile", rule: "dated", symmetric: true,
    note: "Profile picture, banner, bio, pinned badges and designs shown ({ …, date }): the later change." },

  // A day's game in progress or finished: { date | day, … }.
  { key: "globalio_daily_progress", rule: "dated", symmetric: true,
    note: "Today's daily answers so far: the later day; same day, the one further along." },
  { key: "globalio_connections_v2", rule: "dated", symmetric: true,
    note: "Connections guesses: the later puzzle; same puzzle, the one further along." },
  { key: "globalio_flagle_v1", rule: "dated", symmetric: true,
    note: "Flagle guesses: the later day; same day, the one with more guesses." },
  { key: "globalio_atlas_daily", rule: "dated", symmetric: true,
    note: "Atlas daily guess: the later day." },

  // Choices with no "better" one: keep everything, and this device's on a clash.
  { key: "globalio_atlas_played", rule: "unionKeepLocal", symmetric: false,
    note: "Atlas archive guesses ({ mapId: year }): every map guessed; a map guessed on both keeps this device's." },
  { key: /^globalio_tierlist_/, rule: "unionKeepLocal", symmetric: false,
    note: "Tier lists ({ flag: tier }): every flag placed; a flag placed on both keeps this device's tier." },

  // This device's settings, recents and seen-it flags.
  { key: /^globalio_[a-z0-9-]+_prefs$/, rule: "device", symmetric: false,
    note: "Last difficulty/mode chosen." },
  { key: "globalio_recent_games", rule: "device", symmetric: false, note: "Recently played shelf." },
  { key: "globalio_flashcard_recent", rule: "device", symmetric: false, note: "Recent flashcard sets." },
  { key: "globalio_onboarded", rule: "device", symmetric: false, note: "Intro seen." },
  { key: "globalio_fs_shuffle_hint", rule: "device", symmetric: false, note: "Flag Studio hint seen." },
  { key: "globalio_creator", rule: "device", symmetric: false, note: "Creator tools shown." },
  { key: /^globalio_account/, rule: "device", symmetric: false,
    note: "The account on this device (sign-in session, sync status, ?accounts=1). Never in a backup or synced (src/accounts.ts), so this rule never runs." },
]

export function ruleFor(key: string): Rule | null {
  return RULES.find(r => (typeof r.key === "string" ? r.key === key : r.key.test(key))) ?? null
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)
const isDate = (v: unknown): v is string => typeof v === "string" && v !== ""
const has = (o: object, k: string) => Object.hasOwn(o, k)
// Plain assignment would treat a key named "__proto__" as the prototype.
const put = <V,>(o: Record<string, V>, k: string, v: V) => {
  Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true })
}

/** JSON with object keys sorted, so equal values always give equal text. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]"
  if (isObj(v)) return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}"
  return JSON.stringify(v ?? null)
}

const parse = (s: string | undefined): { ok: true; v: Json } | { ok: false } => {
  if (s === undefined) return { ok: false }
  try { return { ok: true, v: JSON.parse(s) as Json } } catch { return { ok: false } }
}

/** A fixed, direction-free tie-break: the value whose canonical JSON sorts last. */
const pickStable = <V,>(a: V, b: V): V => (canonical(a) >= canonical(b) ? a : b)

const later = (a: unknown, b: unknown): number => {
  const x = isDate(a) ? a : "", y = isDate(b) ? b : ""
  return x === y ? 0 : x > y ? 1 : -1
}

/** Set union of two lists, sorted (order carries no meaning in these lists). */
function union(a: unknown, b: unknown): Json[] {
  const seen = new Map<string, Json>()
  for (const list of [a, b]) if (Array.isArray(list)) for (const x of list) seen.set(canonical(x), x as Json)
  return [...seen.keys()].sort().map(k => seen.get(k)!)
}

const maxNum = (a: unknown, b: unknown, fallback = 0): number =>
  Math.max(isNum(a) ? a : fallback, isNum(b) ? b : fallback)

/** Each key from both objects, sorted; `both` merges a key the two share. */
function byKey(a: Obj, b: Obj, both: (x: Json, y: Json, key: string) => Json): Obj {
  const out: Obj = {}
  for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    put(out, k, !has(a, k) ? b[k] : !has(b, k) ? a[k] : both(a[k], b[k], k))
  }
  return out
}

/** The fallback for anything without a rule. */
function mergeAny(local: Json, incoming: Json): Json {
  if (isNum(local) && isNum(incoming)) return Math.max(local, incoming)
  if (Array.isArray(local) && Array.isArray(incoming)) return union(local, incoming)
  if (isObj(local) && isObj(incoming)) return byKey(local, incoming, mergeAny)
  return local
}

/** Higher wins: a number, or entry by entry for an object of numbers. */
function mergeMax(local: Json, incoming: Json, pick: (a: number, b: number) => number): Json {
  if (isNum(local) && isNum(incoming)) return pick(local, incoming)
  if (isObj(local) && isObj(incoming)) return byKey(local, incoming, (x, y) => mergeMax(x, y, pick))
  // Mismatched shapes: a valid score beats a non-score.
  if (isNum(local) || isObj(local)) return isNum(incoming) || isObj(incoming) ? pickStable(local, incoming) : local
  return isNum(incoming) || isObj(incoming) ? incoming : pickStable(local, incoming)
}

/** How far along a day's game is: its list of guesses / answers. */
const progressOf = (v: Obj): number => {
  for (const k of ["history", "codes", "answers"]) { const x = v[k]; if (Array.isArray(x)) return x.length }
  return 0
}

/** { date | day, … }: the later day wins; same day, further along; then stable. */
function mergeDated(local: Json, incoming: Json): Json {
  if (!isObj(local)) return isObj(incoming) ? incoming : local
  if (!isObj(incoming)) return local
  const day = (v: Obj) => v.date ?? v.day
  const d = later(day(local), day(incoming))
  if (d !== 0) return d > 0 ? local : incoming
  // Connections numbers its puzzles; a later puzzle on the same day wins.
  if (isNum(local.n) && isNum(incoming.n) && local.n !== incoming.n) return local.n > incoming.n ? local : incoming
  const p = progressOf(local) - progressOf(incoming)
  if (p !== 0) return p > 0 ? local : incoming
  return pickStable(local, incoming)
}

/** Every key from both; on a clash, this device's value. */
function mergeUnionKeepLocal(local: Json, incoming: Json): Json {
  if (isObj(local) && isObj(incoming)) return byKey(local, incoming, x => x)
  return isObj(local) || !isObj(incoming) ? local : incoming
}

function mergeGacha(local: Json, incoming: Json): Json {
  if (!isObj(local) || !isObj(incoming)) return isObj(local) ? local : isObj(incoming) ? incoming : local
  const out = byKey(local, incoming, mergeAny) // unknown fields
  out.collected = union(local.collected, incoming.collected)
  out.xp = maxNum(local.xp, incoming.xp)
  // The free pull belongs to a day. The later day's count stands; on the same
  // day the lower count, so combining can't hand back a pull already spent.
  const d = later(local.lastDaily, incoming.lastDaily)
  const newer = d > 0 ? local : d < 0 ? incoming : null
  out.lastDaily = (newer ?? local).lastDaily ?? ""
  out.tokens = newer ? (isNum(newer.tokens) ? newer.tokens : 0)
    : Math.min(isNum(local.tokens) ? local.tokens : 0, isNum(incoming.tokens) ? incoming.tokens : 0)
  if (local.seeded === true || incoming.seeded === true) out.seeded = true
  return out
}

/** Gauntlet: { region: { best, completed, firstCompleted } } (utils/gauntlet.ts). */
function mergeGauntlet(local: Json, incoming: Json): Json {
  if (!isObj(local) || !isObj(incoming)) return isObj(local) ? local : isObj(incoming) ? incoming : local
  return byKey(local, incoming, (x, y) => {
    if (!isObj(x) || !isObj(y)) return isObj(x) ? x : isObj(y) ? y : pickStable(x, y)
    const out = byKey(x, y, mergeAny) // fields this file doesn't know yet
    out.best = maxNum(x.best, y.best)
    out.completed = x.completed === true || y.completed === true
    const times = [x.firstCompleted, y.firstCompleted].filter((t): t is number => isNum(t) && t > 0)
    out.firstCompleted = times.length ? Math.min(...times) : null
    return out
  })
}

const FLAG_STUDIO_MAX = 60 // utils/flagStudio.ts keeps at most this many

function mergeFlagStudio(local: Json, incoming: Json): Json {
  if (!isObj(local) || !isObj(incoming)) return isObj(local) ? local : isObj(incoming) ? incoming : local
  const designs = new Map<string, Obj>()
  for (const list of [local.saved, incoming.saved]) {
    if (!Array.isArray(list)) continue
    for (const d of list) {
      if (!isObj(d) || typeof d.id !== "string") continue
      const had = designs.get(d.id)
      if (!had) { designs.set(d.id, d); continue }
      const u = maxNum(d.updated, 0) - maxNum(had.updated, 0)
      designs.set(d.id, u > 0 ? d : u < 0 ? had : pickStable(had, d))
    }
  }
  const saved = [...designs.values()]
    .sort((a, b) => maxNum(b.updated, 0) - maxNum(a.updated, 0) || (String(a.id) < String(b.id) ? -1 : 1))
    .slice(0, FLAG_STUDIO_MAX)
  const out = byKey(local, incoming, (x, y, k) => (k === "current" ? x : mergeAny(x, y)))
  out.saved = saved
  // The design open on this device stays open; the backup's only fills an empty canvas.
  out.current = local.current ?? incoming.current ?? null
  return out
}

// ── The main save ──────────────────────────────────────────────────────────

const prevDay = (day: string): string => {
  const [y, m, d] = day.split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  t.setUTCDate(t.getUTCDate() - 1)
  return Number.isNaN(t.getTime()) ? "" : t.toISOString().slice(0, 10)
}

/** Consecutive dailies in `history` ending on `last` (0 if `last` isn't in it). */
function runEndingOn(history: Obj, last: unknown): number {
  if (!isDate(last)) return 0
  let n = 0
  for (let day = last; day && has(history, day) && n <= Object.keys(history).length; day = prevDay(day)) n++
  return n
}

/** A streak is a count plus the day it was last extended; they travel together. */
function mergeStreak(a: Obj, b: Obj, countKey: string, dateKey: string): { count: number; date: Json } {
  const d = later(a[dateKey], b[dateKey])
  if (d !== 0) {
    const w = d > 0 ? a : b
    return { count: maxNum(w[countKey], 0), date: w[dateKey] ?? null }
  }
  return { count: maxNum(a[countKey], b[countKey]), date: a[dateKey] ?? b[dateKey] ?? null }
}

/** Two days' results: the higher score, then more questions, then stable. */
function betterDaily(x: Json, y: Json): Json {
  if (!isObj(x)) return isObj(y) ? y : x
  if (!isObj(y)) return x
  const s = maxNum(x.score, -1) - maxNum(y.score, -1)
  if (s !== 0) return s > 0 ? x : y
  const t = maxNum(x.total, -1) - maxNum(y.total, -1)
  if (t !== 0) return t > 0 ? x : y
  return pickStable(x, y)
}

function mergeMain(local: Json, incoming: Json): Json {
  if (!isObj(local) || !isObj(incoming)) return isObj(local) ? local : isObj(incoming) ? incoming : local
  const out = byKey(local, incoming, mergeAny) // fields this file doesn't know yet

  for (const k of ["learnedFlags", "learnedSubs", "crowns"]) out[k] = union(local[k], incoming[k])

  const history = byKey(isObj(local.dailyHistory) ? local.dailyHistory : {},
    isObj(incoming.dailyHistory) ? incoming.dailyHistory : {}, betterDaily)
  out.dailyHistory = history

  // The daily streak comes from whichever device played the later daily. When
  // the two devices' dailies together make a longer unbroken run (phone Mon–Tue,
  // computer Wed), the run counts.
  const daily = mergeStreak(local, incoming, "currentStreak", "lastDailyDate")
  out.lastDailyDate = daily.date
  out.currentStreak = Math.max(daily.count, runEndingOn(history, daily.date))
  out.longestStreak = Math.max(maxNum(local.longestStreak, incoming.longestStreak), out.currentStreak)

  const fact = mergeStreak(local, incoming, "funFactStreak", "lastFunFactDate")
  out.funFactStreak = fact.count
  out.lastFunFactDate = fact.date

  out.gamesPlayed = maxNum(local.gamesPlayed, incoming.gamesPlayed)
  out.premium = local.premium === true || incoming.premium === true

  const name = (v: Json) => (typeof v === "string" && v.trim() ? v : "")
  out.username = name(local.username) || name(incoming.username)

  const share = (v: Json) => (isObj(v) ? v : null)
  const a = share(local.lastShareResult), b = share(incoming.lastShareResult)
  const d = a && b ? later(a.date, b.date) : 0
  out.lastShareResult = !a || !b ? a ?? b : d > 0 ? a : d < 0 ? b : pickStable(a, b)
  return out
}

// ── Putting it together ────────────────────────────────────────────────────

function mergeValue(rule: RuleName, local: Json, incoming: Json): Json {
  switch (rule) {
    case "main": return mergeMain(local, incoming)
    case "max": return mergeMax(local, incoming, Math.max)
    case "min": return mergeMax(local, incoming, Math.min) // for times, where lower is better
    case "union": return Array.isArray(local) || Array.isArray(incoming) ? union(local, incoming) : local
    case "dated": return mergeDated(local, incoming)
    case "gacha": return mergeGacha(local, incoming)
    case "flagStudio": return mergeFlagStudio(local, incoming)
    case "gauntlet": return mergeGauntlet(local, incoming)
    case "unionKeepLocal": return mergeUnionKeepLocal(local, incoming)
    case "device": return local
  }
}

/** One key that is on both sides with different text. */
function mergeKey(key: string, local: string, incoming: string): string {
  const rule = ruleFor(key)
  if (rule?.rule === "device") return local
  const a = parse(local), b = parse(incoming)
  if (!a.ok || !b.ok) {
    // Unknown keys may hold plain text, which is fine; this device's wins.
    if (!rule || (!a.ok && !b.ok)) return local
    return a.ok ? local : incoming
  }
  const merged = rule ? mergeValue(rule.rule, a.v, b.v) : mergeAny(a.v, b.v)
  const text = canonical(merged), ca = canonical(a.v), cb = canonical(b.v)
  // Return an input's own text when the result is that input, so a key that
  // doesn't change keeps its exact formatting. (Two texts for the same value:
  // the same one either way round.)
  if (text === ca && text === cb) return local >= incoming ? local : incoming
  return text === ca ? local : text === cb ? incoming : text
}

/**
 * Combine two saves, keeping the best of both. `local` is this device's,
 * `incoming` the one being brought in (a backup, or later another device).
 * Pure and safe to call with anything; it never throws.
 */
export function mergeSnapshots(local: Snapshot, incoming: Snapshot): Snapshot {
  const a: Snapshot = isObj(local) ? local : {}
  const b: Snapshot = isObj(incoming) ? incoming : {}
  const out: Snapshot = {}
  for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const x = has(a, k) && typeof a[k] === "string" ? a[k] : undefined
    const y = has(b, k) && typeof b[k] === "string" ? b[k] : undefined
    if (x === undefined && y === undefined) continue
    put(out, k, x === undefined ? y! : y === undefined || x === y ? x : (() => {
      try { return mergeKey(k, x, y) } catch { return x }
    })())
  }
  return out
}

// ── What a save holds, for the restore screen's summary ─────────────────────

export interface ProgressSummary {
  flags: number
  subs: number
  crowns: number
  streak: number
  bestStreak: number
  dailies: number
  /** Best scores across every game that keeps one. */
  bests: number
}

export function summarize(snap: Snapshot): ProgressSummary {
  const p = parse(snap?.[MAIN_KEY])
  const m: Obj = p.ok && isObj(p.v) ? p.v : {}
  const len = (v: Json | undefined) => (Array.isArray(v) ? v.length : 0)
  let bests = 0
  for (const [k, v] of Object.entries(snap ?? {})) {
    if (ruleFor(k)?.rule !== "max" || k === "globalio_total_plays") continue
    const x = parse(v)
    if (x.ok && isNum(x.v)) bests += x.v > 0 ? 1 : 0
    else if (x.ok && isObj(x.v)) bests += Object.values(x.v).filter(n => isNum(n) && n > 0).length
  }
  return {
    flags: len(m.learnedFlags), subs: len(m.learnedSubs), crowns: len(m.crowns),
    streak: maxNum(m.currentStreak, 0), bestStreak: maxNum(m.longestStreak, 0),
    dailies: isObj(m.dailyHistory) ? Object.keys(m.dailyHistory).length : 0,
    bests,
  }
}

/** Best scores that went up (or appeared) from `before` to `after`. */
export function bestsRaised(before: Snapshot, after: Snapshot): number {
  let n = 0
  for (const [k, v] of Object.entries(after ?? {})) {
    if (ruleFor(k)?.rule !== "max" || k === "globalio_total_plays" || before?.[k] === v) continue
    const x = parse(before?.[k]), y = parse(v)
    if (!y.ok) continue
    const old = x.ok ? x.v : null
    if (isNum(y.v)) { if (!isNum(old) || y.v > old) n++ }
    else if (isObj(y.v)) {
      for (const [e, s] of Object.entries(y.v)) {
        const o = isObj(old) ? old[e] : undefined
        if (isNum(s) && (!isNum(o) || s > o)) n++
      }
    }
  }
  return n
}
