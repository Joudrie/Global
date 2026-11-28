// Unlocking achievements (the list is src/data/achievements.ts).
//
// globalio_achievements holds { id: unlock time in ms }. It syncs with the
// account like the rest of the save; when two devices both have one, the
// earlier time wins (the "min" rule in src/utils/mergeProgress.ts).
//
// The app calls checkAchievements() at start and whenever the player comes
// back from a game; games call unlockAchievement(id) for the moments only
// they see. Either way, new unlocks are announced with a
// "globalio:achievements" event (the toast listens for it).
import { ACHIEVEMENTS, SET_CROWNS, achievementById } from "../data/achievements"
import type { AchievementFacts } from "../data/achievements"
import { FLAGS } from "../data/flags"
import type { Snapshot } from "../utils/mergeProgress"
import { GAUNTLET_KEY, passedRegions, readGauntlet } from "../utils/gauntlet"
import { bestEntries, bestOf, gachaCount, gamesCount, mainOf, studioDesigns } from "./save"
import { previewAll } from "./preview"

export const ACHIEVEMENTS_KEY = "globalio_achievements"
export const ACHIEVEMENTS_EVENT = "globalio:achievements"
export type Unlocks = Record<string, number>

/** The unlock times in a save: known ids with a sensible time only. */
export function unlocksOf(snap: Snapshot): Unlocks {
  const out: Unlocks = {}
  try {
    const raw = JSON.parse(snap?.[ACHIEVEMENTS_KEY] ?? "null")
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [id, t] of Object.entries(raw)) {
        if (achievementById(id) && typeof t === "number" && Number.isFinite(t) && t > 0) out[id] = t
      }
    }
  } catch { /* nothing unlocked */ }
  return out
}

export function factsOf(snap: Snapshot): AchievementFacts {
  const m = mainOf(snap)
  const bests = bestEntries(snap)
  const days = Object.values(m.dailyHistory)
  return {
    learned: m.learnedFlags.filter(c => FLAGS.some(f => f.code === c)).length,
    totalFlags: FLAGS.length,
    crowns: SET_CROWNS.filter(c => m.crowns.includes(c)).length,
    longestStreak: Math.max(m.longestStreak, m.currentStreak),
    dailies: days.length,
    perfectDaily: days.some(d => d.total >= 1 && d.score >= d.total),
    games: gamesCount(snap),
    collected: gachaCount(snap),
    designs: studioDesigns(snap).length,
    best: (game, tier) => bestOf(bests, game, tier),
    gauntlets: passedRegions(readGauntlet(snap?.[GAUNTLET_KEY])),
  }
}

/** Achievements the save has earned that aren't unlocked yet. Pure. */
export function earned(snap: Snapshot, unlocks: Unlocks = unlocksOf(snap)): string[] {
  const f = factsOf(snap)
  return ACHIEVEMENTS.filter(a => a.check && !unlocks[a.id] && a.check(f)).map(a => a.id)
}

// ── Creator preview (see ./preview.ts) ──────────────────────────────────────
/** The unlocks to show: every achievement while the preview is on
 *  (real unlock times kept), else exactly the save's. */
export function shownUnlocks(unlocks: Unlocks, on: boolean = previewAll()): Unlocks {
  if (!on) return unlocks
  const now = Date.now()
  return Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, unlocks[a.id] ?? now]))
}

// ── This device ─────────────────────────────────────────────────────────────

function readKey(): Unlocks {
  try { return unlocksOf({ [ACHIEVEMENTS_KEY]: localStorage.getItem(ACHIEVEMENTS_KEY) ?? "null" }) } catch { return {} }
}

function record(ids: string[], at = Date.now()): string[] {
  const have = readKey()
  const fresh = ids.filter(id => achievementById(id) && !have[id])
  if (!fresh.length) return []
  for (const id of fresh) have[id] = at
  try { localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(have)) } catch { return [] }
  try { window.dispatchEvent(new CustomEvent(ACHIEVEMENTS_EVENT, { detail: { ids: fresh } })) } catch { /* not a browser */ }
  return fresh
}

/** Unlock what this device's save has earned. The ids just unlocked. */
export function checkAchievements(snap: Snapshot): string[] {
  return record(earned(snap, { ...unlocksOf(snap), ...readKey() }))
}

/** For games: unlock one achievement now (does nothing if it already is). */
export function unlockAchievement(...ids: string[]): void {
  record(ids)
}

/** Every unlock, newest first: the profile's activity list. */
export function activityOf(unlocks: Unlocks): { id: string; at: number }[] {
  return Object.entries(unlocks).map(([id, at]) => ({ id, at })).sort((a, b) => b.at - a.at || (a.id < b.id ? -1 : 1))
}
