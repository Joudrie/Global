// Connections: the rules, with no DOM. Ported from the ConnecSeans game.js.
//
// A puzzle is { groups: [{ name, why, words: [4] } x4] }, groups ordered
// easiest to hardest; the order sets each group's colour.

export interface Group { name: string; why: string; words: string[] }
export interface Puzzle { groups: Group[] }

export const SIZE = 4
export const MISTAKES = 6
export const HINTS = 3
export const MAX_WORD = 40
const MAX_TEXT = 120

export type CheckResult =
  | { result: "correct"; group: number }
  | { result: "one-away" | "wrong" | "repeat" }

export interface GameState {
  solved: number[]
  mistakes: number
  left: number
  won: boolean
  lost: boolean
  over: boolean
}

const clean = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim()
const key = (w: string) => clean(w).toLowerCase()

// Every problem with a puzzle, as sentences. Empty = playable.
export function problems(p: Puzzle): string[] {
  const out: string[] = []
  if (!p || !Array.isArray(p.groups) || p.groups.length !== SIZE) return ["A puzzle needs exactly four groups."]
  const seen = new Map<string, number>()
  p.groups.forEach((g, i) => {
    const n = i + 1
    if (!clean(g.name)) out.push(`Group ${n} needs a connection.`)
    if (clean(g.name).length > MAX_TEXT) out.push(`Group ${n}'s connection is over ${MAX_TEXT} characters.`)
    if (clean(g.why).length > MAX_TEXT * 2) out.push(`Group ${n}'s story is over ${MAX_TEXT * 2} characters.`)
    const words = Array.isArray(g.words) ? g.words : []
    if (words.length !== SIZE || words.some(w => !clean(w))) out.push(`Group ${n} needs four words.`)
    words.forEach(w => {
      if (clean(w).length > MAX_WORD) out.push(`"${clean(w)}" is over ${MAX_WORD} characters; it won't fit on a tile.`)
      const k = key(w)
      if (!k) return
      if (seen.has(k) && seen.get(k) !== n) out.push(`"${clean(w)}" is in two groups; every word has to be different.`)
      else if (seen.has(k)) out.push(`"${clean(w)}" is in group ${n} twice.`)
      seen.set(k, n)
    })
  })
  return [...new Set(out)]
}

export function shuffle<T>(list: T[], rand: () => number = Math.random): T[] {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const groupOf = (p: Puzzle, word: string) => p.groups.findIndex(g => g.words.some(w => key(w) === key(word)))
export const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.map(key).sort().join("\n") === b.map(key).sort().join("\n")

// Guess four words, given the guesses so far ([[word x4], ...]).
export function check(p: Puzzle, pick: string[], history: string[][] = []): CheckResult {
  if (pick.length !== SIZE) throw new Error("Pick four words.")
  if (history.some(h => sameSet(h, pick))) return { result: "repeat" }
  const counts = new Map<number, number>()
  pick.forEach(w => { const g = groupOf(p, w); counts.set(g, (counts.get(g) || 0) + 1) })
  const [[group, most]] = [...counts].sort((a, b) => b[1] - a[1])
  if (most === SIZE) return { result: "correct", group }
  return { result: most === SIZE - 1 ? "one-away" : "wrong" }
}

// Replay a guess history: which groups are solved (in the order found),
// mistakes made, and whether the game is over.
export function state(p: Puzzle, history: string[][]): GameState {
  const solved: number[] = []
  let mistakes = 0
  const past: string[][] = []
  for (const pick of history) {
    if (solved.length === SIZE || mistakes >= MISTAKES) break
    const r = check(p, pick, past)
    past.push(pick)
    if (r.result === "correct") solved.push(r.group)
    else if (r.result !== "repeat") mistakes++
  }
  const won = solved.length === SIZE
  const lost = !won && mistakes >= MISTAKES
  return { solved, mistakes, left: MISTAKES - mistakes, won, lost, over: won || lost }
}

// The guesses that counted (repeats left out), as group indexes per word.
export function rows(p: Puzzle, history: string[][]): number[][] {
  const past: string[][] = []
  const out: number[][] = []
  for (const pick of history) {
    if (check(p, pick, past).result === "repeat") continue
    past.push(pick)
    out.push(pick.map(w => groupOf(p, w)))
  }
  return out
}

// ── Hints ────────────────────────────────────────────────────────────────
// Up to HINTS per puzzle, free (they never cost a mistake). The first hint
// names the easiest unsolved group; the next two each mark one of its
// countries. If that group gets solved in between, the next hint starts over
// on the easiest group still unsolved.
export interface Hint { group: number; word?: string }

export function nextHint(p: Puzzle, history: string[][], hints: Hint[]): Hint | null {
  const s = state(p, history)
  if (s.over || hints.length >= HINTS) return null
  const open = [0, 1, 2, 3].filter(g => !s.solved.includes(g))
  const last = hints[hints.length - 1]
  const group = last && open.includes(last.group) ? last.group : open[0]
  if (!hints.some(h => h.group === group && !h.word)) return { group }
  const marked = new Set(hints.filter(h => h.group === group && h.word).map(h => key(h.word!)))
  const word = p.groups[group].words.find(w => !marked.has(key(w)))
  return word ? { group, word } : null
}

// Keep only well-formed hints for this puzzle (they come back from storage).
export function validHints(p: Puzzle, raw: unknown): Hint[] {
  if (!Array.isArray(raw)) return []
  const out: Hint[] = []
  for (const h of raw.slice(0, HINTS)) {
    const g = (h as Hint)?.group, w = (h as Hint)?.word
    if (!Number.isInteger(g) || g < 0 || g >= SIZE) break
    if (w !== undefined && groupOf(p, String(w)) !== g) break
    out.push(w === undefined ? { group: g } : { group: g, word: String(w) })
  }
  return out
}

// One row of colour squares per guess, as in the original's share text.
const SQUARES = ["\u{1F7E8}", "\u{1F7E9}", "\u{1F7E6}", "\u{1F7EA}"]
export function shareText(p: Puzzle, history: string[][], title: string, url?: string, hints = 0): string {
  const s = state(p, history)
  const plural = (n: number, one: string) => `${n} ${n === 1 ? one : one + "s"}`
  const summary = (s.won
    ? `Solved with ${plural(s.mistakes, "mistake")}`
    : `Found ${s.solved.length} of ${SIZE} groups`) + (hints ? `, ${plural(hints, "hint")}` : ", no hints")
  const grid = rows(p, history).map(r => r.map(g => SQUARES[g]).join(""))
  return [title, summary, ...grid, url].filter(Boolean).join("\n")
}

// ── Daily pick ─────────────────────────────────────────────────────────────
// Puzzle #1 is on the epoch; one new puzzle per local calendar day, wrapping
// after the last. Dates are "YYYY-MM-DD" (prng.todayString), read as UTC so
// daylight-saving changes can't shift the count.
export const EPOCH = "2026-09-29"
const DAY = 86_400_000
const utc = (d: string) => { const [y, m, dd] = d.split("-").map(Number); return Date.UTC(y, m - 1, dd) }

export function daysSinceEpoch(date: string): number {
  return Math.round((utc(date) - utc(EPOCH)) / DAY)
}

/** Index (0-based) of the puzzle for `date` among `count` puzzles. */
export function puzzleIndex(date: string, count: number): number {
  return ((daysSinceEpoch(date) % count) + count) % count
}
