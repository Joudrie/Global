import type { AppState } from "../utils/storage"
import { FLAGS } from "../data/flags"
import type { AccentKey } from "./tokens"

export type TabKey = "today" | "play" | "codex" | "you"
export type Size = "module" | "tile"
export type LaunchAction = "quickplay" | "daily" | "reverse"

export interface Entry {
  id: string                 // Screen id for plain navigation
  action?: LaunchAction      // special launches that build a quiz first
  title: string
  subtitle: string
  icon: string
  tab: TabKey
  group: string
  size: Size
  accent: AccentKey
  /** Niche/experimental games — buried in the collapsible Beta Sandbox at the
   *  bottom of Play. Progressive disclosure: nothing is ever deleted. */
  sandbox?: boolean
  /** Hand-picked A-tier games surfaced in the "Most Loved" shelf on Play.
   *  A game can be featured *and* still appear in its category shelf. */
  featured?: boolean
  progress?: (s: AppState) => { done: number; total: number }
}

const flagProgress = (s: AppState) => ({ done: s.learnedFlags.length, total: FLAGS.length })
// Number of guessable subdivision flags (SUB_FLAGS.length in data/subdivisions.ts).
// A constant so the home screen does not load every subdivision table just to
// show a progress total; scripts/bundle.test.mjs fails if it drifts.
export const SUB_FLAG_COUNT = 1579
const subProgress = (s: AppState) => ({ done: s.learnedSubs.length, total: SUB_FLAG_COUNT })

// Single source of truth. Adding a destination (or a whole new regional set)
// is one entry here — tabs, sections, accents and progress all derive from it.
export const REGISTRY: Entry[] = [
  // ── PLAY — the game browser. Games are filed by *appetite* (what a player is
  // in the mood for) rather than by mechanic, then surfaced flag-forward. The
  // learning Curriculum is the spine; the Beta Sandbox holds rough/redundant
  // games until they earn their way back up. Zero deletions — only resorted.
  // `featured` marks Trending-eligible A-tier games that lead the deck.

  // Learn the World — the learning spine, integrated as poster tiles like
  // every other shelf (leads the page with a live mastery line)
  { id: "flags", title: "Flag Sets", subtitle: "Country, historical & identity sets", icon: "🚩", tab: "play", group: "Learn the World", size: "module", accent: "learn", progress: flagProgress },
  { id: "flashcards", title: "Flashcards", subtitle: "Swipe & learn all 195", icon: "🃏", tab: "play", group: "Learn the World", size: "module", accent: "learn", progress: flagProgress },
  { id: "historical", title: "Historical Flags", subtitle: "Vanished empires & states", icon: "📜", tab: "play", group: "Learn the World", size: "module", accent: "learn" },
  { id: "identity", title: "Identity Flags", subtitle: "Pride · ethnic · signal flags", icon: "🏳️‍🌈", tab: "play", group: "Learn the World", size: "module", accent: "learn" },
  { id: "provinceroulette", title: "Province Roulette", subtitle: "Continent → country → region", icon: "🎰", tab: "play", group: "Learn the World", size: "module", accent: "learn", progress: subProgress },
  { id: "substumper", title: "Subdivision Stumper", subtitle: "Province flag → country", icon: "📍", tab: "play", group: "Learn the World", size: "module", accent: "learn", progress: subProgress },

  // Daily Rituals — come back every day
  // (Flag Gacha lives on the TODAY tab only — it's a daily ritual, not an
  //  arcade game, and the dev wants it off Play entirely.)
  { id: "gacha", title: "Flag Gacha", subtitle: "Daily pull · collect them all", icon: "🎁", tab: "today", group: "Daily Rituals", size: "tile", accent: "today" },
  { id: "connections", title: "Connections", subtitle: "Daily · four groups of four countries", icon: "🧩", tab: "play", group: "Daily Rituals", size: "tile", accent: "today" },
  { id: "funfact", title: "Fun Fact", subtitle: "Daily flag fact", icon: "💡", tab: "play", group: "Daily Rituals", size: "tile", accent: "today" },
  { id: "flagbracket", title: "Flag Bracket", subtitle: "Vote your champion", icon: "🏆", tab: "play", group: "Daily Rituals", size: "tile", accent: "today" },
  { id: "tierlist", title: "Tier List Maker", subtitle: "Rank flags S–F", icon: "🏆", tab: "play", group: "Daily Rituals", size: "tile", accent: "today" },

  // Featured limited-time explorer — surfaces in Trending & Popular
  { id: "worldcup", title: "World Cup 2026", subtitle: "48 nations · flags & history", icon: "🏆", tab: "play", group: "Daily Rituals", size: "tile", accent: "today", featured: true },

  // One Glance — reveal & make (visual, satisfying, fast)
  { id: "silhouette", title: "Silhouette", subtitle: "Guess from the dark", icon: "🌑", tab: "play", group: "One Glance", size: "tile", accent: "challenge", featured: true },
  { id: "thecrop", title: "The Crop", subtitle: "Zoom out to guess", icon: "🔍", tab: "play", group: "One Glance", size: "tile", accent: "challenge", featured: true },
  { id: "thepeel", title: "The Peel", subtitle: "Scratch to reveal", icon: "🖌️", tab: "play", group: "One Glance", size: "tile", accent: "challenge" },
  { id: "composer", title: "Tile Flipper", subtitle: "Reassemble the flag", icon: "🎴", tab: "play", group: "One Glance", size: "tile", accent: "challenge" },
  { id: "buildflag", title: "Build the Flag", subtitle: "Assemble the bands", icon: "🧩", tab: "play", group: "One Glance", size: "tile", accent: "challenge" },
  { id: "geopaint", title: "GeoPaint", subtitle: "Colour-match the flag", icon: "🎨", tab: "play", group: "One Glance", size: "tile", accent: "challenge", featured: true },
  { id: "sketchflag", title: "Sketch the Flag", subtitle: "Draw it from memory", icon: "✏️", tab: "play", group: "One Glance", size: "tile", accent: "play", featured: true },
  { id: "flagoutline", title: "Flag Outline", subtitle: "Guess from the outlines", icon: "🔲", tab: "play", group: "One Glance", size: "tile", accent: "codex" },
  { id: "frankenflag", title: "Frankenflag", subtitle: "Name both halves", icon: "🧟", tab: "play", group: "One Glance", size: "tile", accent: "challenge", featured: true },

  // Spot It — eagle-eye difference & pattern hunting
  { id: "oddoneout", title: "Odd One Out", subtitle: "Find the impostor", icon: "🕵️", tab: "play", group: "Spot It", size: "tile", accent: "play" },
  { id: "lookalikes", title: "Lookalikes", subtitle: "Spot the real one", icon: "👯", tab: "play", group: "Spot It", size: "tile", accent: "play" },
  { id: "flagdna", title: "Flag DNA", subtitle: "Guess by attributes", icon: "🧬", tab: "play", group: "Spot It", size: "tile", accent: "play" },
  { id: "symbolhunt", title: "Symbol Hunt", subtitle: "Find every flag with a symbol", icon: "🔎", tab: "play", group: "Spot It", size: "tile", accent: "play" },
  { id: "flagfamilies", title: "Flag Families", subtitle: "Sort into families", icon: "👪", tab: "play", group: "Spot It", size: "tile", accent: "play" },
  { id: "spoterror", title: "Spot the Error", subtitle: "Find the wrong colour", icon: "🔺", tab: "play", group: "Spot It", size: "tile", accent: "play", featured: true },
  { id: "forgery", title: "Flag Forgery", subtitle: "Swipe: correct or doctored?", icon: "🔍", tab: "play", group: "Spot It", size: "tile", accent: "play", featured: true },

  // Cartographer — maps, borders & shapes
  { id: "geo", title: "Geography", subtitle: "Identify countries by shape", icon: "🗺️", tab: "play", group: "Cartographer", size: "tile", accent: "learn" },
  { id: "bordermap", title: "Border Map", subtitle: "Fill in a country's neighbours", icon: "🗺️", tab: "play", group: "Cartographer", size: "tile", accent: "learn" },
  { id: "borderchain", title: "Border Path", subtitle: "Connect two countries by land", icon: "🔗", tab: "play", group: "Cartographer", size: "tile", accent: "learn" },
  { id: "continentsort", title: "Continent Sort", subtitle: "1-minute region sprint", icon: "🌍", tab: "play", group: "Cartographer", size: "tile", accent: "learn", featured: true },

  // Sharp Recall — fast reps, reflex quizzes
  { id: "reversequiz", action: "reverse", title: "Flag ID Challenge", subtitle: "See the name, pick the flag", icon: "🎯", tab: "play", group: "Sharp Recall", size: "tile", accent: "drill" },
  { id: "capitalquiz", title: "Capital Cities", subtitle: "Name that capital", icon: "🏛️", tab: "play", group: "Sharp Recall", size: "tile", accent: "drill" },
  { id: "statclash", title: "Stat Clash", subtitle: "Bigger population or area?", icon: "⚖️", tab: "play", group: "Sharp Recall", size: "tile", accent: "drill", featured: true },
  { id: "prideroulette", title: "Pride Roulette", subtitle: "Name the pride flag · survival", icon: "🏳️‍🌈", tab: "play", group: "Sharp Recall", size: "tile", accent: "drill" },

  // Loremaster — deep knowledge & trivia
  { id: "language", title: "Guess the Language", subtitle: "88 languages · easy → extreme", icon: "🗣️", tab: "play", group: "Loremaster", size: "tile", accent: "codex", featured: true },
  { id: "realorbot", title: "Real or Bot", subtitle: "Swipe: real flag or AI fake?", icon: "🤖", tab: "play", group: "Loremaster", size: "tile", accent: "codex", featured: true },
  { id: "twotruths", title: "Two Truths", subtitle: "Spot the lie about a country", icon: "🕵️", tab: "play", group: "Loremaster", size: "tile", accent: "codex" },
  { id: "deadoralive", title: "Dead or Alive", subtitle: "Live or vanished?", icon: "💀", tab: "play", group: "Loremaster", size: "tile", accent: "codex" },
  { id: "lineage", title: "Lineage", subtitle: "Trace a flag's family tree", icon: "🌳", tab: "play", group: "Loremaster", size: "tile", accent: "codex" },
  { id: "timeline", title: "Flag Timeline", subtitle: "Order a country's flags in time", icon: "⏳", tab: "play", group: "Loremaster", size: "tile", accent: "codex" },

  // Challenge — the hardcore endgame
  { id: "gauntlet", title: "Gauntlet", subtitle: "One life · every flag", icon: "⚔️", tab: "play", group: "Challenge", size: "module", accent: "challenge" },
  { id: "challenge", title: "Challenge Mode", subtitle: "States, provinces & regions", icon: "🎖️", tab: "play", group: "Challenge", size: "module", accent: "challenge" },

  // Beta Sandbox — rough/redundant games wait here until they're ready.
  // Reachable any time via the drawer + search; nothing is deleted.
  { id: "flagle", title: "Flagle", subtitle: "Daily flag Wordle · 6 guesses", icon: "🟩", tab: "play", group: "Beta Sandbox", size: "tile", accent: "play", sandbox: true },
  { id: "capitalmatch", title: "Capital Match", subtitle: "Match flags to capitals", icon: "🏛️", tab: "play", group: "Beta Sandbox", size: "tile", accent: "drill", sandbox: true },
  { id: "higherlower", title: "Higher / Lower", subtitle: "More red or blue?", icon: "📊", tab: "play", group: "Beta Sandbox", size: "tile", accent: "drill", sandbox: true },
  { id: "oddborder", title: "Odd Border Out", subtitle: "Spot the non-neighbour", icon: "🧭", tab: "play", group: "Beta Sandbox", size: "tile", accent: "learn", sandbox: true },
  { id: "describeit", title: "Describe-It", subtitle: "Guess from the clues", icon: "📝", tab: "play", group: "Beta Sandbox", size: "tile", accent: "codex", sandbox: true },
  { id: "uscityflags", title: "US City Flags", subtitle: "Name the American city", icon: "🏙️", tab: "play", group: "Beta Sandbox", size: "tile", accent: "drill", sandbox: true },

  // ── CODEX → the bottom tab now opens the Codex itself (no launcher page).
  // Its companion reference tools live on the YOU tab as the Collection.
  { id: "progressmap", title: "Progress Map", subtitle: "Light up the world", icon: "🗺️", tab: "you", group: "Collection", size: "module", accent: "codex", progress: flagProgress },
  { id: "substats", title: "Subdivision Stats", subtitle: "Mastery by continent", icon: "📊", tab: "you", group: "Collection", size: "module", accent: "codex", progress: subProgress },
]

// Every game a player can open: everything on Play (Beta Sandbox included) and
// Today. The You tab's Collection pages are progress views, not games. This is
// the one list/count used everywhere (app copy and the /games/ page), so the
// numbers always match.
export const GAMES: Entry[] = REGISTRY.filter(e => e.tab !== "you")
export const GAME_COUNT = GAMES.length

export function groupsFor(tab: TabKey): { group: string; entries: Entry[] }[] {
  const out: { group: string; entries: Entry[] }[] = []
  for (const e of REGISTRY.filter(r => r.tab === tab)) {
    let g = out.find(x => x.group === e.group)
    if (!g) { g = { group: e.group, entries: [] }; out.push(g) }
    g.entries.push(e)
  }
  return out
}

// ── Local personalization engine ──────────────────────────────────────────
// There is no server: every "recommendation" is derived on-device from the
// registry plus the recently-played ids. Pure functions, deterministic where it
// matters (so a day's picks stay stable), and they only ever *reorder* — never
// hide — so the whole catalogue stays reachable.

// Every launchable Play game that isn't buried in the Beta Sandbox.
const playable = (): Entry[] => REGISTRY.filter(r => r.tab === "play" && !r.sandbox)

/** Hand-picked A-tier games for the "Most Loved" shelf, in registry order. */
export function featuredGames(): Entry[] {
  return playable().filter(r => r.featured)
}

// Stable string hash (FNV-1a) — lets us shuffle deterministically by a daily
// seed without pulling in a PRNG dependency.
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** "Because you played X" — games that share a shelf or category with the most
 *  recently played game, ranked by affinity, excluding the recent rotation so
 *  the rail always points somewhere new. Returns null until there's a signal. */
export function recommendFor(recentIds: string[]): { seed: Entry; entries: Entry[] } | null {
  const games = playable()
  const seed = games.find(r => r.id === recentIds[0])
  if (!seed) return null
  const recent = new Set(recentIds)
  const score = (r: Entry) => (r.group === seed.group ? 2 : 0) + (r.accent === seed.accent ? 1 : 0)
  const ranked = games
    .filter(r => r.id !== seed.id && !recent.has(r.id))
    .sort((a, b) => score(b) - score(a))
  return ranked.length ? { seed, entries: ranked.slice(0, 10) } : null
}

/** Daily-rotating discovery: games outside the recent rotation, shuffled by a
 *  per-day seed so "something new" stays fresh but stable within the day. */
export function discoverGames(recentIds: string[], daySeed: number): Entry[] {
  const recent = new Set(recentIds)
  return playable()
    .filter(r => !recent.has(r.id))
    .map(r => ({ r, k: hash(`${r.id}:${daySeed}`) }))
    .sort((a, b) => a.k - b.k)
    .map(x => x.r)
    .slice(0, 12)
}

/** "Trending this week" deck — featured (A-tier) games lead, then a stable
 *  weekly shuffle of the rest, so the swipe stack always opens on something
 *  great yet rotates fresh every week. Catalogue reach, weekly cadence. */
export function trendingGames(weekSeed: number, count = 9): Entry[] {
  return playable()
    .map(r => ({ r, k: (r.featured ? 0 : 1) * 1e9 + hash(`${r.id}:${weekSeed}`) }))
    .sort((a, b) => a.k - b.k)
    .map(x => x.r)
    .slice(0, count)
}

// The hand-picked hit list for the "Top games" shelf. Fixed membership (these
// may also appear in their own category shelves — that's fine), order
// reshuffled daily so the shelf stays fresh without ever hiding anything.
const TOP_GAME_IDS = [
  "realorbot", "forgery", "language", "spoterror", "historical", "thepeel",
  "bordermap", "composer", "deadoralive", "lineage", "gauntlet",
]
export function topGames(daySeed: number): Entry[] {
  return TOP_GAME_IDS
    .map(id => REGISTRY.find(r => r.id === id))
    .filter((e): e is Entry => !!e)
    .map(r => ({ r, k: hash(`top:${r.id}:${daySeed}`) }))
    .sort((a, b) => a.k - b.k)
    .map(x => x.r)
}
