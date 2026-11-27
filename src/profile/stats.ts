// The profile's stats: worked out from the save on this device, shown on the
// player's own profile and, for a public profile, sent to the account as
// public.profiles.stats when it syncs. Other players read it back with
// public.get_player(). It is self-reported (the app writes it), which is fine
// because nothing ranks players against each other.
//
// The summary (version 1), kept small (well under the database's 8 KB cap):
//   flags, flagsOf    country flags learned, and how many there are
//   crowns            Flag Set crowns (of 7)
//   streak, streakDay the Daily Game streak and the day it was last extended
//                     (a viewer shows 0 once that day is older than yesterday)
//   bestStreak        the longest daily streak
//   dailies           Daily Games played
//   games             games played (launched or finished, the higher count)
//   collection        flags collected in Flag Gacha
//   bests             { game id: best score } for games played, best per game
//   since             "2026-11": the month the player started
//   achievements      how many achievements are unlocked
//   activity          [[achievement id, unlock time ms], …] newest first, at most 20
import { FLAGS } from "../data/flags"
import { ACHIEVEMENTS, SET_CROWNS, achievementById } from "../data/achievements"
import { REGISTRY } from "../ui/registry"
import type { Snapshot } from "../utils/mergeProgress"
import { activityOf, unlocksOf } from "./achievements"
import { sinceMonth } from "./local"
import { bestEntries, gachaCount, gamesCount, mainOf } from "./save"

export interface ProfileStats {
  v: 1
  flags: number
  flagsOf: number
  crowns: number
  streak: number
  streakDay: string | null
  bestStreak: number
  dailies: number
  games: number
  collection: number
  bests: Record<string, number>
  since: string | null
  achievements: number
  activity: [string, number][]
}

export const CROWN_COUNT = SET_CROWNS.length
export const ACTIVITY_MAX = 20
const BESTS_MAX = 40
const GAME_IDS = new Set(REGISTRY.map(r => r.id))

export const EMPTY_STATS: ProfileStats = {
  v: 1, flags: 0, flagsOf: FLAGS.length, crowns: 0, streak: 0, streakDay: null, bestStreak: 0,
  dailies: 0, games: 0, collection: 0, bests: {}, since: null, achievements: 0, activity: [],
}

/** The stats summary of a save. Pure. */
export function statsOf(snap: Snapshot): ProfileStats {
  const m = mainOf(snap)
  const bests: Record<string, number> = {}
  for (const e of bestEntries(snap)) {
    if (GAME_IDS.has(e.game)) bests[e.game] = Math.max(bests[e.game] ?? 0, Math.round(e.value))
  }
  const unlocks = unlocksOf(snap)
  const days = Object.keys(m.dailyHistory)
  return {
    v: 1,
    flags: m.learnedFlags.filter(c => FLAGS.some(f => f.code === c)).length,
    flagsOf: FLAGS.length,
    crowns: SET_CROWNS.filter(c => m.crowns.includes(c)).length,
    streak: m.currentStreak,
    streakDay: m.lastDailyDate,
    bestStreak: Math.max(m.longestStreak, m.currentStreak),
    dailies: days.length,
    games: gamesCount(snap),
    collection: gachaCount(snap),
    bests: Object.fromEntries(Object.entries(bests).slice(0, BESTS_MAX)),
    since: sinceMonth(snap),
    achievements: Object.keys(unlocks).length,
    activity: activityOf(unlocks).slice(0, ACTIVITY_MAX).map(a => [a.id, a.at]),
  }
}

const count = (v: unknown, max = 10_000_000) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)
const DAY = /^\d{4}-\d{2}-\d{2}$/

/** Someone else's stats as read from the server: trusted for nothing, so
 *  every field is checked and clamped (an unknown game or badge is dropped). */
export function readStats(raw: unknown): ProfileStats {
  if (!isObj(raw)) return { ...EMPTY_STATS }
  const flagsOf = count(raw.flagsOf, 1000) || FLAGS.length
  const bests: Record<string, number> = {}
  if (isObj(raw.bests)) {
    for (const [id, v] of Object.entries(raw.bests).slice(0, BESTS_MAX)) if (GAME_IDS.has(id) && count(v) > 0) bests[id] = count(v)
  }
  const activity: [string, number][] = Array.isArray(raw.activity)
    ? raw.activity.filter((a): a is [string, number] => Array.isArray(a) && typeof a[0] === "string" && !!achievementById(a[0]) && count(a[1], 8.64e15) > 0)
      .slice(0, ACTIVITY_MAX).map(a => [a[0], count(a[1], 8.64e15)])
    : []
  return {
    v: 1,
    flags: Math.min(count(raw.flags, 1000), flagsOf),
    flagsOf,
    crowns: count(raw.crowns, CROWN_COUNT),
    streak: count(raw.streak, 100_000),
    streakDay: typeof raw.streakDay === "string" && DAY.test(raw.streakDay) ? raw.streakDay : null,
    bestStreak: count(raw.bestStreak, 100_000),
    dailies: count(raw.dailies),
    games: count(raw.games),
    collection: count(raw.collection, 1000),
    bests,
    since: typeof raw.since === "string" && /^\d{4}-\d{2}$/.test(raw.since) ? raw.since : null,
    achievements: count(raw.achievements, ACHIEVEMENTS.length),
    activity,
  }
}

const prevDay = (day: string) => {
  const [y, m, d] = day.split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d - 1))
  return t.toISOString().slice(0, 10)
}

/** The streak to show on `today`: 0 once the last daily is older than yesterday. */
export function shownStreak(s: ProfileStats, today: string): number {
  if (!s.streakDay || !DAY.test(today)) return 0
  return s.streakDay === today || s.streakDay === prevDay(today) ? s.streak : 0
}

/** Best scores with their game's title, in the order games are listed. */
export function bestsList(s: ProfileStats): { id: string; title: string; value: number }[] {
  return REGISTRY.filter(r => (s.bests[r.id] ?? 0) > 0).map(r => ({ id: r.id, title: r.title, value: s.bests[r.id] }))
}
