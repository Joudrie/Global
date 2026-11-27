// Patch notes in the app. The changelog (src/data/changelog.ts) grouped into
// dated "patches", which entries this player hasn't read yet, and the one-line
// summary on Today. Pure helpers plus one storage key; the screen is
// components/PatchNotesScreen.tsx and the Today line components/PatchNotesStrip.tsx.
import type { ChangelogEntry } from "../data/changelog"

/** What the player has read (merged across devices in utils/mergeProgress.ts). */
export const SEEN_KEY = "globalio_patchnotes_seen"

/**
 * Every entry dated before `date`, and the first `count` entries made on
 * `date`. New entries go on top of the changelog, so on a day with several the
 * unread ones are the newest (top) ones.
 */
export interface Seen { date: string; count: number }

export interface Patch {
  date: string
  /** Newest first, with each entry's position in the whole changelog. */
  entries: { entry: ChangelogEntry; index: number }[]
}

const ISO = /^\d{4}-\d{2}-\d{2}$/

const addDays = (iso: string, n: number): string => {
  const [y, m, d] = iso.split("-").map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return Number.isNaN(t.getTime()) ? iso : t.toISOString().slice(0, 10)
}

const newestDate = (entries: ChangelogEntry[]): string =>
  entries.reduce((max, e) => (e.date > max ? e.date : max), "")

/** The first day of the newest week of changes: the newest entry and the six days before it. */
export const weekStart = (entries: ChangelogEntry[]): string => addDays(newestDate(entries), -6)

/** Entries grouped by date, newest date first; within a date, changelog order. */
export function groupPatches(entries: ChangelogEntry[]): Patch[] {
  const byDate = new Map<string, Patch>()
  entries.forEach((entry, index) => {
    let p = byDate.get(entry.date)
    if (!p) { p = { date: entry.date, entries: [] }; byDate.set(entry.date, p) }
    p.entries.push({ entry, index })
  })
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

/** A stored value, or null when it's missing or isn't one. */
export function readSeen(raw: string | null | undefined): Seen | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    if (v && typeof v === "object" && typeof v.date === "string" && ISO.test(v.date)
      && Number.isInteger(v.count) && v.count >= 0) return { date: v.date, count: v.count }
  } catch { /* not ours */ }
  return null
}

/** Having read everything in `entries`. */
export function seenAll(entries: ChangelogEntry[]): Seen {
  const date = newestDate(entries)
  return { date, count: entries.filter(e => e.date === date).length }
}

/** The one that has read further: the later date, then more entries on it. */
export function laterSeen(a: Seen | null, b: Seen | null): Seen | null {
  if (!a || !b) return a ?? b
  if (a.date !== b.date) return a.date > b.date ? a : b
  return a.count >= b.count ? a : b
}

/**
 * For each entry, whether the player hasn't read it. Someone who has never
 * opened the notes gets the newest week marked, not the whole history.
 */
export function unseenFlags(entries: ChangelogEntry[], seen: Seen | null): boolean[] {
  if (!seen) {
    const from = weekStart(entries)
    return entries.map(e => e.date >= from)
  }
  const total = new Map<string, number>()
  for (const e of entries) total.set(e.date, (total.get(e.date) ?? 0) + 1)
  const above = new Map<string, number>() // entries on the same date higher up the list
  return entries.map(e => {
    const k = above.get(e.date) ?? 0
    above.set(e.date, k + 1)
    if (e.date !== seen.date) return e.date > seen.date
    return k < total.get(e.date)! - seen.count
  })
}

export const unseenCount = (entries: ChangelogEntry[], seen: Seen | null): number =>
  unseenFlags(entries, seen).filter(Boolean).length

export function loadSeen(): Seen | null {
  try { return readSeen(localStorage.getItem(SEEN_KEY)) } catch { return null }
}

/** Remember that everything in `entries` has been read (never moves backwards). */
export function markAllSeen(entries: ChangelogEntry[]): void {
  try {
    const next = laterSeen(loadSeen(), seenAll(entries))
    if (next) localStorage.setItem(SEEN_KEY, JSON.stringify(next))
  } catch { /* storage blocked: the dot just stays */ }
}

// ── Wording ────────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "2026-11-27" → "27 Nov 2026". */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return `${d} ${MONTHS[m - 1] ?? ""} ${y}`
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

const NEW_GAME = /^(?:New(?: games?)?|Two new games|Three new games):\s*/

/** "New game: Demonyms" is about a new game (or tool). */
export const isNewGame = (title: string) => NEW_GAME.test(title)

/**
 * A title cut down to a name for the Today line: "New game: Demonyms" →
 * "Demonyms", "Coats of arms in the Codex (beta)" → "coats of arms in the
 * Codex". Sentence-case phrases start lower case so they read inside a
 * sentence; names (a game title, or two capitalised words) keep theirs.
 */
export function shortName(title: string, names: string[] = []): string {
  let s = title.replace(NEW_GAME, "")
  s = s.split(/:\s|,\s/)[0].replace(/\s*\((?:beta|Beta)\)$/, "").trim()
  const words = s.split(/\s+/)
  const isName = words.length < 2 || /^[^a-z]/.test(words[1]) || /^[“"‘']/.test(s)
    || names.some(n => s === n || s.startsWith(n + " "))
  return isName ? s : s.charAt(0).toLowerCase() + s.slice(1)
}

/**
 * The Today line: "New this week" (or "Latest updates" once the newest change
 * is over a week old), up to `max` names (new games first, then the newest
 * changes) and how many more there are.
 */
export function headline(entries: ChangelogEntry[], today: string, names: string[] = [], max = 2): { label: string; names: string; more: string } {
  const from = weekStart(entries)
  const week = entries.filter(e => e.date >= from)
  const picks = [...week.filter(e => isNewGame(e.title)), ...week.filter(e => !isNewGame(e.title))].slice(0, Math.max(1, max))
  const list = picks.map(e => shortName(e.title, names))
  const rest = week.length - picks.length
  const recent = today <= addDays(newestDate(entries), 6)
  return {
    label: recent ? "New this week" : "Latest updates",
    names: rest > 0 ? list.join(", ") : list.join(" and "),
    more: rest > 0 ? ` and ${rest} more` : "",
  }
}

/** `phrase` appears in `text` as whole words, capitals and all. */
function mentions(text: string, phrase: string): boolean {
  for (let at = text.indexOf(phrase); at >= 0; at = text.indexOf(phrase, at + 1)) {
    const before = text[at - 1] ?? " ", after = text[at + phrase.length] ?? " "
    if (!/[A-Za-z0-9]/.test(before) && !/[A-Za-z0-9]/.test(after)) return true
  }
  return false
}

/**
 * The one game an entry's title names, matched on the game's exact title, or
 * null when it names none or more than one ("Gauntlet progress, faster Dead or
 * Alive…" names several, so it gets no link). A long title's first two words
 * count as naming it too ("the Tier List" is Tier List Maker), so an entry
 * about two games doesn't link to just one of them.
 */
export function gameFor<G extends { title: string }>(title: string, games: G[]): G | null {
  const named = games.filter(g => {
    const words = g.title.split(" ")
    return mentions(title, g.title) || (words.length >= 3 && mentions(title, words.slice(0, 2).join(" ")))
  })
  // "Flag Studio" inside a longer matched title isn't a second game.
  const distinct = named.filter(g => !named.some(o => o !== g && o.title.includes(g.title)))
  return distinct.length === 1 ? distinct[0] : null
}
