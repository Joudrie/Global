// Favourite games and how often each game is opened, kept on this device.
//
// globalio_favorites  { gameId: { on, at } }: starred (on) or unstarred, and
//                     when (ms). An unstarred game keeps its entry, so account
//                     sync and Combine know the later choice wins and an
//                     unstarred game doesn't come back from another device
//                     (utils/mergeProgress.ts, rule "latest").
// globalio_playcounts { gameId: n }: times each game was opened. The
//                     Favourites row on Play is ordered by it.
//
// Storage can be missing or throw (private windows); every read falls back to
// nothing and every write is best-effort. Changes are announced with
// FAVORITES_EVENT so every open star and row redraws.

export const FAVORITES_KEY = "globalio_favorites"
export const PLAYCOUNTS_KEY = "globalio_playcounts"
export const FAVORITES_EVENT = "globalio:favorites"

export interface FavoriteMark { on: boolean; at: number }
export type Favorites = Record<string, FavoriteMark>
export type PlayCounts = Record<string, number>

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)

function readJson(key: string): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) ?? "null")
    return isObj(v) ? v : {}
  } catch { return {} }
}
function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* not saved */ }
  try { window.dispatchEvent(new Event(FAVORITES_EVENT)) } catch { /* not a browser */ }
}

/** Every mark, starred or not, with anything malformed left out. */
export function readFavorites(): Favorites {
  const out: Favorites = {}
  for (const [id, m] of Object.entries(readJson(FAVORITES_KEY))) {
    if (isObj(m) && typeof m.on === "boolean" && isNum(m.at)) out[id] = { on: m.on, at: m.at }
  }
  return out
}

export function readPlayCounts(): PlayCounts {
  const out: PlayCounts = {}
  for (const [id, n] of Object.entries(readJson(PLAYCOUNTS_KEY))) if (isNum(n) && n > 0) out[id] = Math.floor(n)
  return out
}

/** Star or unstar a game. */
export function setFavorite(id: string, on: boolean, now = Date.now()): void {
  // A clock set back (or a fast double tap) must still count as the later choice.
  const prev = readFavorites()[id]
  writeJson(FAVORITES_KEY, { ...readFavorites(), [id]: { on, at: Math.max(now, (prev?.at ?? 0) + 1) } })
}

/** One more open of a game. */
export function notePlay(id: string): void {
  const counts = readPlayCounts()
  writeJson(PLAYCOUNTS_KEY, { ...counts, [id]: (counts[id] ?? 0) + 1 })
}

/** Starred ids, most played first; a tie goes to the one starred most recently.
 *  Pure, so it can be tested without storage. */
export function rankFavorites(favs: Favorites, counts: PlayCounts): string[] {
  return Object.entries(favs)
    .filter(([, m]) => m.on)
    .sort(([a, x], [b, y]) => (counts[b] ?? 0) - (counts[a] ?? 0) || y.at - x.at || (a < b ? -1 : 1))
    .map(([id]) => id)
}

/** True once the player has starred anything, even if they unstarred it since. */
export const hasUsedFavorites = (favs: Favorites): boolean => Object.keys(favs).length > 0
