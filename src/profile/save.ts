// Reading a player's save (a localStorage snapshot: key → stored text) for the
// profile: the main save, best scores, the Gacha collection and Flag Studio.
// Pure and safe with anything: a value that won't parse counts as nothing.
import { MAIN_KEY } from "../utils/mergeProgress"
import type { Snapshot } from "../utils/mergeProgress"

const parse = (s: string | undefined): unknown => {
  if (typeof s !== "string") return undefined
  try { return JSON.parse(s) } catch { return undefined }
}
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0)

export interface MainSave {
  learnedFlags: string[]
  crowns: string[]
  currentStreak: number
  longestStreak: number
  lastDailyDate: string | null
  dailyHistory: Record<string, { score: number; total: number }>
  gamesPlayed: number
  username: string
}

export function mainOf(snap: Snapshot): MainSave {
  const m = parse(snap?.[MAIN_KEY])
  const o = isObj(m) ? m : {}
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])
  const history: MainSave["dailyHistory"] = {}
  if (isObj(o.dailyHistory)) {
    for (const [day, r] of Object.entries(o.dailyHistory)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && isObj(r)) history[day] = { score: num(r.score), total: num(r.total) }
    }
  }
  return {
    learnedFlags: [...new Set(list(o.learnedFlags))],
    crowns: [...new Set(list(o.crowns))],
    currentStreak: num(o.currentStreak),
    longestStreak: num(o.longestStreak),
    lastDailyDate: typeof o.lastDailyDate === "string" ? o.lastDailyDate : null,
    dailyHistory: history,
    gamesPlayed: num(o.gamesPlayed),
    username: typeof o.username === "string" ? o.username : "",
  }
}

/** Best-score keys whose name isn't the game's registry id. */
const BEST_ALIASES: Record<string, string> = { hl: "higherlower", doa: "deadoralive" }
const BEST_KEY = /^globalio_([a-z0-9-]+)_best(?:_(\d+))?$/

export interface BestEntry { game: string; variant: string; value: number }

/** Every best score in the save: one per game and tier/mode. */
export function bestEntries(snap: Snapshot): BestEntry[] {
  const out: BestEntry[] = []
  for (const [key, text] of Object.entries(snap ?? {})) {
    const m = BEST_KEY.exec(key)
    if (!m) continue
    const game = BEST_ALIASES[m[1]] ?? m[1]
    const v = parse(text)
    if (typeof v === "number" || (typeof text === "string" && /^\d+$/.test(text.trim()))) {
      const value = num(typeof v === "number" ? v : Number(text))
      if (value) out.push({ game, variant: m[2] ?? "", value })
    } else if (isObj(v)) {
      for (const [variant, x] of Object.entries(v)) {
        const value = num(x)
        if (value) out.push({ game, variant: m[2] ? `${m[2]}:${variant}` : variant, value })
      }
    }
  }
  return out
}

/** The highest best for a game (optionally one tier: "hard" matches "hard" and "hard-type"). */
export function bestOf(entries: BestEntry[], game: string, tier?: string): number {
  let top = 0
  for (const e of entries) {
    if (e.game !== game) continue
    if (tier && e.variant !== tier && !e.variant.startsWith(`${tier}-`)) continue
    top = Math.max(top, e.value)
  }
  return top
}

/** Flags pulled in Flag Gacha. */
export function gachaCount(snap: Snapshot): number {
  const g = parse(snap?.globalio_gacha)
  return isObj(g) && Array.isArray(g.collected) ? new Set(g.collected.filter(c => typeof c === "string")).size : 0
}

/** Designs saved in Flag Studio (read only; the studio owns this key). */
export function studioDesigns(snap: Snapshot): Record<string, unknown>[] {
  const s = parse(snap?.globalio_flagstudio_v1)
  return isObj(s) && Array.isArray(s.saved) ? s.saved.filter(isObj) : []
}

/** Games launched (from the tabs) or finished, whichever count is higher. */
export function gamesCount(snap: Snapshot): number {
  return Math.max(mainOf(snap).gamesPlayed, num(Number(snap?.globalio_total_plays)))
}
